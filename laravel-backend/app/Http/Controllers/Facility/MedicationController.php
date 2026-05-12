<?php

namespace App\Http\Controllers\Facility;

use App\Http\Controllers\Controller;
use App\Models\Medication;
use App\Models\MedicationAdministration;
use App\Models\Resident;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class MedicationController extends Controller
{
    /**
     * The med-pass view: returns every active resident with their active
     * medications plus any administration events for the given date
     * (defaults to today). The frontend uses this to render the day's
     * med pass per resident.
     */
    public function todayBoard(Request $request): JsonResponse
    {
        $facilityId = $request->attributes->get('facility_id');

        $data = $request->validate([
            'date' => ['nullable', 'date_format:Y-m-d'],
        ]);
        $date = $data['date'] ?? now()->toDateString();

        $residents = Resident::query()
            ->where('facility_id', $facilityId)
            ->where('status', 'active')
            ->with([
                'bed:id,resident_id,room_number,bed_label',
                'medications' => fn ($q) => $q->where('is_active', true)->orderBy('is_prn')->orderBy('name'),
            ])
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get();

        $residentIds = $residents->pluck('id');

        $events = MedicationAdministration::query()
            ->where('facility_id', $facilityId)
            ->whereIn('resident_id', $residentIds)
            ->where('scheduled_date', $date)
            ->get()
            ->groupBy(fn ($e) => $e->medication_id . '|' . ($e->scheduled_time ?? ''));

        return response()->json([
            'date' => $date,
            'data' => $residents->map(function ($resident) use ($events) {
                return [
                    'id' => $resident->id,
                    'first_name' => $resident->first_name,
                    'last_name' => $resident->last_name,
                    'level_of_care' => $resident->level_of_care,
                    'mrn' => $resident->mrn,
                    'room' => $resident->bed
                        ? $resident->bed->room_number . ($resident->bed->bed_label ? '-' . $resident->bed->bed_label : '')
                        : null,
                    'medications' => $resident->medications->map(function ($med) use ($events) {
                        $slots = collect($med->schedule_times ?? [])->map(function ($time) use ($med, $events) {
                            $key = $med->id . '|' . $time;
                            $event = $events->get($key)?->first();
                            return [
                                'time' => $time,
                                'event' => $event ? [
                                    'id' => $event->id,
                                    'status' => $event->status,
                                    'administered_at' => $event->administered_at,
                                    'administered_by_name' => $event->administered_by_name,
                                ] : null,
                            ];
                        });
                        return [
                            'id' => $med->id,
                            'name' => $med->name,
                            'dose' => $med->dose,
                            'route' => $med->route,
                            'frequency' => $med->frequency,
                            'indication' => $med->indication,
                            'is_prn' => $med->is_prn,
                            'slots' => $slots,
                        ];
                    })->values(),
                ];
            }),
        ]);
    }

    public function indexForResident(Request $request, string $residentId): JsonResponse
    {
        $facilityId = $request->attributes->get('facility_id');

        Resident::query()->where('facility_id', $facilityId)->findOrFail($residentId);

        $meds = Medication::query()
            ->where('facility_id', $facilityId)
            ->where('resident_id', $residentId)
            ->orderBy('is_prn')
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $meds]);
    }

    public function storeForResident(Request $request, string $residentId): JsonResponse
    {
        $facilityId = $request->attributes->get('facility_id');

        Resident::query()->where('facility_id', $facilityId)->findOrFail($residentId);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'dose' => ['nullable', 'string', 'max:60'],
            'route' => ['nullable', 'in:' . implode(',', Medication::ROUTES)],
            'frequency' => ['nullable', 'in:' . implode(',', Medication::FREQUENCIES)],
            'schedule_times' => ['nullable', 'array'],
            'schedule_times.*' => ['string'],
            'indication' => ['nullable', 'string', 'max:255'],
            'prescriber' => ['nullable', 'string', 'max:120'],
            'start_date' => ['nullable', 'date'],
            'stop_date' => ['nullable', 'date'],
            'is_prn' => ['nullable', 'boolean'],
            'notes' => ['nullable', 'string'],
        ]);

        $med = Medication::create(array_merge($data, [
            'facility_id' => $facilityId,
            'resident_id' => $residentId,
            'is_active' => true,
        ]));

        return response()->json(['data' => $med], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $facilityId = $request->attributes->get('facility_id');

        $med = Medication::query()->where('facility_id', $facilityId)->findOrFail($id);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'dose' => ['nullable', 'string', 'max:60'],
            'route' => ['nullable', 'in:' . implode(',', Medication::ROUTES)],
            'frequency' => ['nullable', 'in:' . implode(',', Medication::FREQUENCIES)],
            'schedule_times' => ['nullable', 'array'],
            'schedule_times.*' => ['string'],
            'indication' => ['nullable', 'string', 'max:255'],
            'prescriber' => ['nullable', 'string', 'max:120'],
            'start_date' => ['nullable', 'date'],
            'stop_date' => ['nullable', 'date'],
            'is_prn' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
            'notes' => ['nullable', 'string'],
        ]);

        $med->update($data);

        return response()->json(['data' => $med->fresh()]);
    }

    public function administer(Request $request, string $id): JsonResponse
    {
        $facilityId = $request->attributes->get('facility_id');

        $med = Medication::query()->where('facility_id', $facilityId)->findOrFail($id);

        $data = $request->validate([
            'status' => ['required', 'in:' . implode(',', MedicationAdministration::STATUSES)],
            'scheduled_time' => ['nullable', 'string', 'max:10'],
            'scheduled_date' => ['nullable', 'date_format:Y-m-d'],
            'notes' => ['nullable', 'string'],
        ]);

        if (! $med->is_active) {
            throw ValidationException::withMessages([
                'medication_id' => 'Medication is not active.',
            ]);
        }

        $user = $request->user();
        $event = MedicationAdministration::create([
            'facility_id' => $facilityId,
            'medication_id' => $med->id,
            'resident_id' => $med->resident_id,
            'administered_by_user_id' => $user->id,
            'administered_by_name' => $user->name,
            'administered_at' => now(),
            'status' => $data['status'],
            'scheduled_time' => $data['scheduled_time'] ?? null,
            'scheduled_date' => $data['scheduled_date'] ?? now()->toDateString(),
            'notes' => $data['notes'] ?? null,
        ]);

        return response()->json(['data' => $event], 201);
    }

    public function historyForResident(Request $request, string $residentId): JsonResponse
    {
        $facilityId = $request->attributes->get('facility_id');

        Resident::query()->where('facility_id', $facilityId)->findOrFail($residentId);

        $data = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:500'],
        ]);

        $query = MedicationAdministration::query()
            ->where('facility_id', $facilityId)
            ->where('resident_id', $residentId)
            ->with('medication:id,name,dose,route,frequency')
            ->orderByDesc('administered_at');

        if (isset($data['from'])) $query->where('administered_at', '>=', $data['from']);
        if (isset($data['to'])) $query->where('administered_at', '<=', $data['to']);

        return response()->json(['data' => $query->limit($data['limit'] ?? 100)->get()]);
    }
}
