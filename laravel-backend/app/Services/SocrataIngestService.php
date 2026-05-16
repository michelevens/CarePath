<?php

namespace App\Services;

use App\Models\DataSourceSchema;
use App\Models\Facility;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Generic ingest service for Socrata-backed open-data portals
 * (NY DOH health.data.ny.gov, several other state data portals).
 *
 * Works against any data_source_schema row where:
 *   - access_tier = 1
 *   - api_endpoint is a Socrata JSON endpoint (typically ending
 *     in /resource/{4x4}.json)
 *   - column_mappings translates their Socrata field names → our
 *     canonical column names
 *
 * Socrata supports $limit + $offset paging up to 50k rows, and
 * $where for filtering. We page in chunks of 1000.
 */
class SocrataIngestService
{
    private const PAGE_SIZE = 1000;
    private const MAX_PAGES = 50; // hard cap: 50k rows per run

    public function __construct(
        private readonly FacilityTypeNormalizer $normalizer,
    ) {}

    /**
     * Ingest from the named Socrata source. Bounded to a single
     * state when the schema's state field is set, or all rows when
     * it isn't.
     *
     * @return array{fetched: int, upserted: int, skipped: int, rejected: int}
     */
    public function ingest(string $sourceKey, ?string $state = null, ?int $maxFacilities = null): array
    {
        $schema = DataSourceSchema::where('source_key', $sourceKey)->firstOrFail();
        if (! $schema->api_endpoint) {
            throw new \RuntimeException("Source {$sourceKey} has no api_endpoint configured.");
        }

        $effectiveState = $state ?: $schema->state;
        $fetched = $upserted = $skipped = $rejected = 0;
        $offset = 0;

        for ($page = 0; $page < self::MAX_PAGES; $page++) {
            $resp = Http::timeout(45)->retry(2, 1500)->get($schema->api_endpoint, [
                '$limit' => self::PAGE_SIZE,
                '$offset' => $offset,
            ]);

            if ($resp->failed()) {
                Log::warning('Socrata ingest page failed', [
                    'source' => $sourceKey,
                    'offset' => $offset,
                    'status' => $resp->status(),
                ]);
                break;
            }

            $rows = $resp->json() ?: [];
            if (empty($rows)) break;

            foreach ($rows as $row) {
                $fetched++;
                $mapped = $schema->applyMapping($row);

                $name = trim((string) ($mapped['name'] ?? ''));
                $licenseNo = trim((string) ($mapped['license_no'] ?? ''));
                if ($name === '' || $licenseNo === '') {
                    $skipped++;
                    continue;
                }

                $rowState = strtoupper((string) ($mapped['state'] ?? $effectiveState ?? ''));
                if (strlen($rowState) !== 2) {
                    $skipped++;
                    continue;
                }
                // Filter to requested state if specified — Socrata
                // doesn't always support $where reliably across hosts,
                // so we filter in PHP.
                if ($effectiveState && $rowState !== strtoupper($effectiveState)) {
                    continue;
                }

                // Resolve canonical type via per-source default OR
                // state_license_categories lookup.
                if ($schema->default_canonical_type) {
                    $eligibility = \App\Models\StateLicenseCategory::query()
                        ->where('state', $rowState)
                        ->where('canonical_type', $schema->default_canonical_type)
                        ->when($schema->default_license_subtype,
                            fn ($q) => $q->where('license_subtype', $schema->default_license_subtype))
                        ->first();
                    $resolved = [
                        'canonical' => $schema->default_canonical_type,
                        'license_subtype' => $schema->default_license_subtype,
                        'license_category' => $eligibility->source_term ?? $schema->default_canonical_type,
                        'rejected' => false,
                        'accepted_populations' => $eligibility->accepted_populations ?? null,
                        'payer_programs' => $eligibility->payer_programs ?? null,
                        'funding_authority' => $eligibility->funding_authority ?? null,
                    ];
                } else {
                    $rawType = (string) ($mapped['license_category'] ?? '');
                    if ($rawType === '') { $skipped++; continue; }
                    $resolved = $this->normalizer->normalize($rawType, $rowState);
                    if ($resolved['rejected']) { $rejected++; continue; }
                    if (! $resolved['canonical']) { $skipped++; continue; }
                }

                $slug = strtolower($rowState) . '-' . $sourceKey . '-' .
                    preg_replace('/[^a-z0-9]/i', '', $licenseNo);

                Facility::updateOrCreate(
                    ['slug' => $slug],
                    [
                        'slug' => $slug,
                        'name' => Str::title(Str::lower($name)),
                        'type' => $resolved['canonical'],
                        'license_category' => $resolved['license_category'],
                        'license_subtype' => $resolved['license_subtype'],
                        'accepted_populations' => $resolved['accepted_populations'],
                        'payer_programs' => $resolved['payer_programs'],
                        'funding_authority' => $resolved['funding_authority'],
                        'address_line_1' => $this->nullable($mapped['address_line_1'] ?? null),
                        'city' => $this->title($mapped['city'] ?? null),
                        'state' => $rowState,
                        'zip' => $this->normalizeZip($mapped['zip'] ?? null),
                        'county' => $this->nullable($mapped['county'] ?? null),
                        'phone' => $this->normalizePhone($mapped['phone'] ?? null),
                        'total_beds' => (int) ($mapped['total_beds'] ?? 0),
                        'latitude' => $this->numOrNull($mapped['latitude'] ?? null),
                        'longitude' => $this->numOrNull($mapped['longitude'] ?? null),
                        'is_active' => true,
                        'data_source' => $sourceKey,
                    ],
                );
                $upserted++;

                if ($maxFacilities !== null && $upserted >= $maxFacilities) {
                    $this->stampLastImport($schema, $upserted);
                    return compact('fetched', 'upserted', 'skipped', 'rejected');
                }
            }

            $offset += self::PAGE_SIZE;
            if (count($rows) < self::PAGE_SIZE) break;
        }

        $this->stampLastImport($schema, $upserted);
        return compact('fetched', 'upserted', 'skipped', 'rejected');
    }

    private function stampLastImport(DataSourceSchema $schema, int $count): void
    {
        $schema->update(['last_imported_at' => now(), 'last_imported_count' => $count]);
    }

    private function nullable($v): ?string
    {
        $v = trim((string) ($v ?? ''));
        return $v === '' ? null : $v;
    }

    private function title($v): ?string
    {
        $v = $this->nullable($v);
        return $v === null ? null : Str::title(Str::lower($v));
    }

    private function normalizeZip(?string $z): ?string
    {
        if (! $z) return null;
        return substr(preg_replace('/[^0-9-]/', '', $z), 0, 10) ?: null;
    }

    private function normalizePhone(?string $p): ?string
    {
        if (! $p) return null;
        $digits = preg_replace('/[^0-9]/', '', $p);
        if (strlen($digits) === 10) return '+1-' . substr($digits, 0, 3) . '-' . substr($digits, 3, 3) . '-' . substr($digits, 6);
        if (strlen($digits) === 11 && $digits[0] === '1') return '+1-' . substr($digits, 1, 3) . '-' . substr($digits, 4, 3) . '-' . substr($digits, 7);
        return $p;
    }

    private function numOrNull($v): ?float
    {
        if ($v === null || $v === '' || ! is_numeric($v)) return null;
        return (float) $v;
    }
}
