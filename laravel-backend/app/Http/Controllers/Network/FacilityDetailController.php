<?php

namespace App\Http\Controllers\Network;

use App\Http\Controllers\Controller;
use App\Models\Bed;
use App\Models\Facility;
use App\Models\Placement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Network-operator view of one facility in their portfolio. The
 * operator only sees facilities they're linked to via the
 * facility_user pivot (so a chain executive can drill into any
 * site they own, but not into a competitor's). SuperAdmin
 * bypasses the membership check.
 *
 * Visual emphasis is on benchmarking — how this site is doing vs
 * the rest of the operator's portfolio — and on the listing-event
 * funnel that informs whether to invest in sponsored placements.
 */
class FacilityDetailController extends Controller
{
    public function show(Request $request, string $slug): JsonResponse
    {
        $user = $request->user();

        $facility = Facility::query()
            ->where('slug', $slug)
            ->where('is_active', true)
            ->firstOrFail();

        if (! $user->hasRole('super_admin')) {
            $isMember = $user->facilities()->where('facilities.id', $facility->id)->exists();
            if (! $isMember) {
                abort(403, 'This facility is not in your network.');
            }
        }

        $bedCounts = Bed::query()
            ->where('facility_id', $facility->id)
            ->selectRaw('status, count(*) as c')
            ->groupBy('status')
            ->pluck('c', 'status');

        // Listing-event funnel: same source the per-facility analytics
        // page uses, summarized at 30d granularity.
        $eventFunnel = DB::table('facility_listing_events')
            ->where('facility_id', $facility->id)
            ->where('occurred_at', '>=', now()->subDays(30))
            ->selectRaw('event_type, count(*) as c')
            ->groupBy('event_type')
            ->pluck('c', 'event_type');

        $placements30d = (int) Placement::where('facility_id', $facility->id)
            ->where('admitted_on', '>=', now()->subDays(30))
            ->count();

        // Portfolio benchmark: average impressions/leads across all
        // facilities the user is linked to, so the operator can see
        // whether this site is over- or under-performing.
        $portfolioFacilityIds = $user->hasRole('super_admin')
            ? null // skip — too big
            : $user->facilities()->pluck('facilities.id');

        $portfolioBenchmark = null;
        if ($portfolioFacilityIds && $portfolioFacilityIds->count() > 1) {
            $rows = DB::table('facility_listing_events')
                ->whereIn('facility_id', $portfolioFacilityIds)
                ->where('occurred_at', '>=', now()->subDays(30))
                ->selectRaw('facility_id, event_type, count(*) as c')
                ->groupBy('facility_id', 'event_type')
                ->get();

            $byType = [];
            foreach ($rows as $r) {
                $byType[$r->event_type][] = (int) $r->c;
            }
            $portfolioBenchmark = [];
            foreach (['impression', 'detail_view', 'tour_request', 'lead'] as $t) {
                $counts = $byType[$t] ?? [];
                $portfolioBenchmark[$t] = [
                    'avg' => $counts ? round(array_sum($counts) / max(1, count($counts)), 1) : 0,
                    'this_facility' => (int) ($eventFunnel[$t] ?? 0),
                ];
            }
        }

        $admins = $facility
            ->users()
            ->withPivot('role')
            ->orderBy('name')
            ->limit(20)
            ->get(['users.id', 'name', 'email'])
            ->map(fn ($u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'role' => $u->pivot->role,
            ]);

        return response()->json([
            'data' => [
                'facility' => [
                    'id' => $facility->id,
                    'slug' => $facility->slug,
                    'name' => $facility->name,
                    'type' => $facility->type,
                    'city' => $facility->city,
                    'state' => $facility->state,
                    'zip' => $facility->zip,
                    'phone' => $facility->phone,
                    'website' => $facility->website,
                    'cms_five_star_overall' => $facility->cms_five_star_overall,
                    'total_beds' => (int) $facility->total_beds,
                    'price_from_cents' => $facility->price_from_cents,
                    'subscription_tier' => $facility->subscription_tier,
                ],
                'beds' => [
                    'total' => (int) $facility->total_beds,
                    'available' => (int) ($bedCounts['available'] ?? 0),
                    'occupied' => (int) ($bedCounts['occupied'] ?? 0),
                ],
                'event_funnel_30d' => $eventFunnel,
                'placements_30d' => $placements30d,
                'portfolio_benchmark' => $portfolioBenchmark,
                'admins' => $admins,
            ],
        ]);
    }
}
