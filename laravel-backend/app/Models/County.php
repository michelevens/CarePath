<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * US county. Seeded from existing facility data; can be enriched later
 * with FIPS codes from the Census Bureau gazetteer.
 *
 * The denormalized facility_count column lets county landing pages
 * + SuperAdmin overviews render without a per-page COUNT(*). Refresh
 * on the nightly schedule (or after ingest) via the
 * `counties:refresh-counts` artisan command (TODO).
 */
class County extends Model
{
    use HasUuids;

    protected $fillable = [
        'state', 'name', 'fips_code', 'facility_count',
    ];

    protected $casts = [
        'facility_count' => 'integer',
    ];

    /**
     * Slugified county name for URL use. "Miami-Dade" → "miami-dade".
     */
    public function slug(): string
    {
        return \Illuminate\Support\Str::slug($this->name);
    }

    public function facilities(): HasMany
    {
        return $this->hasMany(Facility::class);
    }
}
