<?php

namespace App\Http\Controllers\Referral;

use App\Http\Controllers\Controller;
use App\Models\Admission;
use App\Models\AdvisorProfile;
use App\Models\Placement;
use App\Models\User;
use App\Services\Billing\StripeConnectService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Placement-advisor portal. All endpoints require an authenticated
 * user with the `referral_partner` role (gated in routes/api.php).
 *
 * Convention: every handler self-resolves the AdvisorProfile from the
 * authenticated user, creating it on first call so onboarding is just
 * "log in, fill out profile, connect Stripe".
 */
class ReferralController extends Controller
{
    public function __construct(
        private readonly StripeConnectService $connect,
    ) {}

    /**
     * GET /api/referral/profile
     * Returns the advisor's profile + payout-readiness flags. Creates
     * an empty profile row on first hit so the UI always has a row to
     * edit against.
     */
    public function profile(): JsonResponse
    {
        $user = $this->userOrFail();
        $profile = $this->ensureProfile($user);

        return response()->json([
            'data' => $this->serialize($profile),
        ]);
    }

    /**
     * PUT /api/referral/profile
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $this->userOrFail();
        $profile = $this->ensureProfile($user);

        // commission_split_advisor_pct is deliberately NOT in this list.
        // The split is a contract term set per-tier by the platform (Solo
        // 82 / Team 85 / Agency 88); letting advisors edit it lets them
        // bump to 95% right before a high-value placement lands and back
        // down after, inflating their cut on in-flight admissions whose
        // snapshot hadn't been taken yet. SuperAdmin updates the column
        // directly when re-negotiating tier contracts.
        $data = $request->validate([
            'agency_name' => ['nullable', 'string', 'max:191'],
            'agency_slug' => ['nullable', 'string', 'max:191', 'regex:/^[a-z0-9-]+$/'],
            'agency_website' => ['nullable', 'url', 'max:255'],
            'bio' => ['nullable', 'string', 'max:2000'],
            'phone' => ['nullable', 'string', 'max:30'],
            'licensed_states' => ['nullable', 'array'],
            'service_area_zips' => ['nullable', 'array'],
            'charges_families' => ['nullable', 'boolean'],
            'family_consultation_fee_cents' => ['nullable', 'integer', 'min:0', 'max:1000000'],
            'is_accepting_referrals' => ['nullable', 'boolean'],
        ]);

        // Derive a slug if the agency named themselves but didn't pick one.
        if (! empty($data['agency_name']) && empty($data['agency_slug']) && ! $profile->agency_slug) {
            $candidate = Str::slug($data['agency_name']);
            // Append a suffix if collision.
            $i = 0;
            $slug = $candidate;
            while (AdvisorProfile::where('agency_slug', $slug)->where('id', '!=', $profile->id)->exists()) {
                $i++;
                $slug = $candidate . '-' . $i;
            }
            $data['agency_slug'] = $slug;
        }

        $profile->update($data);

        return response()->json(['data' => $this->serialize($profile->refresh())]);
    }

    /**
     * POST /api/referral/connect/onboarding
     * Returns a URL the advisor should be redirected to in order to
     * complete (or refresh) their Stripe Connect Express onboarding.
     * Creates the Stripe account on first call.
     */
    public function connectOnboarding(): JsonResponse
    {
        $user = $this->userOrFail();
        $profile = $this->ensureProfile($user);

        $url = $this->connect->generateOnboardingLink($profile);

        // Mirror the new IDs/status back to the User row for cross-portal
        // helpers that don't load AdvisorProfile.
        $user->update([
            'stripe_account_id' => $profile->stripe_account_id,
            'stripe_account_status' => $profile->stripe_account_status,
        ]);

        return response()->json([
            'data' => [
                'onboarding_url' => $url,
                'stripe_account_status' => $profile->stripe_account_status,
            ],
        ]);
    }

    /**
     * GET /api/referral/stats
     * Dashboard overview — earnings YTD, pending payouts, placements
     * this month, conversion rate.
     */
    public function stats(): JsonResponse
    {
        $user = $this->userOrFail();
        $startOfYear = now()->startOfYear();
        $startOfMonth = now()->startOfMonth();

        $yearPlacements = Placement::query()
            ->where('advisor_user_id', $user->id)
            ->where('admitted_on', '>=', $startOfYear)
            ->get(['status', 'advisor_payout_cents', 'amount_paid_cents']);

        $earningsYtdCents = (int) $yearPlacements->sum('amount_paid_cents');
        $pendingPayoutsCents = (int) $yearPlacements
            ->whereIn('status', ['pending', 'confirmed', 'retained_30d'])
            ->sum(fn ($p) => max(0, $p->advisor_payout_cents - $p->amount_paid_cents));

        $placementsThisMonth = Placement::query()
            ->where('advisor_user_id', $user->id)
            ->where('admitted_on', '>=', $startOfMonth)
            ->count();

        $inquiriesThisMonth = Admission::query()
            ->where('sourced_by_user_id', $user->id)
            ->where('created_at', '>=', $startOfMonth)
            ->count();

        $conversionPct = $inquiriesThisMonth > 0
            ? (int) round(($placementsThisMonth / $inquiriesThisMonth) * 100)
            : 0;

        return response()->json([
            'data' => [
                'earnings_ytd_cents' => $earningsYtdCents,
                'pending_payouts_cents' => $pendingPayoutsCents,
                'placements_this_month' => $placementsThisMonth,
                'inquiries_this_month' => $inquiriesThisMonth,
                'conversion_pct' => $conversionPct,
            ],
        ]);
    }

    /**
     * GET /api/referral/placements
     * All placements sourced by this advisor — used for the payouts page.
     */
    public function placements(): JsonResponse
    {
        $user = $this->userOrFail();
        $placements = Placement::query()
            ->where('advisor_user_id', $user->id)
            ->with(['facility:id,name,slug,city,state', 'admission:id,prospect_first_name,prospect_last_name'])
            ->orderByDesc('admitted_on')
            ->limit(200)
            ->get();

        return response()->json([
            'data' => $placements->map(fn ($p) => [
                'id' => $p->id,
                'facility' => $p->facility ? [
                    'name' => $p->facility->name,
                    'slug' => $p->facility->slug,
                    'city' => $p->facility->city,
                    'state' => $p->facility->state,
                ] : null,
                'prospect_name' => $p->admission
                    ? trim($p->admission->prospect_first_name . ' ' . $p->admission->prospect_last_name)
                    : null,
                'status' => $p->status,
                'gross_fee_cents' => $p->gross_fee_cents,
                'advisor_payout_cents' => $p->advisor_payout_cents,
                'amount_paid_cents' => $p->amount_paid_cents,
                'platform_split_pct' => $p->platform_split_pct,
                'admitted_on' => $p->admitted_on,
                'rescission_window_ends_on' => $p->rescission_window_ends_on,
                'retention_30d_milestone_on' => $p->retention_30d_milestone_on,
                'retention_90d_milestone_on' => $p->retention_90d_milestone_on,
                'attribution_source' => $p->attribution_source,
                'paid_at' => $p->paid_at,
            ]),
        ]);
    }

    /**
     * GET /api/referral/pipeline
     * Admissions attributed to this advisor — leads in flight, by
     * funnel stage. The advisor's CRM view.
     */
    public function pipeline(): JsonResponse
    {
        $user = $this->userOrFail();
        $admissions = Admission::query()
            ->where('sourced_by_user_id', $user->id)
            ->with(['facility:id,name,slug,city,state'])
            ->orderByDesc('created_at')
            ->limit(200)
            ->get();

        $byStage = $admissions->groupBy('stage')->map->count();

        return response()->json([
            'data' => [
                'admissions' => $admissions->map(fn ($a) => [
                    'id' => $a->id,
                    'stage' => $a->stage,
                    'inquirer_name' => $a->inquirer_name,
                    'inquirer_email' => $a->inquirer_email,
                    'prospect_first_name' => $a->prospect_first_name,
                    'prospect_last_name' => $a->prospect_last_name,
                    'prospect_level_of_care' => $a->prospect_level_of_care,
                    'target_admit_date' => $a->target_admit_date,
                    'facility' => $a->facility ? [
                        'name' => $a->facility->name,
                        'slug' => $a->facility->slug,
                        'city' => $a->facility->city,
                        'state' => $a->facility->state,
                    ] : null,
                    'attribution_source' => $a->attribution_source,
                    'created_at' => $a->created_at,
                ]),
                'by_stage' => $byStage,
            ],
        ]);
    }

    /**
     * Ensure the authenticated user has an AdvisorProfile row, lazily
     * creating an empty one on first call. Splits and active flags
     * default to schema defaults (82/18 split, active=true).
     */
    private function ensureProfile(User $user): AdvisorProfile
    {
        return DB::transaction(function () use ($user) {
            $profile = AdvisorProfile::where('user_id', $user->id)->first();
            if ($profile) return $profile;
            return AdvisorProfile::create([
                'user_id' => $user->id,
                'agency_name' => null,
                'is_active' => true,
                'is_accepting_referrals' => true,
                'commission_split_advisor_pct' => 82,
                'commission_split_platform_pct' => 18,
            ]);
        });
    }

    private function userOrFail(): User
    {
        $user = Auth::user();
        if (! $user) abort(401);
        return $user;
    }

    private function serialize(AdvisorProfile $profile): array
    {
        return [
            'id' => $profile->id,
            'agency_name' => $profile->agency_name,
            'agency_slug' => $profile->agency_slug,
            'agency_website' => $profile->agency_website,
            'bio' => $profile->bio,
            'phone' => $profile->phone,
            'licensed_states' => $profile->licensed_states ?? [],
            'service_area_zips' => $profile->service_area_zips ?? [],
            'commission_split_advisor_pct' => $profile->commission_split_advisor_pct,
            'commission_split_platform_pct' => $profile->commission_split_platform_pct,
            'charges_families' => (bool) $profile->charges_families,
            'family_consultation_fee_cents' => $profile->family_consultation_fee_cents,
            'is_active' => (bool) $profile->is_active,
            'is_accepting_referrals' => (bool) $profile->is_accepting_referrals,
            'stripe_account_id' => $profile->stripe_account_id,
            'stripe_account_status' => $profile->stripe_account_status,
            'can_accept_placements' => $profile->canAcceptPlacements(),
            'verified_at' => $profile->verified_at,
        ];
    }
}
