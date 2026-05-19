<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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
