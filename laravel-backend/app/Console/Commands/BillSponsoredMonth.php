<?php

namespace App\Console\Commands;

use App\Models\Facility;
use App\Services\Billing\SponsoredBillingService;
use Carbon\Carbon;
use Illuminate\Console\Command;

/**
 * Monthly run that aggregates sponsored-ad spend per facility and
 * issues invoices. Scheduled for the 2nd of each month at 4am UTC
 * (gives the prior month's daily-reset job time to settle).
 *
 *   php artisan sponsored:bill-month           # bills prior month
 *   php artisan sponsored:bill-month 2025-10   # bills October 2025
 *   php artisan sponsored:bill-month --dry-run # aggregates without issuing
 */
class BillSponsoredMonth extends Command
{
    protected $signature = 'sponsored:bill-month {month? : YYYY-MM} {--dry-run : compute without issuing}';
    protected $description = 'Aggregate sponsored-ad clicks per facility for a billing month and issue invoices.';

    public function handle(SponsoredBillingService $svc): int
    {
        $monthInput = $this->argument('month');
        $periodStart = $monthInput
            ? Carbon::createFromFormat('Y-m', $monthInput)->startOfMonth()
            : Carbon::now()->subMonthNoOverflow()->startOfMonth();

        $this->info("Billing period: {$periodStart->format('F Y')}");
        $dryRun = (bool) $this->option('dry-run');

        $facilities = Facility::query()->where('is_active', true)->get(['id', 'name', 'stripe_customer_id']);
        $this->info("Inspecting {$facilities->count()} facilities…");

        $billed = 0;
        $totalCents = 0;
        foreach ($facilities as $facility) {
            $invoice = $svc->billFacility($facility, $periodStart);
            if (! $invoice) continue;

            $totalCents += $invoice->amount_due_cents;
            $billed++;

            $this->line(sprintf(
                '  %s: %d clicks, $%.2f — %s',
                $facility->name,
                $invoice->total_clicks,
                $invoice->amount_due_cents / 100,
                $invoice->status,
            ));

            if (! $dryRun && $invoice->status === 'draft') {
                $svc->issue($invoice);
            }
        }

        $this->info(sprintf(
            'Done. %d invoices, $%.2f total. (%s)',
            $billed,
            $totalCents / 100,
            $dryRun ? 'dry-run, nothing issued' : 'issued',
        ));
        return self::SUCCESS;
    }
}
