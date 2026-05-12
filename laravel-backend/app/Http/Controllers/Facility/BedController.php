<?php

namespace App\Http\Controllers\Facility;

use App\Http\Controllers\Controller;
use App\Models\Bed;
use App\Models\Resident;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Facility-scoped CRUD + assignment ops for beds. All routes assume the
 * facility.scope middleware has set facility_id on the request.
 */
class BedController extends Controller
{
    private const STATUSES = ['available', 'reserved', 'occupied', 'offline', 'isolation'];

    public function index(Request $request): JsonResponse
    {
        $facilityId = $request->attributes->get('facility_id');

        $beds = Bed::query()
            ->where('facility_id', $facilityId)
            ->with(['resident:id,first_name,last_name,date_of_birth,level_of_care,primary_payer,mrn,status'])
            ->orderByRaw('CAST(room_number AS INTEGER) asc')
            ->orderBy('bed_label')
            ->get();

        return response()->json(['data' => $beds]);
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $facilityId = $request->attributes->get('facility_id');

        $data = $request->validate([
            'status' => ['required', 'in:' . implode(',', self::STATUSES)],
            'notes' => ['nullable', 'string'],
        ]);

        /** @var Bed $bed */
        $bed = Bed::query()->where('facility_id', $facilityId)->findOrFail($id);

        // Can't mark a bed available/offline/isolation while a resident is in it.
        if (
            $bed->resident_id !== null
            && in_array($data['status'], ['available', 'offline', 'isolation'], true)
        ) {
            throw ValidationException::withMessages([
                'status' => 'Unassign the resident before changing the bed to ' . $data['status'] . '.',
            ]);
        }

        $bed->update($data);

        return response()->json(['data' => $bed->fresh('resident')]);
    }

    public function assign(Request $request, string $id): JsonResponse
    {
        $facilityId = $request->attributes->get('facility_id');

        $data = $request->validate([
            'resident_id' => ['required', 'uuid'],
        ]);

        /** @var Bed $bed */
        $bed = Bed::query()->where('facility_id', $facilityId)->findOrFail($id);

        if ($bed->resident_id) {
            throw ValidationException::withMessages([
                'resident_id' => 'Bed is already occupied by another resident.',
            ]);
        }

        /** @var Resident $resident */
        $resident = Resident::query()
            ->where('facility_id', $facilityId)
            ->where('status', 'active')
            ->findOrFail($data['resident_id']);

        // Prevent double-assigning a resident.
        $existing = Bed::query()
            ->where('facility_id', $facilityId)
            ->where('resident_id', $resident->id)
            ->first();
        if ($existing) {
            throw ValidationException::withMessages([
                'resident_id' => "Resident is already assigned to bed {$existing->room_number}-{$existing->bed_label}.",
            ]);
        }

        $bed->update([
            'resident_id' => $resident->id,
            'status' => 'occupied',
        ]);

        return response()->json(['data' => $bed->fresh('resident')]);
    }

    public function unassign(Request $request, string $id): JsonResponse
    {
        $facilityId = $request->attributes->get('facility_id');

        /** @var Bed $bed */
        $bed = Bed::query()->where('facility_id', $facilityId)->findOrFail($id);

        if (! $bed->resident_id) {
            throw ValidationException::withMessages([
                'resident_id' => 'Bed has no resident assigned.',
            ]);
        }

        $bed->update([
            'resident_id' => null,
            'status' => 'available',
        ]);

        return response()->json(['data' => $bed->fresh()]);
    }
}
