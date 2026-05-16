<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class HospitalPartner extends Model
{
    use Auditable, HasUuids;

    public const PARTNER_TYPES = ['hospital', 'health_system', 'rehab', 'snf_discharge', 'accountable_care'];

    public const STRIPE_ACCOUNT_STATUSES = AdvisorProfile::STRIPE_ACCOUNT_STATUSES;

    protected $fillable = [
        'user_id', 'name', 'slug', 'partner_type',
        'contact_phone',
        'service_area_zips', 'service_area_states',
        'api_key',
        'stripe_account_id', 'stripe_account_status',
        'commission_split_partner_pct', 'commission_split_platform_pct',
        'is_active', 'is_accepting_referrals',
        'verified_at',
    ];

    protected $casts = [
        'service_area_zips' => 'array',
        'service_area_states' => 'array',
        'is_active' => 'boolean',
        'is_accepting_referrals' => 'boolean',
        'verified_at' => 'datetime',
    ];

    protected $hidden = ['api_key'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * True only when the partner is fully set up to receive referrals
     * AND to be paid. Used by attribution code to decide whether the
     * widget can fire a real inquiry.
     */
    public function canAcceptReferrals(): bool
    {
        return $this->is_active && $this->is_accepting_referrals;
    }

    public function canReceivePayouts(): bool
    {
        return $this->canAcceptReferrals()
            && $this->stripe_account_status === 'active';
    }

    /**
     * Generate a fresh widget API key. Called on first create and on
     * explicit "regenerate" from the portal. Key surfaced to the user
     * exactly once — stored hashed for runtime lookup.
     */
    public static function generateApiKey(): string
    {
        return 'wk_' . Str::random(48);
    }
}
