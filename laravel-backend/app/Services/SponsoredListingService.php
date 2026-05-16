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
 * Decides which sponsored facilities (if any) to insert into a search
 * result, and records the impression/click events that drive billing.
 *
 * Matching rules in v1:
 *   - Campaign must be servable (status=active, in date window, has
 *     budget for at least one more click today).
 *   - Facility must intrinsically match the search filters (state /
 *     city / type / Medicaid-only). The facility's own location is
 *     the targeting; campaigns can't poach OTHER cities' searches.
 *   - Optionally narrowed by campaign.target_states /
 *     campaign.target_cities (if facility owner only wants to spend
 *     on certain markets).
 *
 * Ranking: highest cpc_bid_cents first. Ties broken by random.
 *
 * Caps: at most 2 sponsored slots per search result page (matches
 * Google-style restraint — too many erodes trust).
 */
class SponsoredListingService
{
    private const MAX_SLOTS_PER_PAGE = 2;

    /**
     * Given the filters in use, return up to N sponsored facilities
     * to inject at the top of the result list. Each facility gets
     * an attached `sponsored_campaign_id` so the frontend can log
     * the click against the right campaign.
     *
     * @param  array $filters  Same shape as MarketplaceController validates.
     * @return Collection<int, Facility>
     */
    public function selectForSearch(array $filters): Collection
    {
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

        // Pre-load all candidates and post-filter in PHP — the
        // candidate set is small (active campaigns total) and the
        // matching logic is more readable in code than SQL.
        $campaigns = $query->orderByDesc('cpc_bid_cents')->get();

        $matching = $campaigns
            ->filter(fn ($c) => $c->facility && $c->facility->is_active)
            ->filter(fn ($c) => $this->facilityMatchesSearch($c->facility, $filters))
            ->filter(fn ($c) => $this->campaignTargetingMatches($c, $filters))
            ->take(self::MAX_SLOTS_PER_PAGE);

        // Attach campaign ID + price flag so the search payload can
        // surface `is_sponsored` + `sponsored_campaign_id` per row.
        return $matching->map(function ($c) {
            $f = $c->facility;
            $f->is_sponsored = true;
            $f->sponsored_campaign_id = $c->id;
            return $f;
        })->values();
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
     */
    public function recordClick(string $campaignId, ?string $sessionId, Request $request): void
    {
        $campaign = SponsoredCampaign::find($campaignId);
        if (! $campaign) return;

        DB::transaction(function () use ($campaign, $sessionId, $request) {
            // Bill at the CPC bid snapshot — even if the campaign's
            // current bid changes mid-day, the user's click still
            // gets billed at whatever the bid was when we recorded.
            SponsoredClick::create([
                'campaign_id' => $campaign->id,
                'facility_id' => $campaign->facility_id,
                'session_id' => $sessionId,
                'billed_cents' => $campaign->cpc_bid_cents,
                'ip_address' => $request->ip(),
                'user_agent' => substr((string) $request->userAgent(), 0, 500) ?: null,
                'clicked_at' => now(),
            ]);

            // Atomic increment to handle concurrent clicks correctly.
            $campaign->increment('spent_today_cents', $campaign->cpc_bid_cents);
            $campaign->increment('spent_total_cents', $campaign->cpc_bid_cents);

            // If this click busts the budget, flip status so the
            // matching query stops returning the campaign for the
            // rest of the day. The nightly reset job will flip it
            // back to active if budget renews.
            $campaign->refresh();
            if ($campaign->spent_today_cents + $campaign->cpc_bid_cents > $campaign->daily_budget_cents) {
                $campaign->update(['status' => 'depleted']);
            }

            // Mark the most-recent impression for this session as clicked
            // (analytics + CTR calc).
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
        // If campaign has explicit state targeting and the search has a
        // state filter, both must overlap.
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
