<?php

namespace App\Http\Controllers;

use App\Models\SavedSearch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * Per-user saved-search CRUD. The corresponding alert run lives in
 * App\Console\Commands\SavedSearchAlertsCommand which is invoked
 * daily by the scheduler.
 */
class SavedSearchController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $rows = SavedSearch::query()
            ->where('user_id', Auth::id())
            ->orderByDesc('created_at')
            ->limit(50)
            ->get();

        return response()->json([
            'data' => $rows->map(fn ($s) => $this->serialize($s))->values(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'params' => ['required', 'array'],
            'alerts_push' => ['nullable', 'boolean'],
            'alerts_email' => ['nullable', 'boolean'],
        ]);

        $row = SavedSearch::create([
            'user_id' => Auth::id(),
            'name' => $data['name'],
            'params' => $data['params'],
            'alerts_push' => $data['alerts_push'] ?? true,
            'alerts_email' => $data['alerts_email'] ?? false,
        ]);

        return response()->json(['data' => $this->serialize($row)], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'name' => ['nullable', 'string', 'max:120'],
            'alerts_push' => ['nullable', 'boolean'],
            'alerts_email' => ['nullable', 'boolean'],
        ]);

        $row = SavedSearch::where('user_id', Auth::id())->findOrFail($id);
        $row->fill(array_filter($data, fn ($v) => $v !== null));
        $row->save();

        return response()->json(['data' => $this->serialize($row)]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $row = SavedSearch::where('user_id', Auth::id())->findOrFail($id);
        $row->delete();

        return response()->json(['ok' => true]);
    }

    private function serialize(SavedSearch $s): array
    {
        return [
            'id' => $s->id,
            'name' => $s->name,
            'params' => $s->params,
            'alerts_push' => $s->alerts_push,
            'alerts_email' => $s->alerts_email,
            'last_alerted_at' => $s->last_alerted_at?->toIso8601String(),
            'total_alerts_sent' => $s->total_alerts_sent,
            'created_at' => $s->created_at?->toIso8601String(),
        ];
    }
}
