<?php

namespace App\Services;

use App\Models\Facility;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Ingests long-term care facilities from OpenStreetMap via the Overpass API.
 *
 * Why OSM: ALFs, memory care, and CCRCs are regulated by individual states
 * (not Medicare), so there's no single federal dataset. OSM is the only
 * uniform, legal, free source covering all 50 states. Quality is uneven —
 * great in metros, sparse rural — but it's a strong baseline.
 *
 * Endpoint: https://overpass-api.de/api/interpreter (POST)
 * Slug strategy: `osm-{type}-{id}` so OSM records dedupe cleanly against
 *   existing `cms-{ccn}` records (same name + city OK to keep both — the
 *   OSM record carries ALF/memory_care typing the CMS record doesn't).
 */
class OsmIngestService
{
    private const ENDPOINT = 'https://overpass-api.de/api/interpreter';

    /**
     * Run the ingest for one state.
     *
     * @return array{fetched:int, upserted:int, skipped:int}
     */
    public function ingest(string $state, ?int $limit = null): array
    {
        $stateCode = strtoupper($state);
        $query = $this->buildQuery($stateCode);

        $resp = Http::timeout(180)
            ->withHeaders(['User-Agent' => 'CarePath/1.0 (https://github.com/michelevens/CarePath)'])
            ->asForm()
            ->post(self::ENDPOINT, ['data' => $query]);

        if ($resp->failed()) {
            Log::warning('OSM Overpass query failed', [
                'state' => $stateCode,
                'status' => $resp->status(),
                'body' => substr($resp->body(), 0, 500),
            ]);
            return ['fetched' => 0, 'upserted' => 0, 'skipped' => 0];
        }

        $elements = $resp->json('elements', []);
        $fetched = count($elements);
        $upserted = 0;
        $skipped = 0;

        foreach ($elements as $el) {
            if ($limit !== null && $upserted >= $limit) break;

            $mapped = $this->mapElement($el, $stateCode);
            if (! $mapped) {
                $skipped++;
                continue;
            }

            Facility::updateOrCreate(
                ['slug' => $mapped['slug']],
                $mapped
            );
            $upserted++;
        }

        return compact('fetched', 'upserted', 'skipped');
    }

    private function buildQuery(string $state): string
    {
        // Pull anything tagged as a senior/long-term care facility in this
        // state. The union covers the four main OSM tag conventions:
        //   amenity=nursing_home  → SNF/ALF (most common)
        //   social_facility=assisted_living
        //   social_facility=nursing_home
        //   social_facility:for=senior
        return <<<OVERPASS
[out:json][timeout:150];
area["ISO3166-2"="US-{$state}"]->.a;
(
  node["amenity"="nursing_home"](area.a);
  way["amenity"="nursing_home"](area.a);
  node["social_facility"="assisted_living"](area.a);
  way["social_facility"="assisted_living"](area.a);
  node["social_facility"="nursing_home"](area.a);
  way["social_facility"="nursing_home"](area.a);
  node["social_facility"="group_home"]["social_facility:for"="senior"](area.a);
  way["social_facility"="group_home"]["social_facility:for"="senior"](area.a);
);
out center tags;
OVERPASS;
    }

    /**
     * @param  array<string, mixed>  $el
     * @return array<string, mixed>|null
     */
    private function mapElement(array $el, string $stateCode): ?array
    {
        $tags = $el['tags'] ?? [];
        $name = $tags['name'] ?? null;
        $id = $el['id'] ?? null;
        $osmType = $el['type'] ?? null; // node | way | relation

        if (! $name || ! $id || ! $osmType) return null;

        // ways have coords at center.{lat,lon}; nodes have lat/lon at root
        $lat = $el['lat'] ?? ($el['center']['lat'] ?? null);
        $lon = $el['lon'] ?? ($el['center']['lon'] ?? null);

        // Require name + state (state comes from the Overpass area filter)
        // plus EITHER a street address OR lat/lon. Missing city/zip is fine —
        // reverse geocoding can backfill those later.
        $addr = $this->buildAddress($tags);
        $hasGeo = is_numeric($lat) && is_numeric($lon);
        if (! $addr && ! $hasGeo) return null;

        $city = $tags['addr:city']
            ?? $tags['is_in:city']
            ?? null;
        $zip = $tags['addr:postcode']
            ?? $tags['postal_code']
            ?? null;

        $type = $this->detectType($name, $tags);

        return [
            'slug' => "osm-{$osmType}-{$id}",
            'name' => Str::title(Str::lower($name)),
            'type' => $type,
            'address_line_1' => $addr,
            'city' => $city ? Str::title(Str::lower($city)) : null,
            'state' => $stateCode,
            'zip' => $this->normalizeZip($zip),
            'county' => $tags['addr:county'] ?? null,
            'latitude' => is_numeric($lat) ? (float) $lat : null,
            'longitude' => is_numeric($lon) ? (float) $lon : null,
            'phone' => $this->normalizePhone($tags['phone'] ?? $tags['contact:phone'] ?? null),
            'website' => $tags['website'] ?? $tags['contact:website'] ?? null,
            'email' => $tags['email'] ?? $tags['contact:email'] ?? null,
            // OSM doesn't tell us about Medicare/Medicaid certification — leave
            // false. CMS-cross-referenced records would override this.
            'medicaid_certified' => false,
            'medicare_certified' => false,
            'total_beds' => isset($tags['capacity']) && is_numeric($tags['capacity'])
                ? (int) $tags['capacity']
                : 0,
            'is_active' => true,
            'data_source' => 'osm',
        ];
    }

    private function buildAddress(array $tags): ?string
    {
        $house = trim((string) ($tags['addr:housenumber'] ?? ''));
        $street = trim((string) ($tags['addr:street'] ?? ''));
        if ($street === '') return null;
        return $house !== '' ? "{$house} {$street}" : $street;
    }

    /**
     * Heuristic — OSM tagging is inconsistent so we lean on the facility name
     * for memory care and CCRC signals.
     */
    private function detectType(string $name, array $tags): string
    {
        $haystack = strtolower($name . ' ' . ($tags['description'] ?? ''));

        if (preg_match('/\bmemory\b|alzheimer|dementia/', $haystack)) {
            return 'memory_care';
        }
        if (preg_match('/\bccrc\b|continuing care|life plan/', $haystack)) {
            return 'ccrc';
        }
        if (($tags['social_facility'] ?? null) === 'assisted_living') {
            return 'assisted_living';
        }
        if (preg_match('/assisted living|senior living/', $haystack)) {
            return 'assisted_living';
        }
        if (($tags['social_facility'] ?? null) === 'nursing_home') {
            return 'snf';
        }
        if (($tags['amenity'] ?? null) === 'nursing_home') {
            // amenity=nursing_home is ambiguous in OSM — it covers both SNFs
            // and ALFs. Default to assisted_living since that's the larger
            // population we're missing (CMS gives us SNFs already).
            return 'assisted_living';
        }
        return 'assisted_living';
    }

    private function normalizeZip(?string $zip): ?string
    {
        if (! $zip) return null;
        $digits = preg_replace('/\D/', '', $zip);
        return substr(str_pad($digits, 5, '0', STR_PAD_LEFT), 0, 5);
    }

    private function normalizePhone(?string $phone): ?string
    {
        if (! $phone) return null;
        $digits = preg_replace('/\D/', '', $phone);
        if (strlen($digits) === 11 && str_starts_with($digits, '1')) {
            $digits = substr($digits, 1);
        }
        if (strlen($digits) !== 10) return $phone;
        return sprintf('(%s) %s-%s', substr($digits, 0, 3), substr($digits, 3, 3), substr($digits, 6, 4));
    }
}
