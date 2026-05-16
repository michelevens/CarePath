<?php

namespace App\Console\Commands;

use App\Models\SponsoredCampaign;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Runs at UTC midnight. Zeroes the spent_today_cents counter on every
 * sponsored_campaign and flips any 'depleted' campaigns back to
 * 'active' so they start serving again (assuming they're still within
 * their date window and haven't hit total_budget_cents).
 *
 * If we ever switch to per-tenant timezones, this would need to fan
 * out per-tz. For now, UTC midnight is the universal pacing tick.
 */
class ResetSponsoredDailySpend extends Command
{
    protected $signature = 'sponsored:reset-daily';
    protected $description = 'Reset sponsored-campaign daily spend counters and reactivate depleted campaigns.';

    public function handle(): int
    {
        $now = now();
        $today = now()->toDateString();

        $reset = SponsoredCampaign::query()->update([
            'spent_today_cents' => 0,
            'last_spend_reset_at' => $now,
        ]);
        $this->info("Reset spent_today_cents on {$reset} campaign(s).");

        // Reactivate depleted-but-still-within-window campaigns.
        $reactivated = SponsoredCampaign::query()
            ->where('status', 'depleted')
            ->where('starts_on', '<=', $today)
            ->where(function ($q) use ($today) {
                $q->whereNull('ends_on')->orWhere('ends_on', '>=', $today);
            })
            ->where(function ($q) {
                $q->whereNull('total_budget_cents')
                  ->orWhereRaw('spent_total_cents < total_budget_cents');
            })
            ->update(['status' => 'active']);
        $this->info("Reactivated {$reactivated} previously-depleted campaign(s).");

        // Auto-end campaigns past their end date.
        $ended = SponsoredCampaign::query()
            ->whereNotNull('ends_on')
            ->where('ends_on', '<', $today)
            ->whereNotIn('status', ['ended'])
            ->update(['status' => 'ended']);
        $this->info("Auto-ended {$ended} campaign(s) past end date.");

        return self::SUCCESS;
    }
}
