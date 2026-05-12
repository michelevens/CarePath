<?php

namespace App\Http\Controllers\Facility;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeadController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $facilityId = $request->attributes->get('facility_id');

        $data = $request->validate([
            'status' => ['nullable', 'in:new,contacted,converted,unsubscribed'],
            'source' => ['nullable', 'string'],
        ]);

        $query = Lead::query()
            ->where('facility_id', $facilityId)
            ->orderByDesc('created_at');

        if (isset($data['status'])) $query->where('status', $data['status']);
        if (isset($data['source'])) $query->where('source', $data['source']);

        return response()->json(['data' => $query->limit(200)->get()]);
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $facilityId = $request->attributes->get('facility_id');

        $data = $request->validate([
            'status' => ['required', 'in:new,contacted,converted,unsubscribed'],
        ]);

        $lead = Lead::query()->where('facility_id', $facilityId)->findOrFail($id);
        $lead->update([
            'status' => $data['status'],
            'contacted_at' => $data['status'] === 'contacted' ? now() : $lead->contacted_at,
        ]);

        return response()->json(['data' => $lead->fresh()]);
    }
}
