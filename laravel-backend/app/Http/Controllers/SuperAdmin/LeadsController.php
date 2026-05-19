<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Models\LeadActivity;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * SuperAdmin-facing browse of every Lead row on the platform. Used to
 * see who's downloading guides, who signed up for the newsletter, who
 * submitted a tour-request lead, etc. Marketing + sales use it; the
 * facility-side /admin/leads queue is a different surface (scoped to
 * that facility's leads only).
 *
 * All filters are optional. Returns paginated rows with the contact
 * fields + source + context payload + UTM attribution. Exports the
 * filtered set as CSV when ?format=csv.
 */
class LeadsController extends Controller
{
    public function index(Request $request): JsonResponse|StreamedResponse
    {
        $q = $this->buildQuery($request);

        if ($request->query('format') === 'csv') {
            return $this->streamCsv($q);
        }

        $perPage = min(200, max(10, (int) $request->query('per_page', 50)));
        $rows = $q->with('facility:id,name,slug')
            ->orderByDesc('created_at')
            ->paginate($perPage);

        $summary = [
            'total' => Lead::count(),
            'by_source' => Lead::query()
                ->selectRaw('source, count(*) as c')
                ->groupBy('source')
                ->orderByDesc('c')
                ->pluck('c', 'source'),
            'this_week' => Lead::where('created_at', '>=', now()->subWeek())->count(),
            'this_month' => Lead::where('created_at', '>=', now()->subMonth())->count(),
            'with_phone_pct' => Lead::count() > 0
                ? round((Lead::whereNotNull('phone')->where('phone', '!=', '')->count() / Lead::count()) * 100, 1)
                : 0,
        ];

        return response()->json([
            'data' => $rows->items(),
            'meta' => [
                'total' => $rows->total(),
                'per_page' => $rows->perPage(),
                'current_page' => $rows->currentPage(),
                'last_page' => $rows->lastPage(),
            ],
            'summary' => $summary,
        ]);
    }

    /**
     * GET /api/superadmin/leads/{id} — full row + recent activities.
     */
    public function show(string $id): JsonResponse
    {
        $lead = Lead::with(['facility:id,name,slug', 'activities.actor:id,name', 'assignedUser:id,name'])
            ->findOrFail($id);
        return response()->json(['data' => $lead]);
    }

    /**
     * PATCH /api/superadmin/leads/{id} — status / notes / follow-up /
     * assignment updates. Auto-records a status_change activity row
     * when the status changes; auto-records a note activity row when
     * notes content changes.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $lead = Lead::findOrFail($id);

        $data = $request->validate([
            'status' => ['sometimes', Rule::in(Lead::STATUSES)],
            'notes' => ['nullable', 'string', 'max:5000'],
            'next_follow_up_at' => ['nullable', 'date'],
            'assigned_user_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $userId = Auth::id();
        $prevStatus = $lead->status;
        $prevNotes = $lead->notes;
        $prevFollowup = $lead->next_follow_up_at?->toIso8601String();

        $lead->fill($data);
        // status=contacted snaps a contacted_at if it wasn't set before
        if (isset($data['status']) && $data['status'] === 'contacted' && ! $lead->contacted_at) {
            $lead->contacted_at = now();
        }
        $lead->save();

        if (isset($data['status']) && $data['status'] !== $prevStatus) {
            LeadActivity::create([
                'lead_id' => $lead->id,
                'type' => 'status_change',
                'actor_user_id' => $userId,
                'meta' => ['from' => $prevStatus, 'to' => $data['status']],
            ]);
        }
        if (isset($data['notes']) && $data['notes'] !== $prevNotes && $data['notes']) {
            LeadActivity::create([
                'lead_id' => $lead->id,
                'type' => 'note',
                'actor_user_id' => $userId,
                'body' => $data['notes'],
            ]);
        }
        if (array_key_exists('next_follow_up_at', $data)) {
            $newFollowup = $lead->next_follow_up_at?->toIso8601String();
            if ($newFollowup !== $prevFollowup) {
                LeadActivity::create([
                    'lead_id' => $lead->id,
                    'type' => 'followup_set',
                    'actor_user_id' => $userId,
                    'meta' => ['at' => $newFollowup],
                ]);
            }
        }

        return response()->json(['data' => $lead->fresh()->load(['facility:id,name,slug', 'activities.actor:id,name', 'assignedUser:id,name'])]);
    }

    /**
     * POST /api/superadmin/leads/{id}/activities — log a custom
     * activity (call_logged, email_sent, etc) with optional body +
     * meta. Used for ad-hoc activity that doesn't fit the
     * field-update pattern above.
     */
    public function storeActivity(Request $request, string $id): JsonResponse
    {
        $lead = Lead::findOrFail($id);

        $data = $request->validate([
            'type' => ['required', 'string', 'max:40'],
            'body' => ['nullable', 'string', 'max:5000'],
            'meta' => ['nullable', 'array'],
        ]);

        $activity = LeadActivity::create([
            'lead_id' => $lead->id,
            'actor_user_id' => Auth::id(),
            'type' => $data['type'],
            'body' => $data['body'] ?? null,
            'meta' => $data['meta'] ?? null,
        ]);

        return response()->json(['data' => $activity->load('actor:id,name')], 201);
    }

    private function buildQuery(Request $request)
    {
        $q = Lead::query();

        if ($source = $request->query('source')) {
            $q->where('source', $source);
        }
        if ($status = $request->query('status')) {
            $q->where('status', $status);
        }
        if ($facilityId = $request->query('facility_id')) {
            $q->where('facility_id', $facilityId);
        }
        if ($search = trim((string) $request->query('search', ''))) {
            $q->where(function ($w) use ($search) {
                $w->where('email', 'ilike', "%{$search}%")
                  ->orWhere('name', 'ilike', "%{$search}%")
                  ->orWhere('phone', 'ilike', "%{$search}%");
            });
        }
        if ($since = $request->query('since')) {
            $q->where('created_at', '>=', $since);
        }
        if ($until = $request->query('until')) {
            $q->where('created_at', '<=', $until);
        }

        return $q;
    }

    /**
     * Stream a CSV of the filtered leads. Memory-friendly via lazy()
     * — fine for 100k+ row exports.
     */
    private function streamCsv($q): StreamedResponse
    {
        $filename = 'carepath-leads-' . now()->format('Y-m-d-Hi') . '.csv';

        return response()->stream(function () use ($q) {
            $out = fopen('php://output', 'w');
            fputcsv($out, [
                'created_at', 'source', 'status',
                'name', 'email', 'phone', 'zip',
                'facility_slug', 'facility_name',
                'utm_source', 'utm_medium', 'utm_campaign',
                'guide_slug', 'guide_title', 'care_type',
                'relationship', 'timeline', 'consent_followup',
                'ip_address',
            ]);
            $q->with('facility:id,name,slug')
                ->orderByDesc('created_at')
                ->lazy(500)
                ->each(function (Lead $lead) use ($out) {
                    $ctx = $lead->context ?? [];
                    fputcsv($out, [
                        $lead->created_at?->toIso8601String(),
                        $lead->source,
                        $lead->status,
                        $lead->name,
                        $lead->email,
                        $lead->phone,
                        $lead->zip,
                        $lead->facility?->slug,
                        $lead->facility?->name,
                        $lead->utm_source,
                        $lead->utm_medium,
                        $lead->utm_campaign,
                        $ctx['guide_slug'] ?? null,
                        $ctx['guide_title'] ?? null,
                        $ctx['care_type'] ?? null,
                        $lead->relationship_to_prospect,
                        $ctx['timeline'] ?? null,
                        $ctx['consent_followup'] ?? null,
                        $lead->ip_address,
                    ]);
                });
            fclose($out);
        }, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }
}
