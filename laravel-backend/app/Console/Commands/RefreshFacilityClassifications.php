<?php

namespace App\Console\Commands;

use App\Models\Facility;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Pull the latest accepted_populations / payer_programs /
 * funding_authority values from each facility's state_license_category
 * back into the snapshot columns on facilities.
 *
 * Two consumers of this command:
 *
 *   1. Run automatically whenever the SuperAdmin edits a
 *      state_license_categories row (today: not wired; future: a
 *      model observer should trigger it scoped to the touched row).
 *
 *   2. Run nightly as a belt-and-suspenders sync so the snapshot
 *      columns stay current even if the observer is bypassed
 *      (e.g. direct DB edits).
 *
 *   php artisan facilities:refresh-classifications
 *   php artisan facilities:refresh-classifications --state=FL
 *   php artisan facilities:refresh-classifications --category=<uuid>
 */
class RefreshFacilityClassifications extends Command
{
    protected $signature = 'facilities:refresh-classifications {--state=} {--category=}';
    protected $description = 'Re-sync accepted_populations / payer_programs / funding_authority from state_license_categories';

    public function handle(): int
    {
        // Use a single SQL UPDATE — N facilities at a time would be
        // slow for the 16,000+ linked rows and Postgres handles this
        // as a streaming join.
        $sql = <<<'SQL'
            UPDATE facilities f
            SET
              accepted_populations = slc.accepted_populations,
              payer_programs = slc.payer_programs,
              funding_authority = slc.funding_authority,
              updated_at = NOW()
            FROM state_license_categories slc
            WHERE f.state_license_category_id = slc.id
        SQL;

        $params = [];
        if ($state = $this->option('state')) {
            $sql .= ' AND f.state = ?';
            $params[] = strtoupper($state);
        }
        if ($categoryId = $this->option('category')) {
            $sql .= ' AND f.state_license_category_id = ?';
            $params[] = $categoryId;
        }

        $start = microtime(true);
        DB::statement($sql, $params);
        $ms = (int) ((microtime(true) - $start) * 1000);

        $touched = Facility::query()
            ->whereNotNull('state_license_category_id')
            ->when($state ?? null, fn ($q, $s) => $q->where('state', strtoupper($s)))
            ->when($categoryId ?? null, fn ($q, $c) => $q->where('state_license_category_id', $c))
            ->count();

        $this->info("✓ refreshed snapshot columns on {$touched} facilities in {$ms}ms");
        return self::SUCCESS;
    }
}
