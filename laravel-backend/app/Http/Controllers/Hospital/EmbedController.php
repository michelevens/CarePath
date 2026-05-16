<?php

namespace App\Http\Controllers\Hospital;

use App\Http\Controllers\Controller;
use App\Models\Admission;
use App\Models\Facility;
use App\Models\HospitalPartner;
use App\Services\QualityScoreService;
use App\Services\ZipLookupService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

/**
 * Public embed endpoints. Authenticated via X-CarePath-Embed-Key
 * header (the hospital_partners.api_key column). All requests are
 * rate-limited per partner so a single hospital can't take the
 * marketplace API offline.
 *
 * Every inquiry submitted through these endpoints carries
 * attribution_source='hospital_widget' and sourced_by_user_id=
 * <partner.user_id> so the placement-attribution chain credits
 * the hospital for any resulting admissions.
 */
class EmbedController extends Controller
{
    /**
     * GET /api/embed/config
     * Used by the widget on load — confirms the key, returns the
     * partner display info so the widget can show "Brought to you by
     * {hospital name}" branding.
     */
    public function config(Request $request): JsonResponse
    {
        $partner = $this->partnerOrFail($request);
        return response()->json([
            'data' => [
                'partner' => [
                    'id' => $partner->id,
                    'name' => $partner->name ?: 'CarePath partner',
                    'slug' => $partner->slug,
                    'partner_type' => $partner->partner_type,
                    'is_accepting_referrals' => $partner->is_accepting_referrals,
                    'service_area_zips' => $partner->service_area_zips ?? [],
                    'service_area_states' => $partner->service_area_states ?? [],
                ],
            ],
        ]);
    }

    /**
     * GET /api/embed/facilities
     * Proxies the marketplace search filtered to the partner's
     * service area (if set), with the same payload shape
     * MarketplaceController::index returns.
     */
    public function facilities(Request $request, ZipLookupService $zipLookup): JsonResponse
    {
        $partner = $this->partnerOrFail($request);
        $this->throttleOrFail($partner, 'search', max: 120, decay: 60);

        $data = $request->validate([
            'state' => ['nullable', 'string', 'size:2'],
            'city' => ['nullable', 'string', 'max:120'],
            'zip' => ['nullable', 'string', 'max:10'],
            'radius_miles' => ['nullable', 'integer', 'min:1', 'max:200'],
            'type' => ['nullable', 'in:snf,assisted_living,memory_care,ccrc'],
            'medicaid_only' => ['nullable', 'boolean'],
            'min_five_star' => ['nullable', 'integer', 'min:1', 'max:5'],
            'q' => ['nullable', 'string', 'max:120'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

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
                'total_beds', 'price_from_cents', 'phone',
            ]);

        // Limit to partner's service-area states/zips if configured —
        // hospitals refer locally; no point showing nationwide results.
        $partnerStates = $partner->service_area_states ?? [];
        if (! empty($partnerStates)) {
            $query->whereIn('state', array_map('strtoupper', $partnerStates));
        }

        if (! empty($data['state'])) $query->where('state', strtoupper($data['state']));
        if (! empty($data['city'])) $query->where('city', 'ILIKE', $data['city'] . '%');
        if (! empty($data['type'])) $query->where('type', $data['type']);
        if (! empty($data['medicaid_only'])) $query->where('medicaid_certified', true);
        if (! empty($data['min_five_star'])) $query->where('cms_five_star_overall', '>=', $data['min_five_star']);
        if (! empty($data['q'])) $query->where('name', 'ILIKE', '%' . $data['q'] . '%');

        if ($origin) {
            $radius = $data['radius_miles'] ?? 25;
            $latDelta = $radius / 69.0;
            $lonDelta = $radius / (69.0 * max(0.01, cos(deg2rad($origin['lat']))));
            $query->whereNotNull('latitude')->whereNotNull('longitude')
                ->whereBetween('latitude', [$origin['lat'] - $latDelta, $origin['lat'] + $latDelta])
                ->whereBetween('longitude', [$origin['lon'] - $lonDelta, $origin['lon'] + $lonDelta]);
        }

        $query->orderByDesc('cms_five_star_overall')->orderBy('name');

        $facilities = $query->limit($data['limit'] ?? 25)->get();

        $rows = $facilities->map(function ($f) {
            $arr = $f->toArray();
            $arr['available_beds'] = 0; // widget doesn't pay the bed-count join cost
            $arr['quality_score'] = QualityScoreService::score($arr);
            return $arr;
        });

        return response()->json([
            'data' => $rows,
            'origin' => $origin,
        ]);
    }

    /**
     * POST /api/embed/inquiries
     * Submits a referral inquiry from the widget. Creates an
     * Admission at stage=inquiry with attribution pointing back to
     * the hospital_partner's user.
     */
    public function inquiry(Request $request): JsonResponse
    {
        $partner = $this->partnerOrFail($request);
        if (! $partner->canAcceptReferrals()) {
            throw ValidationException::withMessages([
                'partner' => 'This hospital partner is currently not accepting referrals.',
            ]);
        }
        $this->throttleOrFail($partner, 'inquiry', max: 30, decay: 60);

        $data = $request->validate([
            'facility_slug' => ['required', 'string'],
            'inquirer_name' => ['required', 'string', 'max:120'],
            'inquirer_email' => ['required', 'email', 'max:191'],
            'inquirer_phone' => ['nullable', 'string', 'max:30'],
            'inquirer_relationship' => ['required', 'in:hospital,adult_child,spouse,poa,self,other'],
            'prospect_first_name' => ['required', 'string', 'max:60'],
            'prospect_last_name' => ['required', 'string', 'max:60'],
            'prospect_level_of_care' => ['nullable', 'in:independent,assisted,memory,skilled,hospice'],
            'target_admit_date' => ['nullable', 'date', 'after_or_equal:today'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $facility = Facility::query()
            ->where('slug', $data['facility_slug'])
            ->where('is_active', true)
            ->firstOrFail();

        $admission = Admission::create([
            'facility_id' => $facility->id,
            'sourced_by_user_id' => $partner->user_id,
            'attribution_source' => 'hospital_widget',
            'attribution_context' => [
                'partner_id' => (string) $partner->id,
                'partner_name' => $partner->name,
            ],
            'stage' => 'inquiry',
            'inquirer_name' => $data['inquirer_name'],
            'inquirer_email' => $data['inquirer_email'],
            'inquirer_phone' => $data['inquirer_phone'] ?? null,
            'inquirer_relationship' => $data['inquirer_relationship'],
            'prospect_first_name' => $data['prospect_first_name'],
            'prospect_last_name' => $data['prospect_last_name'],
            'prospect_level_of_care' => $data['prospect_level_of_care'] ?? null,
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
     * Resolve the partner from the X-CarePath-Embed-Key header.
     *
     * The plaintext key is NEVER cached or logged — we cache only the
     * resulting partner_id under the sha256 hash so a Redis snapshot
     * or a slow-query log capture leaks nothing usable. The ?embed_key
     * query fallback was removed because URL params end up in
     * Referer headers, browser history, and any intermediary access
     * log — the widget should only ever pass the key via header.
     */
    private function partnerOrFail(Request $request): HospitalPartner
    {
        $key = $request->header('X-CarePath-Embed-Key');
        if (! $key) abort(401, 'Missing embed key.');

        $hash = HospitalPartner::hashKey($key);
        $partnerId = Cache::remember(
            "embed-key-h:{$hash}",
            60,
            fn () => HospitalPartner::where('api_key_hash', $hash)->value('id'),
        );
        if (! $partnerId) abort(401, 'Invalid embed key.');

        $partner = HospitalPartner::find($partnerId);
        if (! $partner || ! $partner->is_active) {
            abort(403, 'Hospital partner is not active.');
        }
        return $partner;
    }

    private function throttleOrFail(HospitalPartner $partner, string $action, int $max, int $decay): void
    {
        $key = "embed:{$partner->id}:{$action}";
        if (RateLimiter::tooManyAttempts($key, $max)) {
            $seconds = RateLimiter::availableIn($key);
            abort(429, "Rate limit hit. Try again in {$seconds}s.");
        }
        RateLimiter::hit($key, $decay);
    }
}
