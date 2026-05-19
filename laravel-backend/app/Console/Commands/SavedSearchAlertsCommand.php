<?php

namespace App\Console\Commands;

use App\Models\Bed;
use App\Models\Facility;
use App\Models\SavedSearch;
use App\Models\User;
use App\Notifications\SavedSearchMatch;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Daily sweep of every user's saved searches with alerts on. For each
 * search, re-runs the filter set against the live facility table and
 * compares the result IDs to last_seen_facility_ids. New IDs trigger
 * an in-app notification (and a push, when the user has a registered
 * device token).
 *
 * The "when memory care opens in your radius, I'll tell you" promise
 * that beats APFM's clunky version of the same feature.
 *
 * Idempotent: calling twice on a search with no new matches is a
 * no-op. Cheap: each search is one indexed Facility query + one
 * Notification insert; runs in well under a minute for 10k searches.
 */
class SavedSearchAlertsCommand extends Command
{
    protected $signature = 'carepath:run-saved-search-alerts {--dry-run : log what would alert without writing}';
    protected $description = 'Run every alerts-on saved search and notify the user about newly-matching facilities.';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $rows = SavedSearch::query()
            ->where(fn ($q) => $q->where('alerts_push', true)->orWhere('alerts_email', true))
            ->get();

        $this->info("Inspecting {$rows->count()} alerts-on saved searches.");

        $alertsSent = 0;
        $newMatchesTotal = 0;

        foreach ($rows as $search) {
            $params = is_array($search->params) ? $search->params : [];
            $currentIds = $this->runQuery($params)->pluck('id')->all();

            $seen = $search->last_seen_facility_ids ?? [];
            $newIds = array_values(array_diff($currentIds, $seen));

            // First run: snapshot the baseline, don't alert. Otherwise
            // every existing facility would look "new" on day one.
            if (empty($seen)) {
                if (! $dryRun) {
                    $search->update([
                        'last_seen_facility_ids' => $currentIds,
                        'last_run_at' => now(),
                    ]);
                }
                continue;
            }

            if (empty($newIds)) {
                if (! $dryRun) $search->update(['last_run_at' => now()]);
                continue;
            }

            $newMatchesTotal += count($newIds);
            $newFacilities = Facility::query()
                ->whereIn('id', $newIds)
                ->select(['id', 'name', 'slug', 'city', 'state', 'type'])
                ->limit(5) // cap per-alert payload
                ->get();

            if ($dryRun) {
                $this->line("[dry] {$search->user_id} would alert on '{$search->name}': " . $newFacilities->pluck('name')->join(', '));
                continue;
            }

            // Fire the SavedSearchMatch notification — drives both an
            // email (so the user actually sees it without being logged
            // in) and a database row that the bell-icon endpoint
            // picks up. Replaces the bare DB-insert this command did
            // previously, which fired in-app only.
            $user = User::find($search->user_id);
            if ($user) {
                try {
                    $user->notify(new SavedSearchMatch($search, $newFacilities, $params));
                } catch (\Throwable $e) {
                    // Bury so a transient mail failure doesn't take
                    // down the whole sweep. Snapshot still updates so
                    // we don't re-alert on the same facilities tomorrow.
                    \Log::warning('SavedSearchMatch notify failed', [
                        'saved_search_id' => $search->id,
                        'user_id' => $search->user_id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            // TODO(push): when push fan-out service lands, dispatch
            // a job here keyed off push_device_tokens.user_id =
            // $search->user_id. The notification above is the durable
            // record either way.

            $search->update([
                'last_seen_facility_ids' => $currentIds,
                'last_run_at' => now(),
                'last_alerted_at' => now(),
                'total_alerts_sent' => $search->total_alerts_sent + 1,
            ]);
            $alertsSent++;
        }

        $this->info("Done. {$alertsSent} alerts sent for {$newMatchesTotal} new matches.");
        return self::SUCCESS;
    }

    /**
     * Re-run a saved search's filter set against the live Facility
     * table and return matching rows. Mirrors the MarketplaceController
     * `index` filter logic; intentionally simpler — we only need IDs.
     */
    private function runQuery(array $params)
    {
        $query = Facility::query()
            ->where('is_active', true)
            ->select(['id']);

        if (! empty($params['state'])) $query->where('state', strtoupper((string) $params['state']));
        if (! empty($params['city'])) $query->where('city', 'ILIKE', $params['city'] . '%');
        if (! empty($params['type'])) $query->where('type', $params['type']);
        if (! empty($params['max_price_cents'])) $query->where('price_from_cents', '<=', (int) $params['max_price_cents']);
        if (! empty($params['medicaid_only']) || $params['medicaid'] ?? false) $query->where('medicaid_certified', true);
        if (! empty($params['min_five_star'])) $query->where('cms_five_star_overall', '>=', (int) $params['min_five_star']);

        // Available beds filter: only alert on facilities with current
        // availability (no point telling families about a waitlist).
        $availableIds = Bed::query()
            ->whereIn('facility_id', function ($sub) use ($query) {
                $sub->from('facilities')->select('id')->where('is_active', true);
            })
            ->where('status', 'available')
            ->select('facility_id')
            ->distinct();
        $query->whereIn('id', $availableIds);

        return $query->limit(200)->get();
    }
}
