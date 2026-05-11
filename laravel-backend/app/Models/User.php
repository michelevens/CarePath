<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'password', 'active_facility_id'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
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
