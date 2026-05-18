<?php

namespace App\Services\Billing;

use App\Models\Facility;
use App\Models\SponsoredCampaign;
use App\Models\SponsoredClick;
use App\Models\SponsoredInvoice;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Aggregates a facility's sponsored-ad spend for a billing month and
 * creates a SponsoredInvoice row. When a Stripe customer + API key
 * are configured, also posts a Stripe Invoice for auto-charge.
 * Otherwise the invoice is "manual" — visible in the facility UI as
 * "pending payment", payable out of band.
 *
 * Idempotent on (facility_id, period_start): re-running on a closed
 * period returns the existing invoice instead of creating a dupe.
 */
class SponsoredBillingService
{
    public function __construct(
        private StripeClientFactory $stripeFactory,
    ) {}

    /**
     * Build an invoice for one facility + one billing month.
     */
    public function billFacility(Facility $facility, Carbon $periodStart): ?SponsoredInvoice
    {
        $periodEnd = $periodStart->copy()->endOfMonth();

        // Idempotency: existing invoice for this period wins (unless
        // it's still a draft, in which case we re-aggregate).
        $existing = SponsoredInvoice::where('facility_id', $facility->id)
            ->where('period_start', $periodStart->toDateString())
            ->first();
        if ($existing && $existing->status !== 'draft') {
            return $existing;
        }

        // Aggregate clicks for the period.
        $campaignIds = SponsoredCampaign::where('facility_id', $facility->id)->pluck('id');
        if ($campaignIds->isEmpty()) return null;

        $clicks = SponsoredClick::query()
            ->whereIn('campaign_id', $campaignIds)
            ->whereBetween('clicked_at', [$periodStart, $periodEnd])
            ->get(['id', 'campaign_id', 'billed_cents', 'clicked_at']);

        if ($clicks->isEmpty() && ! $existing) return null;

        $subtotal = (int) $clicks->sum('billed_cents');
        $clickCount = $clicks->count();

        // Per-campaign line items for the PDF + invoice display.
        $lineItems = $clicks
            ->groupBy('campaign_id')
            ->map(function ($group, $campaignId) {
                $campaign = SponsoredCampaign::find($campaignId);
                return [
                    'campaign_id' => $campaignId,
                    'campaign_name' => $campaign?->name ?? 'Untitled campaign',
                    'clicks' => $group->count(),
                    'amount_cents' => (int) $group->sum('billed_cents'),
                ];
            })
            ->values()
            ->all();

        $invoice = $existing ?: new SponsoredInvoice([
            'facility_id' => $facility->id,
            'period_start' => $periodStart->toDateString(),
            'period_end' => $periodEnd->toDateString(),
        ]);
        $invoice->fill([
            'total_clicks' => $clickCount,
            'subtotal_cents' => $subtotal,
            'discount_cents' => 0, // refund flow not implemented yet
            'amount_due_cents' => $subtotal,
            'status' => 'draft',
            'line_items' => $lineItems,
        ]);
        $invoice->save();

        return $invoice;
    }

    /**
     * Mark the invoice as issued. When Stripe is configured, also
     * post a Stripe Invoice for the facility's connected customer.
     */
    public function issue(SponsoredInvoice $invoice): SponsoredInvoice
    {
        if ($invoice->status !== 'draft') {
            return $invoice;
        }

        $facility = $invoice->facility;
        $issuedAt = now();

        // Try Stripe Invoice creation. If anything fails, fall back to
        // a "sent — please remit out of band" status.
        $stripeInvoiceId = null;
        $stripeUrl = null;
        try {
            $stripe = $this->stripeFactory->client();
            if ($stripe && $facility->stripe_customer_id) {
                $line = $stripe->invoiceItems->create([
                    'customer' => $facility->stripe_customer_id,
                    'amount' => $invoice->amount_due_cents,
                    'currency' => 'usd',
                    'description' => sprintf(
                        'CarePath sponsored ads — %s (%d clicks)',
                        $invoice->period_start->format('F Y'),
                        $invoice->total_clicks,
                    ),
                ]);
                $stripeInvoice = $stripe->invoices->create([
                    'customer' => $facility->stripe_customer_id,
                    'collection_method' => 'charge_automatically',
                    'auto_advance' => true,
                    'metadata' => [
                        'carepath_invoice_id' => $invoice->id,
                        'carepath_facility_id' => $facility->id,
                        'period' => $invoice->period_start->format('Y-m'),
                    ],
                ]);
                $stripeInvoiceId = $stripeInvoice->id;
                $stripeUrl = $stripeInvoice->hosted_invoice_url ?? null;
            }
        } catch (\Throwable $e) {
            Log::warning('Stripe sponsored invoice creation failed', [
                'invoice_id' => $invoice->id,
                'facility_id' => $facility->id,
                'error' => $e->getMessage(),
            ]);
        }

        $invoice->update([
            'status' => 'sent',
            'issued_at' => $issuedAt,
            'stripe_invoice_id' => $stripeInvoiceId,
            'stripe_invoice_url' => $stripeUrl,
        ]);

        return $invoice;
    }

    /**
     * For testing / SuperAdmin override — mark as paid when receiving
     * out-of-band payment confirmation.
     */
    public function markPaid(SponsoredInvoice $invoice): SponsoredInvoice
    {
        $invoice->update(['status' => 'paid', 'paid_at' => now()]);
        return $invoice;
    }
}
