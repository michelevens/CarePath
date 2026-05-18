<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Bed;
use App\Models\Facility;
use App\Models\FacilityClaim;
use App\Models\Placement;
use App\Models\SponsoredCampaign;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/**
 * SuperAdmin "facility fact sheet" — the most data-rich of the
 * per-portal detail pages. Aggregates everything a platform-level
 * operator needs to investigate a single facility: tenant team,
 * claim history, sponsored campaigns + monthly spend, recent
 * placements + commission flow, listing-event funnel, audit slice.
 *
 * Lives under /superadmin/facilities/{slug} alongside the existing
 * tenant list. Already role-gated by the `role:super_admin`
 * middleware on the parent route group.
 */
class FacilityDetailController extends Controller
{
    public function show(string $slug): JsonResponse
    {
        $facility = Facility::query()
            ->where('slug', $slug)
            ->firstOrFail();

        $bedCounts = Bed::query()
            ->where('facility_id', $facility->id)
            ->selectRaw('status, count(*) as c')
            ->groupBy('status')
            ->pluck('c', 'status');

        $admins = $facility
            ->users()
            ->withPivot('role')
            ->orderBy('name')
            ->get(['users.id', 'name', 'email', 'email_verified_at'])
            ->map(fn ($u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'verified' => (bool) $u->email_verified_at,
                'role' => $u->pivot->role,
            ]);

        $claims = FacilityClaim::query()
            ->where('facility_id', $facility->id)
            ->orderByDesc('created_at')
            ->limit(20)
            ->get(['id', 'claimer_name', 'claimer_title', 'claimer_email', 'status', 'created_at', 'reviewed_at'])
            ->map(fn ($c) => $c->toArray());

        $campaigns = SponsoredCampaign::query()
            ->where('facility_id', $facility->id)
            ->orderByDesc('created_at')
            ->limit(20)
            ->get();

        $placements = Placement::query()
            ->where('facility_id', $facility->id)
            ->with(['advisor:id,name', 'resident:id,first_name,last_name'])
            ->orderByDesc('created_at')
            ->limit(15)
            ->get();

        // Placement money: gross, payouts, status breakdown.
        $placementSummary = [
            'count' => Placement::where('facility_id', $facility->id)->count(),
            'gross_cents_lifetime' => (int) Placement::where('facility_id', $facility->id)
                ->where('status', '!=', 'rescinded')
                ->sum('gross_fee_cents'),
            'platform_cents_lifetime' => (int) Placement::where('facility_id', $facility->id)
                ->where('status', '!=', 'rescinded')
                ->sum('platform_fee_cents'),
            'by_status' => Placement::where('facility_id', $facility->id)
                ->selectRaw('status, count(*) as c')
                ->groupBy('status')
                ->pluck('c', 'status'),
        ];

        // Listing-event funnel for last 30 days. The facility_listing_events
        // table is the source for the per-facility analytics page; we just
        // bucket the same data 4-way here.
        $eventFunnel = DB::table('facility_listing_events')
            ->where('facility_id', $facility->id)
            ->where('occurred_at', '>=', now()->subDays(30))
            ->selectRaw('kind, count(*) as c')
            ->groupBy('kind')
            ->pluck('c', 'kind');

        // Compact audit slice — last 25 events touching this facility
        // OR records nested under it. The SuperAdmin audit log page is
        // the full view; this is the inline summary.
        $audit = AuditLog::query()
            ->where('facility_id', $facility->id)
            ->orderByDesc('occurred_at')
            ->limit(25)
            ->get(['id', 'action', 'auditable_type', 'auditable_id', 'user_id', 'occurred_at'])
            ->map(fn ($r) => $r->toArray());

        return response()->json([
            'data' => [
                'facility' => $facility->toArray(),
                'beds' => [
                    'total' => (int) $facility->total_beds,
                    'available' => (int) ($bedCounts['available'] ?? 0),
                    'occupied' => (int) ($bedCounts['occupied'] ?? 0),
                    'maintenance' => (int) ($bedCounts['maintenance'] ?? 0),
                ],
                'admins' => $admins,
                'claims' => $claims,
                'sponsored_campaigns' => $campaigns,
                'placements_recent' => $placements,
                'placements_summary' => $placementSummary,
                'event_funnel_30d' => $eventFunnel,
                'audit_recent' => $audit,
            ],
        ]);
    }
}
