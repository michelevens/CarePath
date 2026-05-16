<?php

namespace Database\Seeders;

use App\Models\AdvisorProfile;
use App\Models\Facility;
use App\Models\HospitalPartner;
use App\Models\SponsoredCampaign;
use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;

/**
 * Seeds enough monetization-side data to exercise every revenue stream
 * end-to-end in a fresh demo environment:
 *
 *   - AdvisorProfile for the referral.demo user (no Stripe Connect yet
 *     — that requires real onboarding through the Express link)
 *   - HospitalPartner for the hospital.demo user, with a known plaintext
 *     widget key cached for 10 minutes so the embed page can show it
 *     once after a fresh seed
 *   - SponsoredCampaign on Sunset Manor ($50/day, $2.50 CPC)
 *   - Active Facility Pro subscription for Sunset Manor (cached tier
 *     so feature-gates flip on without waiting for a Stripe webhook)
 *   - Active Family Pro subscription for the family.demo user
 *
 * Idempotent — uses firstOrCreate / updateOrInsert. Re-runs on deploy
 * are safe and stay aligned with whatever DemoUserSeeder produced.
 */
class DemoMonetizationSeeder extends Seeder
{
    public function run(): void
    {
        // Demo accounts must exist first.
        $referralUser = User::where('email', 'referral.demo@carepath.io')->first();
        $hospitalUser = User::where('email', 'hospital.demo@carepath.io')->first();
        $familyUser   = User::where('email', 'family.demo@carepath.io')->first();
        $sunset       = Facility::where('slug', 'sunset-manor')->first();

        if (! $referralUser || ! $hospitalUser || ! $familyUser || ! $sunset) {
            $this->command->warn('DemoMonetizationSeeder: prerequisite demo rows missing — run DemoUserSeeder first.');
            return;
        }

        $this->seedAdvisorProfile($referralUser);
        $this->seedHospitalPartner($hospitalUser);
        $this->seedSponsoredCampaign($sunset);
        $this->seedFacilitySubscription($sunset);
        $this->seedFamilySubscription($familyUser);
    }

    private function seedAdvisorProfile(User $user): void
    {
        AdvisorProfile::updateOrCreate(
            ['user_id' => $user->id],
            [
                'agency_name' => 'Demo Senior Placement',
                'agency_slug' => 'demo-senior-placement',
                'agency_website' => 'https://demo-advisor.example',
                'bio' => 'Demo placement advisor — Arizona, California, and Nevada. '
                       . 'Specializing in memory care transitions.',
                'phone' => '+1-602-555-0199',
                'licensed_states' => ['AZ', 'CA', 'NV'],
                'service_area_zips' => ['85016', '85004', '85003', '85007'],
                'charges_families' => false,
                'family_consultation_fee_cents' => null,
                'is_active' => true,
                'is_accepting_referrals' => true,
                'verified_at' => now(),
            ],
        );
        $this->command->info('✓ advisor_profile: Demo Senior Placement');
    }

    private function seedHospitalPartner(User $user): void
    {
        $existing = HospitalPartner::where('user_id', $user->id)->first();
        if ($existing) {
            $this->command->info("✓ hospital_partner already seeded (prefix {$existing->api_key_prefix})");
            return;
        }

        $plaintext = HospitalPartner::mintPlaintext();
        $partner = new HospitalPartner([
            'user_id' => $user->id,
            'name' => 'Demo Regional Medical Center',
            'slug' => 'demo-regional-medical',
            'partner_type' => 'hospital',
            'contact_phone' => '+1-602-555-0177',
            'service_area_zips' => ['85016', '85004'],
            'service_area_states' => ['AZ'],
            'is_active' => true,
            'is_accepting_referrals' => true,
            'verified_at' => now(),
        ]);
        $partner->forceFill([
            'api_key_hash' => HospitalPartner::hashKey($plaintext),
            'api_key_prefix' => substr($plaintext, 0, 10),
            'api_key_rotated_at' => now(),
        ])->save();

        // Cache plaintext so the embed-code page can surface it once on
        // first visit after a fresh seed. After 10 min the partner must
        // rotate to view the secret — matches production behavior.
        Cache::put(
            "hospital-partner-fresh-key:{$partner->id}",
            $plaintext,
            now()->addMinutes(10),
        );

        $this->command->info("✓ hospital_partner: Demo Regional Medical (prefix {$partner->api_key_prefix})");
    }

    private function seedSponsoredCampaign(Facility $facility): void
    {
        SponsoredCampaign::updateOrCreate(
            ['facility_id' => $facility->id, 'name' => 'Sunset Manor — demo boost'],
            [
                'status' => 'active',
                'daily_budget_cents' => 5000,    // $50/day
                'total_budget_cents' => 250_000, // $2,500 lifetime
                'cpc_bid_cents' => 250,          // $2.50 per click
                'starts_on' => now()->subDays(7),
                'ends_on' => now()->addDays(60),
                'target_states' => ['AZ'],
                'target_cities' => ['Phoenix'],
                'spent_today_cents' => 0,
                'spent_total_cents' => 0,
            ],
        );
        $this->command->info('✓ sponsored_campaign: Sunset Manor — demo boost');
    }

    private function seedFacilitySubscription(Facility $facility): void
    {
        $plan = SubscriptionPlan::where('slug', 'facility-pro')->first();
        if (! $plan) return;

        Subscription::updateOrCreate(
            [
                'subscriber_type' => Facility::class,
                'subscriber_id' => $facility->id,
                'subscription_plan_id' => $plan->id,
            ],
            [
                'status' => 'active',
                'billing_cycle' => 'monthly',
                'current_period_started_at' => Carbon::now()->startOfMonth(),
                'current_period_ends_at' => Carbon::now()->startOfMonth()->addMonth(),
                'stripe_subscription_id' => null, // populated when real Stripe checkout runs
                'stripe_customer_id' => null,
            ],
        );

        // Mirror onto the facility row so feature gating reads it without
        // a join.
        $facility->update([
            'subscription_tier' => 'pro',
            'subscription_status' => 'active',
        ]);

        $this->command->info('✓ subscription: Sunset Manor → facility-pro');
    }

    private function seedFamilySubscription(User $user): void
    {
        $plan = SubscriptionPlan::where('slug', 'family-pro')->first();
        if (! $plan) return;

        Subscription::updateOrCreate(
            [
                'subscriber_type' => User::class,
                'subscriber_id' => (string) $user->id,
                'subscription_plan_id' => $plan->id,
            ],
            [
                'status' => 'active',
                'billing_cycle' => 'monthly',
                'current_period_started_at' => Carbon::now()->startOfMonth(),
                'current_period_ends_at' => Carbon::now()->startOfMonth()->addMonth(),
                'stripe_subscription_id' => null,
                'stripe_customer_id' => null,
            ],
        );
        $this->command->info('✓ subscription: family.demo → family-pro');
    }
}
