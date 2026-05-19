<?php

namespace App\Console\Commands;

use App\Models\County;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Refresh counties.facility_count from the live facility join. Lets the
 * counties table cache an authoritative count without per-page COUNT(*).
 *
 * Cheap single SQL UPDATE — sub-second on the current 21k facility set,
 * runs well into the millions before becoming a meaningful chore.
 *
 *   php artisan counties:refresh-counts
 *   php artisan counties:refresh-counts --state=FL
 */
class RefreshCountyCounts extends Command
{
    protected $signature = 'counties:refresh-counts {--state=}';
    protected $description = 'Refresh counties.facility_count from the live facility join';

    public function handle(): int
    {
        $sql = <<<'SQL'
            UPDATE counties c
            SET facility_count = (
              SELECT COUNT(*)
              FROM facilities f
              WHERE f.county_id = c.id
                AND f.is_active = true
            )
        SQL;

        $params = [];
        if ($state = $this->option('state')) {
            $sql .= ' WHERE c.state = ?';
            $params[] = strtoupper($state);
        }

        $start = microtime(true);
        DB::statement($sql, $params);
        $ms = (int) ((microtime(true) - $start) * 1000);

        $touched = County::query()
            ->when($state ?? null, fn ($q, $s) => $q->where('state', strtoupper($s)))
            ->count();

        $this->info("✓ refreshed facility_count on {$touched} counties in {$ms}ms");
        return self::SUCCESS;
    }
}
