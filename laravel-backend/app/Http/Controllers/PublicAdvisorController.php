<?php

namespace App\Http\Controllers;

use App\Models\AdvisorProfile;
use App\Models\Placement;
use Illuminate\Http\JsonResponse;

/**
 * Public-facing advisor profile (the page a family lands on when
 * they click an advisor's name in an attribution link). Surfaces
 * only what families care about — credentials, geography, fee
 * transparency, and a verified badge — never PII.
 *
 * The transparent-by-default nature is the whole reason CarePath
 * works for advisors at all: families see the real split + license
 * status, not a faceless "your advisor" placeholder.
 */
class PublicAdvisorController extends Controller
{
    /**
     * GET /api/advisors/{slug}
     */
    public function show(string $slug): JsonResponse
    {
        $profile = AdvisorProfile::query()
            ->where('agency_slug', $slug)
            ->where('is_active', true)
            ->with('user:id,name')
            ->firstOrFail();

        // Lifetime placements + ones that retained 30+ days are a
        // useful signal of "this advisor isn't just talk". Avoid
        // showing dollar amounts publicly.
        $placementsLifetime = Placement::where('advisor_user_id', $profile->user_id)->count();
        $placementsRetained = Placement::where('advisor_user_id', $profile->user_id)
            ->whereIn('status', ['retained_30d', 'retained_90d', 'paid_in_full'])
            ->count();

        return response()->json([
            'data' => [
                'agency_name' => $profile->agency_name,
                'agency_slug' => $profile->agency_slug,
                'agency_website' => $profile->agency_website,
                'bio' => $profile->bio,
                'phone' => $profile->phone,
                // Surface licensed_states + service_area_zips so a
                // family can confirm "they cover where Mom lives".
                'licensed_states' => $profile->licensed_states ?? [],
                'service_area_zips' => $profile->service_area_zips ?? [],
                // Transparent fee disclosure.
                'commission_split_advisor_pct' => $profile->commission_split_advisor_pct,
                'commission_split_platform_pct' => $profile->commission_split_platform_pct,
                'charges_families' => (bool) $profile->charges_families,
                'family_consultation_fee_cents' => $profile->family_consultation_fee_cents,
                // Verification + Stripe Connect.
                'verified' => (bool) $profile->verified_at,
                'verified_at' => $profile->verified_at,
                'payout_ready' => $profile->stripe_account_status === 'active',
                'is_accepting_referrals' => (bool) $profile->is_accepting_referrals,
                'stats' => [
                    'placements_lifetime' => $placementsLifetime,
                    'placements_retained' => $placementsRetained,
                ],
            ],
        ]);
    }
}
