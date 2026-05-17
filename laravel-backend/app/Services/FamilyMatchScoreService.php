<?php

namespace App\Services;

/**
 * Family-specific match score: how well does THIS facility fit THIS
 * family's stated needs? Distinct from QualityScoreService (which is a
 * facility-intrinsic 0-10 quality rating). Same facility scores
 * differently for a Medicaid-required family vs. a private-pay family.
 *
 * The wedge: APFM/Caring/Seniorly compute matches internally and hide
 * them so families call an advisor. We compute and EXPLAIN, so families
 * can self-serve and trust what they see.
 *
 * Score is 0-100 with five weighted dimensions:
 *   - Level of care (must-have)             ............ 25%
 *   - Payer accepted (Medicaid/VA)          ............ 25%
 *   - Distance from preferred location      ............ 15%
 *   - Budget                                ............ 20%
 *   - Special needs (memory, mobility, etc) ............ 15%
 *
 * Each dimension returns a reason object so the UI can show
 * "✓ Accepts Medicaid · ✓ Memory Care · ⚠ Above budget by $400."
 */
class FamilyMatchScoreService
{
    private const WEIGHTS = [
        'level_of_care' => 25,
        'payer' => 25,
        'distance' => 15,
        'budget' => 20,
        'special_needs' => 15,
    ];

    /**
     * @param  array  $facility  Facility-ish array (type, price_from_cents,
     *                           medicaid_certified, distance_miles, amenities[]).
     * @param  array  $prefs     Family preferences. Any null field means "no
     *                           preference" — that dimension is removed from
     *                           scoring entirely (weights redistribute).
     *                           Shape:
     *                             - care_type: 'assisted_living'|'memory_care'|'snf'|...
     *                             - payer_required: 'medicaid'|'medicare'|'va'|null
     *                             - max_budget_cents: int|null
     *                             - distance_target_miles: int|null (preferred radius)
     *                             - special_needs: array<string> (e.g. ['dementia','wheelchair'])
     *
     * @return array{score: int, reasons: array<int, array{key: string, label: string, status: 'pass'|'partial'|'fail'|'unknown', weight: int}>}
     */
    public static function score(array $facility, array $prefs): array
    {
        $reasons = [];
        $weighted = 0.0;
        $usedWeight = 0;

        // 1. Level of care — strict match required for a 'pass'.
        if (! empty($prefs['care_type'])) {
            $facType = $facility['type'] ?? null;
            $needed = $prefs['care_type'];
            $offers = self::offersLevelOfCare($facType, $needed);
            $reasons[] = [
                'key' => 'level_of_care',
                'label' => $offers === 'pass'
                    ? self::careTypeLabel($needed) . ' — specializes here'
                    : ($offers === 'partial'
                        ? 'May offer ' . self::careTypeLabel($needed) . ' (verify with facility)'
                        : 'Does not offer ' . self::careTypeLabel($needed)),
                'status' => $offers,
                'weight' => self::WEIGHTS['level_of_care'],
            ];
            $usedWeight += self::WEIGHTS['level_of_care'];
            $weighted += self::statusValue($offers) * self::WEIGHTS['level_of_care'];
        }

        // 2. Payer — Medicaid/Medicare/VA acceptance.
        if (! empty($prefs['payer_required'])) {
            $payer = $prefs['payer_required'];
            $accepts = self::acceptsPayer($facility, $payer);
            $reasons[] = [
                'key' => 'payer',
                'label' => $accepts === 'pass'
                    ? 'Accepts ' . strtoupper($payer)
                    : ($accepts === 'unknown'
                        ? strtoupper($payer) . ' acceptance unconfirmed'
                        : 'Does not accept ' . strtoupper($payer)),
                'status' => $accepts,
                'weight' => self::WEIGHTS['payer'],
            ];
            $usedWeight += self::WEIGHTS['payer'];
            $weighted += self::statusValue($accepts) * self::WEIGHTS['payer'];
        }

        // 3. Distance — score on band: within target = pass, up to 2x = partial.
        if (! empty($prefs['distance_target_miles']) && isset($facility['distance_miles'])) {
            $target = (float) $prefs['distance_target_miles'];
            $actual = (float) $facility['distance_miles'];
            $status = $actual <= $target ? 'pass' : ($actual <= $target * 2 ? 'partial' : 'fail');
            $reasons[] = [
                'key' => 'distance',
                'label' => $actual <= $target
                    ? sprintf('%.1f mi away (within your %d mi radius)', $actual, $target)
                    : sprintf('%.1f mi away (outside your %d mi target)', $actual, $target),
                'status' => $status,
                'weight' => self::WEIGHTS['distance'],
            ];
            $usedWeight += self::WEIGHTS['distance'];
            $weighted += self::statusValue($status) * self::WEIGHTS['distance'];
        }

        // 4. Budget — strict pass under, partial up to +20%, fail above.
        if (! empty($prefs['max_budget_cents']) && ! empty($facility['price_from_cents'])) {
            $budget = (int) $prefs['max_budget_cents'];
            $price = (int) $facility['price_from_cents'];
            if ($price <= $budget) {
                $status = 'pass';
                $label = sprintf('$%s/mo — within your $%s budget',
                    number_format($price / 100),
                    number_format($budget / 100));
            } elseif ($price <= $budget * 1.2) {
                $status = 'partial';
                $diff = $price - $budget;
                $label = sprintf('Above budget by ~$%s/mo', number_format($diff / 100));
            } else {
                $status = 'fail';
                $diff = $price - $budget;
                $label = sprintf('Significantly above budget (~$%s/mo over)', number_format($diff / 100));
            }
            $reasons[] = [
                'key' => 'budget',
                'label' => $label,
                'status' => $status,
                'weight' => self::WEIGHTS['budget'],
            ];
            $usedWeight += self::WEIGHTS['budget'];
            $weighted += self::statusValue($status) * self::WEIGHTS['budget'];
        } elseif (! empty($prefs['max_budget_cents']) && empty($facility['price_from_cents'])) {
            // Family set a budget but facility hides pricing. Mark unknown
            // and downweight — facility loses points for opacity.
            $reasons[] = [
                'key' => 'budget',
                'label' => 'Pricing not published — request a quote',
                'status' => 'unknown',
                'weight' => self::WEIGHTS['budget'],
            ];
            $usedWeight += self::WEIGHTS['budget'];
            $weighted += self::statusValue('unknown') * self::WEIGHTS['budget'];
        }

        // 5. Special needs — match against facility amenities/specialties.
        if (! empty($prefs['special_needs']) && is_array($prefs['special_needs'])) {
            $needs = array_map('strtolower', $prefs['special_needs']);
            $amenities = array_map('strtolower', $facility['amenity_keys'] ?? []);
            $matched = array_intersect($needs, $amenities);
            $coverage = count($needs) === 0 ? 1.0 : count($matched) / count($needs);
            $status = $coverage >= 1.0 ? 'pass' : ($coverage > 0 ? 'partial' : 'fail');
            $reasons[] = [
                'key' => 'special_needs',
                'label' => $status === 'pass'
                    ? 'Meets all your special-needs requirements'
                    : ($status === 'partial'
                        ? sprintf('Meets %d of %d special-needs requirements', count($matched), count($needs))
                        : 'Special-needs requirements not confirmed'),
                'status' => $status,
                'weight' => self::WEIGHTS['special_needs'],
            ];
            $usedWeight += self::WEIGHTS['special_needs'];
            $weighted += self::statusValue($status) * self::WEIGHTS['special_needs'];
        }

        // If no preferences were set, return a neutral 0 with no reasons.
        if ($usedWeight === 0) {
            return ['score' => 0, 'reasons' => []];
        }

        $score = (int) round(($weighted / $usedWeight) * 100);

        return ['score' => $score, 'reasons' => $reasons];
    }

    private static function statusValue(string $status): float
    {
        return match ($status) {
            'pass' => 1.0,
            'partial' => 0.5,
            'unknown' => 0.3,
            'fail' => 0.0,
            default => 0.0,
        };
    }

    private static function offersLevelOfCare(?string $facilityType, string $needed): string
    {
        if (! $facilityType) return 'unknown';
        if ($facilityType === $needed) return 'pass';

        // CCRCs cover the full continuum.
        if ($facilityType === 'ccrc') return 'pass';

        // Memory care is a specialization of AL — AL facilities often have
        // a memory unit, but not guaranteed; mark partial.
        if ($needed === 'memory_care' && $facilityType === 'assisted_living') return 'partial';

        // SNFs frequently offer short-term rehab + long-term AL-tier care.
        if ($needed === 'assisted_living' && $facilityType === 'snf') return 'partial';

        return 'fail';
    }

    private static function acceptsPayer(array $facility, string $payer): string
    {
        return match (strtolower($payer)) {
            'medicaid' => ! empty($facility['medicaid_certified']) ? 'pass' : 'fail',
            'medicare' => ! empty($facility['medicare_certified']) ? 'pass' : 'fail',
            'va' => 'unknown', // No VA-acceptance column yet
            default => 'unknown',
        };
    }

    private static function careTypeLabel(string $type): string
    {
        return match ($type) {
            'independent_living' => 'Independent Living',
            'assisted_living' => 'Assisted Living',
            'memory_care' => 'Memory Care',
            'snf' => 'Skilled Nursing',
            'ccrc' => 'Continuing Care (CCRC)',
            'group_home' => 'Group Home',
            'adult_family_home' => 'Adult Family Home',
            'icf_iid' => 'ICF/IID',
            default => ucfirst(str_replace('_', ' ', $type)),
        };
    }
}
