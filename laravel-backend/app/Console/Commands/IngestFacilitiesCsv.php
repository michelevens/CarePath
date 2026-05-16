<?php

namespace App\Console\Commands;

use App\Models\DataSourceSchema;
use App\Models\Facility;
use App\Services\FacilityTypeNormalizer;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

/**
 * Ingests a CSV of facilities from a state licensure database (or any
 * other authoritative source). Pair with state-specific downloads:
 *   - Florida AHCA: https://ahca.myflorida.com/health-care-policy-and-oversight
 *   - Texas HHS: https://hhs.texas.gov/regulations/facilities-resources
 *   - California DSS: https://www.cdss.ca.gov/inforesources/community-care
 *
 * Expected CSV columns (order doesn't matter, missing OK if marked optional):
 *   name         (required)
 *   license_no   (required — used to build slug `state-license-{n}` for dedup)
 *   type         (required — assisted_living | snf | memory_care | ccrc)
 *   address_line_1
 *   city
 *   state        (2-letter)
 *   zip
 *   phone        (optional)
 *   email        (optional)
 *   website      (optional)
 *   total_beds   (optional)
 *   latitude     (optional)
 *   longitude    (optional)
 *
 * Usage:
 *   php artisan facilities:ingest-csv path/to/fl_alfs.csv --state=FL --source=fl_ahca
 */
class IngestFacilitiesCsv extends Command
{
    protected $signature = 'facilities:ingest-csv
        {path : Absolute path to CSV file}
        {--state= : 2-letter override; otherwise read from each row}
        {--source=manual : data_source value to stamp on every row}';

    protected $description = 'Bulk-import facilities from a CSV (state licensure files)';

    public function handle(FacilityTypeNormalizer $normalizer): int
    {
        $path = $this->argument('path');
        if (! is_file($path)) {
            $this->error("File not found: {$path}");
            return self::FAILURE;
        }

        $defaultState = $this->option('state') ? strtoupper($this->option('state')) : null;
        $source = $this->option('source') ?: 'manual_upload';

        // Look up the per-source schema. Falls back to the generic
        // manual upload mapping so back-compat with raw canonical-
        // header CSVs is preserved.
        $schema = DataSourceSchema::where('source_key', $source)->first()
            ?? DataSourceSchema::where('source_key', 'manual_upload')->first();

        if (! $schema) {
            $this->error("Unknown source '{$source}' and no manual_upload fallback found. Run StateLicenseCategoriesSeeder + DataSourceSchemasSeeder.");
            return self::FAILURE;
        }

        $this->info("Using schema: {$schema->display_name}");
        $defaultState ??= $schema->state;

        $fh = fopen($path, 'r');
        if (! $fh) {
            $this->error("Could not open: {$path}");
            return self::FAILURE;
        }

        $header = fgetcsv($fh);
        if (! $header) {
            $this->error('Empty CSV — no header row.');
            return self::FAILURE;
        }
        // Keep headers verbatim — the schema's applyMapping()
        // tolerates case + whitespace variation.

        $upserted = 0;
        $skipped = 0;
        $rowNum = 1;

        while (($row = fgetcsv($fh)) !== false) {
            $rowNum++;
            $sourceRow = array_combine($header, array_pad($row, count($header), null));
            $data = $schema->applyMapping($sourceRow);

            $name = trim((string) ($data['name'] ?? ''));
            $licenseNo = trim((string) ($data['license_no'] ?? ''));
            // Source default type wins when the source is single-type
            // (e.g. fl_apd is always group_home). Otherwise use the
            // raw value from the mapped row.
            $rawType = $schema->default_canonical_type
                ? $schema->default_canonical_type
                : (string) ($data['license_category'] ?? '');

            if ($name === '' || $licenseNo === '' || $rawType === '') {
                $skipped++;
                continue;
            }

            $state = $defaultState ?: strtoupper(trim((string) ($data['state'] ?? '')));
            if (strlen($state) !== 2) {
                $skipped++;
                continue;
            }

            // State-aware type normalization. Pulls in eligibility
            // + payer data from state_license_categories so the
            // ingested facility row carries the full context.
            //
            // For single-type sources (FL APD = group_home, CMS =
            // snf), skip the rawType lookup and pull the eligibility
            // row by canonical_type+subtype instead.
            if ($schema->default_canonical_type) {
                $eligibility = \App\Models\StateLicenseCategory::query()
                    ->where('state', $state)
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
                $resolved = $normalizer->normalize($rawType, $state);
                if ($resolved['rejected']) {
                    $skipped++;
                    continue;
                }
                if (! $resolved['canonical']) {
                    $this->warn("Unmapped type '{$rawType}' for state {$state} (row {$rowNum}) — skipping");
                    $skipped++;
                    continue;
                }
            }

            $slug = strtolower($state) . '-lic-' . preg_replace('/[^a-z0-9]/i', '', $licenseNo);

            $attrs = [
                'slug' => $slug,
                'name' => Str::title(Str::lower($name)),
                'type' => $resolved['canonical'],
                'license_category' => $resolved['license_category'],
                'license_subtype' => $resolved['license_subtype'],
                'accepted_populations' => $resolved['accepted_populations'],
                'payer_programs' => $resolved['payer_programs'],
                'funding_authority' => $resolved['funding_authority'],
                'address_line_1' => $this->nullableStr($data['address_line_1'] ?? null),
                'city' => $this->titleStr($data['city'] ?? null),
                'state' => $state,
                'zip' => $this->normalizeZip($data['zip'] ?? null),
                'phone' => $this->normalizePhone($data['phone'] ?? null),
                'email' => $this->nullableStr($data['email'] ?? null),
                'website' => $this->nullableStr($data['website'] ?? null),
                'total_beds' => $this->intOrZero($data['total_beds'] ?? null),
                'latitude' => $this->numOrNull($data['latitude'] ?? null),
                'longitude' => $this->numOrNull($data['longitude'] ?? null),
                'is_active' => true,
                'data_source' => $source,
            ];

            Facility::updateOrCreate(['slug' => $slug], $attrs);
            $upserted++;
        }

        fclose($fh);

        // Stamp last-imported on the schema so the SuperAdmin Data
        // Sources tab can show "last ingested 12d ago, 247 rows."
        $schema->update([
            'last_imported_at' => now(),
            'last_imported_count' => $upserted,
        ]);

        $this->info("✓ rows: " . ($rowNum - 1) . " — upserted: {$upserted}, skipped: {$skipped}");
        return self::SUCCESS;
    }

    private function normalizeType(?string $t): ?string
    {
        $t = strtolower(trim((string) $t));
        return match (true) {
            in_array($t, ['snf', 'nursing_home', 'nursing home', 'skilled nursing'], true) => 'snf',
            in_array($t, ['memory_care', 'memory care', 'alzheimer', 'dementia'], true) => 'memory_care',
            in_array($t, ['ccrc', 'continuing care', 'life plan'], true) => 'ccrc',
            in_array($t, ['alf', 'assisted_living', 'assisted living'], true) => 'assisted_living',
            in_array($t, ['il', 'independent_living', 'independent living', 'retirement community', '55+'], true) => 'independent_living',
            in_array($t, ['group_home', 'group home'], true) => 'group_home',
            in_array($t, ['afh', 'adult_family_home', 'adult family home'], true) => 'adult_family_home',
            in_array($t, ['icf_iid', 'icf/iid', 'icf-iid', 'intermediate care'], true) => 'icf_iid',
            default => null,
        };
    }

    private function titleStr($v): ?string
    {
        $v = trim((string) ($v ?? ''));
        return $v === '' ? null : Str::title(Str::lower($v));
    }

    private function nullableStr($v): ?string
    {
        $v = trim((string) ($v ?? ''));
        return $v === '' ? null : $v;
    }

    private function intOrZero($v): int
    {
        return is_numeric($v) ? (int) $v : 0;
    }

    private function numOrNull($v): ?float
    {
        return is_numeric($v) ? (float) $v : null;
    }

    private function normalizeZip($v): ?string
    {
        if ($v === null || $v === '') return null;
        $digits = preg_replace('/\D/', '', (string) $v);
        return substr(str_pad($digits, 5, '0', STR_PAD_LEFT), 0, 5);
    }

    private function normalizePhone($v): ?string
    {
        if ($v === null || $v === '') return null;
        $digits = preg_replace('/\D/', '', (string) $v);
        if (strlen($digits) === 11 && str_starts_with($digits, '1')) {
            $digits = substr($digits, 1);
        }
        if (strlen($digits) !== 10) return (string) $v;
        return sprintf('(%s) %s-%s', substr($digits, 0, 3), substr($digits, 3, 3), substr($digits, 6, 4));
    }
}
