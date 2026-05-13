<?php

namespace App\Console\Commands;

use App\Services\OsmIngestService;
use Illuminate\Console\Command;

/**
 * Ingests assisted living / memory care / CCRC facilities from
 * OpenStreetMap via the Overpass API.
 *
 * Usage:
 *   php artisan facilities:ingest-osm --state=FL
 *   php artisan facilities:ingest-osm --state=FL,GA,TX
 *   php artisan facilities:ingest-osm --state=ALL --limit=500
 */
class IngestOsmFacilities extends Command
{
    protected $signature = 'facilities:ingest-osm
        {--state= : Comma-separated 2-letter codes, or "ALL"}
        {--limit= : Max facilities per state}';

    protected $description = 'Pull ALF / memory care / CCRC from OpenStreetMap';

    /** All 50 US states. */
    private const ALL_STATES = [
        'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
        'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
        'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
        'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
        'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
    ];

    public function handle(OsmIngestService $service): int
    {
        $stateArg = $this->option('state');
        if (! $stateArg) {
            $this->error('Pass --state=FL or --state=ALL');
            return self::FAILURE;
        }

        $limit = $this->option('limit') ? (int) $this->option('limit') : null;
        $states = strtoupper($stateArg) === 'ALL'
            ? self::ALL_STATES
            : array_map('trim', explode(',', strtoupper($stateArg)));

        $totals = ['fetched' => 0, 'upserted' => 0, 'skipped' => 0];

        foreach ($states as $state) {
            $this->line("→ {$state}…");
            try {
                $r = $service->ingest($state, $limit);
            } catch (\Throwable $e) {
                $this->warn("  failed: " . $e->getMessage());
                continue;
            }
            $this->info(sprintf(
                '  %s: fetched=%d upserted=%d skipped=%d',
                $state, $r['fetched'], $r['upserted'], $r['skipped']
            ));
            $totals['fetched'] += $r['fetched'];
            $totals['upserted'] += $r['upserted'];
            $totals['skipped'] += $r['skipped'];

            // Overpass is polite — give it a breath between large state queries.
            if (count($states) > 1) {
                usleep(800_000);
            }
        }

        $this->info(sprintf(
            '✓ done — fetched=%d upserted=%d skipped=%d across %d state(s)',
            $totals['fetched'], $totals['upserted'], $totals['skipped'], count($states)
        ));

        return self::SUCCESS;
    }
}
