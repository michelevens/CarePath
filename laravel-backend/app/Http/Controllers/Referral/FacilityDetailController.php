<?php

namespace App\Http\Controllers\Referral;

use App\Http\Controllers\Controller;
use App\Models\Bed;
use App\Models\Facility;
use App\Models\Placement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Placement-advisor / referral-partner view of a single facility.
 * Lets an advisor see capacity + how they've personally done
 * placing residents into this facility (lifetime placements +
 * commission summary), so they can decide whether to keep
 * recommending it.
 *
 * Scoped to the advisor's own placements — they cannot see other
 * advisors' commission history. SuperAdmin uses the SuperAdmin
 * variant for that.
 */
class FacilityDetailController extends Controller
{
    public function show(Request $request, string $slug): JsonResponse
    {
        $facility = Facility::query()
            ->where('slug', $slug)
            ->where('is_active', true)
            ->firstOrFail();

        $advisorId = $request->user()->id;

        $availableBeds = Bed::query()
            ->where('facility_id', $facility->id)
            ->where('status', 'available')
            ->count();

        $byLevel = Bed::query()
            ->where('facility_id', $facility->id)
            ->where('status', 'available')
            ->selectRaw('level_of_care, count(*) as c')
            ->groupBy('level_of_care')
            ->pluck('c', 'level_of_care');

        $myPlacements = Placement::query()
            ->where('facility_id', $facility->id)
            ->where('advisor_user_id', $advisorId)
            ->with(['resident:id,first_name,last_name'])
            ->orderByDesc('created_at')
            ->limit(20)
            ->get();

        $commissionSummary = [
            'count' => Placement::where('facility_id', $facility->id)
                ->where('advisor_user_id', $advisorId)
                ->count(),
            'gross_cents' => (int) Placement::where('facility_id', $facility->id)
                ->where('advisor_user_id', $advisorId)
                ->where('status', '!=', 'rescinded')
                ->sum('gross_fee_cents'),
            'payout_cents' => (int) Placement::where('facility_id', $facility->id)
                ->where('advisor_user_id', $advisorId)
                ->where('status', '!=', 'rescinded')
                ->sum('advisor_payout_cents'),
            'paid_cents' => (int) Placement::where('facility_id', $facility->id)
                ->where('advisor_user_id', $advisorId)
                ->whereNotNull('paid_at')
                ->sum('amount_paid_cents'),
        ];

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
                    'price_from_cents' => $facility->price_from_cents,
                    'total_beds' => (int) $facility->total_beds,
                ],
                'capacity' => [
                    'available_beds' => $availableBeds,
                    'by_level' => $byLevel,
                ],
                'my_placements' => $myPlacements,
                'commission_summary' => $commissionSummary,
            ],
        ]);
    }
}
