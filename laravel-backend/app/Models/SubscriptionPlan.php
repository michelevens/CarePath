<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class SubscriptionPlan extends Model
{
    use HasUuids;

    public const AUDIENCES = ['facility', 'advisor', 'family'];
    public const TIERS = ['free', 'pro', 'team', 'agency', 'network', 'enterprise'];

    protected $fillable = [
        'slug', 'name', 'audience', 'tier',
        'monthly_cents', 'annual_cents',
        'included_seats', 'placement_cap_per_year',
        'stripe_price_id_monthly', 'stripe_price_id_annual',
        'features', 'is_active', 'sort_order',
    ];

    protected $casts = [
        'features' => 'array',
        'is_active' => 'boolean',
    ];

    public function subscriptions()
    {
        return $this->hasMany(Subscription::class);
    }

    /**
     * Feature flag check — drives UI gating ("this requires Pro").
     */
    public function hasFeature(string $key): bool
    {
        return in_array($key, $this->features ?? [], true);
    }
}
