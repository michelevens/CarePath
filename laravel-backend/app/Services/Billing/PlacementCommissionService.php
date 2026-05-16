<?php

namespace App\Services\Billing;

use App\Models\Admission;
use App\Models\AdvisorProfile;
use App\Models\Facility;
use App\Models\Placement;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Records a placement when an admission becomes 'admitted' and computes
 * the commission split. Retention-based payouts are scheduled here too
 * (release 70% at the 30-day milestone, 30% at the 90-day milestone).
 *
 * Stripe transfers (the actual money-moving part) are stubbed until
 * Stripe is configured. The local state machine works today so we can
 * dry-run revenue, surface payout dashboards, and back-test commission
 * structures against real admissions data.
 */
class PlacementCommissionService
{
    private const RESCISSION_DAYS = 7;
    private const DEFAULT_FACILITY_PLACEMENT_FEE_CENTS = 500_000; // $5,000

    public function __construct(
        private readonly StripeConnectService $connect,
        private readonly StripeClientFactory $stripe,
    ) {}

    /**
     * Called when an Admission transitions to 'admitted'. Creates the
     * Placement row, computes the split, schedules milestones.
     * Idempotent — returns the existing placement if one already exists.
     */
    public function recordAdmission(Admission $admission, ?int $facilityFeeCents = null): Placement
    {
        $existing = Placement::query()
            ->where('admission_id', $admission->id)
            ->first();
        if ($existing) {
            return $existing;
        }

        $gross = $facilityFeeCents
            ?? $this->resolveFacilityFeeCents($admission->facility_id);

        $advisor = $admission->sourced_by_user_id
            ? User::find($admission->sourced_by_user_id)
            : null;
        $advisorProfile = $advisor?->advisorProfile;

        // Direct (no advisor): platform keeps the whole fee at a lower
        // rate, since we don't have an advisor to pay.
        if (! $advisor || ! $advisorProfile) {
            $platformPct = 100;
            $advisorPayout = 0;
            $platformFee = $gross;
        } else {
            // Snapshot the split at admit time so future advisor pct
            // changes don't retroactively affect already-recorded
            // placements.
            $platformPct = (int) $advisorProfile->commission_split_platform_pct;
            $platformFee = (int) round($gross * $platformPct / 100);
            $advisorPayout = $gross - $platformFee;
        }

        $admittedOn = CarbonImmutable::now()->startOfDay();

        return DB::transaction(function () use ($admission, $advisor, $gross, $platformFee, $advisorPayout, $platformPct, $admittedOn) {
            $placement = Placement::create([
                'facility_id' => $admission->facility_id,
                'admission_id' => $admission->id,
                'advisor_user_id' => $advisor?->id,
                'resident_id' => $admission->resident_id ?? null,
                'gross_fee_cents' => $gross,
                'platform_fee_cents' => $platformFee,
                'advisor_payout_cents' => $advisorPayout,
                'platform_split_pct' => $platformPct,
                'currency' => 'USD',
                'status' => 'pending',
                'admitted_on' => $admittedOn,
                'rescission_window_ends_on' => $admittedOn->addDays(self::RESCISSION_DAYS),
                'retention_30d_milestone_on' => $admittedOn->addDays(30),
                'retention_90d_milestone_on' => $admittedOn->addDays(90),
                'attribution_source' => $admission->attribution_source,
                'attribution_context' => $admission->attribution_context,
            ]);

            Log::info('PlacementCommissionService::recordAdmission', [
                'placement_id' => $placement->id,
                'admission_id' => $admission->id,
                'gross_cents' => $gross,
                'advisor_user_id' => $advisor?->id,
                'platform_pct' => $platformPct,
            ]);

            return $placement;
        });
    }

    /**
     * Move a placement through its retention milestones. Called by a
     * scheduled job (`placements:advance-milestones`) every night.
     *
     * Transitions:
     *   pending → confirmed (after rescission window)
     *   confirmed → retained_30d (releases 70% of advisor payout)
     *   retained_30d → retained_90d (releases 30% remainder + final platform fee)
     *   retained_90d → paid_in_full
     */
    public function advanceMilestones(Placement $placement): Placement
    {
        $today = CarbonImmutable::now()->startOfDay();

        if ($placement->status === 'pending' && $placement->rescission_window_ends_on && $today->gte($placement->rescission_window_ends_on)) {
            $placement->update([
                'status' => 'confirmed',
                'confirmed_on' => $today,
            ]);
        }

        if ($placement->status === 'confirmed' && $placement->retention_30d_milestone_on && $today->gte($placement->retention_30d_milestone_on)) {
            // Release 70% of the advisor payout at 30-day retention.
            $first = (int) round($placement->advisor_payout_cents * 0.70);
            $this->releasePayout($placement, $first);
            $placement->update(['status' => 'retained_30d']);
        }

        if ($placement->status === 'retained_30d' && $placement->retention_90d_milestone_on && $today->gte($placement->retention_90d_milestone_on)) {
            // Release the remaining 30% at 90-day retention.
            $remainder = $placement->advisor_payout_cents - $placement->amount_paid_cents;
            $this->releasePayout($placement, max(0, $remainder));
            $placement->update(['status' => 'paid_in_full']);
        }

        return $placement->refresh();
    }

    /**
     * Mark a placement rescinded — resident left during the rescission
     * window or family canceled. Reverses any pending payouts.
     */
    public function rescind(Placement $placement, ?string $notes = null): Placement
    {
        $placement->update([
            'status' => 'rescinded',
            'rescinded_on' => now()->toDateString(),
            'notes' => $notes,
        ]);
        // TODO[stripe]: if amount_paid_cents > 0, issue a Stripe Reversal
        // on the transfer. For now, just log.
        Log::warning('PlacementCommissionService::rescind', [
            'placement_id' => $placement->id,
            'already_paid_cents' => $placement->amount_paid_cents,
            'notes' => $notes,
        ]);
        return $placement->refresh();
    }

    /**
     * Push money to the advisor's Connect account. Updates the local
     * placement record with the transfer ID and accumulates
     * amount_paid_cents.
     *
     * Real Transfer fires when STRIPE_SECRET is configured. Otherwise
     * this records a local-ledger entry (amount_paid_cents bumped)
     * with a stub transfer ID so the rest of the milestone state
     * machine works end-to-end in dev.
     */
    private function releasePayout(Placement $placement, int $amountCents): void
    {
        if ($amountCents <= 0 || ! $placement->advisor_user_id) {
            return;
        }
        $advisor = User::find($placement->advisor_user_id);
        $advisorProfile = $advisor?->advisorProfile;
        if (! $advisorProfile?->canAcceptPlacements()) {
            Log::warning('PlacementCommissionService::releasePayout — advisor not payout-ready', [
                'placement_id' => $placement->id,
                'advisor_user_id' => $advisor?->id,
                'stripe_account_status' => $advisorProfile?->stripe_account_status,
            ]);
            return;
        }

        $client = $this->stripe->client();
        $transferId = null;

        if ($client) {
            try {
                $transfer = $client->transfers->create([
                    'amount' => $amountCents,
                    'currency' => 'usd',
                    'destination' => $advisorProfile->stripe_account_id,
                    'metadata' => [
                        'placement_id' => (string) $placement->id,
                        'facility_id' => (string) $placement->facility_id,
                    ],
                ]);
                $transferId = $transfer->id;
            } catch (\Throwable $e) {
                Log::error('PlacementCommissionService::releasePayout — Transfer create failed', [
                    'placement_id' => $placement->id,
                    'amount_cents' => $amountCents,
                    'destination' => $advisorProfile->stripe_account_id,
                    'error' => $e->getMessage(),
                ]);
                return; // don't bump amount_paid if the transfer failed
            }
        } else {
            Log::info('PlacementCommissionService::releasePayout (stub — no STRIPE_SECRET)', [
                'placement_id' => $placement->id,
                'amount_cents' => $amountCents,
                'destination' => $advisorProfile->stripe_account_id,
            ]);
        }

        $placement->update([
            'amount_paid_cents' => $placement->amount_paid_cents + $amountCents,
            'paid_at' => now(),
            'stripe_transfer_id' => $transferId ?? $placement->stripe_transfer_id,
        ]);
    }

    /**
     * Each facility can override its placement fee in its profile; we
     * fall back to the platform default otherwise. (Future: store on
     * facilities.placement_fee_cents and override here.)
     */
    private function resolveFacilityFeeCents(string $facilityId): int
    {
        $f = Facility::find($facilityId);
        return $f?->placement_fee_cents
            ?? self::DEFAULT_FACILITY_PLACEMENT_FEE_CENTS;
    }
}
