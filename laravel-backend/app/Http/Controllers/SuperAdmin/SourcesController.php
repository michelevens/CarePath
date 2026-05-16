<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\DataSourceSchema;
use App\Models\Facility;
use App\Services\CmsIngestService;
use App\Services\OsmIngestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

/**
 * SuperAdmin facility-source dashboard. Surfaces the data_source column
 * stats and exposes "run again" endpoints for each ingester (CMS,
 * OSM, CSV-upload).
 *
 * The synchronous endpoints here are bounded — per-state runs only —
 * so they fit inside the request timeout. National pulls (all 50
 * states for OSM, full CMS national dataset) still need to go through
 * the artisan worker; surface them via instructions, not the UI, for
 * now.
 */
class SourcesController extends Controller
{
    /**
     * GET /api/superadmin/sources
     *
     * Returns per-source statistics: row count, last cms_synced_at
     * (where applicable), and a breakdown of type coverage so the
     * SuperAdmin can see, e.g., that OSM gave them 12k ALFs but
     * zero SNFs (because SNFs are CMS-only).
     */
    public function index(): JsonResponse
    {
        // Group by data_source. Coalesce nulls to "unknown" so the
        // pre-ingest demo seeds (Sunset Manor etc.) show up too.
        $rows = Facility::query()
            ->selectRaw("coalesce(data_source, 'unknown') as source")
            ->selectRaw('count(*) as facility_count')
            ->selectRaw('count(distinct state) as state_count')
            ->selectRaw('max(cms_synced_at) as last_synced_at')
            ->selectRaw("count(*) filter (where type = 'snf') as snf_count")
            ->selectRaw("count(*) filter (where type = 'assisted_living') as alf_count")
            ->selectRaw("count(*) filter (where type = 'memory_care') as mc_count")
            ->selectRaw("count(*) filter (where type = 'ccrc') as ccrc_count")
            ->selectRaw("count(*) filter (where type = 'independent_living') as il_count")
            ->selectRaw("count(*) filter (where type = 'group_home') as gh_count")
            ->selectRaw("count(*) filter (where type = 'adult_family_home') as afh_count")
            ->selectRaw("count(*) filter (where type = 'icf_iid') as icf_count")
            ->groupBy('source')
            ->orderByDesc('facility_count')
            ->get();

        // Per-type coverage across the whole platform — useful when a
        // SuperAdmin asks "do we have enough ICF/IID coverage yet?"
        $byType = Facility::query()
            ->selectRaw('type, count(*) as c')
            ->groupBy('type')
            ->pluck('c', 'type');

        $totalFacilities = Facility::count();

        return response()->json([
            'data' => [
                'sources' => $rows->map(fn ($r) => [
                    'source' => $r->source,
                    'facility_count' => (int) $r->facility_count,
                    'state_count' => (int) $r->state_count,
                    'last_synced_at' => $r->last_synced_at,
                    'by_type' => [
                        'snf' => (int) $r->snf_count,
                        'assisted_living' => (int) $r->alf_count,
                        'memory_care' => (int) $r->mc_count,
                        'ccrc' => (int) $r->ccrc_count,
                        'independent_living' => (int) $r->il_count,
                        'group_home' => (int) $r->gh_count,
                        'adult_family_home' => (int) $r->afh_count,
                        'icf_iid' => (int) $r->icf_count,
                    ],
                ]),
                'totals' => [
                    'facility_count' => $totalFacilities,
                    'by_type' => collect(Facility::TYPES)
                        ->mapWithKeys(fn ($t) => [$t => (int) ($byType[$t] ?? 0)])
                        ->all(),
                ],
                // Reference schemas seeded from research — drives the
                // per-source detail panel + the upload form's source
                // picker. Sorted by access tier so the easy ones
                // (CMS, OSM) show first.
                'schemas' => DataSourceSchema::query()
                    ->orderBy('access_tier')
                    ->orderBy('state')
                    ->orderBy('display_name')
                    ->get(),
                'tier_labels' => DataSourceSchema::TIERS,
            ],
        ]);
    }

    /**
     * POST /api/superadmin/sources/cms/run
     *
     * Pulls CMS Nursing Home Compare for a single state. SNFs only —
     * CMS doesn't publish ALF/IL/group-home data federally. Bounded
     * to max=2000 to stay within the request timeout; a national pull
     * has to be done from the worker.
     */
    public function runCms(Request $request, CmsIngestService $service): JsonResponse
    {
        $data = $request->validate([
            'state' => ['required', 'string', 'size:2'],
            'max' => ['nullable', 'integer', 'min:1', 'max:2000'],
        ]);

        try {
            $result = $service->ingest($data['state'], $data['max'] ?? 2000);
            Log::info('SourcesController::runCms', $result + ['state' => $data['state']]);
            return response()->json(['ok' => true, 'result' => $result]);
        } catch (\Throwable $e) {
            Log::error('SourcesController::runCms failed', [
                'state' => $data['state'],
                'error' => $e->getMessage(),
            ]);
            return response()->json([
                'ok' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /api/superadmin/sources/osm/run
     *
     * Pulls OpenStreetMap for ALF/MC/CCRC in a single state. Polite
     * to the Overpass API — bounded to 500 results per call. National
     * runs need to be CLI-only (workers, with the 800ms sleep between
     * states that the artisan command already enforces).
     */
    public function runOsm(Request $request, OsmIngestService $service): JsonResponse
    {
        $data = $request->validate([
            'state' => ['required', 'string', 'size:2'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:500'],
        ]);

        try {
            $result = $service->ingest($data['state'], $data['limit'] ?? 500);
            Log::info('SourcesController::runOsm', $result + ['state' => $data['state']]);
            return response()->json(['ok' => true, 'result' => $result]);
        } catch (\Throwable $e) {
            Log::error('SourcesController::runOsm failed', [
                'state' => $data['state'],
                'error' => $e->getMessage(),
            ]);
            return response()->json([
                'ok' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /api/superadmin/sources/csv/upload
     *
     * Accepts a state licensure CSV upload. File is staged to local
     * storage then handed to the existing facilities:ingest-csv
     * artisan command, which streams it row-by-row and is therefore
     * safe even for 10k-row files within a request timeout.
     */
    public function uploadCsv(Request $request): JsonResponse
    {
        $data = $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:20480'], // 20MB
            'state' => ['nullable', 'string', 'size:2'],     // optional when source is single-state
            'source' => ['required', 'string', Rule::exists('data_source_schemas', 'source_key')],
        ]);
        // Default state to the schema's pinned state if the user
        // didn't override (e.g. fl_apd is always FL).
        if (empty($data['state'])) {
            $schema = DataSourceSchema::where('source_key', $data['source'])->first();
            $data['state'] = $schema?->state ?? '';
        }
        if (strlen((string) $data['state']) !== 2) {
            return response()->json(['ok' => false, 'message' => 'State is required'], 422);
        }

        $file = $request->file('file');
        // Stage outside the public storage dir; we just need a temp
        // path we control and can clean up after the artisan call.
        $tmpPath = storage_path('app/csv-ingest-' . uniqid() . '.csv');
        $file->move(dirname($tmpPath), basename($tmpPath));

        try {
            $exitCode = Artisan::call('facilities:ingest-csv', [
                'path' => $tmpPath,
                '--state' => strtoupper($data['state']),
                '--source' => strtolower($data['source']),
            ]);
            $output = Artisan::output();
        } finally {
            @unlink($tmpPath);
        }

        return response()->json([
            'ok' => $exitCode === 0,
            'exit_code' => $exitCode,
            'output' => $output,
        ], $exitCode === 0 ? 200 : 500);
    }
}
