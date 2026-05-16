<?php

namespace App\Console\Commands;

use App\Models\Placement;
use App\Services\Billing\PlacementCommissionService;
use Illuminate\Console\Command;

/**
 * Walks every in-flight placement through its retention milestones:
 *   pending → confirmed (after 7-day rescission window)
 *   confirmed → retained_30d (releases 70% of advisor payout)
 *   retained_30d → retained_90d (releases the remaining 30%)
 *   retained_90d → paid_in_full
 *
 * Idempotent — calling on a placement that's already past today's
 * milestone is a no-op. Safe to run hourly or nightly.
 */
class AdvancePlacementMilestones extends Command
{
    protected $signature = 'placements:advance-milestones {--dry-run : log what would change without writing}';
    protected $description = 'Move pending placements through their retention milestones and release advisor payouts.';

    public function handle(PlacementCommissionService $svc): int
    {
        $candidates = Placement::query()
            ->whereIn('status', ['pending', 'confirmed', 'retained_30d'])
            ->orderBy('admitted_on')
            ->get();

        $this->info("Found {$candidates->count()} placements to inspect.");

        $advanced = 0;
        foreach ($candidates as $p) {
            $before = $p->status;
            if ($this->option('dry-run')) {
                $this->line("[dry-run] Would advance placement {$p->id} (status={$before}, admitted_on={$p->admitted_on?->toDateString()})");
                continue;
            }
            $svc->advanceMilestones($p);
            $after = $p->refresh()->status;
            if ($before !== $after) {
                $advanced++;
                $this->line("Advanced placement {$p->id}: {$before} → {$after}");
            }
        }

        $this->info("Done. {$advanced} placement(s) advanced.");
        return self::SUCCESS;
    }
}
