<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Facility extends Model
{
    use Auditable, HasFactory, HasUuids;

    /**
     * Canonical facility types. Kept as a class constant so every
     * validator + filter UI references one source of truth. New values:
     *   - independent_living: 55+ housing without daily care
     *   - group_home / adult_family_home: small (typically <=10 beds)
     *     residential settings; AFH is the WA/OR-favored term
     *   - icf_iid: intermediate care for individuals with intellectual
     *     / developmental disabilities (federally-regulated, not SNF)
     */
    public const TYPES = [
        'snf', 'assisted_living', 'memory_care', 'ccrc',
        'independent_living', 'group_home', 'adult_family_home', 'icf_iid',
    ];

    protected $fillable = [
        'cms_certification_number',
        'name',
        'slug',
        'type',
        'license_category',
        'license_subtype',
        'accepted_populations',
        'payer_programs',
        'funding_authority',
        'ownership_type',
        'address_line_1',
        'address_line_2',
        'city',
        'state',
        'zip',
        'county',
        'county_id',
        'latitude',
        'longitude',
        'phone',
        'email',
        'website',
        'tagline',
        'description',
        'medicaid_certified',
        'medicare_certified',
        'cms_five_star_overall',
        'cms_five_star_health_inspection',
        'cms_five_star_staffing',
        'cms_five_star_quality',
        'total_beds',
        'average_residents_per_day',
        'price_from_cents',
        'is_active',
        'data_source',
        'data_source_id',
        'state_license_category_id',
        'cms_synced_at',
        'stripe_customer_id',
        'subscription_tier',
    ];

    protected $casts = [
        'medicaid_certified' => 'boolean',
        'medicare_certified' => 'boolean',
        'is_active' => 'boolean',
        'latitude' => 'float',
        'longitude' => 'float',
        'average_residents_per_day' => 'float',
        'cms_synced_at' => 'datetime',
        'accepted_populations' => 'array',
        'payer_programs' => 'array',
    ];

    public function beds(): HasMany
    {
        return $this->hasMany(Bed::class);
    }

    public function residents(): HasMany
    {
        return $this->hasMany(Resident::class);
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class)->withPivot('role');
    }

    public function photos(): HasMany
    {
        return $this->hasMany(FacilityPhoto::class)->orderBy('sort_order');
    }

    public function pricingTiers(): HasMany
    {
        return $this->hasMany(FacilityPricingTier::class)->orderBy('sort_order');
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(FacilityReview::class)->where('is_published', true)->latest();
    }

    public function tours(): HasMany
    {
        return $this->hasMany(Tour::class);
    }

    public function amenities(): HasMany
    {
        return $this->hasMany(FacilityAmenity::class)->orderBy('sort_order');
    }

    /**
     * Polymorphic subscription accessor. Facility Pro / Network plans
     * live here; the cached `subscription_tier` column is the read-time
     * source of truth for gating, updated by SubscriptionService on
     * webhook events.
     */
    public function subscriptions(): MorphMany
    {
        return $this->morphMany(Subscription::class, 'subscriber');
    }

    public function placements(): HasMany
    {
        return $this->hasMany(Placement::class);
    }

    /**
     * The ingest feed this row was produced by (CMS, FL APD, OSM, etc).
     * Replaces the loose-string facilities.data_source varchar with a
     * real FK so we can navigate facility → source and source → facilities.
     */
    public function dataSource(): BelongsTo
    {
        return $this->belongsTo(DataSourceSchema::class, 'data_source_id');
    }

    /**
     * The regulatory bucket this facility falls in for its state. Carries
     * the canonical accepted_populations / payer_programs / funding_authority
     * metadata. Joining here is preferred over reading the cached snapshot
     * columns on facilities — joined data reflects the latest classification.
     */
    public function stateLicenseCategory(): BelongsTo
    {
        return $this->belongsTo(StateLicenseCategory::class, 'state_license_category_id');
    }

    /**
     * The county this facility sits in, as a real model instead of a
     * varchar. Powers /senior-living/{state}/{county} landing pages
     * and county-level analytics.
     */
    public function countyRel(): BelongsTo
    {
        return $this->belongsTo(County::class, 'county_id');
    }
}
