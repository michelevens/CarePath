<?php

namespace App\Http\Controllers\Facility;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Listing analytics for a facility admin — the "ROI on your listing"
 * surface that justifies the Pro tier subscription.
 *
 * Numbers shown:
 *   - Impressions: appearances in search results
 *   - Detail views: facility-page opens (the click-through proxy)
 *   - Tour requests: leads tagged to this facility
 *   - Conversion rates between each step
 *
 * Compares last 30d vs. prior 30d so admins see momentum.
 */
class AnalyticsController extends Controller
{
    public function listing(Request $request): JsonResponse
    {
        $user = Auth::user();
        $facilityId = $request->header('X-Facility-Id') ?: $user?->active_facility_id;
        if (! $facilityId) abort(422, 'No active facility');

        // Authorize: must be admin on this facility.
        $isAdmin = DB::table('facility_user')
            ->where('user_id', $user->id)
            ->where('facility_id', $facilityId)
            ->where('role', 'admin')
            ->exists();
        if (! $isAdmin && ! $user->hasRole('super_admin')) abort(403);

        $now = Carbon::now();
        $last30Start = $now->copy()->subDays(30);
        $prior30Start = $now->copy()->subDays(60);

        $current = $this->bucketStats($facilityId, $last30Start, $now);
        $prior = $this->bucketStats($facilityId, $prior30Start, $last30Start);

        // 7-day rolling sparkline — array of per-day counts for the
        // last 30 days. Drives the chart on the analytics page.
        $sparklines = $this->dailyBuckets($facilityId, $last30Start, $now);

        // Top sources (city pages, search, etc.) for the period.
        $sources = DB::table('facility_listing_events')
            ->where('facility_id', $facilityId)
            ->where('occurred_at', '>=', $last30Start)
            ->selectRaw('source, count(*) as n')
            ->groupBy('source')
            ->orderByDesc('n')
            ->limit(6)
            ->get();

        return response()->json([
            'data' => [
                'period_label' => 'Last 30 days',
                'current' => $current,
                'prior' => $prior,
                'change' => [
                    'impressions_pct' => $this->pctChange($current['impressions'], $prior['impressions']),
                    'detail_views_pct' => $this->pctChange($current['detail_views'], $prior['detail_views']),
                    'tour_requests_pct' => $this->pctChange($current['tour_requests'], $prior['tour_requests']),
                ],
                'sparklines' => $sparklines,
                'sources' => $sources,
            ],
        ]);
    }

    private function bucketStats(string $facilityId, Carbon $from, Carbon $to): array
    {
        $events = DB::table('facility_listing_events')
            ->where('facility_id', $facilityId)
            ->whereBetween('occurred_at', [$from, $to])
            ->selectRaw('kind, count(*) as n')
            ->groupBy('kind')
            ->pluck('n', 'kind')
            ->all();

        $impressions = (int) ($events['impression'] ?? 0);
        $detailViews = (int) ($events['detail_view'] ?? 0);
        $phoneClicks = (int) ($events['phone_click'] ?? 0);
        $tourRequests = Lead::query()
            ->where('facility_id', $facilityId)
            ->whereBetween('created_at', [$from, $to])
            ->count();

        return [
            'impressions' => $impressions,
            'detail_views' => $detailViews,
            'phone_clicks' => $phoneClicks,
            'tour_requests' => $tourRequests,
            'ctr_pct' => $impressions > 0 ? round(($detailViews / $impressions) * 100, 1) : 0,
            'conversion_pct' => $detailViews > 0 ? round(($tourRequests / $detailViews) * 100, 1) : 0,
        ];
    }

    private function dailyBuckets(string $facilityId, Carbon $from, Carbon $to): array
    {
        $rows = DB::table('facility_listing_events')
            ->where('facility_id', $facilityId)
            ->whereBetween('occurred_at', [$from, $to])
            ->selectRaw('date(occurred_at) as day, kind, count(*) as n')
            ->groupBy('day', 'kind')
            ->get();

        $byDay = [];
        $cursor = $from->copy()->startOfDay();
        while ($cursor->lte($to)) {
            $byDay[$cursor->toDateString()] = [
                'date' => $cursor->toDateString(),
                'impression' => 0,
                'detail_view' => 0,
            ];
            $cursor->addDay();
        }
        foreach ($rows as $r) {
            $key = $r->day;
            if (! isset($byDay[$key])) continue;
            if (in_array($r->kind, ['impression', 'detail_view'], true)) {
                $byDay[$key][$r->kind] = (int) $r->n;
            }
        }
        return array_values($byDay);
    }

    private function pctChange(int $current, int $prior): ?float
    {
        if ($prior === 0) return $current > 0 ? null : 0.0;
        return round((($current - $prior) / $prior) * 100, 1);
    }
}
