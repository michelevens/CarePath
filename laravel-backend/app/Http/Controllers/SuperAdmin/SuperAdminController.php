<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Admission;
use App\Models\AdvisorProfile;
use App\Models\Facility;
use App\Models\HospitalPartner;
use App\Models\Placement;
use App\Models\SponsoredCampaign;
use App\Models\Subscription;
use App\Models\Tour;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/**
 * Platform-wide overview for the CarePath team. This is the
 * superadmin's home page — every other tab (master data, audit log,
 * tenant detail, subscription oversight, etc.) hangs off the same
 * navigation but is implemented in its own controller.
 *
 * Everything here is read-only and cheap; expect 3-5 dashboard hits
 * per superadmin session, all small aggregate queries.
 */
class SuperAdminController extends Controller
{
    /**
     * GET /api/superadmin/stats
     *
     * Two rows of headline numbers + an alerts payload that drives the
     * dashboard's "needs attention" panel. Counts are unconditional —
     * no facility scope, no per-tenant filter — since the superadmin
     * is by definition cross-tenant.
     */
    public function stats(): JsonResponse
    {
        $now = now();
        $startOfYear = $now->copy()->startOfYear();
        $startOfMonth = $now->copy()->startOfMonth();

        $facilityCounts = Facility::query()
            ->selectRaw('count(*) as total')
            ->selectRaw("count(*) filter (where is_active = true) as active")
            ->selectRaw("count(*) filter (where subscription_tier <> 'free') as paid")
            ->first();

        $userCounts = User::query()
            ->selectRaw('count(*) as total')
            ->selectRaw("count(*) filter (where email_verified_at is not null) as verified")
            ->first();

        // Pending verifications — advisor + hospital partner rows where
        // verified_at is null. These are the queue the CarePath ops team
        // works through each morning.
        $pendingAdvisors = AdvisorProfile::whereNull('verified_at')->count();
        $pendingHospitals = HospitalPartner::whereNull('verified_at')->count();

        // MRR approximation — sum monthly_cents of every active sub's
        // plan, with annual subs amortized to monthly. Stored as plain
        // dollars so the frontend doesn't have to do the divide.
        $activeSubs = Subscription::query()
            ->whereIn('status', Subscription::ACTIVE_STATUSES)
            ->with('plan:id,monthly_cents,annual_cents')
            ->get(['id', 'subscription_plan_id', 'billing_cycle', 'status']);

        $mrrCents = $activeSubs->sum(function (Subscription $s) {
            if (! $s->plan) return 0;
            return $s->billing_cycle === 'annual'
                ? (int) round(($s->plan->annual_cents ?? ($s->plan->monthly_cents * 12)) / 12)
                : (int) $s->plan->monthly_cents;
        });

        // Marketplace activity
        $placementsYtd = Placement::where('admitted_on', '>=', $startOfYear)->count();
        $toursThisMonth = Tour::where('starts_at', '>=', $startOfMonth)->count();
        $inquiriesThisMonth = Admission::where('created_at', '>=', $startOfMonth)
            ->where('stage', 'inquiry')
            ->count();
        $activeCampaigns = SponsoredCampaign::whereIn('status', SponsoredCampaign::SERVABLE_STATUSES)
            ->count();

        $statesCovered = Facility::query()
            ->where('is_active', true)
            ->whereNotNull('state')
            ->distinct()
            ->count('state');

        // Last CMS sync — Five-Star data freshness. Most recent
        // cms_synced_at across all facilities is the platform-wide
        // proxy for "did the daily ingest run?"
        $cmsSyncedAt = Facility::max('cms_synced_at');

        return response()->json([
            'data' => [
                'platform' => [
                    'total_facilities' => (int) ($facilityCounts->total ?? 0),
                    'active_facilities' => (int) ($facilityCounts->active ?? 0),
                    'paid_facilities' => (int) ($facilityCounts->paid ?? 0),
                    'total_users' => (int) ($userCounts->total ?? 0),
                    'verified_users' => (int) ($userCounts->verified ?? 0),
                    'pending_advisors' => $pendingAdvisors,
                    'pending_hospitals' => $pendingHospitals,
                    'mrr_cents' => $mrrCents,
                    'active_subscriptions' => $activeSubs->count(),
                ],
                'activity' => [
                    'placements_ytd' => $placementsYtd,
                    'tours_this_month' => $toursThisMonth,
                    'inquiries_this_month' => $inquiriesThisMonth,
                    'active_sponsored_campaigns' => $activeCampaigns,
                    'states_covered' => $statesCovered,
                ],
                'health' => [
                    'cms_synced_at' => $cmsSyncedAt,
                ],
            ],
        ]);
    }

    /**
     * GET /api/superadmin/recent-facilities
     *
     * Last 8 facilities to join the platform (claimed listing or
     * superadmin-created). Shown as a table on the dashboard.
     */
    public function recentFacilities(): JsonResponse
    {
        $rows = Facility::query()
            ->select(['id', 'name', 'slug', 'type', 'city', 'state',
                      'subscription_tier', 'subscription_status',
                      'cms_five_star_overall', 'is_active', 'created_at'])
            ->orderByDesc('created_at')
            ->limit(8)
            ->get();

        return response()->json(['data' => $rows]);
    }

    /**
     * GET /api/superadmin/tenants
     *
     * Filterable facility directory. The superadmin's bread-and-butter
     * view — every facility, every plan, every state, with the same
     * "search + filter" shape they'd expect on /search.
     */
    public function tenants(): JsonResponse
    {
        $rows = Facility::query()
            ->select(['id', 'name', 'slug', 'type', 'city', 'state', 'zip',
                      'subscription_tier', 'subscription_status',
                      'cms_five_star_overall', 'medicaid_certified',
                      'is_active', 'created_at', 'data_source'])
            ->withCount(['users as members_count'])
            ->orderBy('name')
            ->limit(500)
            ->get();

        return response()->json([
            'data' => $rows,
            'summary' => [
                'total' => $rows->count(),
                'by_tier' => $rows->groupBy('subscription_tier')->map->count(),
                'by_state' => $rows->groupBy('state')->map->count(),
            ],
        ]);
    }
}
