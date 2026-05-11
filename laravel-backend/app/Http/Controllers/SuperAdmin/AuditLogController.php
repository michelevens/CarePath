<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'action' => ['nullable', 'string', 'max:60'],
            'auditable_type' => ['nullable', 'string', 'max:191'],
            'auditable_id' => ['nullable', 'string', 'max:60'],
            'facility_id' => ['nullable', 'uuid'],
            'user_id' => ['nullable', 'integer'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:200'],
        ]);

        $perPage = $data['per_page'] ?? 50;

        $logs = AuditLog::query()
            ->with('auditable')
            ->when($data['action'] ?? null, fn ($q, $v) => $q->where('action', $v))
            ->when($data['auditable_type'] ?? null, fn ($q, $v) => $q->where('auditable_type', $v))
            ->when($data['auditable_id'] ?? null, fn ($q, $v) => $q->where('auditable_id', $v))
            ->when($data['facility_id'] ?? null, fn ($q, $v) => $q->where('facility_id', $v))
            ->when(isset($data['user_id']), fn ($q) => $q->where('user_id', $data['user_id']))
            ->when($data['from'] ?? null, fn ($q, $v) => $q->where('occurred_at', '>=', $v))
            ->when($data['to'] ?? null, fn ($q, $v) => $q->where('occurred_at', '<=', $v))
            ->orderByDesc('occurred_at')
            ->paginate($perPage);

        return response()->json($logs);
    }
}
