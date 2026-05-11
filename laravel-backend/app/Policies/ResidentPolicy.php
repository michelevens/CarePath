<?php

namespace App\Policies;

use App\Models\Resident;
use App\Models\User;

class ResidentPolicy
{
    public function before(User $user, string $ability): ?bool
    {
        return $user->hasRole('super_admin') ? true : null;
    }

    public function viewAny(User $user): bool
    {
        return $user->can('resident.view_any');
    }

    public function view(User $user, Resident $resident): bool
    {
        if (! $user->can('resident.view')) {
            return false;
        }

        // Facility staff/admin: only residents in their facility.
        if ($user->hasAnyRole(['facility_admin', 'facility_staff'])) {
            return $user->facilities->contains('id', $resident->facility_id);
        }

        // Network admin: any facility in their network (TODO: when we add
        // the networks table, scope this). For now, allowed across all.
        if ($user->hasRole('network_admin')) {
            return true;
        }

        // Family/resident: only their own resident record. The pairing
        // (family ↔ resident) is added in a later phase; for now, gate to
        // the resident themselves matching by email or to the linked POA.
        if ($user->hasRole('resident')) {
            return $resident->primary_user_id === $user->id;
        }

        if ($user->hasRole('family_member')) {
            return $resident->family_user_ids
                && in_array($user->id, (array) $resident->family_user_ids, true);
        }

        return false;
    }

    public function create(User $user): bool
    {
        return $user->can('resident.create');
    }

    public function update(User $user, Resident $resident): bool
    {
        if (! $user->can('resident.update')) {
            return false;
        }

        if ($user->hasAnyRole(['facility_admin', 'facility_staff'])) {
            return $user->facilities->contains('id', $resident->facility_id);
        }

        return false;
    }

    public function discharge(User $user, Resident $resident): bool
    {
        if (! $user->can('resident.discharge')) {
            return false;
        }

        return $user->hasRole('facility_admin')
            && $user->facilities->contains('id', $resident->facility_id);
    }
}
