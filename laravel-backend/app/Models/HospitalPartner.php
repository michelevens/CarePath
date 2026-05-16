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

    /**
     * api_key_hash / api_key_prefix / api_key_rotated_at are NEVER
     * mass-assignable — they're only written through rotateApiKey()
     * below, which derives them from a freshly-minted plaintext.
     * commission_split_* are also excluded for the same reason as
     * AdvisorProfile: contract terms set by the platform, not
     * user-editable.
     */
    protected $fillable = [
        'user_id', 'name', 'slug', 'partner_type',
        'contact_phone',
        'service_area_zips', 'service_area_states',
        'stripe_account_id', 'stripe_account_status',
        'is_active', 'is_accepting_referrals',
        'verified_at',
    ];

    protected $casts = [
        'service_area_zips' => 'array',
        'service_area_states' => 'array',
        'is_active' => 'boolean',
        'is_accepting_referrals' => 'boolean',
        'verified_at' => 'datetime',
        'api_key_rotated_at' => 'datetime',
    ];

    protected $hidden = ['api_key_hash'];

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
     * Mints a fresh widget API key. Returns the plaintext (shown to
     * the partner exactly once) and persists only the hash + a short
     * prefix for identification. The plaintext is never read back
     * from storage; if the partner loses it they must rotate.
     */
    public function rotateApiKey(): string
    {
        $plaintext = self::mintPlaintext();
        $this->forceFill([
            'api_key_hash' => self::hashKey($plaintext),
            'api_key_prefix' => substr($plaintext, 0, 10),
            'api_key_rotated_at' => now(),
        ])->save();
        return $plaintext;
    }

    public static function mintPlaintext(): string
    {
        return 'wk_' . Str::random(48);
    }

    /**
     * Deterministic hash for lookup. sha256 is fine here because the
     * plaintext is 48 chars of secure random — a rainbow-table attack
     * is computationally infeasible against that keyspace, and we
     * need an exact-match lookup (so password_hash() / bcrypt with
     * their per-call salt would not work).
     */
    public static function hashKey(string $plaintext): string
    {
        return hash('sha256', $plaintext);
    }
}
