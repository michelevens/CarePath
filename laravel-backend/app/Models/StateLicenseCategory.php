<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class StateLicenseCategory extends Model
{
    use HasUuids;

    public const POPULATIONS = [
        'general_seniors', 'idd_adults', 'memory_care_residents',
        'mental_health', 'bariatric', 'ventilator_dependent',
        'young_adults', 'youth',
    ];

    public const PAYERS = [
        'private_pay', 'medicaid_long_term_care', 'medicaid_hcbs_waiver',
        'medicaid_idd_waiver', 'medicare_part_a', 'va_aid_attendance',
        'ltc_insurance', 'state_supplement', 'ssi_state_supplement',
    ];

    protected $fillable = [
        'state', 'source_term', 'source_term_normalized',
        'canonical_type', 'license_subtype',
        'rejected', 'rejection_reason',
        'accepted_populations', 'payer_programs', 'funding_authority',
        'eligibility_notes',
        'regulator', 'notes', 'source_url', 'is_seeded',
    ];

    protected $casts = [
        'rejected' => 'boolean',
        'is_seeded' => 'boolean',
        'accepted_populations' => 'array',
        'payer_programs' => 'array',
    ];

    /**
     * Lookup the canonical mapping for a raw license string.
     * Returns null if no entry exists — caller should fall back to
     * the generic alias normalizer + flag as "unknown" for review.
     */
    public static function lookup(string $state, string $rawTerm): ?self
    {
        return static::query()
            ->where('state', strtoupper($state))
            ->where('source_term_normalized', self::normalize($rawTerm))
            ->first();
    }

    public static function normalize(string $raw): string
    {
        return Str::of($raw)->lower()->squish()->toString();
    }

    /**
     * Every facility classified under this regulatory bucket. Lets the
     * SuperAdmin show "All FL APD Group Home (IDD) facilities" with a
     * single JOIN, and lets a regulator-side reclassification surface
     * the impacted population instantly.
     */
    public function facilities(): HasMany
    {
        return $this->hasMany(Facility::class, 'state_license_category_id');
    }

    /**
     * Ingest feeds whose default categorization points here.
     */
    public function dataSources(): HasMany
    {
        return $this->hasMany(DataSourceSchema::class, 'default_state_license_category_id');
    }
}
