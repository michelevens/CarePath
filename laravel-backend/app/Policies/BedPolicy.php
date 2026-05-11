<?php

namespace App\Policies;

use App\Models\Bed;
use App\Models\User;

class BedPolicy
{
    public function before(User $user, string $ability): ?bool
    {
        return $user->hasRole('super_admin') ? true : null;
    }

    public function viewAny(User $user): bool
    {
        return $user->can('bed.view_any');
    }

    public function view(User $user, Bed $bed): bool
    {
        if (! $user->can('bed.view_any')) {
            return false;
        }

        if ($user->hasAnyRole(['facility_admin', 'facility_staff'])) {
            return $user->facilities->contains('id', $bed->facility_id);
        }

        return $user->hasRole('network_admin');
    }

    public function manage(User $user, Bed $bed): bool
    {
        if (! $user->can('bed.manage')) {
            return false;
        }

        return $user->hasRole('facility_admin')
            && $user->facilities->contains('id', $bed->facility_id);
    }
}
