<?php

namespace Database\Seeders;

use App\Models\Facility;
use App\Models\User;
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
            }

            $user->syncRoles([$spatieRole]);

            $this->command->info("✓ {$portal}: {$email} → role {$spatieRole}");
        }
    }
}
