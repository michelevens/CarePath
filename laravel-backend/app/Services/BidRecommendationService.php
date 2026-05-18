<?php

namespace App\Services;

use App\Models\SponsoredCampaign;
use App\Models\SponsoredClick;
use App\Models\SponsoredImpression;
use Illuminate\Support\Facades\DB;

/**
 * Auction-insights heuristic for sponsored campaigns. We don't log
 * "lost auctions" individually, so the model is pragmatic: combine
 * budget-utilization, competitive-bid, and frequency-cap signals
 * to produce 2-4 actionable hints per campaign.
 *
 * Output is consumed by SponsoredController::insights and rendered
 * on the campaign-edit surface as a "Why didn't I win more?" panel.
 */
class BidRecommendationService
{
    public const HEAD_ROOM_PCT = 0.85; // ≥85% of daily budget = budget-bound

    /**
     * @return array<int, array{
     *   key: string,
     *   severity: 'high'|'medium'|'low',
     *   label: string,
     *   detail: string,
     *   suggested_action: ?array{
     *     type: 'raise_bid'|'raise_budget'|'lower_bid'|'pause',
     *     to_cents?: int,
     *     predicted_lift?: string
     *   }
     * }>
     */
    public function insights(SponsoredCampaign $c): array
    {
        $last30 = now()->subDays(30);
        $impressions = SponsoredImpression::query()
            ->where('campaign_id', $c->id)
            ->where('shown_at', '>=', $last30)
            ->count();
        $clicks = SponsoredClick::query()
            ->where('campaign_id', $c->id)
            ->where('clicked_at', '>=', $last30)
            ->count();
        $spend = (int) SponsoredClick::query()
            ->where('campaign_id', $c->id)
            ->where('clicked_at', '>=', $last30)
            ->sum('billed_cents');

        $ctr = $impressions > 0 ? $clicks / $impressions : 0;
        $avgDailySpend = (int) ($spend / 30);
        $budgetBound = $c->daily_budget_cents > 0
            && $avgDailySpend >= $c->daily_budget_cents * self::HEAD_ROOM_PCT;

        // Days with conversions vs days with spend — coarse signal of
        // whether the bid is hitting eligible families.
        $convertedClicks = SponsoredClick::query()
            ->where('campaign_id', $c->id)
            ->where('clicked_at', '>=', $last30)
            ->whereNotNull('converted_at')
            ->count();
        $cpa = $convertedClicks > 0 ? $spend / $convertedClicks : null;

        // Peer bid: median CPC of OTHER active campaigns targeting the
        // overlapping geography + care type. Skip when there's no peer
        // set (single-tenant edge cases).
        $peerMedianBid = $this->peerMedianBid($c);

        $hints = [];

        // 1. Budget-bound: raise daily budget would unlock more inventory.
        if ($budgetBound) {
            $suggested = (int) round($c->daily_budget_cents * 1.25);
            $hints[] = [
                'key' => 'budget_bound',
                'severity' => 'high',
                'label' => 'Daily budget is the ceiling',
                'detail' => sprintf(
                    'Your avg daily spend ($%.2f) is %d%% of your daily budget ($%.2f). When the budget exhausts mid-day your ad goes dark — families searching after that see competitors.',
                    $avgDailySpend / 100,
                    (int) round(($avgDailySpend / max(1, $c->daily_budget_cents)) * 100),
                    $c->daily_budget_cents / 100,
                ),
                'suggested_action' => [
                    'type' => 'raise_budget',
                    'to_cents' => $suggested,
                    'predicted_lift' => sprintf('+%d%% impressions estimated', 25),
                ],
            ];
        }

        // 2. Bid competitiveness: under peer median = losing higher-CPC slots.
        if ($peerMedianBid && $c->cpc_bid_cents < $peerMedianBid * 0.9) {
            $suggested = (int) round($peerMedianBid * 1.05);
            $delta = max(1, $suggested - $c->cpc_bid_cents);
            $hints[] = [
                'key' => 'under_peer_bid',
                'severity' => 'high',
                'label' => 'Bid is below peer median',
                'detail' => sprintf(
                    'Your CPC ($%.2f) is below the median ($%.2f) of other active campaigns in your area. Raising to $%.2f would put you above ~50%% of competing bids.',
                    $c->cpc_bid_cents / 100,
                    $peerMedianBid / 100,
                    $suggested / 100,
                ),
                'suggested_action' => [
                    'type' => 'raise_bid',
                    'to_cents' => $suggested,
                    'predicted_lift' => sprintf('+$%.2f per click; +%d%% impression share est.', $delta / 100, 35),
                ],
            ];
        }

        // 3. CPA awareness: spend with no conversions in 14+ days is bad.
        if ($spend > 0 && $convertedClicks === 0) {
            $hints[] = [
                'key' => 'no_conversions',
                'severity' => 'medium',
                'label' => 'No tour requests attributed in 30d',
                'detail' => 'Clicks are landing but none have converted to tour requests. Either the listing detail page isn\'t converting (missing photos, price, or compelling description) or the audience isn\'t qualified. Consider improving listing completeness before spending more.',
                'suggested_action' => null,
            ];
        }

        // 4. CTR is strong AND budget has headroom = pure win, suggest raising both.
        if ($ctr > 0.04 && ! $budgetBound && $impressions > 200) {
            $hints[] = [
                'key' => 'underutilized_high_ctr',
                'severity' => 'medium',
                'label' => 'Strong CTR with budget headroom',
                'detail' => sprintf(
                    'CTR is %.1f%% (above the 4%% benchmark) and you\'re using only %d%% of daily budget. Either raise bid to win more auctions, or accept the under-spend and let the campaign run organically.',
                    $ctr * 100,
                    (int) round(($avgDailySpend / max(1, $c->daily_budget_cents)) * 100),
                ),
                'suggested_action' => [
                    'type' => 'raise_bid',
                    'to_cents' => (int) round($c->cpc_bid_cents * 1.15),
                    'predicted_lift' => sprintf('+%d%% volume at similar CTR', 15),
                ],
            ];
        }

        // 5. CPA way above attributed value — lower bid signal.
        if ($cpa !== null && $cpa > SponsoredAttributionService::ESTIMATED_TOUR_VALUE_CENTS) {
            $suggested = (int) max(10, round($c->cpc_bid_cents * 0.85));
            $hints[] = [
                'key' => 'cpa_too_high',
                'severity' => 'medium',
                'label' => 'Cost per tour exceeds estimated tour value',
                'detail' => sprintf(
                    'You\'re paying $%.2f per attributed tour request — above the $%.2f tour-value benchmark. Consider lowering bid to $%.2f or improving conversion on the listing detail page.',
                    $cpa / 100,
                    SponsoredAttributionService::ESTIMATED_TOUR_VALUE_CENTS / 100,
                    $suggested / 100,
                ),
                'suggested_action' => [
                    'type' => 'lower_bid',
                    'to_cents' => $suggested,
                    'predicted_lift' => 'Reduces wasteful clicks',
                ],
            ];
        }

        // 6. Nothing's wrong — affirmation. Important: facilities second-
        // guess healthy campaigns and pause them prematurely.
        if (empty($hints) && $impressions > 0) {
            $hints[] = [
                'key' => 'healthy',
                'severity' => 'low',
                'label' => 'Campaign is performing within range',
                'detail' => sprintf(
                    '%s clicks, %.1f%% CTR, $%.2f spend over the last 30 days. No bid or budget changes recommended right now.',
                    number_format($clicks),
                    $ctr * 100,
                    $spend / 100,
                ),
                'suggested_action' => null,
            ];
        }

        return $hints;
    }

    private function peerMedianBid(SponsoredCampaign $c): ?int
    {
        // Peer set: other active campaigns whose target_states intersect
        // with this one's. JSON column lookup is portable enough across
        // pg + mysql for this rough query.
        $peers = SponsoredCampaign::query()
            ->where('id', '!=', $c->id)
            ->where('status', 'active')
            ->where('cpc_bid_cents', '>', 0)
            ->pluck('cpc_bid_cents');

        if ($peers->count() < 2) return null;

        $sorted = $peers->sort()->values();
        $mid = (int) floor($sorted->count() / 2);
        return $sorted->count() % 2 === 0
            ? (int) round(($sorted[$mid - 1] + $sorted[$mid]) / 2)
            : $sorted[$mid];
    }
}
