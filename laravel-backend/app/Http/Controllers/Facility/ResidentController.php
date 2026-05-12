<?php

namespace App\Http\Controllers\Facility;

use App\Http\Controllers\Controller;
use App\Models\Bed;
use App\Models\Resident;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ResidentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $facilityId = $request->attributes->get('facility_id');

        $data = $request->validate([
            'status' => ['nullable', 'in:active,discharged,deceased'],
            'unassigned' => ['nullable', 'boolean'],
        ]);

        $query = Resident::query()
            ->where('facility_id', $facilityId)
            ->orderBy('last_name')
            ->orderBy('first_name');

        if (isset($data['status'])) {
            $query->where('status', $data['status']);
        }

        if (! empty($data['unassigned'])) {
            $query->whereDoesntHave('bed');
        }

        return response()->json(['data' => $query->get()]);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $facilityId = $request->attributes->get('facility_id');

        $resident = Resident::query()
            ->where('facility_id', $facilityId)
            ->with('bed:id,facility_id,room_number,bed_label,unit,floor,resident_id')
            ->findOrFail($id);

        return response()->json(['data' => $resident]);
    }

    public function discharge(Request $request, string $id): JsonResponse
    {
        $facilityId = $request->attributes->get('facility_id');

        $data = $request->validate([
            'discharge_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ]);

        /** @var Resident $resident */
        $resident = Resident::query()
            ->where('facility_id', $facilityId)
            ->findOrFail($id);

        $resident->update([
            'status' => 'discharged',
            'discharge_date' => $data['discharge_date'] ?? now()->toDateString(),
            'notes' => $data['notes'] ?? $resident->notes,
        ]);

        // Vacate any bed the resident occupies.
        Bed::query()
            ->where('facility_id', $facilityId)
            ->where('resident_id', $resident->id)
            ->update(['resident_id' => null, 'status' => 'available']);

        return response()->json(['data' => $resident->fresh()]);
    }
}
