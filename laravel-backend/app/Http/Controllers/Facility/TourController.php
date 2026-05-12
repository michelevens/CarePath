<?php

namespace App\Http\Controllers\Facility;

use App\Http\Controllers\Controller;
use App\Models\Tour;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TourController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $facilityId = $request->attributes->get('facility_id');

        $data = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'status' => ['nullable', 'in:confirmed,rescheduled,completed,no_show,cancelled'],
        ]);

        $query = Tour::query()
            ->where('facility_id', $facilityId)
            ->orderBy('starts_at');

        if (isset($data['from'])) {
            $query->where('starts_at', '>=', $data['from']);
        } else {
            // Default: last 30 days through 90 days out.
            $query->where('starts_at', '>=', now()->subDays(30));
        }
        if (isset($data['to'])) {
            $query->where('starts_at', '<=', $data['to']);
        }
        if (isset($data['status'])) {
            $query->where('status', $data['status']);
        }

        return response()->json(['data' => $query->get()]);
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $facilityId = $request->attributes->get('facility_id');

        $data = $request->validate([
            'status' => ['required', 'in:' . implode(',', Tour::STATUSES)],
            'notes' => ['nullable', 'string'],
            'cancellation_reason' => ['nullable', 'string'],
        ]);

        $tour = Tour::query()->where('facility_id', $facilityId)->findOrFail($id);
        $tour->update($data);

        return response()->json(['data' => $tour->fresh()]);
    }
}
