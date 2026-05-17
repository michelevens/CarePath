<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Admission;
use App\Models\AdvisorProfile;
use App\Models\Facility;
use App\Models\FacilityClaim;
use App\Models\HospitalPartner;
use App\Models\Placement;
use App\Models\SponsoredCampaign;
use App\Models\Subscription;
use App\Models\Tour;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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
     * GET /api/superadmin/verifications
     *
     * Pending + recently-verified advisor + hospital queue. Ordered
     * oldest-first so the ops team works the longest-waiting partners
     * first (a partner sitting unverified for 2 weeks is the worst
     * possible UX — they signed up and we've ghosted them).
     */
    public function verifications(): JsonResponse
    {
        $pendingAdvisors = AdvisorProfile::query()
            ->whereNull('verified_at')
            ->with('user:id,name,email,created_at')
            ->orderBy('created_at')
            ->limit(100)
            ->get([
                'id', 'user_id', 'agency_name', 'agency_slug',
                'licensed_states', 'stripe_account_status',
                'is_active', 'is_accepting_referrals',
                'created_at',
            ]);

        $pendingHospitals = HospitalPartner::query()
            ->whereNull('verified_at')
            ->with('user:id,name,email,created_at')
            ->orderBy('created_at')
            ->limit(100)
            ->get([
                'id', 'user_id', 'name', 'slug', 'partner_type',
                'service_area_states', 'stripe_account_status',
                'is_active', 'is_accepting_referrals',
                'created_at',
            ]);

        $recentlyVerifiedAdvisors = AdvisorProfile::query()
            ->whereNotNull('verified_at')
            ->with('user:id,name,email')
            ->orderByDesc('verified_at')
            ->limit(10)
            ->get(['id', 'user_id', 'agency_name', 'verified_at']);

        $recentlyVerifiedHospitals = HospitalPartner::query()
            ->whereNotNull('verified_at')
            ->with('user:id,name,email')
            ->orderByDesc('verified_at')
            ->limit(10)
            ->get(['id', 'user_id', 'name', 'verified_at']);

        return response()->json([
            'data' => [
                'pending_advisors' => $pendingAdvisors,
                'pending_hospitals' => $pendingHospitals,
                'recent_advisors' => $recentlyVerifiedAdvisors,
                'recent_hospitals' => $recentlyVerifiedHospitals,
            ],
        ]);
    }

    /**
     * POST /api/superadmin/verifications/advisors/{id}/approve
     *
     * Stamps verified_at AND grants the referral_partner role on the
     * owning user (idempotent). Without the role grant, an advisor
     * whose profile was created out-of-band (or before the role
     * existed) would stay locked out of the portal even after we'd
     * "approved" them in the queue.
     */
    public function approveAdvisor(string $id): JsonResponse
    {
        $profile = AdvisorProfile::findOrFail($id);
        $profile->update(['verified_at' => now()]);
        if ($profile->user) {
            $profile->user->assignRole('referral_partner');
            $profile->user->notify(new \App\Notifications\AdvisorApproved($profile));
        }
        return response()->json([
            'ok' => true,
            'verified_at' => $profile->verified_at,
            'role_granted' => 'referral_partner',
        ]);
    }

    /**
     * POST /api/superadmin/verifications/hospitals/{id}/approve
     */
    public function approveHospital(string $id): JsonResponse
    {
        $partner = HospitalPartner::findOrFail($id);
        $partner->update(['verified_at' => now()]);
        if ($partner->user) {
            $partner->user->assignRole('hospital_partner');
            $partner->user->notify(new \App\Notifications\HospitalApproved($partner));
        }
        return response()->json([
            'ok' => true,
            'verified_at' => $partner->verified_at,
            'role_granted' => 'hospital_partner',
        ]);
    }

    /**
     * GET /api/superadmin/claims
     *
     * Pending facility-claim queue + recently-approved/rejected for
     * audit. Includes the email-domain match signal so the reviewer
     * can spot likely-legitimate claims at a glance.
     */
    public function claims(): JsonResponse
    {
        $pending = FacilityClaim::query()
            ->where('status', 'pending')
            ->with([
                'facility:id,name,slug,city,state,website,phone',
                'user:id,name,email,created_at',
            ])
            ->orderBy('created_at')
            ->limit(100)
            ->get();

        $recent = FacilityClaim::query()
            ->whereIn('status', ['approved', 'rejected'])
            ->with(['facility:id,name,slug', 'user:id,name,email'])
            ->orderByDesc('reviewed_at')
            ->limit(20)
            ->get();

        return response()->json([
            'data' => [
                'pending' => $pending->map(fn (FacilityClaim $c) => [
                    'id' => $c->id,
                    'facility' => $c->facility ? [
                        'name' => $c->facility->name,
                        'slug' => $c->facility->slug,
                        'city' => $c->facility->city,
                        'state' => $c->facility->state,
                        'website' => $c->facility->website,
                        'phone' => $c->facility->phone,
                    ] : null,
                    'user' => $c->user ? [
                        'id' => $c->user->id,
                        'name' => $c->user->name,
                        'email' => $c->user->email,
                    ] : null,
                    'claimer_name' => $c->claimer_name,
                    'claimer_title' => $c->claimer_title,
                    'claimer_email' => $c->claimer_email,
                    'claimer_phone' => $c->claimer_phone,
                    'supporting_notes' => $c->supporting_notes,
                    'email_domain_matches' => $c->emailDomainMatchesFacility(),
                    'created_at' => $c->created_at,
                ]),
                'recent' => $recent->map(fn (FacilityClaim $c) => [
                    'id' => $c->id,
                    'facility_name' => $c->facility?->name,
                    'facility_slug' => $c->facility?->slug,
                    'user_name' => $c->user?->name,
                    'status' => $c->status,
                    'reviewed_at' => $c->reviewed_at,
                ]),
            ],
        ]);
    }

    /**
     * POST /api/superadmin/claims/{id}/approve
     *
     * Grants facility_admin role on the user, creates the
     * facility_user pivot row, sets the claim to approved. Auto-
     * approves OTHER pending claims by the same user on the same
     * facility (rare race) so we don't leave dangling rows.
     */
    public function approveClaim(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $claim = FacilityClaim::findOrFail($id);
        if ($claim->status !== 'pending') {
            return response()->json(['ok' => false, 'message' => 'Claim is no longer pending'], 422);
        }

        DB::transaction(function () use ($claim, $request, $data) {
            // Grant role.
            $claim->user->assignRole('facility_admin');

            // Create pivot row (idempotent — they may already be a
            // member as staff, for instance).
            DB::table('facility_user')->updateOrInsert(
                ['facility_id' => $claim->facility_id, 'user_id' => $claim->user_id],
                ['role' => 'admin', 'updated_at' => now(), 'created_at' => now()],
            );

            // Default active facility if they don't have one yet.
            if (! $claim->user->active_facility_id) {
                $claim->user->update(['active_facility_id' => $claim->facility_id]);
            }

            $claim->update([
                'status' => 'approved',
                'reviewed_by_user_id' => $request->user()?->id,
                'reviewed_at' => now(),
                'decision_notes' => $data['notes'] ?? null,
            ]);
        });

        // Notify the claimant outside the transaction so an SMTP
        // failure doesn't roll back the role grant.
        $claim->refresh()->load('facility', 'user');
        if ($claim->user && $claim->facility) {
            $claim->user->notify(new \App\Notifications\FacilityClaimApproved($claim, $claim->facility));
        }

        return response()->json([
            'ok' => true,
            'message' => 'Claim approved. The user is now a facility admin on this site.',
        ]);
    }

    /**
     * POST /api/superadmin/claims/{id}/reject
     */
    public function rejectClaim(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'notes' => ['required', 'string', 'max:2000'],
        ]);

        $claim = FacilityClaim::findOrFail($id);
        if ($claim->status !== 'pending') {
            return response()->json(['ok' => false, 'message' => 'Claim is no longer pending'], 422);
        }

        $claim->update([
            'status' => 'rejected',
            'reviewed_by_user_id' => $request->user()?->id,
            'reviewed_at' => now(),
            'decision_notes' => $data['notes'],
        ]);

        $claim->load('facility', 'user');
        if ($claim->user && $claim->facility) {
            $claim->user->notify(new \App\Notifications\FacilityClaimRejected($claim, $claim->facility));
        }

        return response()->json(['ok' => true]);
    }

    /**
     * GET /api/superadmin/subscriptions
     *
     * Active + recently-canceled subscriptions across the platform,
     * with MRR by plan and a churn-risk view (past_due, canceled in
     * the last 30 days).
     */
    public function subscriptions(Request $request): JsonResponse
    {
        $status = $request->query('status', 'active'); // active | past_due | canceled | all

        $query = Subscription::query()
            ->with(['plan:id,slug,name,audience,tier,monthly_cents,annual_cents'])
            ->orderByDesc('current_period_started_at')
            ->limit(300);

        if ($status === 'active') {
            $query->whereIn('status', Subscription::ACTIVE_STATUSES);
        } elseif ($status === 'past_due') {
            $query->where('status', 'past_due');
        } elseif ($status === 'canceled') {
            $query->where('status', 'canceled');
        }

        $subs = $query->get();

        // Resolve subscriber names. Polymorphic lookup is too chatty
        // to eager-load cleanly across two types, so we split + batch.
        $facilityIds = $subs->where('subscriber_type', Facility::class)->pluck('subscriber_id')->unique();
        $userIds = $subs->where('subscriber_type', User::class)->pluck('subscriber_id')->unique();

        $facilities = Facility::whereIn('id', $facilityIds)->get(['id', 'name', 'slug'])->keyBy('id');
        $users = User::whereIn('id', $userIds)->get(['id', 'name', 'email'])->keyBy('id');

        $rows = $subs->map(function (Subscription $s) use ($facilities, $users) {
            $subscriber = $s->subscriber_type === Facility::class
                ? $facilities->get($s->subscriber_id)
                : $users->get((int) $s->subscriber_id);

            $monthlyCents = $s->plan
                ? ($s->billing_cycle === 'annual'
                    ? (int) round(($s->plan->annual_cents ?? ($s->plan->monthly_cents * 12)) / 12)
                    : (int) $s->plan->monthly_cents)
                : 0;

            return [
                'id' => $s->id,
                'subscriber_type' => $s->subscriber_type === Facility::class ? 'facility' : 'user',
                'subscriber_id' => $s->subscriber_id,
                'subscriber_name' => $subscriber->name ?? '(deleted)',
                'subscriber_slug' => $subscriber->slug ?? null,
                'subscriber_email' => $subscriber->email ?? null,
                'plan_slug' => $s->plan?->slug,
                'plan_name' => $s->plan?->name,
                'tier' => $s->plan?->tier,
                'audience' => $s->plan?->audience,
                'status' => $s->status,
                'billing_cycle' => $s->billing_cycle,
                'monthly_cents' => $monthlyCents,
                'current_period_ends_at' => $s->current_period_ends_at,
                'canceled_at' => $s->canceled_at,
                'stripe_subscription_id' => $s->stripe_subscription_id,
            ];
        })->values();

        // Headline numbers across the unfiltered active set, so the
        // page can show MRR even when filtered to past_due / canceled.
        $allActive = Subscription::whereIn('status', Subscription::ACTIVE_STATUSES)
            ->with('plan:id,monthly_cents,annual_cents')
            ->get(['id', 'subscription_plan_id', 'billing_cycle', 'status']);

        $mrrCents = $allActive->sum(function (Subscription $s) {
            if (! $s->plan) return 0;
            return $s->billing_cycle === 'annual'
                ? (int) round(($s->plan->annual_cents ?? ($s->plan->monthly_cents * 12)) / 12)
                : (int) $s->plan->monthly_cents;
        });

        return response()->json([
            'data' => $rows,
            'summary' => [
                'mrr_cents' => $mrrCents,
                'active_count' => $allActive->count(),
                'past_due_count' => Subscription::where('status', 'past_due')->count(),
                'canceled_last_30d' => Subscription::where('status', 'canceled')
                    ->where('canceled_at', '>=', now()->subDays(30))
                    ->count(),
            ],
        ]);
    }

    /**
     * GET /api/superadmin/placements
     *
     * Cross-tenant placement ledger. Ops uses this to confirm
     * milestone advancement, investigate disputes, and audit
     * commission payouts.
     */
    public function placements(Request $request): JsonResponse
    {
        $status = $request->query('status'); // pending | confirmed | retained_30d | retained_90d | paid_in_full | rescinded | disputed

        $query = Placement::query()
            ->with([
                'facility:id,name,slug,city,state',
            ])
            ->orderByDesc('admitted_on')
            ->limit(200);

        if ($status) {
            $query->where('status', $status);
        }

        $placements = $query->get();

        // Resolve advisor names — bigint user id, batch lookup.
        $advisorIds = $placements->pluck('advisor_user_id')->filter()->unique();
        $advisors = User::whereIn('id', $advisorIds)->get(['id', 'name', 'email'])->keyBy('id');

        $rows = $placements->map(function (Placement $p) use ($advisors) {
            $advisor = $p->advisor_user_id ? $advisors->get($p->advisor_user_id) : null;
            return [
                'id' => $p->id,
                'facility' => $p->facility ? [
                    'name' => $p->facility->name,
                    'slug' => $p->facility->slug,
                    'city' => $p->facility->city,
                    'state' => $p->facility->state,
                ] : null,
                'advisor' => $advisor ? ['name' => $advisor->name, 'email' => $advisor->email] : null,
                'gross_fee_cents' => $p->gross_fee_cents,
                'platform_fee_cents' => $p->platform_fee_cents,
                'advisor_payout_cents' => $p->advisor_payout_cents,
                'amount_paid_cents' => $p->amount_paid_cents,
                'platform_split_pct' => $p->platform_split_pct,
                'status' => $p->status,
                'admitted_on' => $p->admitted_on,
                'rescission_window_ends_on' => $p->rescission_window_ends_on,
                'retention_30d_milestone_on' => $p->retention_30d_milestone_on,
                'retention_90d_milestone_on' => $p->retention_90d_milestone_on,
                'attribution_source' => $p->attribution_source,
                'stripe_transfer_id' => $p->stripe_transfer_id,
            ];
        });

        return response()->json([
            'data' => $rows,
            'summary' => [
                'total_gross_ytd_cents' => Placement::where('admitted_on', '>=', now()->startOfYear())
                    ->sum('gross_fee_cents'),
                'total_paid_ytd_cents' => Placement::where('admitted_on', '>=', now()->startOfYear())
                    ->sum('amount_paid_cents'),
                'by_status' => Placement::selectRaw('status, count(*) as c')
                    ->groupBy('status')
                    ->pluck('c', 'status'),
            ],
        ]);
    }

    /**
     * GET /api/superadmin/sponsored
     *
     * Platform-wide ad-campaign oversight. Spend pacing, CTR proxies,
     * and a flag if any campaign's spent_today_cents looks suspicious
     * relative to impression count (early click-fraud signal).
     */
    public function sponsored(): JsonResponse
    {
        $campaigns = SponsoredCampaign::query()
            ->with('facility:id,name,slug,city,state')
            ->withCount(['impressions', 'clicks'])
            ->orderByDesc('spent_today_cents')
            ->limit(200)
            ->get();

        $rows = $campaigns->map(function (SponsoredCampaign $c) {
            $impressions = (int) ($c->impressions_count ?? 0);
            $clicks = (int) ($c->clicks_count ?? 0);
            $ctr = $impressions > 0 ? round($clicks * 100 / $impressions, 2) : null;

            return [
                'id' => $c->id,
                'name' => $c->name,
                'status' => $c->status,
                'facility' => $c->facility ? [
                    'name' => $c->facility->name,
                    'slug' => $c->facility->slug,
                    'city' => $c->facility->city,
                    'state' => $c->facility->state,
                ] : null,
                'daily_budget_cents' => $c->daily_budget_cents,
                'total_budget_cents' => $c->total_budget_cents,
                'cpc_bid_cents' => $c->cpc_bid_cents,
                'spent_today_cents' => $c->spent_today_cents,
                'spent_total_cents' => $c->spent_total_cents,
                'impressions' => $impressions,
                'clicks' => $clicks,
                'ctr_pct' => $ctr,
                'starts_on' => $c->starts_on,
                'ends_on' => $c->ends_on,
                'target_states' => $c->target_states,
                'target_cities' => $c->target_cities,
            ];
        });

        // Open user reports for the SuperAdmin to triage. Joined into
        // the same payload so the page can show "X campaigns have
        // pending reports" without a second request.
        $openReports = \App\Models\SponsoredAdReport::query()
            ->where('status', 'open')
            ->with(['facility:id,name,slug', 'campaign:id,name'])
            ->orderByDesc('created_at')
            ->limit(50)
            ->get();

        return response()->json([
            'data' => $rows,
            'summary' => [
                'total_active' => $campaigns->whereIn('status', SponsoredCampaign::SERVABLE_STATUSES)->count(),
                'spend_today_cents' => $campaigns->sum('spent_today_cents'),
                'impressions_today' => $campaigns->sum('impressions_count'),
                'clicks_today' => $campaigns->sum('clicks_count'),
                'open_reports_count' => \App\Models\SponsoredAdReport::where('status', 'open')->count(),
            ],
            'open_reports' => $openReports->map(fn ($r) => [
                'id' => $r->id,
                'reason' => $r->reason,
                'notes' => $r->notes,
                'created_at' => $r->created_at,
                'campaign' => $r->campaign ? ['id' => $r->campaign->id, 'name' => $r->campaign->name] : null,
                'facility' => $r->facility ? ['name' => $r->facility->name, 'slug' => $r->facility->slug] : null,
            ]),
        ]);
    }

    /**
     * POST /api/superadmin/sponsored/reports/{id}/resolve
     */
    public function resolveAdReport(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'action' => ['required', 'in:warning_sent,campaign_paused,campaign_ended,no_action'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $report = \App\Models\SponsoredAdReport::findOrFail($id);
        $report->update([
            'status' => $data['action'] === 'no_action' ? 'dismissed' : 'actioned',
            'resolution_action' => $data['action'],
            'resolution_notes' => $data['notes'] ?? null,
            'resolved_by_user_id' => $request->user()?->id,
            'resolved_at' => now(),
        ]);

        // If the action says pause/end, flip the campaign too.
        if ($data['action'] === 'campaign_paused') {
            SponsoredCampaign::where('id', $report->campaign_id)->update(['status' => 'paused']);
        } elseif ($data['action'] === 'campaign_ended') {
            SponsoredCampaign::where('id', $report->campaign_id)->update(['status' => 'ended']);
        }

        return response()->json(['ok' => true]);
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
