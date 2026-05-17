<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\SavedSearch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

/**
 * Health + manual-trigger surface for scheduled artisan jobs. Lets
 * a SuperAdmin verify the Railway worker process is actually firing
 * the schedule, and to manually trigger a sweep when testing.
 *
 * Without this, the only way to know if `php artisan schedule:run`
 * is alive on Railway is to log into the dashboard and check the
 * worker logs — too far from where the failure shows up.
 */
class ScheduledJobsController extends Controller
{
    /**
     * GET /api/superadmin/scheduled-jobs/health
     *
     * Snapshot for the SuperAdmin dashboard widget. Per-job: how many
     * subscriptions, when the last run was, alerts fired in last 24h.
     */
    public function health(Request $request): JsonResponse
    {
        // Saved-search alerts
        $totalSearches = SavedSearch::query()
            ->where(fn ($q) => $q->where('alerts_push', true)->orWhere('alerts_email', true))
            ->count();
        $latestRun = SavedSearch::query()
            ->whereNotNull('last_run_at')
            ->orderByDesc('last_run_at')
            ->value('last_run_at');
        $alertsLast24h = Notification::query()
            ->where('type', 'App\\Notifications\\SavedSearchMatch')
            ->where('created_at', '>=', now()->subDay())
            ->count();

        return response()->json([
            'data' => [
                'saved_search_alerts' => [
                    'enabled_searches' => $totalSearches,
                    'last_run_at' => $latestRun,
                    'alerts_last_24h' => $alertsLast24h,
                    'schedule' => 'daily at 13:00 UTC (9am ET)',
                    'command' => 'carepath:run-saved-search-alerts',
                ],
                // Future jobs add here so the widget grows with us:
                // placements:advance-milestones, sponsored:reset-daily, etc.
            ],
        ]);
    }

    /**
     * POST /api/superadmin/scheduled-jobs/run/{command}
     *
     * Synchronously invokes a whitelisted artisan command and returns
     * its exit code + tail of output. Useful for SuperAdmins to verify
     * a job works end-to-end without waiting for the scheduler.
     */
    public function runNow(Request $request, string $command): JsonResponse
    {
        // Strict allowlist — never trust route input to invoke arbitrary
        // commands. Keep this synced with what the Schedule actually runs.
        $allowed = [
            'carepath:run-saved-search-alerts',
            'placements:advance-milestones',
            'sponsored:reset-daily',
        ];
        if (! in_array($command, $allowed, true)) {
            abort(404, 'Unknown scheduled command.');
        }

        $dryRun = (bool) $request->query('dry_run', false);
        $args = $dryRun ? ['--dry-run' => true] : [];

        $exit = Artisan::call($command, $args);
        $output = Artisan::output();

        return response()->json([
            'data' => [
                'command' => $command,
                'dry_run' => $dryRun,
                'exit_code' => $exit,
                'output' => $output,
                'completed_at' => now()->toIso8601String(),
            ],
        ]);
    }
}
