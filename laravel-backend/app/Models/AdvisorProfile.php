<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AdvisorProfile extends Model
{
    use Auditable, HasUuids;

    /**
     * Stripe Connect Express account onboarding states. Mirror of what
     * /v1/accounts/{id} returns; we update on webhook events.
     */
    public const STRIPE_ACCOUNT_STATUSES = [
        'not_connected',  // never started onboarding
        'pending',        // onboarding link generated but incomplete
        'verifying',      // submitted, awaiting Stripe verification
        'active',         // verified, can receive payouts
        'restricted',     // Stripe disabled payouts (e.g., docs requested)
        'rejected',
    ];

    protected $fillable = [
        'user_id',
        'agency_name', 'agency_slug', 'agency_website', 'bio', 'phone',
        'licensed_states', 'service_area_zips',
        'stripe_account_id', 'stripe_account_status',
        'commission_split_advisor_pct', 'commission_split_platform_pct',
        'charges_families', 'family_consultation_fee_cents',
        'is_active', 'is_accepting_referrals',
        'verified_at',
    ];

    protected $casts = [
        'licensed_states' => 'array',
        'service_area_zips' => 'array',
        'charges_families' => 'boolean',
        'is_active' => 'boolean',
        'is_accepting_referrals' => 'boolean',
        'verified_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * True only if the advisor is fully set up to receive a placement
     * and get paid. Used by attribution code to decide whether a
     * referral can be credited to them.
     */
    public function canAcceptPlacements(): bool
    {
        return $this->is_active
            && $this->is_accepting_referrals
            && $this->stripe_account_status === 'active';
    }
}
