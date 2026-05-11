<?php

namespace App\Policies;

use App\Models\AuditLog;
use App\Models\User;

class AuditLogPolicy
{
    public function before(User $user, string $ability): ?bool
    {
        return $user->hasRole('super_admin') ? true : null;
    }

    public function viewAny(User $user): bool
    {
        return $user->can('audit_log.view');
    }

    public function view(User $user, AuditLog $log): bool
    {
        if (! $user->can('audit_log.view')) {
            return false;
        }

        // Facility-bound roles only see their facility's audit trail.
        if ($user->hasRole('facility_admin')) {
            return $log->facility_id
                && $user->facilities->contains('id', $log->facility_id);
        }

        return $user->hasRole('network_admin');
    }
}
