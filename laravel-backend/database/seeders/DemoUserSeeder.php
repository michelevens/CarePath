<?php

namespace Database\Seeders;

use App\Models\Facility;
use App\Models\User;
use App\Services\TenantProvisioningService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DemoUserSeeder extends Seeder
{
    public function run(): void
    {
        $facility = Facility::firstOrCreate(
            ['slug' => 'sunset-manor'],
            [
                'name' => 'Sunset Manor',
                'type' => 'assisted_living',
                'address_line_1' => '1234 E Camelback Rd',
                'city' => 'Phoenix',
                'state' => 'AZ',
                'zip' => '85016',
                'phone' => '+1-602-555-0142',
                'email' => 'hello@sunsetmanor.example',
                'medicaid_certified' => true,
                'medicare_certified' => true,
                'cms_five_star_overall' => 5,
                'cms_five_star_health_inspection' => 5,
                'cms_five_star_staffing' => 4,
                'cms_five_star_quality' => 5,
                'total_beds' => 125,
                'price_from_cents' => 450000,
                'is_active' => true,
            ]
        );

        $sisterFacility = Facility::firstOrCreate(
            ['slug' => 'willow-creek-snf'],
            [
                'name' => 'Willow Creek Skilled Nursing',
                'type' => 'snf',
                'address_line_1' => '892 N Central Ave',
                'city' => 'Phoenix',
                'state' => 'AZ',
                'zip' => '85004',
                'phone' => '+1-602-555-0188',
                'email' => 'hello@willowcreek.example',
                'medicaid_certified' => true,
                'medicare_certified' => true,
                'cms_five_star_overall' => 4,
                'cms_five_star_health_inspection' => 4,
                'cms_five_star_staffing' => 4,
                'cms_five_star_quality' => 4,
                'total_beds' => 80,
                'price_from_cents' => 820000,
                'is_active' => true,
            ]
        );

        // [portal, email, name, facility_pivot_role, spatie_role]
        $accounts = [
            ['family',     'family.demo@carepath.io',     'Demo Family',      null,        'family_member'],
            ['resident',   'resident.demo@carepath.io',   'Margaret Chen',    null,        'resident'],
            ['staff',      'staff.demo@carepath.io',      'Demo Staff',       'staff',     'facility_staff'],
            ['admin',      'admin.demo@carepath.io',      'Demo Admin',       'admin',     'facility_admin'],
            ['network',    'network.demo@carepath.io',    'Demo Network',     'network',   'network_admin'],
            ['referral',   'referral.demo@carepath.io',   'Demo Referral',    'referral',  'referral_partner'],
            ['superadmin', 'superadmin.demo@carepath.io', 'Demo Super Admin', null,        'super_admin'],
        ];

        foreach ($accounts as [$portal, $email, $name, $facilityRole, $spatieRole]) {
            $user = User::updateOrCreate(
                ['email' => $email],
                [
                    'name' => $name,
                    'password' => Hash::make('demo1234'),
                    'email_verified_at' => now(),
                    'active_facility_id' => $facilityRole ? $facility->id : null,
                    // Demo accounts always reset to 2FA-off so the one-click
                    // demo login buttons stay frictionless across deploys.
                    'two_factor_secret' => null,
                    'two_factor_recovery_codes' => null,
                    'two_factor_confirmed_at' => null,
                ]
            );

            if ($facilityRole) {
                DB::table('facility_user')->updateOrInsert(
                    ['facility_id' => $facility->id, 'user_id' => $user->id],
                    ['role' => $facilityRole, 'created_at' => now(), 'updated_at' => now()]
                );

                // Give admin + network demo accounts membership in both
                // facilities so the switcher has something to switch between.
                if (in_array($spatieRole, ['facility_admin', 'network_admin'], true)) {
                    DB::table('facility_user')->updateOrInsert(
                        ['facility_id' => $sisterFacility->id, 'user_id' => $user->id],
                        ['role' => $facilityRole, 'created_at' => now(), 'updated_at' => now()]
                    );
                }
            }

            $user->syncRoles([$spatieRole]);

            $this->command->info("✓ {$portal}: {$email} → role {$spatieRole}");
        }

        // Provision master data snapshots into both demo facilities so the
        // facility-side endpoints have something to read. Idempotent — only
        // inserts rows that don't already exist for the facility.
        $provisioner = app(TenantProvisioningService::class);
        foreach ([$facility, $sisterFacility] as $f) {
            $created = $provisioner->provision($f);
            $total = array_sum($created);
            $this->command->info("✓ provisioned {$f->name}: {$total} master snapshots");
        }
    }
}
