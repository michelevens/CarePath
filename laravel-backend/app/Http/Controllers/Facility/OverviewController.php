<?php

namespace App\Http\Controllers\Facility;

use App\Http\Controllers\Controller;
use App\Models\Admission;
use App\Models\Bed;
use App\Models\CarePlan;
use App\Models\Facility;
use App\Models\FacilityClaim;
use App\Models\Lead;
use App\Models\Medication;
use App\Models\Resident;
use App\Models\SponsoredCampaign;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Consolidated "this is your facility, at a glance" view consumed
 * by BOTH the Facility Admin and Facility Staff portals. Same
 * payload, different cards rendered per portal on the frontend —
 * admin cares about listing health + sponsored + claims; staff
 * cares about census + residents + admissions queue.
 *
 * Already scoped by the `facility.scope` middleware, so no slug
 * is needed in the URL — the active facility id is pulled from the
 * X-Facility-Id header or the user's active_facility_id.
 */
class OverviewController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $facilityId = $request->attributes->get('facility_id');
        $facility = Facility::findOrFail($facilityId);

        $bedCounts = Bed::query()
            ->where('facility_id', $facilityId)
            ->selectRaw('status, count(*) as c')
            ->groupBy('status')
            ->pluck('c', 'status');

        $admissionsByStage = Admission::query()
            ->where('facility_id', $facilityId)
            ->selectRaw('stage, count(*) as c')
            ->groupBy('stage')
            ->pluck('c', 'stage');

        $residents = [
            'total' => (int) Resident::where('facility_id', $facilityId)
                ->where('status', 'active')
                ->count(),
            'unassigned' => (int) Resident::where('facility_id', $facilityId)
                ->where('status', 'active')
                ->whereDoesntHave('bed')
                ->count(),
        ];

        $carePlanStats = [
            'total' => (int) CarePlan::query()
                ->where('facility_id', $facilityId)
                ->whereIn('status', ['draft', 'active'])
                ->count(),
            'unsigned' => (int) CarePlan::query()
                ->where('facility_id', $facilityId)
                ->where('status', 'active')
                ->whereNull('signed_at')
                ->count(),
        ];

        // Listing-event funnel for last 30 days, used by the admin's
        // analytics card — same source as the dedicated analytics page.
        $eventFunnel = DB::table('facility_listing_events')
            ->where('facility_id', $facilityId)
            ->where('occurred_at', '>=', now()->subDays(30))
            ->selectRaw('event_type, count(*) as c')
            ->groupBy('event_type')
            ->pluck('c', 'event_type');

        $leadsOpen = (int) Lead::query()
            ->where('facility_id', $facilityId)
            ->whereIn('status', ['new', 'contacting'])
            ->count();

        $sponsoredActive = (int) SponsoredCampaign::query()
            ->where('facility_id', $facilityId)
            ->where('status', 'active')
            ->count();

        $claimsPending = (int) FacilityClaim::query()
            ->where('facility_id', $facilityId)
            ->where('status', 'pending')
            ->count();

        $medsDueToday = (int) Medication::query()
            ->whereHas('resident', fn ($q) => $q->where('facility_id', $facilityId)->where('status', 'active'))
            ->where('is_active', true)
            ->count();

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
                    'email' => $facility->email,
                    'website' => $facility->website,
                    'tagline' => $facility->tagline,
                    'description' => $facility->description,
                    'cms_five_star_overall' => $facility->cms_five_star_overall,
                    'medicaid_certified' => (bool) $facility->medicaid_certified,
                    'medicare_certified' => (bool) $facility->medicare_certified,
                    'total_beds' => (int) $facility->total_beds,
                    'price_from_cents' => $facility->price_from_cents,
                    'subscription_tier' => $facility->subscription_tier,
                ],
                'beds' => [
                    'total' => (int) $facility->total_beds,
                    'available' => (int) ($bedCounts['available'] ?? 0),
                    'occupied' => (int) ($bedCounts['occupied'] ?? 0),
                    'maintenance' => (int) ($bedCounts['maintenance'] ?? 0),
                ],
                'residents' => $residents,
                'care_plans' => $carePlanStats,
                'admissions_by_stage' => $admissionsByStage,
                'event_funnel_30d' => $eventFunnel,
                'leads_open' => $leadsOpen,
                'sponsored_active' => $sponsoredActive,
                'claims_pending' => $claimsPending,
                'meds_active' => $medsDueToday,
            ],
        ]);
    }
}
