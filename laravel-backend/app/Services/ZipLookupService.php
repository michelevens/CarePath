<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

/**
 * Resolves US ZIP codes to lat/lon centroids. First checks our local
 * zip_centroids cache table; on miss, queries the free zippopotam.us
 * public API and persists the result for next time.
 *
 * Cached in-memory for the request lifetime via Cache::remember.
 */
class ZipLookupService
{
    public function lookup(string $zip): ?array
    {
        $zip = substr(preg_replace('/\D/', '', $zip) ?? '', 0, 5);
        if (strlen($zip) !== 5) {
            return null;
        }

        return Cache::remember("zip:{$zip}", now()->addDays(7), function () use ($zip) {
            $local = DB::table('zip_centroids')->where('zip', $zip)->first();
            if ($local) {
                return [
                    'zip' => $zip,
                    'city' => $local->city,
                    'state' => $local->state,
                    'lat' => (float) $local->latitude,
                    'lon' => (float) $local->longitude,
                ];
            }

            try {
                $resp = Http::timeout(5)->get("https://api.zippopotam.us/us/{$zip}");
                if (! $resp->successful()) {
                    return null;
                }
                $body = $resp->json();
                $place = $body['places'][0] ?? null;
                if (! $place) {
                    return null;
                }

                $result = [
                    'zip' => $zip,
                    'city' => $place['place name'] ?? null,
                    'state' => $place['state abbreviation'] ?? null,
                    'lat' => (float) $place['latitude'],
                    'lon' => (float) $place['longitude'],
                ];

                DB::table('zip_centroids')->updateOrInsert(
                    ['zip' => $zip],
                    [
                        'city' => $result['city'],
                        'state' => $result['state'],
                        'latitude' => $result['lat'],
                        'longitude' => $result['lon'],
                        'updated_at' => now(),
                        'created_at' => now(),
                    ]
                );

                return $result;
            } catch (\Throwable) {
                return null;
            }
        });
    }
}
