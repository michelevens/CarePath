<?php

namespace App\Http\Controllers\Facility;

use App\Http\Controllers\Controller;
use App\Models\CarePlan;
use App\Models\CarePlanItem;
use App\Models\Resident;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class CarePlanController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $facilityId = $request->attributes->get('facility_id');

        $plans = CarePlan::query()
            ->where('facility_id', $facilityId)
            ->with(['resident:id,first_name,last_name,level_of_care,mrn,status'])
            ->withCount('items')
            ->orderByDesc('updated_at')
            ->get();

        return response()->json(['data' => $plans]);
    }

    public function showByResident(Request $request, string $residentId): JsonResponse
    {
        $facilityId = $request->attributes->get('facility_id');

        $resident = Resident::query()
            ->where('facility_id', $facilityId)
            ->findOrFail($residentId);

        $plan = CarePlan::query()
            ->where('resident_id', $resident->id)
            ->with(['items'])
            ->first();

        return response()->json([
            'data' => [
                'resident' => $resident,
                'plan' => $plan,
            ],
        ]);
    }

    public function storeForResident(Request $request, string $residentId): JsonResponse
    {
        $facilityId = $request->attributes->get('facility_id');

        $resident = Resident::query()
            ->where('facility_id', $facilityId)
            ->findOrFail($residentId);

        if (CarePlan::where('resident_id', $resident->id)->exists()) {
            throw ValidationException::withMessages([
                'resident_id' => 'A care plan already exists for this resident.',
            ]);
        }

        $data = $request->validate([
            'status' => ['nullable', 'in:' . implode(',', CarePlan::STATUSES)],
            'started_at' => ['nullable', 'date'],
            'summary' => ['nullable', 'string'],
        ]);

        $plan = CarePlan::create(array_merge($data, [
            'facility_id' => $facilityId,
            'resident_id' => $resident->id,
            'status' => $data['status'] ?? 'draft',
            'started_at' => $data['started_at'] ?? now()->toDateString(),
        ]));

        return response()->json(['data' => $plan->load('items')], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $facilityId = $request->attributes->get('facility_id');

        $plan = CarePlan::query()
            ->where('facility_id', $facilityId)
            ->findOrFail($id);

        $data = $request->validate([
            'status' => ['sometimes', 'in:' . implode(',', CarePlan::STATUSES)],
            'started_at' => ['nullable', 'date'],
            'summary' => ['nullable', 'string'],
        ]);

        $plan->update($data);

        return response()->json(['data' => $plan->fresh('items')]);
    }

    public function sign(Request $request, string $id): JsonResponse
    {
        $facilityId = $request->attributes->get('facility_id');

        $plan = CarePlan::query()
            ->where('facility_id', $facilityId)
            ->findOrFail($id);

        if ($plan->signed_at) {
            throw ValidationException::withMessages([
                'id' => 'Care plan is already signed. Edit to unsign first.',
            ]);
        }

        $user = $request->user();

        $plan->update([
            'signed_at' => now(),
            'signed_by_user_id' => $user->id,
            'signed_by_name' => $user->name,
            'status' => 'active',
        ]);

        return response()->json(['data' => $plan->fresh('items')]);
    }

    public function unsign(Request $request, string $id): JsonResponse
    {
        $facilityId = $request->attributes->get('facility_id');

        $plan = CarePlan::query()
            ->where('facility_id', $facilityId)
            ->findOrFail($id);

        $plan->update([
            'signed_at' => null,
            'signed_by_user_id' => null,
            'signed_by_name' => null,
            'status' => 'draft',
        ]);

        return response()->json(['data' => $plan->fresh('items')]);
    }

    public function storeItem(Request $request, string $id): JsonResponse
    {
        $facilityId = $request->attributes->get('facility_id');

        $plan = CarePlan::query()
            ->where('facility_id', $facilityId)
            ->findOrFail($id);

        $data = $request->validate([
            'kind' => ['required', 'in:' . implode(',', CarePlanItem::KINDS)],
            'category' => ['nullable', 'in:' . implode(',', CarePlanItem::CATEGORIES)],
            'description' => ['required', 'string'],
            'status' => ['nullable', 'in:' . implode(',', CarePlanItem::STATUSES)],
            'target_date' => ['nullable', 'date'],
            'frequency' => ['nullable', 'in:' . implode(',', CarePlanItem::FREQUENCIES)],
            'responsible_role' => ['nullable', 'string', 'max:30'],
            'parent_id' => ['nullable', 'uuid'],
            'sort_order' => ['nullable', 'integer'],
        ]);

        $data['care_plan_id'] = $plan->id;
        if (empty($data['sort_order'])) {
            $data['sort_order'] = ((int) $plan->items()->max('sort_order')) + 10;
        }

        $item = CarePlanItem::create($data);

        return response()->json(['data' => $item], 201);
    }

    public function updateItem(Request $request, string $id, string $itemId): JsonResponse
    {
        $facilityId = $request->attributes->get('facility_id');

        $plan = CarePlan::query()
            ->where('facility_id', $facilityId)
            ->findOrFail($id);

        $item = $plan->items()->findOrFail($itemId);

        $data = $request->validate([
            'description' => ['sometimes', 'string'],
            'category' => ['nullable', 'in:' . implode(',', CarePlanItem::CATEGORIES)],
            'status' => ['nullable', 'in:' . implode(',', CarePlanItem::STATUSES)],
            'target_date' => ['nullable', 'date'],
            'frequency' => ['nullable', 'in:' . implode(',', CarePlanItem::FREQUENCIES)],
            'responsible_role' => ['nullable', 'string', 'max:30'],
            'sort_order' => ['nullable', 'integer'],
        ]);

        if (($data['status'] ?? null) === 'met' && ! $item->completed_at) {
            $data['completed_at'] = now();
        } elseif (isset($data['status']) && $data['status'] !== 'met') {
            $data['completed_at'] = null;
        }

        $item->update($data);

        return response()->json(['data' => $item->fresh()]);
    }

    public function destroyItem(Request $request, string $id, string $itemId): JsonResponse
    {
        $facilityId = $request->attributes->get('facility_id');

        $plan = CarePlan::query()
            ->where('facility_id', $facilityId)
            ->findOrFail($id);

        $item = $plan->items()->findOrFail($itemId);
        $item->delete();

        return response()->json(['ok' => true]);
    }
}
