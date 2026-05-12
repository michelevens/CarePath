<?php

namespace App\Services;

use App\Models\Facility;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Ingests real US nursing home data from the CMS "Provider Information"
 * dataset (Nursing Home Compare).
 *
 * Endpoint: https://data.cms.gov/provider-data/api/1/datastore/query/4pq5-n9py/0
 * Public, no auth required. Idempotent on cms_certification_number — re-running
 * updates existing rows in place rather than inserting duplicates.
 */
class CmsIngestService
{
    private const ENDPOINT = 'https://data.cms.gov/provider-data/api/1/datastore/query/4pq5-n9py/0';
    private const PAGE_SIZE = 500;

    /**
     * Ingest facilities from CMS, optionally filtered by state.
     *
     * @param  string|null  $state  2-letter state code (AZ, CA, TX, …) or null for all states
     * @param  int|null  $maxFacilities  Hard cap on number of rows to ingest (null = no cap)
     * @return array{fetched: int, upserted: int, skipped: int}
     */
    public function ingest(?string $state = null, ?int $maxFacilities = null): array
    {
        $fetched = 0;
        $upserted = 0;
        $skipped = 0;
        $offset = 0;
        $now = now();

        while (true) {
            $payload = [
                'limit' => self::PAGE_SIZE,
                'offset' => $offset,
            ];

            if ($state) {
                $payload['conditions'] = [
                    ['resource' => 't', 'property' => 'state', 'value' => strtoupper($state), 'operator' => '='],
                ];
            }

            $resp = Http::timeout(30)->retry(2, 1000)->get(self::ENDPOINT, $payload);

            if ($resp->failed()) {
                Log::warning('CMS ingest page failed', [
                    'offset' => $offset,
                    'status' => $resp->status(),
                ]);
                break;
            }

            $rows = $resp->json('results', []);
            if (empty($rows)) {
                break;
            }

            foreach ($rows as $row) {
                $fetched++;

                $ccn = $row['cms_certification_number_ccn'] ?? null;
                $name = $row['provider_name'] ?? null;
                if (! $ccn || ! $name) {
                    $skipped++;
                    continue;
                }

                $attrs = $this->mapRow($row, $now);

                Facility::updateOrCreate(
                    ['cms_certification_number' => $ccn],
                    $attrs
                );
                $upserted++;

                if ($maxFacilities !== null && $upserted >= $maxFacilities) {
                    return compact('fetched', 'upserted', 'skipped');
                }
            }

            $offset += self::PAGE_SIZE;

            // Safety guard — bail after pulling a generous chunk even without
            // a hard cap, to avoid runaway requests.
            if ($offset > 25_000) {
                break;
            }
        }

        return compact('fetched', 'upserted', 'skipped');
    }

    /**
     * @param  array<string, mixed>  $row
     * @return array<string, mixed>
     */
    private function mapRow(array $row, \DateTimeInterface $now): array
    {
        $name = $row['provider_name'] ?? '';
        $ccn = $row['cms_certification_number_ccn'] ?? '';
        $ownership = $row['ownership_type'] ?? null;
        $state = $row['state'] ?? null;
        $city = $row['citytown'] ?? null;

        return [
            'name' => Str::title(Str::lower($name)),
            'slug' => 'cms-' . $ccn,
            // All CMS-tracked nursing homes are SNFs (Medicare/Medicaid certified).
            'type' => 'snf',
            'ownership_type' => $ownership,
            'address_line_1' => $row['provider_address'] ?? '',
            'city' => $city ? Str::title(Str::lower($city)) : null,
            'state' => $state ? strtoupper($state) : null,
            'zip' => $this->normalizeZip($row['zip_code'] ?? null),
            'county' => $row['countyparish'] ?? null,
            'latitude' => $this->numOrNull($row['latitude'] ?? null),
            'longitude' => $this->numOrNull($row['longitude'] ?? null),
            'phone' => $this->normalizePhone($row['telephone_number'] ?? null),
            'medicaid_certified' => ($row['provider_type'] ?? '') === 'Medicare and Medicaid',
            'medicare_certified' => str_contains((string) ($row['provider_type'] ?? ''), 'Medicare'),
            'cms_five_star_overall' => $this->intOrNull($row['overall_rating'] ?? null),
            'cms_five_star_health_inspection' => $this->intOrNull($row['health_inspection_rating'] ?? null),
            'cms_five_star_staffing' => $this->intOrNull($row['staffing_rating'] ?? null),
            'cms_five_star_quality' => $this->intOrNull($row['qm_rating'] ?? null),
            'total_beds' => $this->intOrNull($row['number_of_certified_beds'] ?? null) ?? 0,
            'average_residents_per_day' => $this->numOrNull($row['average_number_of_residents_per_day'] ?? null),
            'is_active' => true,
            'data_source' => 'cms_pdc',
            'cms_synced_at' => $now,
        ];
    }

    private function intOrNull($v): ?int
    {
        if ($v === null || $v === '' || ! is_numeric($v)) {
            return null;
        }
        return (int) $v;
    }

    private function numOrNull($v): ?float
    {
        if ($v === null || $v === '' || ! is_numeric($v)) {
            return null;
        }
        return (float) $v;
    }

    private function normalizeZip(?string $zip): ?string
    {
        if (! $zip) {
            return null;
        }
        return substr(str_pad($zip, 5, '0', STR_PAD_LEFT), 0, 5);
    }

    private function normalizePhone(?string $phone): ?string
    {
        if (! $phone) {
            return null;
        }
        $digits = preg_replace('/\D/', '', $phone);
        if (strlen($digits) !== 10) {
            return $phone;
        }
        return sprintf('(%s) %s-%s', substr($digits, 0, 3), substr($digits, 3, 3), substr($digits, 6, 4));
    }
}
