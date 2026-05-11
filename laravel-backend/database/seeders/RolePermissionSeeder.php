<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Seeds the 7 portal roles and the granular permission set that maps to
 * facility-ops + marketplace behaviors. Idempotent — re-runs on every
 * Railway deploy.
 *
 * Permission naming convention: <resource>.<action>
 *   resources: facility, resident, bed, care_plan, admission, audit_log,
 *              master_data, referral, billing, user
 *   actions:   view, view_any, create, update, delete, manage
 */
class RolePermissionSeeder extends Seeder
{
    /**
     * @var array<int, string>
     */
    private array $permissions = [
        // Facility
        'facility.view_any',
        'facility.view',
        'facility.create',
        'facility.update',
        'facility.delete',
        // Resident
        'resident.view_any',
        'resident.view',
        'resident.create',
        'resident.update',
        'resident.discharge',
        // Bed
        'bed.view_any',
        'bed.manage',
        // Care planning + clinical
        'care_plan.view',
        'care_plan.manage',
        'admission.manage',
        // Compliance + audit
        'audit_log.view',
        'compliance.manage',
        // Platform admin
        'master_data.manage',
        'user.invite',
        'user.manage_roles',
        // Marketplace
        'referral.create',
        'referral.view_own',
        'billing.view',
        'billing.manage',
    ];

    /**
     * @var array<string, array<int, string>>
     */
    private array $rolePermissions = [
        'super_admin' => ['*'], // wildcard handled below

        'network_admin' => [
            'facility.view_any', 'facility.view', 'facility.update',
            'resident.view_any', 'resident.view',
            'bed.view_any',
            'care_plan.view',
            'audit_log.view',
            'compliance.manage',
            'billing.view', 'billing.manage',
            'user.invite',
        ],

        'facility_admin' => [
            'facility.view',
            'facility.update',
            'resident.view_any', 'resident.view', 'resident.create',
            'resident.update', 'resident.discharge',
            'bed.view_any', 'bed.manage',
            'care_plan.view', 'care_plan.manage',
            'admission.manage',
            'compliance.manage',
            'billing.view', 'billing.manage',
            'user.invite',
        ],

        'facility_staff' => [
            'facility.view',
            'resident.view_any', 'resident.view', 'resident.update',
            'bed.view_any',
            'care_plan.view', 'care_plan.manage',
        ],

        'referral_partner' => [
            'facility.view_any', 'facility.view',
            'referral.create', 'referral.view_own',
        ],

        'family_member' => [
            'facility.view_any', 'facility.view',
            'resident.view', // limited to their loved one — enforced in policy
            'care_plan.view',
            'billing.view',
        ],

        'resident' => [
            'resident.view', // limited to themselves — enforced in policy
            'care_plan.view',
            'billing.view',
        ],
    ];

    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach ($this->permissions as $name) {
            Permission::findOrCreate($name, 'web');
        }

        foreach ($this->rolePermissions as $roleName => $perms) {
            $role = Role::findOrCreate($roleName, 'web');

            if ($perms === ['*']) {
                $role->syncPermissions($this->permissions);
            } else {
                $role->syncPermissions($perms);
            }

            $this->command->info("✓ role {$roleName} ({$role->permissions->count()} permissions)");
        }
    }
}
