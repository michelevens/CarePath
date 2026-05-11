<?php

namespace App\Policies;

use App\Models\Facility;
use App\Models\User;

class FacilityPolicy
{
    /**
     * Super admins bypass every check.
     */
    public function before(User $user, string $ability): ?bool
    {
        return $user->hasRole('super_admin') ? true : null;
    }

    public function viewAny(User $user): bool
    {
        return $user->can('facility.view_any');
    }

    public function view(User $user, Facility $facility): bool
    {
        if (! $user->can('facility.view')) {
            return false;
        }

        // Facility-bound roles can only see facilities they belong to.
        if ($user->hasAnyRole(['facility_admin', 'facility_staff'])) {
            return $user->facilities->contains($facility);
        }

        // Network admins, referral partners, family/residents can view any
        // facility profile from the marketplace side.
        return true;
    }

    public function create(User $user): bool
    {
        return $user->can('facility.create');
    }

    public function update(User $user, Facility $facility): bool
    {
        if (! $user->can('facility.update')) {
            return false;
        }

        if ($user->hasRole('facility_admin')) {
            return $user->facilities->contains($facility);
        }

        return $user->hasRole('network_admin');
    }

    public function delete(User $user, Facility $facility): bool
    {
        return false; // super_admin only — handled by before()
    }
}
