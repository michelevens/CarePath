<?php

namespace Database\Seeders;

use App\Models\AdvisorProfile;
use App\Models\Facility;
use App\Models\HospitalPartner;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Populates the SuperAdmin Users + Verifications tabs with realistic
 * variety so the dashboards aren't a one-row-per-type ghost town.
 *
 * Adds:
 *   - 2 extra facility_staff at Sunset Manor (so the memberships
 *     section on the staff detail page is populated)
 *   - 1 extra facility_admin at the sister facility
 *   - 1 PENDING placement advisor (lands in Verifications queue —
 *     gives ops something to approve while testing the flow)
 *   - 1 PENDING hospital partner (same idea)
 *   - 2 extra family_member accounts
 *
 * Idempotent — uses updateOrCreate by email.
 */
class DemoExpandedUsersSeeder extends Seeder
{
    public function run(): void
    {
        $sunset = Facility::where('slug', 'sunset-manor')->first();
        $sister = Facility::where('slug', 'willow-creek-snf')->first();

        if (! $sunset || ! $sister) {
            $this->command->warn('DemoExpandedUsersSeeder: demo facilities missing — run DemoUserSeeder first.');
            return;
        }

        // ── Extra facility staff at Sunset Manor ──────────────────────
        $this->seedUser('staff.nurse@carepath.io', 'Maria Gonzales, RN',
            'facility_staff', $sunset, 'staff');
        $this->seedUser('staff.aide@carepath.io', 'Jamal Carter, CNA',
            'facility_staff', $sunset, 'staff');

        // ── Extra facility admin at the sister facility ───────────────
        $this->seedUser('admin.willow@carepath.io', 'Pat Nguyen',
            'facility_admin', $sister, 'admin');

        // ── PENDING advisor (verified_at = null) ─────────────────────
        $pendingAdvisor = $this->seedUser('advisor.pending@carepath.io',
            'Sarah Whitman', 'referral_partner', null, null);
        AdvisorProfile::updateOrCreate(
            ['user_id' => $pendingAdvisor->id],
            [
                'agency_name' => 'Whitman Senior Placement',
                'agency_slug' => 'whitman-senior-placement',
                'licensed_states' => ['CA', 'NV'],
                'is_active' => true,
                'is_accepting_referrals' => true,
                'verified_at' => null,  // ← pending — shows in queue
            ],
        );

        // ── PENDING hospital partner ─────────────────────────────────
        $pendingHospital = $this->seedUser('hospital.pending@carepath.io',
            'Dr. Kim Lee', 'hospital_partner', null, null);
        $existing = HospitalPartner::where('user_id', $pendingHospital->id)->first();
        if (! $existing) {
            $plaintext = HospitalPartner::mintPlaintext();
            $partner = new HospitalPartner([
                'user_id' => $pendingHospital->id,
                'name' => 'Bay Area General Hospital',
                'slug' => 'bay-area-general-hospital',
                'partner_type' => 'hospital',
                'service_area_states' => ['CA'],
                'is_active' => true,
                'is_accepting_referrals' => true,
            ]);
            $partner->forceFill([
                'api_key_hash' => HospitalPartner::hashKey($plaintext),
                'api_key_prefix' => substr($plaintext, 0, 10),
                'api_key_rotated_at' => now(),
            ])->save();
        }

        // ── Extra family members ─────────────────────────────────────
        $this->seedUser('family.smith@carepath.io', 'Robert Smith',
            'family_member', null, null);
        $this->seedUser('family.jones@carepath.io', 'Linda Jones',
            'family_member', null, null);

        $this->command->info('✓ DemoExpandedUsersSeeder: 7 extra users seeded');
    }

    /**
     * Idempotent user upsert + role + optional facility pivot. Returns
     * the User so callers can hang per-type profile rows off it.
     */
    private function seedUser(
        string $email,
        string $name,
        string $role,
        ?Facility $facility,
        ?string $pivotRole,
    ): User {
        $user = User::updateOrCreate(
            ['email' => $email],
            [
                'name' => $name,
                'password' => Hash::make('demo1234'),
                'email_verified_at' => now(),
                'active_facility_id' => $facility?->id,
            ],
        );

        $user->assignRole($role);

        if ($facility && $pivotRole) {
            DB::table('facility_user')->updateOrInsert(
                ['facility_id' => $facility->id, 'user_id' => $user->id],
                ['role' => $pivotRole, 'created_at' => now(), 'updated_at' => now()],
            );
        }

        return $user;
    }
}
