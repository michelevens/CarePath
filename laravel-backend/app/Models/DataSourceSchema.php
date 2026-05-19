<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DataSourceSchema extends Model
{
    use HasUuids;

    public const TIERS = [
        1 => 'Open API — fully automatable',
        2 => 'Web search + CSV export — manual download',
        3 => 'Paid bulk order — mail / form',
        4 => 'No bulk export — public records request only',
    ];

    public const FREQUENCIES = ['continuous', 'monthly', 'quarterly', 'annual', 'on_request'];

    protected $fillable = [
        'source_key', 'display_name', 'state', 'regulator',
        'access_tier', 'update_frequency', 'cost',
        'api_endpoint', 'docs_url',
        'default_canonical_type', 'default_license_subtype',
        'default_state_license_category_id',
        'column_mappings',
        'access_instructions', 'contact_email', 'contact_phone',
        'last_imported_at', 'last_imported_count',
    ];

    protected $casts = [
        'column_mappings' => 'array',
        'last_imported_at' => 'datetime',
        'access_tier' => 'integer',
    ];

    /**
     * Translate a row from this source's CSV (keyed by their header
     * strings) into our canonical attribute names. Unmapped columns
     * are dropped.
     *
     * @param  array<string, mixed>  $row
     * @return array<string, mixed>
     */
    public function applyMapping(array $row): array
    {
        $out = [];
        foreach ($this->column_mappings ?? [] as $theirCol => $ourCol) {
            // Tolerate case + whitespace variation in the CSV header.
            $normalizedKey = $this->normalizeHeader($theirCol);
            foreach ($row as $sourceKey => $value) {
                if ($this->normalizeHeader($sourceKey) === $normalizedKey) {
                    $out[$ourCol] = $value;
                    break;
                }
            }
        }
        return $out;
    }

    private function normalizeHeader(string $header): string
    {
        return strtolower(preg_replace('/\s+/', ' ', trim($header)));
    }

    /**
     * Every facility this feed has produced. Lets SuperAdmin show
     * "FL APD — Group Homes (IDD): 2,219 facilities ingested" with a
     * single JOIN instead of a string scan.
     */
    public function facilities(): HasMany
    {
        return $this->hasMany(Facility::class, 'data_source_id');
    }

    /**
     * Single source of truth for the regulatory bucket this feed maps
     * to. When the importer runs, every new facility inherits this
     * categorization unless overridden per-row.
     */
    public function defaultStateLicenseCategory(): BelongsTo
    {
        return $this->belongsTo(StateLicenseCategory::class, 'default_state_license_category_id');
    }
}
