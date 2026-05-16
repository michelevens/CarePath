<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Facility extends Model
{
    use Auditable, HasFactory, HasUuids;

    protected $fillable = [
        'cms_certification_number',
        'name',
        'slug',
        'type', // snf | assisted_living | memory_care | ccrc
        'ownership_type',
        'address_line_1',
        'address_line_2',
        'city',
        'state',
        'zip',
        'county',
        'latitude',
        'longitude',
        'phone',
        'email',
        'website',
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
        'cms_synced_at',
    ];

    protected $casts = [
        'medicaid_certified' => 'boolean',
        'medicare_certified' => 'boolean',
        'is_active' => 'boolean',
        'latitude' => 'float',
        'longitude' => 'float',
        'average_residents_per_day' => 'float',
        'cms_synced_at' => 'datetime',
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
}
