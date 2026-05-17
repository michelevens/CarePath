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
     * the "Use my location" affordance on SearchPage. Reads from
     * zip_centroids only — no external lookup, since we'd need to
     * download the full ZIP file to do a real nearest-neighbor.
     *
     * Uses a coarse degree-bbox prefilter (1° ≈ 69 mi) so we don't
     * scan all 41k US ZIP centroids per request.
     */
    public function nearest(float $lat, float $lon): ?array
    {
        $degDelta = 0.5; // ~35 mi half-side bbox

        $candidates = DB::table('zip_centroids')
            ->whereBetween('latitude', [$lat - $degDelta, $lat + $degDelta])
            ->whereBetween('longitude', [$lon - $degDelta, $lon + $degDelta])
            ->limit(500)
            ->get(['zip', 'city', 'state', 'latitude', 'longitude']);

        if ($candidates->isEmpty()) {
            return null;
        }

        $best = null;
        $bestDist = INF;
        foreach ($candidates as $c) {
            $dLat = (float) $c->latitude - $lat;
            $dLon = (float) $c->longitude - $lon;
            // Squared distance is sufficient for argmin — skip sqrt.
            $dist = $dLat * $dLat + $dLon * $dLon;
            if ($dist < $bestDist) {
                $bestDist = $dist;
                $best = $c;
            }
        }

        return $best ? [
            'zip' => $best->zip,
            'city' => $best->city,
            'state' => $best->state,
            'lat' => (float) $best->latitude,
            'lon' => (float) $best->longitude,
        ] : null;
    }
}
