<?php

namespace App\Http\Controllers\Facility;

use App\Http\Controllers\Controller;
use App\Models\Admission;
use App\Models\Resident;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AdmissionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $facilityId = $request->attributes->get('facility_id');

        $admissions = Admission::query()
            ->where('facility_id', $facilityId)
            ->orderByDesc('stage_changed_at')
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['data' => $admissions]);
    }

    public function store(Request $request): JsonResponse
    {
        $facilityId = $request->attributes->get('facility_id');

        $data = $request->validate([
            'inquirer_name' => ['required', 'string', 'max:120'],
            'inquirer_phone' => ['nullable', 'string', 'max:30'],
            'inquirer_email' => ['nullable', 'email', 'max:191'],
            'inquirer_relationship' => ['nullable', 'in:adult_child,spouse,poa,self,hospital,other'],
            'prospect_first_name' => ['required', 'string', 'max:60'],
            'prospect_last_name' => ['required', 'string', 'max:60'],
            'prospect_dob' => ['nullable', 'date'],
            'prospect_level_of_care' => ['nullable', 'in:independent,assisted,memory,skilled,hospice'],
            'prospect_primary_payer' => ['nullable', 'string', 'max:60'],
            'target_admit_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ]);

        $data['facility_id'] = $facilityId;
        $data['stage'] = 'inquiry';
        $data['stage_changed_at'] = now();
        $data['assigned_user_id'] = $request->user()->id;

        $admission = Admission::create($data);

        return response()->json(['data' => $admission], 201);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $facilityId = $request->attributes->get('facility_id');

        $admission = Admission::query()
            ->where('facility_id', $facilityId)
            ->with(['resident', 'bed', 'assignee:id,name,email'])
            ->findOrFail($id);

        return response()->json(['data' => $admission]);
    }

    public function updateStage(Request $request, string $id): JsonResponse
    {
        $facilityId = $request->attributes->get('facility_id');

        $data = $request->validate([
            'stage' => ['required', 'in:' . implode(',', Admission::STAGES)],
            'notes' => ['nullable', 'string'],
        ]);

        /** @var Admission $admission */
        $admission = Admission::query()
            ->where('facility_id', $facilityId)
            ->findOrFail($id);

        if ($admission->stage === $data['stage']) {
            return response()->json(['data' => $admission]);
        }

        $isAdmitTransition = $data['stage'] === 'admitted' && ! $admission->resident_id;

        DB::transaction(function () use ($admission, $data, $isAdmitTransition, $facilityId) {
            $admission->stage = $data['stage'];
            $admission->stage_changed_at = now();
            if (isset($data['notes'])) {
                $admission->notes = $data['notes'];
            }

            if ($isAdmitTransition) {
                $resident = Resident::create([
                    'facility_id' => $facilityId,
                    'first_name' => $admission->prospect_first_name,
                    'last_name' => $admission->prospect_last_name,
                    'date_of_birth' => $admission->prospect_dob,
                    'admission_date' => now()->toDateString(),
                    'level_of_care' => $admission->prospect_level_of_care,
                    'primary_payer' => $admission->prospect_primary_payer,
                    'mrn' => 'SM-' . strtoupper(Str::random(6)),
                    'status' => 'active',
                ]);
                $admission->resident_id = $resident->id;
            }

            $admission->save();
        });

        return response()->json(['data' => $admission->fresh(['resident'])]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $facilityId = $request->attributes->get('facility_id');

        $data = $request->validate([
            'inquirer_name' => ['sometimes', 'string', 'max:120'],
            'inquirer_phone' => ['nullable', 'string', 'max:30'],
            'inquirer_email' => ['nullable', 'email', 'max:191'],
            'inquirer_relationship' => ['nullable', 'in:adult_child,spouse,poa,self,hospital,other'],
            'prospect_first_name' => ['sometimes', 'string', 'max:60'],
            'prospect_last_name' => ['sometimes', 'string', 'max:60'],
            'prospect_dob' => ['nullable', 'date'],
            'prospect_level_of_care' => ['nullable', 'in:independent,assisted,memory,skilled,hospice'],
            'prospect_primary_payer' => ['nullable', 'string', 'max:60'],
            'target_admit_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
            'assigned_user_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $admission = Admission::query()
            ->where('facility_id', $facilityId)
            ->findOrFail($id);

        $admission->update($data);

        return response()->json(['data' => $admission->fresh()]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $facilityId = $request->attributes->get('facility_id');

        $admission = Admission::query()
            ->where('facility_id', $facilityId)
            ->findOrFail($id);

        if ($admission->resident_id) {
            throw ValidationException::withMessages([
                'id' => 'Cannot delete an admission that has produced a resident. Discharge the resident first.',
            ]);
        }

        $admission->delete();

        return response()->json(['ok' => true]);
    }
}
