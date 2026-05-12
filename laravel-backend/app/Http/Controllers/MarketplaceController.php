<?php

namespace App\Http\Controllers;

use App\Models\Admission;
use App\Models\Bed;
use App\Models\Facility;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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
    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'state' => ['nullable', 'string', 'size:2'],
            'city' => ['nullable', 'string', 'max:120'],
            'type' => ['nullable', 'in:snf,assisted_living,memory_care,ccrc'],
            'max_price_cents' => ['nullable', 'integer', 'min:0'],
            'medicaid_only' => ['nullable', 'boolean'],
            'min_five_star' => ['nullable', 'integer', 'min:1', 'max:5'],
            'q' => ['nullable', 'string', 'max:120'],
            'sort' => ['nullable', 'in:recommended,rating,price_asc,price_desc'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = Facility::query()
            ->where('is_active', true)
            ->select([
                'id', 'name', 'slug', 'type', 'city', 'state', 'zip',
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

        match ($data['sort'] ?? 'recommended') {
            'rating' => $query->orderByDesc('cms_five_star_overall')->orderBy('name'),
            'price_asc' => $query->orderBy('price_from_cents')->orderBy('name'),
            'price_desc' => $query->orderByDesc('price_from_cents')->orderBy('name'),
            default => $query->orderByDesc('cms_five_star_overall')->orderBy('name'),
        };

        $facilities = $query->limit($data['limit'] ?? 50)->get();

        // Attach live bed availability for each facility.
        $availability = Bed::query()
            ->whereIn('facility_id', $facilities->pluck('id'))
            ->where('status', 'available')
            ->selectRaw('facility_id, count(*) as available_count')
            ->groupBy('facility_id')
            ->pluck('available_count', 'facility_id');

        $rows = $facilities->map(function ($f) use ($availability) {
            return array_merge($f->toArray(), [
                'available_beds' => (int) ($availability[$f->id] ?? 0),
            ]);
        });

        return response()->json(['data' => $rows]);
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
        ];

        return response()->json([
            'data' => array_merge($facility->toArray(), [
                'available_beds' => $availableBeds,
                'available_by_level' => $byLevel,
                'review_stats' => $reviewStats,
            ]),
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

        return response()->json([
            'ok' => true,
            'admission_id' => $admission->id,
            'facility_name' => $facility->name,
        ], 201);
    }
}
