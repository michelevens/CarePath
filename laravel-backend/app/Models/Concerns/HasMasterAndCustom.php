<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Builder;

/**
 * Shared scopes for any master/custom-flavored reference table.
 *
 * Convention:
 * - `source` column: 'master' or 'custom'
 * - `facility_id`:   NULL for the platform-wide master row (super admin),
 *                    set for a tenant copy or a tenant-owned custom row
 *
 * The TenantProvisioningService snapshots master rows into per-facility
 * copies on facility approval, so once a facility exists they always
 * read from their own facility-scoped rows (never the NULL master rows).
 */
trait HasMasterAndCustom
{
    public function scopeMaster(Builder $query): Builder
    {
        return $query->whereNull('facility_id')->where('source', 'master');
    }

    public function scopeForFacility(Builder $query, string $facilityId): Builder
    {
        return $query->where('facility_id', $facilityId);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function isMasterRow(): bool
    {
        return $this->facility_id === null && $this->source === 'master';
    }

    /**
     * A facility-side row is editable if it's a custom row. Master snapshots
     * (source='master' with a facility_id set) may only toggle is_active.
     */
    public function isFacilityEditable(): bool
    {
        return $this->source === 'custom';
    }
}
