<?php

namespace Database\Seeders;

use App\Models\SubscriptionPlan;
use Illuminate\Database\Seeder;

/**
 * Source of truth for the public plan catalog. Idempotent — uses
 * updateOrCreate keyed by slug, so re-runs on deploy are safe.
 *
 * Stripe price IDs intentionally null on first seed: create the prices
 * in the Stripe dashboard, then either update the rows manually or via
 * a follow-up migration. Once a price ID is set, SubscriptionService
 * will use it for checkout.
 */
class SubscriptionPlansSeeder extends Seeder
{
    public function run(): void
    {
        $plans = [
            // ── FACILITY ──────────────────────────────────────────────
            [
                'slug' => 'facility-free',
                'name' => 'Facility · Free',
                'audience' => 'facility',
                'tier' => 'free',
                'monthly_cents' => 0,
                'annual_cents' => 0,
                'included_seats' => 1,
                'placement_cap_per_year' => null,
                'features' => [
                    'claim_listing', 'respond_to_inquiries', 'cms_data_visible',
                ],
                'sort_order' => 10,
            ],
            [
                'slug' => 'facility-pro',
                'name' => 'Facility · Pro',
                'audience' => 'facility',
                'tier' => 'pro',
                'monthly_cents' => 29900,           // $299/mo
                'annual_cents' => 287_040,          // $239.20/mo × 12 = $2,870.40 (20% off)
                'included_seats' => 5,
                'placement_cap_per_year' => null,
                'features' => [
                    'claim_listing', 'respond_to_inquiries', 'cms_data_visible',
                    'bed_board_sync', 'admissions_kanban', 'tour_calendar',
                    'mds_tools', 'brochure_customization', 'lead_routing',
                    'basic_analytics', 'facility_data_editor',
                ],
                'sort_order' => 20,
            ],
            [
                'slug' => 'facility-network',
                'name' => 'Facility · Network',
                'audience' => 'facility',
                'tier' => 'network',
                'monthly_cents' => 99900,           // $999/mo per facility, custom for chains
                'annual_cents' => 959_040,
                'included_seats' => 25,
                'placement_cap_per_year' => null,
                'features' => [
                    'claim_listing', 'respond_to_inquiries', 'cms_data_visible',
                    'bed_board_sync', 'admissions_kanban', 'tour_calendar',
                    'mds_tools', 'brochure_customization', 'lead_routing',
                    'basic_analytics', 'facility_data_editor',
                    'multi_facility_dashboard', 'saml_sso', 'white_label_family_portal',
                    'api_access', 'dedicated_csm', 'custom_billing',
                ],
                'sort_order' => 30,
            ],

            // ── ADVISOR ───────────────────────────────────────────────
            [
                'slug' => 'advisor-solo',
                'name' => 'Advisor · Solo',
                'audience' => 'advisor',
                'tier' => 'pro',
                'monthly_cents' => 7900,            // $79/mo
                'annual_cents' => 75_840,
                'included_seats' => 1,
                'placement_cap_per_year' => 50,
                'features' => [
                    'crm_pipeline', 'e_signature_basic', 'payout_dashboard',
                    'calendar_sync', 'public_advisor_page',
                ],
                'sort_order' => 40,
            ],
            [
                'slug' => 'advisor-team',
                'name' => 'Advisor · Team',
                'audience' => 'advisor',
                'tier' => 'team',
                'monthly_cents' => 19900,           // $199/mo
                'annual_cents' => 191_040,
                'included_seats' => 5,
                'placement_cap_per_year' => 200,
                'features' => [
                    'crm_pipeline', 'e_signature_basic', 'payout_dashboard',
                    'calendar_sync', 'public_advisor_page',
                    'team_seats', 'custom_branded_family_pages',
                    'advanced_pipeline_analytics', 'agency_dashboard',
                ],
                'sort_order' => 50,
            ],
            [
                'slug' => 'advisor-agency',
                'name' => 'Advisor · Agency',
                'audience' => 'advisor',
                'tier' => 'agency',
                'monthly_cents' => 49900,           // $499/mo
                'annual_cents' => 479_040,
                'included_seats' => 999,           // effectively unlimited
                'placement_cap_per_year' => null,
                'features' => [
                    'crm_pipeline', 'e_signature_basic', 'payout_dashboard',
                    'calendar_sync', 'public_advisor_page',
                    'team_seats', 'custom_branded_family_pages',
                    'advanced_pipeline_analytics', 'agency_dashboard',
                    'unlimited_seats', 'white_label', 'api_access',
                    'training_mode_admin', 'volume_commission_rebate',
                ],
                'sort_order' => 60,
            ],

            // ── FAMILY ────────────────────────────────────────────────
            [
                'slug' => 'family-free',
                'name' => 'Family · Free',
                'audience' => 'family',
                'tier' => 'free',
                'monthly_cents' => 0,
                'annual_cents' => 0,
                'included_seats' => 1,
                'features' => [
                    'search', 'compare', 'tour_request', 'save_facility',
                    'saved_search', 'cost_projection', 'guides_download',
                ],
                'sort_order' => 70,
            ],
            [
                'slug' => 'family-pro',
                'name' => 'Family · Pro',
                'audience' => 'family',
                'tier' => 'pro',
                'monthly_cents' => 2900,            // $29/mo
                'annual_cents' => 29000,            // 17% off
                'included_seats' => 5,              // multi-family-member sharing
                'features' => [
                    'search', 'compare', 'tour_request', 'save_facility',
                    'saved_search', 'cost_projection', 'guides_download',
                    'document_vault', 'custom_cost_projection_report',
                    'comparison_reports_pdf', 'premium_support',
                    'multi_member_sharing',
                ],
                'sort_order' => 80,
            ],
        ];

        foreach ($plans as $row) {
            SubscriptionPlan::updateOrCreate(
                ['slug' => $row['slug']],
                $row + ['is_active' => true],
            );
        }
    }
}
