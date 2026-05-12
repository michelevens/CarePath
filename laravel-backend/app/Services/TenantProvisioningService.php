<?php

namespace App\Services;

use App\Models\CredentialTemplate;
use App\Models\DiagnosisCode;
use App\Models\DocPreset;
use App\Models\Facility;
use App\Models\LevelOfCare;
use App\Models\Payer;
use App\Models\ServiceCode;
use App\Models\ServiceType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

/**
 * Snapshots platform-wide master rows into per-facility copies on facility
 * approval / first run. Mirrors ShiftPulse's TenantProvisioningService.
 *
 * After provisioning, the facility has:
 *   - source='master' rows with facility_id set (immutable snapshots —
 *     editable only by toggling is_active)
 *   - source='custom' rows the facility adds itself
 *
 * Re-running this service is safe: existing snapshots are detected by
 * matching the natural key (e.g. `code` for payers/credentials/levels)
 * and skipped.
 */
class TenantProvisioningService
{
    /**
     * @var array<class-string<Model>, array<int, string>>
     *   Map of provisionable model → natural-key column(s) for dedupe
     */
    private const PROVISIONABLE = [
        Payer::class => ['code'],
        LevelOfCare::class => ['code'],
        CredentialTemplate::class => ['code'],
        DiagnosisCode::class => ['code'],
        ServiceCode::class => ['code'],
        ServiceType::class => ['code'],
        DocPreset::class => ['code'],
    ];

    /**
     * Provision all configured master types into the facility. Returns a
     * map of model FQCN → number of rows newly inserted.
     *
     * @return array<class-string<Model>, int>
     */
    public function provision(Facility $facility): array
    {
        $created = [];

        DB::transaction(function () use ($facility, &$created) {
            foreach (self::PROVISIONABLE as $modelClass => $keys) {
                $created[$modelClass] = $this->provisionModel($facility, $modelClass, $keys);
            }
        });

        return $created;
    }

    /**
     * Re-provision every active facility. Idempotent — only inserts rows
     * for snapshots that don't already exist on the facility. Used by the
     * super-admin "sync" action after adding new master rows.
     *
     * @return array{
     *   facilities: int,
     *   inserted_total: int,
     *   per_facility: array<int, array{facility_id: string, name: string, inserted: int}>
     * }
     */
    public function syncAllFacilities(): array
    {
        $facilities = Facility::query()->where('is_active', true)->get();

        $perFacility = [];
        $insertedTotal = 0;

        foreach ($facilities as $facility) {
            $created = $this->provision($facility);
            $count = array_sum($created);
            $insertedTotal += $count;
            $perFacility[] = [
                'facility_id' => $facility->id,
                'name' => $facility->name,
                'inserted' => $count,
            ];
        }

        return [
            'facilities' => $facilities->count(),
            'inserted_total' => $insertedTotal,
            'per_facility' => $perFacility,
        ];
    }

    /**
     * @param  class-string<Model>  $modelClass
     * @param  array<int, string>  $naturalKeys
     */
    private function provisionModel(Facility $facility, string $modelClass, array $naturalKeys): int
    {
        $masterRows = $modelClass::query()
            ->whereNull('facility_id')
            ->where('source', 'master')
            ->get();

        $existing = $modelClass::query()
            ->where('facility_id', $facility->id)
            ->get($naturalKeys)
            ->map(fn ($row) => $this->keyOf($row, $naturalKeys))
            ->all();

        $inserted = 0;

        foreach ($masterRows as $row) {
            if (in_array($this->keyOf($row, $naturalKeys), $existing, true)) {
                continue;
            }

            $attributes = collect($row->getAttributes())
                ->except(['id', 'created_at', 'updated_at'])
                ->merge([
                    'facility_id' => $facility->id,
                    'source' => 'master',
                ])
                ->all();

            $modelClass::create($attributes);
            $inserted++;
        }

        return $inserted;
    }

    /**
     * @param  array<int, string>  $keys
     */
    private function keyOf(Model $row, array $keys): string
    {
        return implode('|', array_map(fn ($k) => (string) $row->getAttribute($k), $keys));
    }
}
