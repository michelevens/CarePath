<?php

namespace App\Services;

use App\Models\Facility;
use App\Models\SponsoredCampaign;
use App\Models\SponsoredClick;
use App\Models\SponsoredImpression;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Decides which sponsored facilities (if any) to inject into a search
 * result and records impression/click events that drive billing.
 *
 * Trust-first design — see "Sponsored ads design notes":
 *
 *   - SURFACE OPT-IN: ads only fire on caller surfaces we've decided
 *     are acceptable for monetization (`search`, `embed`). All other
 *     surfaces (landing pages, comparison, facility detail) get an
 *     empty collection regardless of what the caller asks for.
 *
 *   - QUALITY-BLEND RANKING: candidates are sorted by
 *     `cpc_bid * quality_score` instead of bid alone, so a low-rated
 *     facility can't simply outbid a great one. Anti-perverse-
 *     incentive measure; the brand promise won't survive without it.
 *
 *   - SPARSE-RESULTS SUPPRESSION: when organic results are thin
 *     (<5 facilities), sponsored slots are hidden. Two ads above
 *     three organic results feels rigged — and the advertiser
 *     wouldn't get fair value anyway.
 *
 *   - FREQUENCY CAP: a single (session, campaign) pair can see at
 *     most 3 impressions in a 24h window. Repetition is badgering;
 *     this also blunts budget-drain attacks from any one client.
 *
 *   - GEOGRAPHIC RADIUS: when the search has an origin lat/lon, we
 *     drop sponsored candidates more than the search's radius away
 *     from that origin. A Phoenix ALF shouldn't sponsor a Tucson
 *     search just because both are AZ.
 *
 *   - MAX 2 SLOTS PER PAGE: Google-style restraint.
 */
class SponsoredListingService
{
    private const MAX_SLOTS_PER_PAGE = 2;

    /** Minimum organic-result count below which we suppress sponsored slots. */
    private const SPARSE_RESULTS_THRESHOLD = 5;

    /** Maximum impressions of the same (campaign, session) pair per 24h. */
    private const FREQUENCY_CAP_PER_DAY = 3;

    /** Surfaces that are allowed to inject sponsored slots. */
    public const ALLOWED_SURFACES = ['search', 'embed'];

    /**
     * Given the filters in use, return up to N sponsored facilities
     * to inject at the top of the result list. Each facility gets
     * attached `sponsored_campaign_id` + `click_token` + a structured
     * `sponsored_reason` payload so the frontend can render a
     * "Why am I seeing this?" tooltip without a second roundtrip.
     *
     * @param  array       $filters         Same shape as MarketplaceController validates.
     * @param  string      $surface         Caller surface — see ALLOWED_SURFACES.
     * @param  int|null    $organicCount    Count of organic results in this same query;
     *                                      sponsored is suppressed when below the threshold.
     * @param  array|null  $origin          ['lat'=>..., 'lon'=>..., 'radius_miles'=>...]
     *                                      from the search's ZIP or geocode.
     * @param  string|null $sessionId       Browser session for frequency-cap enforcement.
     * @return Collection<int, Facility>
     */
    public function selectForSearch(
        array $filters,
        string $surface = 'search',
        ?int $organicCount = null,
        ?array $origin = null,
        ?string $sessionId = null,
    ): Collection {
        // 1. Surface opt-in. The marketplace search + embed widget are
        //    the only places ads fire today. Any other caller — sitemap
        //    generation, comparison, landing pages — gets nothing.
        if (! in_array($surface, self::ALLOWED_SURFACES, true)) {
            return new Collection();
        }

        // 2. Sparse-results suppression. Showing 2 ads above 3 organic
        //    rows looks gamed; advertisers don't benefit from a page
        //    that loses user trust.
        if ($organicCount !== null && $organicCount < self::SPARSE_RESULTS_THRESHOLD) {
            return new Collection();
        }

        $now = now()->toDateString();

        $query = SponsoredCampaign::query()
            ->whereIn('status', SponsoredCampaign::SERVABLE_STATUSES)
            ->where('starts_on', '<=', $now)
            ->where(function ($q) use ($now) {
                $q->whereNull('ends_on')->orWhere('ends_on', '>=', $now);
            })
            ->whereRaw('spent_today_cents + cpc_bid_cents <= daily_budget_cents')
            ->where(function ($q) {
                $q->whereNull('total_budget_cents')
                  ->orWhereRaw('spent_total_cents + cpc_bid_cents <= total_budget_cents');
            })
            ->with(['facility' => function ($q) {
                $q->select([
                    'id', 'name', 'slug', 'type', 'city', 'state', 'zip',
                    'latitude', 'longitude',
                    'medicaid_certified', 'medicare_certified',
                    'cms_five_star_overall', 'cms_five_star_health_inspection',
                    'cms_five_star_staffing', 'cms_five_star_quality',
                    'total_beds', 'price_from_cents', 'is_active',
                ]);
            }]);

        // Pre-load all candidates and post-filter in PHP — candidate set
        // is small (active campaigns total) and the matching logic reads
        // better in code than SQL.
        $campaigns = $query->get();

        // 3. Filter eligibility: facility must actually match the search,
        //    the campaign's own state/city targets must overlap, and
        //    (if origin) the facility must be inside the search radius.
        $matching = $campaigns
            ->filter(fn ($c) => $c->facility && $c->facility->is_active)
            ->filter(fn ($c) => $this->facilityMatchesSearch($c->facility, $filters))
            ->filter(fn ($c) => $this->campaignTargetingMatches($c, $filters))
            ->filter(fn ($c) => $this->withinRadius($c->facility, $origin));

        // 4. Frequency cap per session.
        if ($sessionId) {
            $matching = $matching->filter(
                fn ($c) => $this->underFrequencyCap($c->id, $sessionId),
            );
        }

        // 5. Quality-score blend: rank by (bid * quality), not bid alone.
        //    Ties broken by random to avoid first-mover lock-in.
        $ranked = $matching
            ->map(function ($c) {
                $c->__score = $this->blendScore($c);
                return $c;
            })
            ->sortByDesc(fn ($c) => $c->__score)
            ->values()
            ->take(self::MAX_SLOTS_PER_PAGE);

        return $ranked->map(function ($c) use ($filters) {
            $f = $c->facility;
            $f->is_sponsored = true;
            $f->sponsored_campaign_id = $c->id;
            $f->click_token = self::signClickToken($c->id, $f->id);
            // Disclosure payload for "Why am I seeing this?" — no
            // secrets, no PII, just an explanation the user can audit.
            $f->sponsored_reason = [
                'facility_name' => $f->name,
                'matched_on' => array_values(array_filter([
                    ! empty($filters['state']) ? "state {$filters['state']}" : null,
                    ! empty($filters['city']) ? "city {$filters['city']}" : null,
                    ! empty($filters['type']) ? "level of care" : null,
                ])),
                'rank_signal' => 'Bid × quality score (CMS rating + verification)',
            ];
            return $f;
        })->values();
    }

    /**
     * (bid_cents) × (quality_score 0..1). Quality is derived from CMS
     * Five-Star rating with a small floor so unrated facilities don't
     * get auto-zeroed out. Unrated = treated as 2.5 stars (neutral).
     */
    private function blendScore(SponsoredCampaign $c): float
    {
        $stars = (int) ($c->facility->cms_five_star_overall ?? 0);
        // 0..5 stars → 0.4..1.0 multiplier. A 1-star facility's bid is
        // effectively halved against a 5-star at the same dollar amount.
        $quality = $stars > 0
            ? 0.4 + ($stars / 5.0) * 0.6
            : 0.5; // unrated = mid-pack
        return $c->cpc_bid_cents * $quality + (mt_rand() / mt_getrandmax()) * 0.001;
    }

    /**
     * Haversine miles between facility and the search origin. Returns
     * true when no origin is supplied (geo filter doesn't apply) or
     * when the facility is within the radius window.
     */
    private function withinRadius(Facility $f, ?array $origin): bool
    {
        if (! $origin || ! isset($origin['lat'], $origin['lon'])) return true;
        if ($f->latitude === null || $f->longitude === null) return true; // can't measure, allow

        $radius = (float) ($origin['radius_miles'] ?? 25);
        $miles = $this->haversine(
            (float) $origin['lat'], (float) $origin['lon'],
            (float) $f->latitude, (float) $f->longitude,
        );
        return $miles <= $radius;
    }

    private function haversine(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $R = 3958.8; // Earth radius miles
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);
        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon / 2) ** 2;
        return $R * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }

    /**
     * Frequency cap: this (campaign, session) pair must have fewer
     * than FREQUENCY_CAP_PER_DAY impressions in the last 24h. Cheap
     * COUNT against the (campaign_id, session_id) index.
     */
    private function underFrequencyCap(string $campaignId, string $sessionId): bool
    {
        $shown = SponsoredImpression::query()
            ->where('campaign_id', $campaignId)
            ->where('session_id', $sessionId)
            ->where('shown_at', '>=', now()->subDay())
            ->count();
        return $shown < self::FREQUENCY_CAP_PER_DAY;
    }

    /**
     * HMAC-signed (campaign, facility, expiry) tuple. The recipient
     * doesn't need to trust the frontend; they can verify with the
     * same app key. 10-minute expiry is long enough for a real user
     * to browse + click, short enough that a leaked token can't be
     * weaponized hours later. session_id is intentionally NOT in the
     * sig — we couple it via the must-have-impression check instead,
     * which is more robust against cookie-clearing users.
     */
    public static function signClickToken(string $campaignId, string $facilityId): string
    {
        $expires = now()->addMinutes(10)->timestamp;
        $payload = "{$campaignId}|{$facilityId}|{$expires}";
        $sig = hash_hmac('sha256', $payload, config('app.key'));
        return "{$expires}.{$sig}";
    }

    public static function verifyClickToken(string $campaignId, string $facilityId, string $token): bool
    {
        if (! str_contains($token, '.')) return false;
        [$expires, $sig] = explode('.', $token, 2);
        if ((int) $expires < time()) return false;
        $expected = hash_hmac('sha256', "{$campaignId}|{$facilityId}|{$expires}", config('app.key'));
        return hash_equals($expected, $sig);
    }

    /**
     * Record an impression for each sponsored facility shown. Called
     * by the frontend after render so paced budgets account for
     * actual served slots, not just selected ones.
     */
    public function recordImpression(string $campaignId, string $facilityId, ?string $sessionId, array $searchContext): void
    {
        SponsoredImpression::create([
            'campaign_id' => $campaignId,
            'facility_id' => $facilityId,
            'session_id' => $sessionId,
            'search_context' => $searchContext,
            'shown_at' => now(),
        ]);
    }

    /**
     * Click happened. Increment the campaign's spend counters
     * atomically, mark the most recent impression for this session
     * as clicked (best-effort).
     *
     * Returns false (without billing) if no matching impression for
     * this session exists within the last 30 min — i.e. the campaign
     * id was never actually shown to this client, so the click can't
     * be legitimate. Helps shut down off-page click-bot replays.
     */
    public function recordClick(string $campaignId, ?string $sessionId, Request $request): bool
    {
        $campaign = SponsoredCampaign::find($campaignId);
        if (! $campaign) return false;

        if (! $sessionId) return false;
        $hasImpression = SponsoredImpression::query()
            ->where('campaign_id', $campaign->id)
            ->where('session_id', $sessionId)
            ->where('shown_at', '>=', now()->subMinutes(30))
            ->exists();
        if (! $hasImpression) return false;

        DB::transaction(function () use ($campaign, $sessionId, $request): void {
            SponsoredClick::create([
                'campaign_id' => $campaign->id,
                'facility_id' => $campaign->facility_id,
                'session_id' => $sessionId,
                'billed_cents' => $campaign->cpc_bid_cents,
                'ip_address' => $request->ip(),
                'user_agent' => substr((string) $request->userAgent(), 0, 500) ?: null,
                'clicked_at' => now(),
            ]);

            $campaign->increment('spent_today_cents', $campaign->cpc_bid_cents);
            $campaign->increment('spent_total_cents', $campaign->cpc_bid_cents);

            $campaign->refresh();
            if ($campaign->spent_today_cents + $campaign->cpc_bid_cents > $campaign->daily_budget_cents) {
                $campaign->update(['status' => 'depleted']);
            }

            if ($sessionId) {
                SponsoredImpression::query()
                    ->where('campaign_id', $campaign->id)
                    ->where('session_id', $sessionId)
                    ->where('was_clicked', false)
                    ->latest('shown_at')
                    ->limit(1)
                    ->update(['was_clicked' => true]);
            }
        });

        return true;
    }

    private function facilityMatchesSearch(Facility $f, array $filters): bool
    {
        if (! empty($filters['state']) && strtoupper($f->state) !== strtoupper($filters['state'])) {
            return false;
        }
        if (! empty($filters['city']) && stripos($f->city, $filters['city']) !== 0) {
            return false;
        }
        if (! empty($filters['type']) && $f->type !== $filters['type']) {
            return false;
        }
        if (! empty($filters['medicaid_only']) && ! $f->medicaid_certified) {
            return false;
        }
        if (! empty($filters['min_five_star']) && (int) $f->cms_five_star_overall < (int) $filters['min_five_star']) {
            return false;
        }
        if (! empty($filters['max_price_cents']) && $f->price_from_cents && $f->price_from_cents > $filters['max_price_cents']) {
            return false;
        }
        return true;
    }

    private function campaignTargetingMatches(SponsoredCampaign $c, array $filters): bool
    {
        if (! empty($c->target_states) && ! empty($filters['state'])) {
            $allowed = array_map('strtoupper', $c->target_states);
            if (! in_array(strtoupper($filters['state']), $allowed, true)) {
                return false;
            }
        }
        if (! empty($c->target_cities) && ! empty($filters['city'])) {
            $allowed = array_map('strtolower', $c->target_cities);
            if (! in_array(strtolower($filters['city']), $allowed, true)) {
                return false;
            }
        }
        return true;
    }
}
