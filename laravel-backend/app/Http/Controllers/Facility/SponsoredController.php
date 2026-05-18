<?php

namespace App\Http\Controllers\Facility;

use App\Http\Controllers\Controller;
use App\Models\Facility;
use App\Models\SponsoredCampaign;
use App\Models\SponsoredClick;
use App\Models\SponsoredCreative;
use App\Models\SponsoredImpression;
use App\Models\SponsoredInvoice;
use App\Services\BidRecommendationService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Facility-side self-serve sponsored-listings management. Each
 * authenticated facility-admin user manages campaigns for their
 * active facility only — the FacilityScope middleware enforces this.
 */
class SponsoredController extends Controller
{
    /**
     * GET /api/facility/sponsored/campaigns
     */
    public function index(): JsonResponse
    {
        $facility = $this->facilityOrFail();
        $campaigns = SponsoredCampaign::query()
            ->where('facility_id', $facility->id)
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($c) => $this->serialize($c));

        return response()->json(['data' => $campaigns]);
    }

    /**
     * POST /api/facility/sponsored/campaigns
     */
    public function store(Request $request): JsonResponse
    {
        $facility = $this->facilityOrFail();
        $data = $this->validateCampaign($request);

        $campaign = SponsoredCampaign::create([
            'facility_id' => $facility->id,
            'name' => $data['name'] ?? null,
            'status' => $data['status'] ?? 'draft',
            'daily_budget_cents' => $data['daily_budget_cents'],
            'total_budget_cents' => $data['total_budget_cents'] ?? null,
            'cpc_bid_cents' => $data['cpc_bid_cents'],
            'starts_on' => $data['starts_on'],
            'ends_on' => $data['ends_on'] ?? null,
            'target_states' => $data['target_states'] ?? null,
            'target_cities' => $data['target_cities'] ?? null,
        ]);

        return response()->json(['data' => $this->serialize($campaign)], 201);
    }

    /**
     * PUT /api/facility/sponsored/campaigns/{id}
     * Allows editing budget, bid, schedule, targeting, status (resume/pause).
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $facility = $this->facilityOrFail();
        $campaign = SponsoredCampaign::query()
            ->where('facility_id', $facility->id)
            ->where('id', $id)
            ->firstOrFail();

        $data = $this->validateCampaign($request, partial: true);

        if (isset($data['status']) && ! in_array($data['status'], SponsoredCampaign::STATUSES, true)) {
            throw ValidationException::withMessages(['status' => 'Invalid status']);
        }

        $campaign->update(array_filter($data, fn ($v) => $v !== null));
        return response()->json(['data' => $this->serialize($campaign->refresh())]);
    }

    /**
     * DELETE /api/facility/sponsored/campaigns/{id}
     */
    public function destroy(string $id): JsonResponse
    {
        $facility = $this->facilityOrFail();
        $campaign = SponsoredCampaign::query()
            ->where('facility_id', $facility->id)
            ->where('id', $id)
            ->firstOrFail();
        $campaign->delete();
        return response()->json(['ok' => true]);
    }

    /**
     * GET /api/facility/sponsored/stats
     * Roll-up across all of this facility's campaigns: today/this-month
     * impressions, clicks, spend, CTR.
     */
    public function stats(): JsonResponse
    {
        $facility = $this->facilityOrFail();
        $today = now()->startOfDay();
        $monthStart = now()->startOfMonth();

        $campaignIds = SponsoredCampaign::query()
            ->where('facility_id', $facility->id)
            ->pluck('id');

        if ($campaignIds->isEmpty()) {
            return response()->json([
                'data' => $this->emptyStats(),
            ]);
        }

        $todayImpressions = SponsoredImpression::query()
            ->whereIn('campaign_id', $campaignIds)
            ->where('shown_at', '>=', $today)
            ->count();
        $todayClicks = SponsoredClick::query()
            ->whereIn('campaign_id', $campaignIds)
            ->where('clicked_at', '>=', $today)
            ->count();
        $todaySpend = (int) SponsoredClick::query()
            ->whereIn('campaign_id', $campaignIds)
            ->where('clicked_at', '>=', $today)
            ->sum('billed_cents');

        $monthImpressions = SponsoredImpression::query()
            ->whereIn('campaign_id', $campaignIds)
            ->where('shown_at', '>=', $monthStart)
            ->count();
        $monthClicks = SponsoredClick::query()
            ->whereIn('campaign_id', $campaignIds)
            ->where('clicked_at', '>=', $monthStart)
            ->count();
        $monthSpend = (int) SponsoredClick::query()
            ->whereIn('campaign_id', $campaignIds)
            ->where('clicked_at', '>=', $monthStart)
            ->sum('billed_cents');

        $todayCtr = $todayImpressions > 0
            ? round(($todayClicks / $todayImpressions) * 100, 1)
            : 0;
        $monthCtr = $monthImpressions > 0
            ? round(($monthClicks / $monthImpressions) * 100, 1)
            : 0;

        // Conversion rollups for ROAS — clicks that have a converted_at
        // were stamped by SponsoredAttributionService when the inquiry
        // landed. Two buckets (tour_request vs admission) so the UI
        // can show the funnel honestly.
        $convRow = function ($from) use ($campaignIds) {
            $rows = SponsoredClick::query()
                ->whereIn('campaign_id', $campaignIds)
                ->where('clicked_at', '>=', $from)
                ->whereNotNull('converted_at')
                ->selectRaw('converted_to, count(*) as n, sum(attributed_value_cents) as value_cents')
                ->groupBy('converted_to')
                ->get()
                ->keyBy('converted_to');
            return [
                'tour_requests' => (int) ($rows->get('tour_request')->n ?? 0)
                    + (int) ($rows->get('admission')->n ?? 0), // admissions also count as tour
                'admissions' => (int) ($rows->get('admission')->n ?? 0),
                'attributed_value_cents' => (int) (
                    ($rows->get('tour_request')->value_cents ?? 0)
                    + ($rows->get('admission')->value_cents ?? 0)
                ),
            ];
        };

        $todayConv = $convRow($today);
        $monthConv = $convRow($monthStart);

        $roas = fn (array $c, int $spend) => $spend > 0
            ? round($c['attributed_value_cents'] / $spend, 2)
            : null;

        return response()->json([
            'data' => [
                'today' => [
                    'impressions' => $todayImpressions,
                    'clicks' => $todayClicks,
                    'spend_cents' => $todaySpend,
                    'ctr_pct' => $todayCtr,
                    'tour_requests' => $todayConv['tour_requests'],
                    'admissions' => $todayConv['admissions'],
                    'attributed_value_cents' => $todayConv['attributed_value_cents'],
                    'roas' => $roas($todayConv, $todaySpend),
                ],
                'this_month' => [
                    'impressions' => $monthImpressions,
                    'clicks' => $monthClicks,
                    'spend_cents' => $monthSpend,
                    'ctr_pct' => $monthCtr,
                    'tour_requests' => $monthConv['tour_requests'],
                    'admissions' => $monthConv['admissions'],
                    'attributed_value_cents' => $monthConv['attributed_value_cents'],
                    'roas' => $roas($monthConv, $monthSpend),
                ],
            ],
        ]);
    }

    private function emptyStats(): array
    {
        $z = [
            'impressions' => 0, 'clicks' => 0, 'spend_cents' => 0, 'ctr_pct' => 0,
            'tour_requests' => 0, 'admissions' => 0,
            'attributed_value_cents' => 0, 'roas' => null,
        ];
        return ['today' => $z, 'this_month' => $z];
    }

    /**
     * GET /api/facility/sponsored/campaigns/{id}/insights
     *
     * Heuristic "why didn't I win?" surface. Returns 1-4 actionable
     * hints per campaign, each with a suggested action the UI can
     * one-click apply.
     */
    public function insights(string $id, BidRecommendationService $svc): JsonResponse
    {
        $facility = $this->facilityOrFail();
        $campaign = SponsoredCampaign::query()
            ->where('id', $id)
            ->where('facility_id', $facility->id)
            ->firstOrFail();

        return response()->json([
            'data' => [
                'campaign_id' => $campaign->id,
                'cpc_bid_cents' => $campaign->cpc_bid_cents,
                'daily_budget_cents' => $campaign->daily_budget_cents,
                'hints' => $svc->insights($campaign),
            ],
        ]);
    }

    /**
     * GET /api/facility/sponsored/campaigns/{id}/creatives
     *
     * List + per-variant CTR rollup. Drives the A/B variants panel
     * on the campaign card.
     */
    public function listCreatives(string $id): JsonResponse
    {
        $facility = $this->facilityOrFail();
        $campaign = SponsoredCampaign::where('id', $id)->where('facility_id', $facility->id)->firstOrFail();
        $creatives = $campaign->creatives()->orderBy('created_at')->get();

        // Roll up per-variant impressions/clicks for the last 30d.
        $since = now()->subDays(30);
        $rows = $creatives->map(function ($v) use ($since) {
            $impressions = SponsoredImpression::query()
                ->where('creative_id', $v->id)
                ->where('shown_at', '>=', $since)
                ->count();
            $clicks = SponsoredClick::query()
                ->where('creative_id', $v->id)
                ->where('clicked_at', '>=', $since)
                ->count();
            return [
                'id' => $v->id,
                'label' => $v->label,
                'headline' => $v->headline,
                'body' => $v->body,
                'is_active' => $v->is_active,
                'impressions' => $impressions,
                'clicks' => $clicks,
                'ctr_pct' => $impressions > 0 ? round(($clicks / $impressions) * 100, 2) : 0,
            ];
        });

        return response()->json(['data' => $rows]);
    }

    /**
     * POST /api/facility/sponsored/campaigns/{id}/creatives
     */
    public function storeCreative(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'label' => ['nullable', 'string', 'max:60'],
            'headline' => ['required', 'string', 'max:160'],
            'body' => ['nullable', 'string', 'max:400'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $facility = $this->facilityOrFail();
        $campaign = SponsoredCampaign::where('id', $id)->where('facility_id', $facility->id)->firstOrFail();

        $variant = $campaign->creatives()->create([
            'label' => $data['label'] ?? null,
            'headline' => $data['headline'],
            'body' => $data['body'] ?? null,
            'is_active' => $data['is_active'] ?? true,
        ]);

        return response()->json(['data' => $variant], 201);
    }

    /**
     * PUT /api/facility/sponsored/creatives/{id}
     */
    public function updateCreative(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'label' => ['nullable', 'string', 'max:60'],
            'headline' => ['nullable', 'string', 'max:160'],
            'body' => ['nullable', 'string', 'max:400'],
            'is_active' => ['nullable', 'boolean'],
        ]);
        $facility = $this->facilityOrFail();
        $variant = SponsoredCreative::query()
            ->whereHas('campaign', fn ($q) => $q->where('facility_id', $facility->id))
            ->findOrFail($id);
        $variant->fill(array_filter($data, fn ($v) => $v !== null));
        $variant->save();
        return response()->json(['data' => $variant]);
    }

    /**
     * DELETE /api/facility/sponsored/creatives/{id}
     */
    public function destroyCreative(string $id): JsonResponse
    {
        $facility = $this->facilityOrFail();
        $variant = SponsoredCreative::query()
            ->whereHas('campaign', fn ($q) => $q->where('facility_id', $facility->id))
            ->findOrFail($id);
        $variant->delete();
        return response()->json(['ok' => true]);
    }

    /**
     * GET /api/facility/sponsored/invoices
     */
    public function listInvoices(): JsonResponse
    {
        $facility = $this->facilityOrFail();
        $rows = SponsoredInvoice::query()
            ->where('facility_id', $facility->id)
            ->orderByDesc('period_start')
            ->limit(24)
            ->get();
        return response()->json([
            'data' => $rows->map(fn ($r) => [
                'id' => $r->id,
                'period_label' => $r->period_start->format('F Y'),
                'period_start' => $r->period_start->toDateString(),
                'period_end' => $r->period_end->toDateString(),
                'total_clicks' => $r->total_clicks,
                'amount_due_cents' => $r->amount_due_cents,
                'status' => $r->status,
                'issued_at' => $r->issued_at?->toIso8601String(),
                'paid_at' => $r->paid_at?->toIso8601String(),
                'stripe_invoice_url' => $r->stripe_invoice_url,
                'line_items' => $r->line_items,
            ]),
        ]);
    }

    /**
     * GET /api/facility/sponsored/invoices/{id}/pdf — branded invoice PDF.
     */
    public function invoicePdf(string $id): Response
    {
        $facility = $this->facilityOrFail();
        $invoice = SponsoredInvoice::query()
            ->where('id', $id)
            ->where('facility_id', $facility->id)
            ->firstOrFail();

        $pdf = Pdf::loadView('invoices.sponsored', [
            'invoice' => $invoice,
            'facility' => $facility,
        ])->setPaper('letter');

        return $pdf->download('carepath-sponsored-' . $invoice->period_start->format('Y-m') . '.pdf');
    }

    private function validateCampaign(Request $request, bool $partial = false): array
    {
        $rules = [
            'name' => ['nullable', 'string', 'max:120'],
            'status' => ['nullable', 'in:draft,active,paused,depleted,ended'],
            'daily_budget_cents' => [$partial ? 'nullable' : 'required', 'integer', 'min:500', 'max:1000000'],
            'total_budget_cents' => ['nullable', 'integer', 'min:500'],
            'cpc_bid_cents' => [$partial ? 'nullable' : 'required', 'integer', 'min:25', 'max:50000'],
            'starts_on' => [$partial ? 'nullable' : 'required', 'date'],
            'ends_on' => ['nullable', 'date', 'after_or_equal:starts_on'],
            'target_states' => ['nullable', 'array'],
            'target_states.*' => ['string', 'size:2'],
            'target_cities' => ['nullable', 'array'],
            'target_cities.*' => ['string', 'max:80'],
        ];
        return $request->validate($rules);
    }

    private function facilityOrFail(): Facility
    {
        $user = Auth::user();
        if (! $user || ! $user->active_facility_id) {
            abort(403, 'No active facility for the authenticated user.');
        }
        $facility = Facility::find($user->active_facility_id);
        if (! $facility) abort(404, 'Active facility not found.');
        return $facility;
    }

    private function serialize(SponsoredCampaign $c): array
    {
        return [
            'id' => $c->id,
            'name' => $c->name,
            'status' => $c->status,
            'daily_budget_cents' => $c->daily_budget_cents,
            'total_budget_cents' => $c->total_budget_cents,
            'cpc_bid_cents' => $c->cpc_bid_cents,
            'starts_on' => $c->starts_on,
            'ends_on' => $c->ends_on,
            'target_states' => $c->target_states ?? [],
            'target_cities' => $c->target_cities ?? [],
            'spent_today_cents' => $c->spent_today_cents,
            'spent_total_cents' => $c->spent_total_cents,
            'created_at' => $c->created_at,
        ];
    }
}
