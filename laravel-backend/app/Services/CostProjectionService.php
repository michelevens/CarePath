<?php

namespace App\Services;

use App\Models\Facility;
use App\Models\FacilityPricingTier;

/**
 * Projects 5-year (or shorter) total cost of stay at a facility, blending
 * Medicare Part A SNF benefit, Medicaid spend-down, LTC insurance, VA Aid
 * & Attendance, and private pay.
 *
 * All money is computed in CENTS internally and returned that way; the UI
 * formats. Stateless — no DB writes.
 *
 * Numbers are 2024 federal benchmarks. State-specific Medicaid math is
 * approximated: when assets fall below $2,000, the resident keeps a $50/mo
 * personal needs allowance plus modest health-insurance allowance, and the
 * rest of their income is the "patient share." Medicaid pays the
 * difference up to the facility's Medicaid-allowable rate (here we assume
 * the facility's base rate is fully covered to keep the model intuitive).
 */
class CostProjectionService
{
    // 2024 Medicare Part A SNF benefit period.
    private const MEDICARE_FULL_COVERAGE_DAYS = 20;
    private const MEDICARE_COPAY_DAYS = 80;                // days 21-100
    private const MEDICARE_DAILY_COPAY_CENTS = 20950;      // $209.50/day in 2024

    // Medicaid simplifications.
    private const MEDICAID_ASSET_THRESHOLD_CENTS = 200000; // $2,000 in cents
    private const PERSONAL_NEEDS_ALLOWANCE_CENTS = 5000;   // $50/mo

    // VA Aid & Attendance 2024 monthly maximums.
    private const VA_AA_SINGLE_VETERAN_CENTS = 272700;     // $2,727
    private const VA_AA_VETERAN_AND_SPOUSE_CENTS = 323200; // $3,232
    private const VA_AA_SURVIVING_SPOUSE_CENTS = 175400;   // $1,754

    /**
     * Compute a per-month projection over the given horizon.
     *
     * @param  array{
     *   facility_slug: string,
     *   level_of_care: string,
     *   months: int,
     *   starting_assets_cents: int,
     *   monthly_income_cents: int,
     *   medicare_part_a_eligible: bool,
     *   ltc_insurance_daily_benefit_cents?: int,
     *   ltc_insurance_total_pool_cents?: int,
     *   va_aa_status?: 'none'|'single_veteran'|'veteran_and_spouse'|'surviving_spouse',
     *   medicaid_eligible_state?: bool,
     * }  $input
     */
    public function project(array $input): array
    {
        $facility = Facility::query()
            ->where('slug', $input['facility_slug'])
            ->firstOrFail();

        $monthlyRate = $this->resolveMonthlyRate($facility, $input['level_of_care']);
        $months = max(1, min(60, $input['months']));

        $vaMonthly = match ($input['va_aa_status'] ?? 'none') {
            'single_veteran' => self::VA_AA_SINGLE_VETERAN_CENTS,
            'veteran_and_spouse' => self::VA_AA_VETERAN_AND_SPOUSE_CENTS,
            'surviving_spouse' => self::VA_AA_SURVIVING_SPOUSE_CENTS,
            default => 0,
        };

        $assets = $input['starting_assets_cents'];
        $income = $input['monthly_income_cents'];
        $medicareDaysUsed = 0;
        $ltcRemaining = $input['ltc_insurance_total_pool_cents'] ?? 0;
        $ltcDaily = $input['ltc_insurance_daily_benefit_cents'] ?? 0;
        $medicaidEligibleState = $input['medicaid_eligible_state'] ?? true;

        $rows = [];
        $totals = [
            'facility_cost_cents' => 0,
            'medicare_covered_cents' => 0,
            'medicaid_covered_cents' => 0,
            'ltc_covered_cents' => 0,
            'va_covered_cents' => 0,
            'out_of_pocket_cents' => 0,
            'months_until_medicaid' => null,
        ];

        for ($m = 1; $m <= $months; $m++) {
            $monthDays = 30; // simplification — average month length for benefit math
            $monthCost = $monthlyRate;

            $medicareCovered = 0;
            // Skilled / sub-acute rehab is the only thing Medicare A SNF
            // covers — for AL/memory care months, $0.
            if (
                ($input['medicare_part_a_eligible'] ?? false)
                && $input['level_of_care'] === 'skilled'
                && $medicareDaysUsed < (self::MEDICARE_FULL_COVERAGE_DAYS + self::MEDICARE_COPAY_DAYS)
            ) {
                $remainingFull = max(0, self::MEDICARE_FULL_COVERAGE_DAYS - $medicareDaysUsed);
                $daysFull = min($remainingFull, $monthDays);
                $remainingCopay = max(0, self::MEDICARE_COPAY_DAYS - max(0, $medicareDaysUsed - self::MEDICARE_FULL_COVERAGE_DAYS));
                $daysCopay = min($remainingCopay, $monthDays - $daysFull);

                $dailyFacilityRate = intdiv($monthlyRate, $monthDays);

                $medicareCovered += $daysFull * $dailyFacilityRate;
                // Copay period: Medicare pays the difference between facility
                // rate and the patient's copay.
                $medicareCovered += $daysCopay * max(0, $dailyFacilityRate - self::MEDICARE_DAILY_COPAY_CENTS);

                $medicareDaysUsed += $daysFull + $daysCopay;
            }

            $afterMedicare = max(0, $monthCost - $medicareCovered);

            $vaCovered = min($vaMonthly, $afterMedicare);
            $afterVa = $afterMedicare - $vaCovered;

            $ltcCovered = 0;
            if ($ltcDaily > 0 && $ltcRemaining > 0) {
                $ltcMonth = min($ltcDaily * $monthDays, $afterVa, $ltcRemaining);
                $ltcCovered = max(0, $ltcMonth);
                $ltcRemaining -= $ltcCovered;
            }
            $afterLtc = $afterVa - $ltcCovered;

            $medicaidCovered = 0;
            $onMedicaid = $medicaidEligibleState && $assets <= self::MEDICAID_ASSET_THRESHOLD_CENTS;
            if ($onMedicaid) {
                // Resident pays patient-share from income; Medicaid covers
                // the rest of the facility bill (we assume the facility's
                // rate is at the Medicaid-allowable level).
                $patientShare = max(0, $income - self::PERSONAL_NEEDS_ALLOWANCE_CENTS);
                $patientShare = min($patientShare, $afterLtc);
                $medicaidCovered = max(0, $afterLtc - $patientShare);
                $outOfPocket = $patientShare;
                if ($totals['months_until_medicaid'] === null) {
                    $totals['months_until_medicaid'] = $m;
                }
            } else {
                $outOfPocket = $afterLtc;
                // Spend down assets by what private-pay can't cover from income.
                $monthlyShortfall = max(0, $outOfPocket - $income);
                $assets = max(0, $assets - $monthlyShortfall);
            }

            $totals['facility_cost_cents'] += $monthCost;
            $totals['medicare_covered_cents'] += $medicareCovered;
            $totals['medicaid_covered_cents'] += $medicaidCovered;
            $totals['ltc_covered_cents'] += $ltcCovered;
            $totals['va_covered_cents'] += $vaCovered;
            $totals['out_of_pocket_cents'] += $outOfPocket;

            $rows[] = [
                'month' => $m,
                'year' => intdiv($m - 1, 12) + 1,
                'facility_cost_cents' => $monthCost,
                'medicare_cents' => $medicareCovered,
                'medicaid_cents' => $medicaidCovered,
                'ltc_cents' => $ltcCovered,
                'va_cents' => $vaCovered,
                'out_of_pocket_cents' => $outOfPocket,
                'assets_remaining_cents' => $assets,
                'on_medicaid' => $onMedicaid,
            ];
        }

        // Roll up per-year for the summary table.
        $byYear = [];
        foreach ($rows as $r) {
            $y = $r['year'];
            if (! isset($byYear[$y])) {
                $byYear[$y] = [
                    'year' => $y,
                    'facility_cost_cents' => 0,
                    'medicare_cents' => 0,
                    'medicaid_cents' => 0,
                    'ltc_cents' => 0,
                    'va_cents' => 0,
                    'out_of_pocket_cents' => 0,
                ];
            }
            $byYear[$y]['facility_cost_cents'] += $r['facility_cost_cents'];
            $byYear[$y]['medicare_cents'] += $r['medicare_cents'];
            $byYear[$y]['medicaid_cents'] += $r['medicaid_cents'];
            $byYear[$y]['ltc_cents'] += $r['ltc_cents'];
            $byYear[$y]['va_cents'] += $r['va_cents'];
            $byYear[$y]['out_of_pocket_cents'] += $r['out_of_pocket_cents'];
        }

        return [
            'facility' => [
                'name' => $facility->name,
                'slug' => $facility->slug,
            ],
            'inputs' => $input,
            'monthly_rate_cents' => $monthlyRate,
            'months' => $months,
            'totals' => $totals,
            'by_year' => array_values($byYear),
            'months_detail' => $rows,
            'assumptions' => [
                'medicare_full_days' => self::MEDICARE_FULL_COVERAGE_DAYS,
                'medicare_copay_days' => self::MEDICARE_COPAY_DAYS,
                'medicare_daily_copay_cents' => self::MEDICARE_DAILY_COPAY_CENTS,
                'medicaid_asset_threshold_cents' => self::MEDICAID_ASSET_THRESHOLD_CENTS,
                'personal_needs_allowance_cents' => self::PERSONAL_NEEDS_ALLOWANCE_CENTS,
                'va_aa_single_veteran_cents' => self::VA_AA_SINGLE_VETERAN_CENTS,
                'va_aa_veteran_and_spouse_cents' => self::VA_AA_VETERAN_AND_SPOUSE_CENTS,
                'va_aa_surviving_spouse_cents' => self::VA_AA_SURVIVING_SPOUSE_CENTS,
            ],
        ];
    }

    /**
     * Resolve the monthly rate at this facility for the chosen level of care.
     * Prefers structured pricing tier data; falls back to price_from_cents;
     * falls back to a sensible national-average estimate per level.
     */
    private function resolveMonthlyRate(Facility $facility, string $levelOfCare): int
    {
        $base = FacilityPricingTier::query()
            ->where('facility_id', $facility->id)
            ->where('tier_type', 'base')
            ->where('billing_cadence', 'monthly')
            ->where('is_active', true)
            ->where(function ($q) use ($levelOfCare) {
                $q->where('level_of_care', $levelOfCare)
                  ->orWhereNull('level_of_care');
            })
            ->orderBy('amount_cents')
            ->value('amount_cents');

        if ($base) {
            $adder = (int) FacilityPricingTier::query()
                ->where('facility_id', $facility->id)
                ->where('tier_type', 'level_adder')
                ->where('billing_cadence', 'monthly')
                ->where('is_active', true)
                ->where('level_of_care', $levelOfCare)
                ->sum('amount_cents');
            return $base + $adder;
        }

        if ($facility->price_from_cents) {
            return $facility->price_from_cents;
        }

        // National average fallbacks ($ → cents).
        return match ($levelOfCare) {
            'independent' => 350000,  // $3,500
            'assisted' => 520000,     // $5,200
            'memory' => 680000,       // $6,800
            'skilled' => 950000,      // $9,500
            'hospice' => 450000,      // $4,500
            default => 500000,
        };
    }
}
