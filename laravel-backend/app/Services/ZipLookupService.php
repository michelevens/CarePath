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

    /**
     * Find the nearest ZIP centroid to a (lat, lon) point. Used by
     * the "Use my location" affordance on SearchPage.
     *
     * Strategy:
     *   1. Local zip_centroids table (~35mi half-side bbox prefilter
     *      + argmin on squared distance) — instant when populated.
     *   2. Nominatim (OpenStreetMap) reverse geocode fallback — free,
     *      covers all US points, rate-limited to ~1 req/sec/IP. Cache
     *      the result back into zip_centroids so we only ask once per
     *      neighborhood.
     */
    public function nearest(float $lat, float $lon): ?array
    {
        $degDelta = 0.5; // ~35 mi half-side bbox

        $candidates = DB::table('zip_centroids')
            ->whereBetween('latitude', [$lat - $degDelta, $lat + $degDelta])
            ->whereBetween('longitude', [$lon - $degDelta, $lon + $degDelta])
            ->limit(500)
            ->get(['zip', 'city', 'state', 'latitude', 'longitude']);

        if ($candidates->isNotEmpty()) {
            $best = null;
            $bestDist = INF;
            foreach ($candidates as $c) {
                $dLat = (float) $c->latitude - $lat;
                $dLon = (float) $c->longitude - $lon;
                $dist = $dLat * $dLat + $dLon * $dLon;
                if ($dist < $bestDist) {
                    $bestDist = $dist;
                    $best = $c;
                }
            }
            return [
                'zip' => $best->zip,
                'city' => $best->city,
                'state' => $best->state,
                'lat' => (float) $best->latitude,
                'lon' => (float) $best->longitude,
            ];
        }

        // Fallback: Nominatim reverse geocode. Free, no key needed,
        // but requires a User-Agent and is rate-limited. We cache hits
        // back into zip_centroids so the next visitor from the same
        // neighborhood gets the fast path.
        //
        // zoom must be 16+ to reliably get the postcode tag in the
        // response — at city-level (zoom 10) postcode is almost never
        // populated. Previous version used 10 and silently returned
        // null for every lookup.
        try {
            $resp = Http::timeout(8)
                ->withHeaders([
                    'User-Agent' => 'CarePath/1.0 (hello@carepath.io)',
                    'Accept-Language' => 'en-US,en',
                ])
                ->get('https://nominatim.openstreetmap.org/reverse', [
                    'format' => 'json',
                    'lat' => $lat,
                    'lon' => $lon,
                    'zoom' => 16,
                    'addressdetails' => 1,
                    'countrycodes' => 'us',
                ]);

            if (! $resp->successful()) {
                \Log::warning('Nominatim reverse-zip non-200', ['status' => $resp->status()]);
                return null;
            }
            $body = $resp->json();
            $addr = $body['address'] ?? [];
            $zip = $addr['postcode'] ?? null;
            if (! $zip || ! preg_match('/^\d{5}/', $zip, $m)) {
                \Log::info('Nominatim no postcode in response', ['lat' => $lat, 'lon' => $lon, 'addr_keys' => array_keys($addr)]);
                return null;
            }
            $zip = $m[0];
            $city = $addr['city'] ?? $addr['town'] ?? $addr['village'] ?? $addr['hamlet'] ?? $addr['county'] ?? null;
            $state = isset($addr['ISO3166-2-lvl4']) ? substr($addr['ISO3166-2-lvl4'], -2) : null;

            DB::table('zip_centroids')->updateOrInsert(
                ['zip' => $zip],
                [
                    'city' => $city,
                    'state' => $state,
                    'latitude' => (float) ($body['lat'] ?? $lat),
                    'longitude' => (float) ($body['lon'] ?? $lon),
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );

            return [
                'zip' => $zip,
                'city' => $city,
                'state' => $state,
                'lat' => (float) ($body['lat'] ?? $lat),
                'lon' => (float) ($body['lon'] ?? $lon),
            ];
        } catch (\Throwable $e) {
            \Log::warning('Nominatim reverse-zip threw', ['error' => $e->getMessage()]);
            return null;
        }
    }
}
