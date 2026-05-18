<?php

namespace App\Http\Controllers\Facility;

use App\Http\Controllers\Controller;
use App\Models\FacilityAmenity;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Self-serve amenity editor for facility managers. Scoped by the
 * FacilityScope middleware — managers can only ever touch amenities
 * on their active facility. The same `facility_amenities` table is
 * read by the public detail page + the search-card preview chips,
 * so edits are visible immediately on next page load.
 *
 * Reorder is a separate endpoint instead of a per-row PUT so the
 * drag-and-drop UI can ship one request with the new ordering
 * instead of N writes (avoids partial-update flicker if the user
 * drags multiple rows quickly).
 */
class FacilityAmenityController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $facilityId = $request->attributes->get('facility_id');

        $rows = FacilityAmenity::query()
            ->where('facility_id', $facilityId)
            ->orderBy('sort_order')
            ->orderBy('created_at')
            ->get();

        return response()->json(['data' => $rows]);
    }

    public function store(Request $request): JsonResponse
    {
        $facilityId = $request->attributes->get('facility_id');

        $data = $request->validate([
            'category' => ['required', Rule::in(FacilityAmenity::CATEGORIES)],
            'name' => ['required', 'string', 'max:120'],
            'detail' => ['nullable', 'string', 'max:500'],
            'is_featured' => ['boolean'],
            'is_active' => ['boolean'],
        ]);

        // Default new rows to the end of the list so they don't jump
        // ahead of items the manager has already curated.
        $maxOrder = FacilityAmenity::where('facility_id', $facilityId)->max('sort_order') ?? -1;

        $row = FacilityAmenity::create(array_merge($data, [
            'facility_id' => $facilityId,
            'is_active' => $data['is_active'] ?? true,
            'is_featured' => $data['is_featured'] ?? false,
            'sort_order' => $maxOrder + 1,
        ]));

        return response()->json(['data' => $row], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $facilityId = $request->attributes->get('facility_id');

        $row = FacilityAmenity::where('facility_id', $facilityId)->findOrFail($id);

        $data = $request->validate([
            'category' => ['sometimes', Rule::in(FacilityAmenity::CATEGORIES)],
            'name' => ['sometimes', 'string', 'max:120'],
            'detail' => ['nullable', 'string', 'max:500'],
            'is_featured' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $row->update($data);

        return response()->json(['data' => $row->fresh()]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $facilityId = $request->attributes->get('facility_id');

        $row = FacilityAmenity::where('facility_id', $facilityId)->findOrFail($id);
        $row->delete();

        return response()->json(['ok' => true]);
    }

    /**
     * POST /api/facility/amenities/reorder
     * Body: { "order": ["uuid-1", "uuid-2", ...] }
     *
     * Single-shot reorder. IDs not belonging to this facility are
     * silently ignored (defense against a stale client posting a
     * row that's been deleted server-side mid-drag).
     */
    public function reorder(Request $request): JsonResponse
    {
        $facilityId = $request->attributes->get('facility_id');

        $data = $request->validate([
            'order' => ['required', 'array'],
            'order.*' => ['string'],
        ]);

        $valid = FacilityAmenity::where('facility_id', $facilityId)
            ->whereIn('id', $data['order'])
            ->pluck('id')
            ->all();
        $validSet = array_flip($valid);

        DB::transaction(function () use ($data, $validSet, $facilityId) {
            $order = 0;
            foreach ($data['order'] as $id) {
                if (! isset($validSet[$id])) continue;
                FacilityAmenity::where('id', $id)
                    ->where('facility_id', $facilityId)
                    ->update(['sort_order' => $order++]);
            }
        });

        return response()->json(['ok' => true]);
    }
}
