<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\StateLicenseCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * State licensing reference data — browseable + editable from
 * SuperAdmin. Backs the "Licensing" tab. Source of truth for the
 * FacilityTypeNormalizer used at ingest time.
 */
class LicensingController extends Controller
{
    public const CANONICAL_TYPES = [
        'snf', 'assisted_living', 'memory_care', 'ccrc',
        'independent_living', 'group_home', 'adult_family_home', 'icf_iid',
    ];

    /**
     * GET /api/superadmin/licensing
     *
     * Returns full catalog grouped by state for the SuperAdmin
     * browse view. Also includes the canonical type + populations
     * + payer enums so the editor doesn't have to hardcode them.
     */
    public function index(Request $request): JsonResponse
    {
        $stateFilter = $request->query('state');
        $typeFilter = $request->query('canonical_type');

        $query = StateLicenseCategory::query()->orderBy('state')->orderBy('source_term');
        if ($stateFilter) $query->where('state', strtoupper($stateFilter));
        if ($typeFilter) $query->where('canonical_type', $typeFilter);

        $rows = $query->limit(2000)->get();

        $byState = $rows->groupBy('state');

        return response()->json([
            'data' => $rows,
            'states' => $byState->map(fn ($items) => [
                'count' => $items->count(),
                'mapped' => $items->where('canonical_type', '!=', null)->count(),
                'rejected' => $items->where('rejected', true)->count(),
            ]),
            'enums' => [
                'canonical_types' => self::CANONICAL_TYPES,
                'populations' => StateLicenseCategory::POPULATIONS,
                'payers' => StateLicenseCategory::PAYERS,
            ],
        ]);
    }

    /**
     * POST /api/superadmin/licensing
     *
     * Add a new state license category — for when the seeder didn't
     * cover something the SuperAdmin encountered in real data.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $data['source_term_normalized'] = StateLicenseCategory::normalize($data['source_term']);
        $data['is_seeded'] = false;

        $category = StateLicenseCategory::updateOrCreate(
            ['state' => $data['state'], 'source_term_normalized' => $data['source_term_normalized']],
            $data,
        );

        return response()->json(['data' => $category], 201);
    }

    /**
     * PUT /api/superadmin/licensing/{id}
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $data = $this->validated($request);
        $data['source_term_normalized'] = StateLicenseCategory::normalize($data['source_term']);

        $category = StateLicenseCategory::findOrFail($id);
        $category->update($data);

        return response()->json(['data' => $category]);
    }

    /**
     * DELETE /api/superadmin/licensing/{id}
     */
    public function destroy(string $id): JsonResponse
    {
        StateLicenseCategory::findOrFail($id)->delete();
        return response()->json(['ok' => true]);
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'state' => ['required', 'string', 'size:2'],
            'source_term' => ['required', 'string', 'max:191'],
            'canonical_type' => ['nullable', Rule::in(self::CANONICAL_TYPES)],
            'license_subtype' => ['nullable', 'string', 'max:64'],
            'rejected' => ['nullable', 'boolean'],
            'rejection_reason' => ['nullable', 'string', 'max:191'],
            'accepted_populations' => ['nullable', 'array'],
            'accepted_populations.*' => ['string', Rule::in(StateLicenseCategory::POPULATIONS)],
            'payer_programs' => ['nullable', 'array'],
            'payer_programs.*' => ['string', Rule::in(StateLicenseCategory::PAYERS)],
            'funding_authority' => ['nullable', 'string', 'max:191'],
            'eligibility_notes' => ['nullable', 'string'],
            'regulator' => ['nullable', 'string', 'max:64'],
            'notes' => ['nullable', 'string'],
            'source_url' => ['nullable', 'url', 'max:500'],
        ]);
    }
}
