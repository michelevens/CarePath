<?php

namespace App\Http\Controllers;

use App\Models\Admission;
use App\Models\Bed;
use App\Models\Facility;
use App\Models\Lead;
use App\Models\Tour;
use App\Services\AiSearchService;
use App\Services\CostProjectionService;
use App\Services\FacilityTrustService;
use App\Services\FamilyMatchScoreService;
use App\Services\QualityScoreService;
use App\Services\SponsoredAttributionService;
use App\Services\SponsoredListingService;
use App\Services\ZipLookupService;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

/**
 * Public-facing marketplace — no auth required. Family members and
 * referral partners browse facilities, view details, and submit tour
 * requests that drop into the facility's admissions kanban at the
 * 'inquiry' stage.
 */
class MarketplaceController extends Controller
{
    /**
     * GET /api/marketplace/facilities
     *
     * Filters: state, city, type (level of care), max_price_cents,
     *          medicaid_only, min_five_star, q (free-text search on name)
     */
    public function index(Request $request, ZipLookupService $zipLookup, SponsoredListingService $sponsored): JsonResponse
    {
        $data = $request->validate([
            'state' => ['nullable', 'string', 'size:2'],
            'city' => ['nullable', 'string', 'max:120'],
            'zip' => ['nullable', 'string', 'max:10'],
            'radius_miles' => ['nullable', 'integer', 'min:1', 'max:200'],
            'type' => ['nullable', 'in:snf,assisted_living,memory_care,ccrc,independent_living,group_home,adult_family_home,icf_iid'],
            'max_price_cents' => ['nullable', 'integer', 'min:0'],
            'medicaid_only' => ['nullable', 'boolean'],
            'min_five_star' => ['nullable', 'integer', 'min:1', 'max:5'],
            'q' => ['nullable', 'string', 'max:120'],
            'sort' => ['nullable', 'in:recommended,rating,price_asc,price_desc,distance,match'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:100'],

            // Map-bounds filter: when the user drags the map, the
            // frontend can re-query with the visible viewport as the
            // geo filter. Format: "minLat,minLon,maxLat,maxLon".
            // Overrides zip/radius when present.
            'bbox' => ['nullable', 'string', 'regex:/^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/'],

            // Match preferences — when present, each facility gets a
            // family-specific score + reason list. `sort=match` then
            // re-ranks by that score. Any null/missing preference is
            // simply excluded from scoring (weights redistribute).
            'match' => ['nullable', 'array'],
            'match.care_type' => ['nullable', 'string'],
            'match.payer_required' => ['nullable', 'in:medicaid,medicare,va'],
            'match.max_budget_cents' => ['nullable', 'integer', 'min:0'],
            'match.distance_target_miles' => ['nullable', 'integer', 'min:1', 'max:200'],
            'match.special_needs' => ['nullable', 'array'],
            'match.special_needs.*' => ['string', 'max:50'],
        ]);

        // ZIP → centroid lookup
        $origin = null;
        if (! empty($data['zip'])) {
            $origin = $zipLookup->lookup($data['zip']);
        }

        $query = Facility::query()
            ->where('is_active', true)
            ->select([
                'id', 'name', 'slug', 'type', 'city', 'state', 'zip',
                'address_line_1', 'phone', 'email', 'website',
                'latitude', 'longitude',
                'medicaid_certified', 'medicare_certified',
                'cms_five_star_overall', 'cms_five_star_health_inspection',
                'cms_five_star_staffing', 'cms_five_star_quality',
                'cms_certification_number', 'subscription_tier',
                'total_beds', 'price_from_cents',
                'updated_at',
            ]);

        if (! empty($data['state'])) {
            $query->where('state', strtoupper($data['state']));
        }
        if (! empty($data['city'])) {
            $query->where('city', 'ILIKE', $data['city'] . '%');
        }
        if (! empty($data['type'])) {
            $query->where('type', $data['type']);
        }
        if (! empty($data['max_price_cents'])) {
            $query->where('price_from_cents', '<=', $data['max_price_cents']);
        }
        if (! empty($data['medicaid_only'])) {
            $query->where('medicaid_certified', true);
        }
        if (! empty($data['min_five_star'])) {
            $query->where('cms_five_star_overall', '>=', $data['min_five_star']);
        }
        if (! empty($data['q'])) {
            $query->where('name', 'ILIKE', '%' . $data['q'] . '%');
        }

        // Explicit map-bounds filter — the drag-to-refine path. When
        // present, overrides the ZIP-radius pre-filter entirely so
        // panning the map is the search.
        if (! empty($data['bbox'])) {
            [$minLat, $minLon, $maxLat, $maxLon] = array_map('floatval', explode(',', $data['bbox']));
            $query->whereNotNull('latitude')->whereNotNull('longitude')
                ->whereBetween('latitude', [$minLat, $maxLat])
                ->whereBetween('longitude', [$minLon, $maxLon]);
        }

        // When we have a ZIP origin, pre-filter on lat/lon bounding box
        // (cheap), then refine with exact haversine later. Default to the
        // origin's state to keep the bounding box tight.
        $radiusMiles = $data['radius_miles'] ?? 25;
        if ($origin && empty($data['bbox'])) {
            $latDelta = $radiusMiles / 69.0; // 1° lat ≈ 69 mi
            $lonDelta = $radiusMiles / (69.0 * max(0.01, cos(deg2rad($origin['lat']))));

            $query->whereNotNull('latitude')->whereNotNull('longitude')
                ->whereBetween('latitude', [$origin['lat'] - $latDelta, $origin['lat'] + $latDelta])
                ->whereBetween('longitude', [$origin['lon'] - $lonDelta, $origin['lon'] + $lonDelta]);
        }

        match ($data['sort'] ?? 'recommended') {
            'rating' => $query->orderByDesc('cms_five_star_overall')->orderBy('name'),
            'price_asc' => $query->orderBy('price_from_cents')->orderBy('name'),
            'price_desc' => $query->orderByDesc('price_from_cents')->orderBy('name'),
            'distance' => $query->orderBy('name'), // sort happens after haversine below
            default => $origin
                ? $query->orderBy('name') // re-sorted by distance below
                : $query->orderByDesc('cms_five_star_overall')->orderBy('name'),
        };

        $facilities = $query->limit($data['limit'] ?? 100)->get();

        // Exact radius check via haversine; also attach distance to payload.
        // (Bounding box above is approximate — corners of the box can fall
        // outside the actual circle, so this step trims those.)
        if ($origin) {
            $facilities = $facilities
                ->map(function ($f) use ($origin) {
                    $f->distance_miles = $this->haversineMiles(
                        $origin['lat'],
                        $origin['lon'],
                        (float) $f->latitude,
                        (float) $f->longitude
                    );
                    return $f;
                })
                ->filter(fn ($f) => $f->distance_miles <= $radiusMiles)
                ->sortBy('distance_miles')
                ->values();
        }

        // Inject sponsored listings at the top of the result set. Each
        // sponsored Facility model is decorated with `is_sponsored` +
        // `sponsored_campaign_id` so the payload mapper picks them up.
        // The service now enforces surface opt-in, sparse-results
        // suppression, frequency caps, geographic radius, and a
        // quality-blend ranking; we hand it the origin + organic count
        // + session id so all of those work.
        $originForAds = $origin
            ? ['lat' => $origin['lat'], 'lon' => $origin['lon'], 'radius_miles' => $radiusMiles]
            : null;
        $sponsoredFacilities = $sponsored->selectForSearch(
            filters: $data,
            surface: 'search',
            organicCount: $facilities->count(),
            origin: $originForAds,
            sessionId: $request->header('X-Carepath-Session-Id') ?: $request->query('session_id'),
        );
        if ($sponsoredFacilities->isNotEmpty()) {
            $sponsoredIds = $sponsoredFacilities->pluck('id')->all();
            $facilities = $facilities->reject(fn ($f) => in_array($f->id, $sponsoredIds, true));
            // If origin is set, copy distance onto the sponsored result so
            // the UI still shows mileage.
            if ($origin) {
                $sponsoredFacilities = $sponsoredFacilities->map(function ($f) use ($origin) {
                    if ($f->latitude && $f->longitude) {
                        $f->distance_miles = $this->haversineMiles(
                            $origin['lat'], $origin['lon'],
                            (float) $f->latitude, (float) $f->longitude,
                        );
                    }
                    return $f;
                });
            }
            $facilities = $sponsoredFacilities->concat($facilities)->values();
        }

        // Attach live bed availability.
        $facilityIds = $facilities->pluck('id');
        $availability = Bed::query()
            ->whereIn('facility_id', $facilityIds)
            ->where('status', 'available')
            ->selectRaw('facility_id, count(*) as available_count')
            ->groupBy('facility_id')
            ->pluck('available_count', 'facility_id');

        // Last-updated timestamp per facility on the beds table — used
        // by FacilityTrustService to emit the "Live availability" badge
        // only when the bed feed is actually fresh (≤ 14 days).
        $bedUpdated = Bed::query()
            ->whereIn('facility_id', $facilityIds)
            ->selectRaw('facility_id, max(updated_at) as last_updated')
            ->groupBy('facility_id')
            ->pluck('last_updated', 'facility_id');

        // Photo counts in one batched query (avoids N+1 on cards).
        $photoCounts = DB::table('facility_photos')
            ->whereIn('facility_id', $facilityIds)
            ->selectRaw('facility_id, count(*) as photo_count')
            ->groupBy('facility_id')
            ->pluck('photo_count', 'facility_id');

        // Claimed-status lookup (any approved claim per facility).
        $claimed = DB::table('facility_claims')
            ->whereIn('facility_id', $facilityIds)
            ->where('status', 'approved')
            ->pluck('facility_id')
            ->flip(); // O(1) lookup as array<id, position>

        // Optional: family match preferences. Compute once per row and
        // surface both score + reasons so the UI can render an
        // explainable badge instead of an opaque number.
        $matchPrefs = $data['match'] ?? null;

        $rows = $facilities->map(function ($f) use ($availability, $bedUpdated, $photoCounts, $claimed, $matchPrefs) {
            $arr = $f->toArray();
            $arr['available_beds'] = (int) ($availability[$f->id] ?? 0);
            if (isset($f->distance_miles)) {
                $arr['distance_miles'] = round($f->distance_miles, 1);
            }
            // CarePath Quality Score — one number above-the-fold.
            // Defensive against partial data; service returns null when
            // nothing is computable.
            $arr['quality_score'] = QualityScoreService::score($arr);

            // Family-specific match score (0-100 + explained reasons).
            // Only present when caller passed `match[...]` preferences.
            if ($matchPrefs) {
                $arr['match'] = FamilyMatchScoreService::score($arr, $matchPrefs);
            }

            // Trust badges — completeness / freshness / verified.
            // Counts are pre-aggregated above so this stays O(1) per row.
            $arr['trust_badges'] = FacilityTrustService::badges($f, [
                'photo_count' => (int) ($photoCounts[$f->id] ?? 0),
                'is_claimed' => isset($claimed[$f->id]),
                'bed_updated_at' => $bedUpdated[$f->id] ?? null,
            ]);
            $arr['completeness_pct'] = FacilityTrustService::completenessPct($f);

            // Surface sponsored status to the frontend so it can render
            // the FTC-required "Sponsored" badge. click_token is the
            // HMAC the frontend must pass back on /sponsored/clicks for
            // the click to bill — see SponsoredListingService::signClickToken.
            $arr['is_sponsored'] = $f->is_sponsored ?? false;
            $arr['sponsored_campaign_id'] = $f->sponsored_campaign_id ?? null;
            $arr['click_token'] = $f->click_token ?? null;
            $arr['sponsored_reason'] = $f->sponsored_reason ?? null;
            return $arr;
        });

        // `sort=match` re-ranks after the row map (we need the computed
        // score). Sponsored stays pinned on top regardless.
        if (($data['sort'] ?? null) === 'match' && $matchPrefs) {
            $rows = $rows
                ->sortBy(function ($r) {
                    // Sponsored first, then by descending match score.
                    return [$r['is_sponsored'] ? 0 : 1, -($r['match']['score'] ?? 0)];
                })
                ->values();
        }

        return response()->json([
            'data' => $rows,
            'origin' => $origin,
            'radius_miles' => $origin ? $radiusMiles : null,
        ]);
    }

    /**
     * POST /api/marketplace/ai-search
     *
     * Translate plain-English ("memory care in west Phoenix under $7k
     * that takes Medicaid waiver") into the same filter shape the
     * /facilities endpoint already understands. The frontend then
     * navigates to /search with those filters set.
     *
     * Rate-limited at the route level (10 / minute / IP).
     */
    public function aiSearch(Request $request, AiSearchService $ai): JsonResponse
    {
        $data = $request->validate([
            'q' => ['required', 'string', 'min:3', 'max:1000'],
            'context' => ['nullable', 'array'],
            'context.origin_zip' => ['nullable', 'string', 'max:10'],
            'context.origin_state' => ['nullable', 'string', 'size:2'],
        ]);

        $result = $ai->parse($data['q'], $data['context'] ?? null);

        return response()->json([
            'data' => [
                'filters' => $result['filters'],
                'explain' => $result['explain'],
                'stubbed' => $result['stubbed'],
            ],
        ]);
    }

    /**
     * POST /api/marketplace/sponsored/impressions
     *
     * Front-end fires this after the search result renders so paced
     * budgets account for actually-served slots, not just selected.
     * Unauthenticated, rate-limited (one batch per request).
     */
    public function recordSponsoredImpressions(Request $request, SponsoredListingService $sponsored): JsonResponse
    {
        $data = $request->validate([
            'impressions' => ['required', 'array', 'max:5'],
            'impressions.*.campaign_id' => ['required', 'string'],
            'impressions.*.facility_id' => ['required', 'string'],
            'session_id' => ['nullable', 'string', 'max:60'],
            'search_context' => ['nullable', 'array'],
        ]);

        foreach ($data['impressions'] as $imp) {
            $sponsored->recordImpression(
                $imp['campaign_id'],
                $imp['facility_id'],
                $data['session_id'] ?? null,
                $data['search_context'] ?? [],
            );
        }

        return response()->json(['ok' => true]);
    }

    /**
     * POST /api/marketplace/sponsored/clicks
     *
     * Records a click + bills the campaign. Rate-limited per IP to
     * deter click fraud (more sophisticated detection lives in the
     * scheduled fraud-check job).
     */
    public function recordSponsoredClick(Request $request, SponsoredListingService $sponsored): JsonResponse
    {
        $throttleKey = 'sponsored-click:' . $request->ip();
        if (RateLimiter::tooManyAttempts($throttleKey, 60)) {
            return response()->json(['ok' => false, 'reason' => 'rate_limited'], 429);
        }
        RateLimiter::hit($throttleKey, 60);

        $data = $request->validate([
            'campaign_id' => ['required', 'string'],
            'facility_id' => ['required', 'string'],
            'click_token' => ['required', 'string'],
            'session_id'  => ['required', 'string', 'max:60'],
        ]);

        // 1. Signature: prove the (campaign, facility) pair was minted
        //    by us within the last 10 min. Defeats off-page replay of
        //    a scraped campaign id.
        if (! SponsoredListingService::verifyClickToken(
            $data['campaign_id'],
            $data['facility_id'],
            $data['click_token']
        )) {
            return response()->json(['ok' => false, 'reason' => 'invalid_token'], 400);
        }

        // 2. Impression-precedence: recordClick() refuses to bill if no
        //    impression was logged for this session+campaign within 30
        //    minutes. Together with (1) a click must follow a real
        //    search render in the same browser.
        $billed = $sponsored->recordClick($data['campaign_id'], $data['session_id'], $request);

        return response()->json(['ok' => true, 'billed' => $billed]);
    }

    /**
     * POST /api/marketplace/sponsored/report
     *
     * Public "report this ad" endpoint. Anyone who saw the ad — logged
     * in or not — can flag it. The report lands in the SuperAdmin
     * Sponsored review queue. Per-IP rate-limited so a single bad
     * actor can't drown the queue.
     */
    public function reportSponsored(Request $request): JsonResponse
    {
        $throttleKey = 'sponsored-report:' . $request->ip();
        if (RateLimiter::tooManyAttempts($throttleKey, 10)) {
            return response()->json(['ok' => false, 'reason' => 'rate_limited'], 429);
        }
        RateLimiter::hit($throttleKey, 3600); // 10/hour per IP

        $data = $request->validate([
            'campaign_id' => ['required', 'string'],
            'facility_id' => ['required', 'string'],
            'reason' => ['required', 'in:misleading,wrong_location,low_quality,off_policy,other'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'session_id' => ['nullable', 'string', 'max:60'],
        ]);

        \App\Models\SponsoredAdReport::create([
            'campaign_id' => $data['campaign_id'],
            'facility_id' => $data['facility_id'],
            'user_id' => $request->user()?->id,
            'session_id' => $data['session_id'] ?? null,
            'ip_address' => $request->ip(),
            'reason' => $data['reason'],
            'notes' => $data['notes'] ?? null,
            'status' => 'open',
        ]);

        return response()->json(['ok' => true]);
    }

    /**
     * GET /api/marketplace/suggest?q=<query>
     *
     * Lightweight autocomplete: returns up to 5 facility-name matches,
     * 5 city/state matches, and a single ZIP echo if `q` looks like one
     * and resolves. Cached per-query for 60s to absorb keystroke storms.
     */
    public function suggest(Request $request, ZipLookupService $zipLookup): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));
        if (mb_strlen($q) < 2) {
            return response()->json(['facilities' => [], 'cities' => [], 'zip' => null]);
        }

        // Bound the cache key length and normalize whitespace. v2: cache
        // plain arrays — v1 stored Collection objects which deserialized as
        // __PHP_Incomplete_Class placeholders and broke the JSON shape.
        $cacheKey = 'suggest:v2:' . md5(mb_strtolower($q));

        $payload = Cache::remember($cacheKey, 60, function () use ($q, $zipLookup) {
            $facilities = Facility::query()
                ->where('is_active', true)
                ->where('name', 'ILIKE', '%' . $q . '%')
                ->orderByDesc('cms_five_star_overall')
                ->orderBy('name')
                ->limit(5)
                ->get(['name', 'slug', 'city', 'state', 'type'])
                ->map(fn ($f) => [
                    'name' => $f->name,
                    'slug' => $f->slug,
                    'city' => $f->city,
                    'state' => $f->state,
                    'type' => $f->type,
                ])
                ->values()
                ->all();

            // Prefix match on city for index-friendliness; aggregate so each
            // (city,state) appears once with a facility count.
            $cities = Facility::query()
                ->where('is_active', true)
                ->where('city', 'ILIKE', $q . '%')
                ->select('city', 'state', DB::raw('count(*) as facility_count'))
                ->groupBy('city', 'state')
                ->orderByDesc(DB::raw('count(*)'))
                ->limit(5)
                ->get()
                ->map(fn ($r) => [
                    'city' => $r->city,
                    'state' => $r->state,
                    'facility_count' => (int) $r->facility_count,
                ])
                ->values()
                ->all();

            $zip = null;
            if (preg_match('/^\d{5}$/', $q)) {
                $hit = $zipLookup->lookup($q);
                if ($hit) {
                    $zip = [
                        'zip' => $hit['zip'],
                        'city' => $hit['city'],
                        'state' => $hit['state'],
                    ];
                }
            }

            return [
                'facilities' => $facilities,
                'cities' => $cities,
                'zip' => $zip,
            ];
        });

        return response()->json($payload);
    }

    /**
     * GET /api/marketplace/top-cities
     *
     * Returns the cities with the deepest facility inventory, plus a 0-10
     * "CarePath Quality Score" derived from the average CMS Five-Star rating
     * of facilities in that city. Used for the homepage city browse grid.
     * Cached for 6h — this data only moves when CMS publishes new ratings.
     */
    public function topCities(Request $request): JsonResponse
    {
        $limit = (int) min(60, max(8, (int) $request->query('limit', 32)));
        $minFacilities = (int) max(1, (int) $request->query('min_facilities', 3));

        // v2: cache plain arrays — v1 stored a Collection and PHP cache
        // serialization round-tripped it as __PHP_Incomplete_Class, which
        // JSON-encoded as `{__PHP_Incomplete_Class_Name: ...}` and broke the
        // frontend (it expected an array).
        $payload = Cache::remember(
            "top-cities:v2:l{$limit}:m{$minFacilities}",
            60 * 60 * 6,
            function () use ($limit, $minFacilities) {
                $rows = Facility::query()
                    ->where('is_active', true)
                    ->whereNotNull('city')
                    ->whereNotNull('state')
                    ->select('city', 'state',
                        DB::raw('count(*) as facility_count'),
                        DB::raw('avg(cms_five_star_overall) as avg_rating'))
                    ->groupBy('city', 'state')
                    ->havingRaw('count(*) >= ?', [$minFacilities])
                    ->orderByDesc(DB::raw('count(*)'))
                    ->limit($limit)
                    ->get();

                return $rows->map(function ($r) {
                    // Convert CMS 1-5 → 0-10, round to 1 decimal. Null when
                    // we don't have any CMS data for the city's facilities.
                    $score = $r->avg_rating === null
                        ? null
                        : round(((float) $r->avg_rating) * 2, 1);
                    return [
                        'city' => $r->city,
                        'state' => $r->state,
                        'facility_count' => (int) $r->facility_count,
                        'score' => $score,
                    ];
                })->values()->all();
            }
        );

        return response()->json(['data' => $payload]);
    }

    /**
     * GET /api/marketplace/stats
     *
     * The numbers that go in the TrustStrip / hero stat row. Cached 1h —
     * they don't change minute-to-minute and we render them on every page.
     */
    public function stats(): JsonResponse
    {
        $payload = Cache::remember('marketplace-stats:v1', 60 * 60, function () {
            $totalFacilities = Facility::where('is_active', true)->count();
            $facilitiesWithPrice = Facility::where('is_active', true)
                ->whereNotNull('price_from_cents')
                ->where('price_from_cents', '>', 0)
                ->count();
            $statesCovered = Facility::where('is_active', true)
                ->whereNotNull('state')
                ->distinct('state')
                ->count('state');
            $citiesCovered = Facility::where('is_active', true)
                ->whereNotNull('city')
                ->whereNotNull('state')
                ->select('city', 'state')
                ->distinct()
                ->count();

            $pricingPct = $totalFacilities > 0
                ? (int) round(($facilitiesWithPrice / $totalFacilities) * 100)
                : 0;

            return [
                'total_facilities' => $totalFacilities,
                'facilities_with_pricing' => $facilitiesWithPrice,
                'pricing_transparency_pct' => $pricingPct,
                'states_covered' => $statesCovered,
                'cities_covered' => $citiesCovered,
            ];
        });

        return response()->json(['data' => $payload]);
    }

    /**
     * GET /api/marketplace/states/{state}
     *
     * Per-state landing page data: totals, top cities, top facilities.
     * Cached 6h. SEO entry point — every state gets its own page even
     * with thin inventory.
     */
    public function state(string $state): JsonResponse
    {
        $state = strtoupper(substr(preg_replace('/[^a-zA-Z]/', '', $state) ?? '', 0, 2));
        if (strlen($state) !== 2) {
            abort(404, 'Invalid state code.');
        }

        $payload = Cache::remember("state:v1:{$state}", 60 * 60 * 6, function () use ($state) {
            $base = Facility::query()
                ->where('is_active', true)
                ->where('state', $state);

            $totalFacilities = (clone $base)->count();
            if ($totalFacilities === 0) {
                return null;
            }

            $byType = (clone $base)
                ->select('type', DB::raw('count(*) as n'))
                ->groupBy('type')
                ->pluck('n', 'type')
                ->all();

            $avgRating = (clone $base)
                ->whereNotNull('cms_five_star_overall')
                ->avg('cms_five_star_overall');
            $avgScore = $avgRating === null ? null : round(((float) $avgRating) * 2, 1);

            $medicaidCount = (clone $base)->where('medicaid_certified', true)->count();

            $topCities = (clone $base)
                ->whereNotNull('city')
                ->select('city',
                    DB::raw('count(*) as facility_count'),
                    DB::raw('avg(cms_five_star_overall) as avg_rating'))
                ->groupBy('city')
                ->orderByDesc(DB::raw('count(*)'))
                ->limit(12)
                ->get()
                ->map(fn ($r) => [
                    'city' => $r->city,
                    'facility_count' => (int) $r->facility_count,
                    'score' => $r->avg_rating === null ? null : round(((float) $r->avg_rating) * 2, 1),
                ])
                ->values()
                ->all();

            $topFacilities = (clone $base)
                ->whereNotNull('cms_five_star_overall')
                ->orderByDesc('cms_five_star_overall')
                ->orderBy('name')
                ->limit(8)
                ->get(['id', 'name', 'slug', 'type', 'city', 'state',
                    'cms_five_star_overall', 'cms_five_star_health_inspection',
                    'cms_five_star_staffing', 'cms_five_star_quality',
                    'price_from_cents', 'total_beds',
                    'medicaid_certified', 'medicare_certified'])
                ->map(function ($f) {
                    $arr = $f->toArray();
                    // Top-cities/state listings don't pay the bed-count
                    // join cost; quality score uses bed-data signal only.
                    $arr['available_beds'] = 0;
                    return [
                        'name' => $f->name,
                        'slug' => $f->slug,
                        'type' => $f->type,
                        'city' => $f->city,
                        'state' => $f->state,
                        'cms_five_star_overall' => $f->cms_five_star_overall,
                        'price_from_cents' => $f->price_from_cents,
                        'medicaid_certified' => (bool) $f->medicaid_certified,
                        'medicare_certified' => (bool) $f->medicare_certified,
                        'quality_score' => QualityScoreService::score($arr),
                    ];
                })
                ->values()
                ->all();

            return [
                'state' => $state,
                'total_facilities' => $totalFacilities,
                'medicaid_count' => $medicaidCount,
                'avg_score' => $avgScore,
                'by_type' => $this->buildByType($byType),
                'top_cities' => $topCities,
                'top_facilities' => $topFacilities,
            ];
        });

        if ($payload === null) {
            return response()->json([
                'data' => [
                    'state' => $state,
                    'total_facilities' => 0,
                    'medicaid_count' => 0,
                    'avg_score' => null,
                    'by_type' => $this->buildByType([]),
                    'top_cities' => [],
                    'top_facilities' => [],
                ],
            ]);
        }

        return response()->json(['data' => $payload]);
    }

    /**
     * GET /api/marketplace/cities/{state}/{city}
     *
     * Aggregates for the city landing page: facility count, by-type
     * breakdown, price quartiles, CMS averages, average CarePath
     * Quality Score, payer access, nearby cities, county, top
     * facilities. Cached 6h.
     */
    public function city(string $state, string $city): JsonResponse
    {
        $state = strtoupper(substr(preg_replace('/[^a-zA-Z]/', '', $state) ?? '', 0, 2));
        $city = trim(urldecode($city));
        if (strlen($state) !== 2 || $city === '') {
            abort(404, 'Invalid city or state.');
        }

        $cacheKey = "city:v1:{$state}:" . md5(mb_strtolower($city));
        $payload = Cache::remember($cacheKey, 60 * 60 * 6, function () use ($state, $city) {
            $base = Facility::query()
                ->where('is_active', true)
                ->where('state', $state)
                ->where('city', 'ILIKE', $city); // exact-match on city; ILIKE for casing

            $facilities = (clone $base)->get([
                'id', 'name', 'slug', 'type', 'address_line_1', 'city', 'state', 'zip',
                'county', 'latitude', 'longitude',
                'medicaid_certified', 'medicare_certified',
                'cms_five_star_overall', 'cms_five_star_health_inspection',
                'cms_five_star_staffing', 'cms_five_star_quality',
                'total_beds', 'price_from_cents',
            ]);

            if ($facilities->isEmpty()) {
                return null;
            }

            $totalFacilities = $facilities->count();
            $byType = $facilities->groupBy('type')->map->count()->all();

            $withPrice = $facilities->filter(fn ($f) => $f->price_from_cents > 0)->values();
            $prices = $withPrice->pluck('price_from_cents')->sort()->values();
            $medianPrice = $prices->isNotEmpty()
                ? (int) $prices[(int) floor($prices->count() / 2)]
                : null;
            $minPrice = $prices->isNotEmpty() ? (int) $prices->first() : null;
            $maxPrice = $prices->isNotEmpty() ? (int) $prices->last() : null;
            $avgPrice = $prices->isNotEmpty() ? (int) $prices->avg() : null;

            $medicaidCount = $facilities->where('medicaid_certified', true)->count();
            $medicareCount = $facilities->where('medicare_certified', true)->count();

            $avgCms = [
                'overall' => self::avg($facilities, 'cms_five_star_overall'),
                'inspection' => self::avg($facilities, 'cms_five_star_health_inspection'),
                'staffing' => self::avg($facilities, 'cms_five_star_staffing'),
                'quality' => self::avg($facilities, 'cms_five_star_quality'),
            ];

            // Average CarePath Quality Score across facilities in this city
            // (re-uses the same service we use everywhere else).
            $cmpAvailability = Bed::query()
                ->whereIn('facility_id', $facilities->pluck('id'))
                ->where('status', 'available')
                ->selectRaw('facility_id, count(*) as available_count')
                ->groupBy('facility_id')
                ->pluck('available_count', 'facility_id');

            $scoredFacilities = $facilities->map(function ($f) use ($cmpAvailability) {
                $arr = $f->toArray();
                $arr['available_beds'] = (int) ($cmpAvailability[$f->id] ?? 0);
                $arr['quality_score'] = QualityScoreService::score($arr);
                return $arr;
            })->values();

            $qualityScores = $scoredFacilities
                ->pluck('quality_score.score')
                ->filter(fn ($v) => $v !== null);
            $avgQualityScore = $qualityScores->isNotEmpty()
                ? round((float) $qualityScores->avg(), 1)
                : null;

            // City centroid for nearby-city distance — average of facility
            // coordinates (skip nulls).
            $coords = $facilities->filter(fn ($f) => $f->latitude && $f->longitude);
            $centroid = null;
            if ($coords->isNotEmpty()) {
                $centroid = [
                    'lat' => (float) $coords->avg('latitude'),
                    'lon' => (float) $coords->avg('longitude'),
                ];
            }

            // Pick the modal county (the most-represented county across
            // facilities in this city). Counties are nullable per facility.
            $county = $facilities
                ->pluck('county')
                ->filter()
                ->countBy()
                ->sortDesc()
                ->keys()
                ->first();

            // Top facilities by Quality Score, then CMS overall — for the
            // mini-list embedded on the city page.
            $topFacilities = $scoredFacilities
                ->sortByDesc(fn ($f) => $f['quality_score']['score'] ?? -1)
                ->take(6)
                ->map(fn ($f) => [
                    'name' => $f['name'],
                    'slug' => $f['slug'],
                    'type' => $f['type'],
                    'city' => $f['city'],
                    'state' => $f['state'],
                    'cms_five_star_overall' => $f['cms_five_star_overall'],
                    'price_from_cents' => $f['price_from_cents'],
                    'medicaid_certified' => (bool) $f['medicaid_certified'],
                    'medicare_certified' => (bool) $f['medicare_certified'],
                    'available_beds' => $f['available_beds'],
                    'quality_score' => $f['quality_score'],
                ])
                ->values()
                ->all();

            // Nearby cities in same state — distance from centroid to other
            // cities' centroids. Compute per-city centroids in one pass.
            $nearby = [];
            if ($centroid) {
                $stateCities = Facility::query()
                    ->where('is_active', true)
                    ->where('state', $state)
                    ->whereRaw('LOWER(city) != ?', [mb_strtolower($city)])
                    ->whereNotNull('latitude')
                    ->whereNotNull('longitude')
                    ->select('city',
                        DB::raw('count(*) as facility_count'),
                        DB::raw('avg(latitude) as lat'),
                        DB::raw('avg(longitude) as lon'))
                    ->groupBy('city')
                    ->havingRaw('count(*) >= 2')
                    ->get();

                $nearby = $stateCities
                    ->map(function ($c) use ($centroid, $state) {
                        $d = self::haversineMilesStatic(
                            $centroid['lat'], $centroid['lon'],
                            (float) $c->lat, (float) $c->lon
                        );
                        return [
                            'city' => $c->city,
                            'state' => $state,
                            'facility_count' => (int) $c->facility_count,
                            'distance_miles' => round($d, 1),
                        ];
                    })
                    ->filter(fn ($r) => $r['distance_miles'] <= 50)
                    ->sortBy('distance_miles')
                    ->take(10)
                    ->values()
                    ->all();
            }

            return [
                'city' => $facilities->first()->city, // canonical casing
                'state' => $state,
                'county' => $county,
                'total_facilities' => $totalFacilities,
                'by_type' => $this->buildByType($byType),
                'pricing' => [
                    'facilities_with_pricing' => $withPrice->count(),
                    'avg_price_cents' => $avgPrice,
                    'median_price_cents' => $medianPrice,
                    'min_price_cents' => $minPrice,
                    'max_price_cents' => $maxPrice,
                ],
                'payers' => [
                    'medicaid_count' => $medicaidCount,
                    'medicare_count' => $medicareCount,
                ],
                'avg_cms' => $avgCms,
                'avg_quality_score' => $avgQualityScore,
                'centroid' => $centroid,
                'top_facilities' => $topFacilities,
                'nearby_cities' => $nearby,
            ];
        });

        if ($payload === null) {
            return response()->json([
                'data' => null,
                'message' => "We don't have facility data for {$city}, {$state} yet.",
            ], 404);
        }

        return response()->json(['data' => $payload]);
    }

    private static function avg($collection, string $field): ?float
    {
        $vals = $collection->pluck($field)->filter();
        return $vals->isEmpty() ? null : round((float) $vals->avg(), 1);
    }

    /**
     * Static-callable variant — closures inside Cache::remember can't
     * call $this->haversineMiles().
     */
    private static function haversineMilesStatic(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $R = 3958.8;
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);
        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon / 2) ** 2;
        return $R * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }

    /**
     * POST /api/marketplace/track-events
     *
     * Append-only listing-event log used by the per-facility analytics
     * page. Public + lightly rate-limited; the analytics endpoint
     * authorizes reads. Accepts a batch so the frontend can flush a
     * page-worth of impressions in one round trip.
     */
    public function trackListingEvents(Request $request): JsonResponse
    {
        $data = $request->validate([
            'events' => ['required', 'array', 'max:50'],
            'events.*.facility_id' => ['required', 'uuid', 'exists:facilities,id'],
            'events.*.kind' => ['required', 'in:impression,detail_view,phone_click,tour_request'],
            'events.*.source' => ['nullable', 'string', 'max:60'],
            'events.*.context' => ['nullable', 'array'],
        ]);

        $sessionId = $request->header('X-Carepath-Session-Id') ?: $request->query('session_id');
        $userId = optional($request->user())->id;
        $now = now();

        $rows = array_map(fn ($e) => [
            'facility_id' => $e['facility_id'],
            'kind' => $e['kind'],
            'session_id' => $sessionId,
            'user_id' => $userId,
            'source' => $e['source'] ?? null,
            'context' => isset($e['context']) ? json_encode($e['context']) : null,
            'occurred_at' => $now,
        ], $data['events']);

        DB::table('facility_listing_events')->insert($rows);

        return response()->json(['ok' => true, 'count' => count($rows)]);
    }

    /**
     * GET /api/marketplace/reverse-zip?lat=&lon=
     *
     * "Use my location" support — converts the browser geolocation
     * coords to the nearest ZIP centroid in our local table. Public,
     * lightly rate-limited at the route layer.
     */
    public function reverseZip(Request $request, ZipLookupService $svc): JsonResponse
    {
        $data = $request->validate([
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lon' => ['required', 'numeric', 'between:-180,180'],
        ]);

        $hit = $svc->nearest((float) $data['lat'], (float) $data['lon']);
        if (! $hit) {
            return response()->json([
                'data' => null,
                'message' => 'No ZIP centroid found within the search radius.',
            ], 404);
        }

        return response()->json(['data' => $hit]);
    }

    /**
     * GET /api/marketplace/compare/pdf?ids[]=uuid&ids[]=uuid
     *
     * Generates a one-page family-decision PDF comparing 2-4 facilities
     * side-by-side. Each facility gets a card with name, location,
     * trust signals, CMS rating, base pricing, and a 5-year blended
     * cost projection (assisted-living level, modest income, no LTC,
     * no VA — default scenario so a single click produces a useful
     * artifact). Families share these with siblings in email; it's a
     * branded passive distribution channel.
     */
    public function comparePdf(Request $request, CostProjectionService $costService): Response
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:2', 'max:4'],
            'ids.*' => ['string'],
            // Optional projection overrides — most callers will use defaults.
            'level_of_care' => ['nullable', 'in:independent,assisted,memory,skilled,hospice'],
            'months' => ['nullable', 'integer', 'min:1', 'max:60'],
            'starting_assets_cents' => ['nullable', 'integer', 'min:0'],
            'monthly_income_cents' => ['nullable', 'integer', 'min:0'],
            'va_aa_status' => ['nullable', 'in:none,single_veteran,veteran_and_spouse,surviving_spouse'],
        ]);

        $facilities = Facility::query()
            ->where('is_active', true)
            ->whereIn('id', $data['ids'])
            ->with([
                'pricingTiers' => fn ($q) => $q->where('is_active', true)->orderBy('sort_order'),
                'amenities' => fn ($q) => $q->where('is_active', true)->orderBy('sort_order')->limit(8),
            ])
            ->get();

        if ($facilities->count() < 2) {
            throw ValidationException::withMessages([
                'ids' => ['Need at least 2 valid, active facilities to compare.'],
            ]);
        }

        $projectionInputs = [
            'level_of_care' => $data['level_of_care'] ?? 'assisted',
            'months' => $data['months'] ?? 60,
            'starting_assets_cents' => $data['starting_assets_cents'] ?? 5_000_000, // $50k default
            'monthly_income_cents' => $data['monthly_income_cents'] ?? 250_000,     // $2,500 default
            'medicare_part_a_eligible' => true,
            'va_aa_status' => $data['va_aa_status'] ?? 'none',
            'medicaid_eligible_state' => true,
        ];

        // Compute projection + trust badges per facility once so the
        // blade template stays presentational.
        $facilityIds = $facilities->pluck('id');
        $availability = Bed::query()
            ->whereIn('facility_id', $facilityIds)
            ->where('status', 'available')
            ->selectRaw('facility_id, count(*) as count')
            ->groupBy('facility_id')
            ->pluck('count', 'facility_id');
        $bedUpdated = Bed::query()
            ->whereIn('facility_id', $facilityIds)
            ->selectRaw('facility_id, max(updated_at) as last_updated')
            ->groupBy('facility_id')
            ->pluck('last_updated', 'facility_id');
        $photoCounts = DB::table('facility_photos')
            ->whereIn('facility_id', $facilityIds)
            ->selectRaw('facility_id, count(*) as photo_count')
            ->groupBy('facility_id')
            ->pluck('photo_count', 'facility_id');
        $claimed = DB::table('facility_claims')
            ->whereIn('facility_id', $facilityIds)
            ->where('status', 'approved')
            ->pluck('facility_id')
            ->flip();

        $cards = $facilities->map(function ($f) use ($projectionInputs, $costService, $availability, $bedUpdated, $photoCounts, $claimed) {
            $arr = $f->toArray();
            $arr['available_beds'] = (int) ($availability[$f->id] ?? 0);
            try {
                $projection = $costService->project(array_merge($projectionInputs, [
                    'facility_slug' => $f->slug,
                ]));
            } catch (\Throwable $e) {
                $projection = null;
            }
            return [
                'facility' => $f,
                'arr' => $arr,
                'quality_score' => QualityScoreService::score($arr),
                'trust_badges' => FacilityTrustService::badges($f, [
                    'photo_count' => (int) ($photoCounts[$f->id] ?? 0),
                    'is_claimed' => isset($claimed[$f->id]),
                    'bed_updated_at' => $bedUpdated[$f->id] ?? null,
                ]),
                'projection' => $projection,
            ];
        });

        $pdf = Pdf::loadView('brochures.comparison', [
            'cards' => $cards,
            'projection_inputs' => $projectionInputs,
            'today' => now()->format('F j, Y'),
        ])->setPaper('letter', 'landscape');

        return $pdf->download('carepath-comparison-' . now()->format('Y-m-d') . '.pdf');
    }

    /**
     * GET /api/marketplace/facilities/{slug}/brochure
     *
     * One-page branded PDF summarizing the facility — for printing,
     * sharing in family meetings, or taking to tours. Public, ungated:
     * the brochure IS the value; we're not pretending it costs an email.
     */
    public function brochure(string $slug): Response
    {
        $facility = Facility::query()
            ->where('slug', $slug)
            ->where('is_active', true)
            ->with([
                'pricingTiers' => fn ($q) => $q->where('is_active', true)->orderBy('sort_order'),
                'amenities' => fn ($q) => $q->where('is_active', true)->orderBy('sort_order'),
            ])
            ->firstOrFail();

        $availableBeds = Bed::query()
            ->where('facility_id', $facility->id)
            ->where('status', 'available')
            ->count();

        $facilityArr = $facility->toArray();
        $facilityArr['available_beds'] = $availableBeds;
        $qualityScore = QualityScoreService::score($facilityArr);

        $pdf = Pdf::loadView('brochures.facility', [
            'facility' => $facility,
            'available_beds' => $availableBeds,
            'quality_score' => $qualityScore,
            'today' => now()->format('F j, Y'),
        ])->setPaper('letter');

        return $pdf->download('carepath-' . $facility->slug . '.pdf');
    }

    /**
     * Emit a stable by_type payload using the canonical Facility::TYPES
     * set. Guarantees every type appears (with 0 default) so the
     * frontend can render filter chips without per-type defensive ??s.
     *
     * @param  array<string, int>  $byType
     * @return array<string, int>
     */
    private function buildByType(array $byType): array
    {
        $out = [];
        foreach (\App\Models\Facility::TYPES as $t) {
            $out[$t] = (int) ($byType[$t] ?? 0);
        }
        return $out;
    }

    /**
     * Great-circle distance in miles between two lat/lon points.
     */
    private function haversineMiles(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $R = 3958.8; // Earth radius in miles
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);
        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon / 2) ** 2;
        return $R * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }

    /**
     * GET /api/marketplace/facilities/{slug}
     */
    public function show(string $slug): JsonResponse
    {
        $facility = Facility::query()
            ->where('slug', $slug)
            ->where('is_active', true)
            ->with([
                'photos' => fn ($q) => $q->where('is_active', true)->orderBy('sort_order'),
                'pricingTiers' => fn ($q) => $q->where('is_active', true)->orderBy('sort_order'),
                'reviews' => fn ($q) => $q
                    ->where('is_published', true)
                    ->where('moderation_status', 'approved')
                    ->orderByDesc('helpful_count')
                    ->latest()
                    ->take(30),
                'amenities' => fn ($q) => $q->where('is_active', true)->orderBy('sort_order'),
            ])
            ->firstOrFail();

        $availableBeds = Bed::query()
            ->where('facility_id', $facility->id)
            ->where('status', 'available')
            ->count();

        $byLevel = Bed::query()
            ->where('facility_id', $facility->id)
            ->where('status', 'available')
            ->selectRaw('level_of_care, count(*) as count')
            ->groupBy('level_of_care')
            ->pluck('count', 'level_of_care');

        $reviewStats = [
            'count' => $facility->reviews->count(),
            'average' => round((float) $facility->reviews->avg('rating'), 1),
            'verified_count' => $facility->reviews->where('is_verified', true)->count(),
            'sub_scores' => [
                'cleanliness' => $this->avgRating($facility->reviews, 'rating_cleanliness'),
                'friendliness' => $this->avgRating($facility->reviews, 'rating_friendliness'),
                'care' => $this->avgRating($facility->reviews, 'rating_care'),
                'staff' => $this->avgRating($facility->reviews, 'rating_staff'),
                'meals' => $this->avgRating($facility->reviews, 'rating_meals'),
                'activities' => $this->avgRating($facility->reviews, 'rating_activities'),
                'value' => $this->avgRating($facility->reviews, 'rating_value'),
            ],
        ];

        // Comparable nearby facilities — same state, sorted by Five-Star,
        // then by distance if we have lat/lon for this facility.
        $compareQuery = Facility::query()
            ->where('is_active', true)
            ->where('id', '!=', $facility->id)
            ->where('state', $facility->state)
            ->select(['id', 'name', 'slug', 'type', 'city', 'state',
                'latitude', 'longitude',
                'cms_five_star_overall', 'cms_five_star_health_inspection',
                'cms_five_star_staffing', 'cms_five_star_quality',
                'medicaid_certified', 'medicare_certified',
                'price_from_cents', 'total_beds']);

        $comparables = $compareQuery->limit(20)->get();

        if ($facility->latitude && $facility->longitude) {
            $comparables = $comparables
                ->map(function ($c) use ($facility) {
                    if ($c->latitude && $c->longitude) {
                        $c->distance_miles = $this->haversineMiles(
                            (float) $facility->latitude,
                            (float) $facility->longitude,
                            (float) $c->latitude,
                            (float) $c->longitude
                        );
                    }
                    return $c;
                })
                ->sortBy(fn ($c) => $c->distance_miles ?? 9999)
                ->take(6)
                ->values();
        } else {
            $comparables = $comparables
                ->sortByDesc('cms_five_star_overall')
                ->take(6)
                ->values();
        }

        // Comparables share live-bed counts with the search index so the
        // quality score can use real availability data.
        $cmpAvailability = Bed::query()
            ->whereIn('facility_id', $comparables->pluck('id'))
            ->where('status', 'available')
            ->selectRaw('facility_id, count(*) as available_count')
            ->groupBy('facility_id')
            ->pluck('available_count', 'facility_id');

        $comparablesPayload = $comparables->map(function ($c) use ($cmpAvailability) {
            $arr = $c->toArray();
            $arr['available_beds'] = (int) ($cmpAvailability[$c->id] ?? 0);
            if (isset($c->distance_miles)) {
                $arr['distance_miles'] = round((float) $c->distance_miles, 1);
            }
            $arr['quality_score'] = QualityScoreService::score($arr);
            return $arr;
        });

        // Compute quality score from the facility's actual data + bed count.
        $facilityArr = $facility->toArray();
        $facilityArr['available_beds'] = $availableBeds;
        $qualityScore = QualityScoreService::score($facilityArr);

        return response()->json([
            'data' => array_merge($facility->toArray(), [
                'available_beds' => $availableBeds,
                'available_by_level' => $byLevel,
                'review_stats' => $reviewStats,
                'comparables' => $comparablesPayload,
                'quality_score' => $qualityScore,
            ]),
        ]);
    }

    private function avgRating($reviews, string $field): ?float
    {
        $vals = $reviews->pluck($field)->filter()->values();
        if ($vals->isEmpty()) return null;
        return round((float) $vals->avg(), 1);
    }

    /**
     * GET /api/marketplace/compare?ids[]=uuid&ids[]=uuid
     *
     * Returns 2-4 facilities with the data needed for a side-by-side
     * comparison: CMS scores, pricing, beds, amenities, review averages.
     * Lighter than show() — no individual reviews or comparables.
     */
    public function compare(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:2', 'max:4'],
            'ids.*' => ['required', 'string'],
        ]);

        $facilities = Facility::query()
            ->where('is_active', true)
            ->whereIn('id', $data['ids'])
            ->with([
                'photos' => fn ($q) => $q->where('is_active', true)->orderBy('sort_order')->limit(1),
                'pricingTiers' => fn ($q) => $q->where('is_active', true)->orderBy('sort_order'),
                'reviews' => fn ($q) => $q->where('is_published', true),
                'amenities' => fn ($q) => $q->where('is_active', true)->orderBy('sort_order'),
            ])
            ->get();

        if ($facilities->count() < 2) {
            throw ValidationException::withMessages([
                'ids' => ['Need at least 2 valid, active facilities to compare.'],
            ]);
        }

        // Collect the union of amenity slugs so the table can show one row
        // per amenity with a check/dash per facility column.
        $amenityUnion = $facilities
            ->flatMap(fn ($f) => $f->amenities->pluck('slug')->all())
            ->unique()
            ->values();

        $amenityLabels = $facilities
            ->flatMap(fn ($f) => $f->amenities)
            ->unique('slug')
            ->mapWithKeys(fn ($a) => [$a->slug => $a->label])
            ->all();

        $payload = $facilities->map(function ($f) {
            $availableBeds = Bed::query()
                ->where('facility_id', $f->id)
                ->where('status', 'available')
                ->count();

            $heroPhotoUrl = $f->photos->first()?->url;
            $amenitySlugs = $f->amenities->pluck('slug')->all();

            return [
                'id' => $f->id,
                'name' => $f->name,
                'slug' => $f->slug,
                'type' => $f->type,
                'city' => $f->city,
                'state' => $f->state,
                'zip' => $f->zip,
                'hero_photo_url' => $heroPhotoUrl,
                'cms_five_star_overall' => $f->cms_five_star_overall,
                'cms_five_star_health_inspection' => $f->cms_five_star_health_inspection,
                'cms_five_star_staffing' => $f->cms_five_star_staffing,
                'cms_five_star_quality' => $f->cms_five_star_quality,
                'medicaid_certified' => $f->medicaid_certified,
                'medicare_certified' => $f->medicare_certified,
                'total_beds' => $f->total_beds,
                'available_beds' => $availableBeds,
                'price_from_cents' => $f->price_from_cents,
                'pricing_tiers' => $f->pricingTiers->map(fn ($t) => [
                    'label' => $t->label,
                    'monthly_cents' => $t->monthly_cents,
                ])->values(),
                'review_count' => $f->reviews->count(),
                'review_average' => $f->reviews->isNotEmpty() ? round((float) $f->reviews->avg('rating'), 1) : null,
                'amenities' => $amenitySlugs,
            ];
        })->values();

        return response()->json([
            'data' => $payload,
            'amenity_rows' => $amenityUnion->map(fn ($slug) => [
                'slug' => $slug,
                'label' => $amenityLabels[$slug] ?? $slug,
            ])->values(),
        ]);
    }

    /**
     * POST /api/marketplace/inquiries
     *
     * Creates an Admission at the 'inquiry' stage so it lands in the
     * facility's kanban. Rate-limited per-IP to deter spam.
     */
    public function storeInquiry(Request $request): JsonResponse
    {
        $throttleKey = 'marketplace-inquiry:' . $request->ip();
        if (RateLimiter::tooManyAttempts($throttleKey, 10)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            throw ValidationException::withMessages([
                'rate' => "Too many requests. Try again in {$seconds} seconds.",
            ]);
        }
        RateLimiter::hit($throttleKey, 600); // 10 / 10 min

        $data = $request->validate([
            'facility_slug' => ['required', 'string'],
            'inquirer_name' => ['required', 'string', 'max:120'],
            'inquirer_email' => ['required', 'email', 'max:191'],
            'inquirer_phone' => ['nullable', 'string', 'max:30'],
            'inquirer_relationship' => ['required', 'in:adult_child,spouse,poa,self,hospital,other'],
            'prospect_first_name' => ['required', 'string', 'max:60'],
            'prospect_last_name' => ['required', 'string', 'max:60'],
            'prospect_level_of_care' => ['nullable', 'in:independent,assisted,memory,skilled,hospice'],
            'prospect_primary_payer' => ['nullable', 'string', 'max:60'],
            'target_admit_date' => ['nullable', 'date', 'after_or_equal:today'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $facility = Facility::query()
            ->where('slug', $data['facility_slug'])
            ->where('is_active', true)
            ->firstOrFail();

        $admission = Admission::create([
            'facility_id' => $facility->id,
            'stage' => 'inquiry',
            'inquirer_name' => $data['inquirer_name'],
            'inquirer_email' => $data['inquirer_email'],
            'inquirer_phone' => $data['inquirer_phone'] ?? null,
            'inquirer_relationship' => $data['inquirer_relationship'],
            'prospect_first_name' => $data['prospect_first_name'],
            'prospect_last_name' => $data['prospect_last_name'],
            'prospect_level_of_care' => $data['prospect_level_of_care'] ?? null,
            'prospect_primary_payer' => $data['prospect_primary_payer'] ?? null,
            'target_admit_date' => $data['target_admit_date'] ?? null,
            'notes' => $data['notes'] ?? null,
            'stage_changed_at' => now(),
        ]);

        // Attribute the inquiry back to a sponsored click if there was
        // one in the session within the last 30 days. Drives the ROAS
        // column on the facility-side analytics page.
        app(SponsoredAttributionService::class)->attributeAdmission(
            $admission,
            $request->header('X-Carepath-Session-Id') ?: $request->query('session_id'),
        );

        return response()->json([
            'ok' => true,
            'admission_id' => $admission->id,
            'facility_name' => $facility->name,
        ], 201);
    }

    /**
     * GET /api/marketplace/facilities/{slug}/tour-slots?date=YYYY-MM-DD
     *
     * Returns available tour slots for a single day. The schedule is rule-
     * based for now (Tue-Sat, 10am/11am/2pm/3pm/4pm in-person; same plus
     * 6pm virtual). Booked slots are subtracted.
     */
    public function tourSlots(Request $request, string $slug): JsonResponse
    {
        $data = $request->validate([
            'date' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'tour_type' => ['nullable', 'in:in_person,virtual,self_guided'],
        ]);

        $facility = Facility::query()->where('slug', $slug)->where('is_active', true)->firstOrFail();
        $date = CarbonImmutable::createFromFormat('Y-m-d', $data['date'])->startOfDay();
        $type = $data['tour_type'] ?? 'in_person';

        // Closed Sun (0) and Mon (1).
        $dow = $date->dayOfWeek;
        if ($dow === 0 || $dow === 1) {
            return response()->json(['date' => $data['date'], 'tour_type' => $type, 'slots' => []]);
        }

        $hours = match ($type) {
            'in_person' => [10, 11, 14, 15, 16],
            'virtual' => [10, 11, 14, 15, 16, 18],
            'self_guided' => [9, 10, 11, 13, 14, 15, 16, 17],
            default => [10, 14],
        };

        $candidates = collect($hours)->map(fn ($h) => $date->setTime($h, 0));

        $taken = Tour::query()
            ->where('facility_id', $facility->id)
            ->where('tour_type', $type)
            ->whereBetween('starts_at', [$date, $date->endOfDay()])
            ->whereNotIn('status', ['cancelled', 'no_show'])
            ->pluck('starts_at')
            ->map(fn ($d) => $d->format('Y-m-d H:i'))
            ->all();

        $slots = $candidates
            ->filter(fn ($c) => ! in_array($c->format('Y-m-d H:i'), $taken, true))
            ->filter(fn ($c) => $c->isAfter(now()->addMinutes(60))) // 1h minimum lead time
            ->values()
            ->map(fn ($c) => [
                'starts_at' => $c->toIso8601String(),
                'label' => $c->format('g:i A'),
            ])
            ->all();

        return response()->json([
            'date' => $data['date'],
            'tour_type' => $type,
            'slots' => $slots,
        ]);
    }

    /**
     * POST /api/marketplace/tours
     *
     * Books a tour. Creates a parent Admission at stage=tour_scheduled if
     * one isn't already linked. Rate-limited per IP.
     */
    public function bookTour(Request $request): JsonResponse
    {
        $throttleKey = 'marketplace-tour:' . $request->ip();
        if (RateLimiter::tooManyAttempts($throttleKey, 8)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            throw ValidationException::withMessages([
                'rate' => "Too many requests. Try again in {$seconds} seconds.",
            ]);
        }
        RateLimiter::hit($throttleKey, 600);

        $data = $request->validate([
            'facility_slug' => ['required', 'string'],
            'starts_at' => ['required', 'date', 'after:now'],
            'tour_type' => ['required', 'in:in_person,virtual,self_guided'],
            'attendee_name' => ['required', 'string', 'max:120'],
            'attendee_email' => ['required', 'email', 'max:191'],
            'attendee_phone' => ['nullable', 'string', 'max:30'],
            'relationship_to_prospect' => ['required', 'in:adult_child,spouse,poa,self,hospital,other'],
            'prospect_first_name' => ['required', 'string', 'max:60'],
            'prospect_last_name' => ['required', 'string', 'max:60'],
            'prospect_level_of_care' => ['nullable', 'in:independent,assisted,memory,skilled,hospice'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $facility = Facility::query()
            ->where('slug', $data['facility_slug'])
            ->where('is_active', true)
            ->firstOrFail();

        $startsAt = CarbonImmutable::parse($data['starts_at']);

        // Double-book guard.
        $clash = Tour::query()
            ->where('facility_id', $facility->id)
            ->where('starts_at', $startsAt)
            ->where('tour_type', $data['tour_type'])
            ->whereNotIn('status', ['cancelled', 'no_show'])
            ->exists();
        if ($clash) {
            throw ValidationException::withMessages([
                'starts_at' => 'That slot just got booked. Please pick another time.',
            ]);
        }

        $tour = DB::transaction(function () use ($data, $facility, $startsAt) {
            $admission = Admission::create([
                'facility_id' => $facility->id,
                'stage' => 'tour_scheduled',
                'inquirer_name' => $data['attendee_name'],
                'inquirer_email' => $data['attendee_email'],
                'inquirer_phone' => $data['attendee_phone'] ?? null,
                'inquirer_relationship' => $data['relationship_to_prospect'],
                'prospect_first_name' => $data['prospect_first_name'],
                'prospect_last_name' => $data['prospect_last_name'],
                'prospect_level_of_care' => $data['prospect_level_of_care'] ?? null,
                'notes' => $data['notes'] ?? null,
                'stage_changed_at' => now(),
            ]);

            return Tour::create([
                'facility_id' => $facility->id,
                'admission_id' => $admission->id,
                'starts_at' => $startsAt,
                'duration_minutes' => 60,
                'tour_type' => $data['tour_type'],
                'attendee_name' => $data['attendee_name'],
                'attendee_email' => $data['attendee_email'],
                'attendee_phone' => $data['attendee_phone'] ?? null,
                'relationship_to_prospect' => $data['relationship_to_prospect'],
                'prospect_first_name' => $data['prospect_first_name'],
                'prospect_last_name' => $data['prospect_last_name'],
                'prospect_level_of_care' => $data['prospect_level_of_care'] ?? null,
                'status' => 'confirmed',
                'notes' => $data['notes'] ?? null,
            ]);
        });

        return response()->json([
            'ok' => true,
            'tour_id' => $tour->id,
            'admission_id' => $tour->admission_id,
            'facility_name' => $facility->name,
            'starts_at' => $tour->starts_at,
            'tour_type' => $tour->tour_type,
        ], 201);
    }

    /**
     * POST /api/marketplace/cost-projection
     *
     * Stateless: returns a 5-year (or shorter) cost-of-care projection
     * blending Medicare A SNF, Medicaid spend-down, LTC insurance, VA
     * Aid & Attendance, and private pay. No DB writes.
     */
    public function costProjection(Request $request, CostProjectionService $service): JsonResponse
    {
        $data = $request->validate([
            'facility_slug' => ['required', 'string'],
            'level_of_care' => ['required', 'in:independent,assisted,memory,skilled,hospice'],
            'months' => ['required', 'integer', 'min:1', 'max:60'],
            'starting_assets_cents' => ['required', 'integer', 'min:0'],
            'monthly_income_cents' => ['required', 'integer', 'min:0'],
            'medicare_part_a_eligible' => ['required', 'boolean'],
            'medicaid_eligible_state' => ['nullable', 'boolean'],
            'ltc_insurance_daily_benefit_cents' => ['nullable', 'integer', 'min:0'],
            'ltc_insurance_total_pool_cents' => ['nullable', 'integer', 'min:0'],
            'va_aa_status' => ['nullable', 'in:none,single_veteran,veteran_and_spouse,surviving_spouse'],
        ]);

        return response()->json(['data' => $service->project($data)]);
    }

    /**
     * POST /api/marketplace/leads
     *
     * Captures a soft lead — saved-search subscribers, cost-projection
     * follow-ups, availability alerts. Rate-limited per IP. UTM + referrer
     * attribution captured automatically from the request.
     */
    public function captureLead(Request $request): JsonResponse
    {
        $throttleKey = 'marketplace-lead:' . $request->ip();
        if (RateLimiter::tooManyAttempts($throttleKey, 15)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            throw ValidationException::withMessages([
                'rate' => "Too many submissions. Try again in {$seconds} seconds.",
            ]);
        }
        RateLimiter::hit($throttleKey, 600);

        $data = $request->validate([
            'source' => ['required', 'in:' . implode(',', Lead::SOURCES)],
            'email' => ['required', 'email', 'max:191'],
            'phone' => ['nullable', 'string', 'max:30'],
            'name' => ['nullable', 'string', 'max:120'],
            'zip' => ['nullable', 'string', 'max:10'],
            'relationship_to_prospect' => ['nullable', 'string', 'max:60'],
            'facility_slug' => ['nullable', 'string'],
            'context' => ['nullable', 'array'],
        ]);

        $facilityId = null;
        if (! empty($data['facility_slug'])) {
            $facilityId = Facility::where('slug', $data['facility_slug'])->value('id');
        }

        $lead = Lead::create([
            'facility_id' => $facilityId,
            'source' => $data['source'],
            'email' => strtolower($data['email']),
            'phone' => $data['phone'] ?? null,
            'name' => $data['name'] ?? null,
            'zip' => $data['zip'] ?? null,
            'relationship_to_prospect' => $data['relationship_to_prospect'] ?? null,
            'context' => $data['context'] ?? null,
            'utm_source' => $request->query('utm_source'),
            'utm_medium' => $request->query('utm_medium'),
            'utm_campaign' => $request->query('utm_campaign'),
            'referrer' => substr((string) $request->header('referer'), 0, 500) ?: null,
            'ip_address' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 1000) ?: null,
            'status' => 'new',
        ]);

        return response()->json(['ok' => true, 'lead_id' => $lead->id], 201);
    }
}
