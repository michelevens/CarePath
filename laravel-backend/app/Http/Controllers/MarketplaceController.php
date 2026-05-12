<?php

namespace App\Http\Controllers;

use App\Models\Admission;
use App\Models\Bed;
use App\Models\Facility;
use App\Models\Lead;
use App\Models\Tour;
use App\Services\CostProjectionService;
use App\Services\ZipLookupService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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
    public function index(Request $request, ZipLookupService $zipLookup): JsonResponse
    {
        $data = $request->validate([
            'state' => ['nullable', 'string', 'size:2'],
            'city' => ['nullable', 'string', 'max:120'],
            'zip' => ['nullable', 'string', 'max:10'],
            'radius_miles' => ['nullable', 'integer', 'min:1', 'max:200'],
            'type' => ['nullable', 'in:snf,assisted_living,memory_care,ccrc'],
            'max_price_cents' => ['nullable', 'integer', 'min:0'],
            'medicaid_only' => ['nullable', 'boolean'],
            'min_five_star' => ['nullable', 'integer', 'min:1', 'max:5'],
            'q' => ['nullable', 'string', 'max:120'],
            'sort' => ['nullable', 'in:recommended,rating,price_asc,price_desc,distance'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:100'],
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
                'latitude', 'longitude',
                'medicaid_certified', 'medicare_certified',
                'cms_five_star_overall', 'cms_five_star_health_inspection',
                'cms_five_star_staffing', 'cms_five_star_quality',
                'total_beds', 'price_from_cents',
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

        // When we have a ZIP origin, pre-filter on lat/lon bounding box
        // (cheap), then refine with exact haversine later. Default to the
        // origin's state to keep the bounding box tight.
        $radiusMiles = $data['radius_miles'] ?? 25;
        if ($origin) {
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

        // Attach live bed availability.
        $availability = Bed::query()
            ->whereIn('facility_id', $facilities->pluck('id'))
            ->where('status', 'available')
            ->selectRaw('facility_id, count(*) as available_count')
            ->groupBy('facility_id')
            ->pluck('available_count', 'facility_id');

        $rows = $facilities->map(function ($f) use ($availability) {
            $arr = $f->toArray();
            $arr['available_beds'] = (int) ($availability[$f->id] ?? 0);
            if (isset($f->distance_miles)) {
                $arr['distance_miles'] = round($f->distance_miles, 1);
            }
            return $arr;
        });

        return response()->json([
            'data' => $rows,
            'origin' => $origin,
            'radius_miles' => $origin ? $radiusMiles : null,
        ]);
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
                'reviews' => fn ($q) => $q->where('is_published', true)->latest()->take(20),
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
                'latitude', 'longitude', 'cms_five_star_overall',
                'medicaid_certified', 'price_from_cents', 'total_beds']);

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

        $comparablesPayload = $comparables->map(function ($c) {
            $arr = $c->toArray();
            if (isset($c->distance_miles)) {
                $arr['distance_miles'] = round((float) $c->distance_miles, 1);
            }
            return $arr;
        });

        return response()->json([
            'data' => array_merge($facility->toArray(), [
                'available_beds' => $availableBeds,
                'available_by_level' => $byLevel,
                'review_stats' => $reviewStats,
                'comparables' => $comparablesPayload,
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
