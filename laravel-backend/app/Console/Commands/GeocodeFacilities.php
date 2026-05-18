<?php

namespace App\Console\Commands;

use App\Models\Facility;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Backfill latitude/longitude on facilities that came in from a CSV
 * ingest (state licensure files like FL APD, FL AHCA, CA CCLD) which
 * publish street + city + state + ZIP but not coordinates.
 *
 * Strategy: ZIP centroid lookups via Nominatim. Far cheaper than
 * per-address geocoding when the same ZIP repeats across hundreds of
 * facilities (FL APD: 2,219 facilities, only 504 unique ZIPs).
 * Results cache into the zip_centroids table so subsequent runs +
 * the ZipLookupService share the cache.
 *
 *   php artisan facilities:geocode --source=fl_apd
 *   php artisan facilities:geocode --state=FL
 *   php artisan facilities:geocode               # everything missing lat/lon
 *
 * Rate-limited to 1 req/sec per Nominatim's usage policy.
 */
class GeocodeFacilities extends Command
{
    protected $signature = 'facilities:geocode {--source=} {--state=} {--limit=10000}';
    protected $description = 'Backfill facility lat/lon from ZIP via Nominatim';

    public function handle(): int
    {
        $q = Facility::query()
            ->whereNull('latitude')
            ->whereNotNull('zip')
            ->where('zip', '!=', '');

        if ($source = $this->option('source')) $q->where('data_source', $source);
        if ($state = $this->option('state')) $q->where('state', strtoupper($state));

        $facilities = $q->limit((int) $this->option('limit'))->get(['id', 'zip']);
        if ($facilities->isEmpty()) {
            $this->info('No facilities need geocoding.');
            return self::SUCCESS;
        }

        // Bucket by ZIP — one Nominatim hit per unique ZIP, then write
        // back the centroid to every facility in that bucket.
        $byZip = $facilities->groupBy(fn ($f) => substr($f->zip, 0, 5));

        $this->info("Geocoding " . $facilities->count() . " facilities across " . $byZip->count() . " unique ZIPs.");
        $cacheHits = 0;
        $nominatimHits = 0;
        $failed = 0;

        foreach ($byZip as $zip => $rows) {
            // Cache first.
            $cached = DB::table('zip_centroids')->where('zip', $zip)->first();
            if ($cached) {
                $cacheHits++;
            } else {
                $coords = $this->lookupZip((string) $zip);
                if (! $coords) {
                    $failed++;
                    $this->warn("  ✗ {$zip} — Nominatim returned no result");
                    // Throttle even on miss so we don't burst Nominatim.
                    usleep(1_100_000);
                    continue;
                }
                $nominatimHits++;
                DB::table('zip_centroids')->updateOrInsert(
                    ['zip' => $zip],
                    [
                        'city' => $coords['city'] ?? null,
                        'state' => $coords['state'] ?? null,
                        'latitude' => $coords['lat'],
                        'longitude' => $coords['lon'],
                        'updated_at' => now(),
                        'created_at' => now(),
                    ]
                );
                $cached = (object) [
                    'latitude' => $coords['lat'],
                    'longitude' => $coords['lon'],
                ];
                // Nominatim usage policy: max 1 request per second.
                usleep(1_100_000);
            }

            Facility::whereIn('id', $rows->pluck('id'))
                ->update([
                    'latitude' => $cached->latitude,
                    'longitude' => $cached->longitude,
                ]);
        }

        $this->info("✓ done — cache hits: {$cacheHits}, Nominatim hits: {$nominatimHits}, failed: {$failed}");
        return self::SUCCESS;
    }

    /**
     * Forward-geocode a US ZIP via Nominatim. Returns lat/lon + city +
     * state, or null if the ZIP isn't recognized.
     */
    private function lookupZip(string $zip): ?array
    {
        try {
            $resp = Http::timeout(10)
                ->withHeaders([
                    'User-Agent' => 'CarePath/1.0 (hello@carepath.io)',
                    'Accept-Language' => 'en-US,en',
                ])
                ->get('https://nominatim.openstreetmap.org/search', [
                    'postalcode' => $zip,
                    'countrycodes' => 'us',
                    'format' => 'json',
                    'limit' => 1,
                    'addressdetails' => 1,
                ]);

            if (! $resp->successful()) {
                Log::warning('Nominatim ZIP search non-200', ['zip' => $zip, 'status' => $resp->status()]);
                return null;
            }
            $body = $resp->json();
            $hit = $body[0] ?? null;
            if (! $hit) return null;
            $addr = $hit['address'] ?? [];
            return [
                'lat' => (float) $hit['lat'],
                'lon' => (float) $hit['lon'],
                'city' => $addr['city'] ?? $addr['town'] ?? $addr['village'] ?? null,
                'state' => isset($addr['ISO3166-2-lvl4']) ? substr($addr['ISO3166-2-lvl4'], -2) : null,
            ];
        } catch (\Throwable $e) {
            Log::warning('Nominatim ZIP search threw', ['zip' => $zip, 'error' => $e->getMessage()]);
            return null;
        }
    }
}
