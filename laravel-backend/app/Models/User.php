<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'password', 'active_facility_id'])]
#[Hidden(['password', 'remember_token', 'two_factor_secret', 'two_factor_recovery_codes'])]
class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_secret' => 'encrypted',
            'two_factor_recovery_codes' => 'encrypted:array',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }

    public function hasTwoFactorEnabled(): bool
    {
        return ! is_null($this->two_factor_confirmed_at);
    }

    /**
     * Serialize the user for the auth API surface (login, me, register).
     */
    public function toAuthPayload(): array
    {
        $this->loadMissing('activeFacility');

        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'email_verified' => (bool) $this->email_verified_at,
            'two_factor_enabled' => $this->hasTwoFactorEnabled(),
            'portal' => $this->portalRole(),
            'active_facility' => $this->activeFacility ? [
                'id' => $this->activeFacility->id,
                'name' => $this->activeFacility->name,
                'slug' => $this->activeFacility->slug,
            ] : null,
        ];
    }

    public function activeFacility(): BelongsTo
    {
        return $this->belongsTo(Facility::class, 'active_facility_id');
    }

    public function facilities(): BelongsToMany
    {
        return $this->belongsToMany(Facility::class)->withPivot('role')->withTimestamps();
    }

    /**
     * Returns the user's effective role string for the current portal/facility.
     * Falls back to the email-based demo role pattern until spatie/permission
     * is fully wired up in Phase 1.3.
     */
    public function portalRole(): ?string
    {
        if ($facility = $this->activeFacility) {
            $pivot = $facility->users()->where('users.id', $this->id)->first()?->pivot;
            if ($pivot?->role) {
                return $pivot->role;
            }
        }

        return match (true) {
            str_starts_with($this->email, 'superadmin.') => 'superadmin',
            str_starts_with($this->email, 'admin.') => 'admin',
            str_starts_with($this->email, 'staff.') => 'staff',
            str_starts_with($this->email, 'network.') => 'network',
            str_starts_with($this->email, 'referral.') => 'referral',
            str_starts_with($this->email, 'family.') => 'family',
            str_starts_with($this->email, 'resident.') => 'resident',
            default => null,
        };
    }
}
