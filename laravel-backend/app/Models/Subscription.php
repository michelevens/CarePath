<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Subscription extends Model
{
    use Auditable, HasUuids;

    /**
     * Subscription status — these are Stripe's canonical statuses, which
     * is what we mirror locally. Anything other than 'active' or
     * 'trialing' should fail feature-gating checks.
     */
    public const ACTIVE_STATUSES = ['active', 'trialing'];

    protected $fillable = [
        'subscriber_type', 'subscriber_id',
        'subscription_plan_id',
        'stripe_subscription_id', 'stripe_customer_id',
        'status', 'billing_cycle',
        'trial_ends_at',
        'current_period_started_at', 'current_period_ends_at',
        'canceled_at', 'ended_at',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
        'trial_ends_at' => 'datetime',
        'current_period_started_at' => 'datetime',
        'current_period_ends_at' => 'datetime',
        'canceled_at' => 'datetime',
        'ended_at' => 'datetime',
    ];

    public function subscriber(): MorphTo
    {
        return $this->morphTo();
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(SubscriptionPlan::class, 'subscription_plan_id');
    }

    public function isActive(): bool
    {
        return in_array($this->status, self::ACTIVE_STATUSES, true)
            && (! $this->ended_at || $this->ended_at->isFuture());
    }
}
