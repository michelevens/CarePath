<?php

namespace App\Console\Commands;

use App\Services\CmsIngestService;
use Illuminate\Console\Command;

class IngestCmsFacilities extends Command
{
    protected $signature = 'cms:ingest
        {--state= : Optional 2-letter state code to filter (e.g. AZ)}
        {--max= : Hard cap on number of facilities (default: unlimited)}';

    protected $description = 'Pull real nursing home data from CMS Provider Data and upsert into facilities table';

    public function handle(CmsIngestService $service): int
    {
        $state = $this->option('state');
        $max = $this->option('max') ? (int) $this->option('max') : null;

        $this->info(sprintf(
            'Ingesting CMS facilities%s%s…',
            $state ? ' for state ' . strtoupper($state) : ' (all states)',
            $max ? " (max {$max})" : ''
        ));

        $start = microtime(true);
        $result = $service->ingest($state, $max);
        $elapsed = round(microtime(true) - $start, 1);

        $this->info("Done in {$elapsed}s.");
        $this->table(
            ['Fetched', 'Upserted', 'Skipped'],
            [[$result['fetched'], $result['upserted'], $result['skipped']]]
        );

        return self::SUCCESS;
    }
}
