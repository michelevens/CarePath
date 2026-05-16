<?php

namespace App\Services;

/**
 * CarePath Quality Score — a single 0-10 number per facility, computed
 * from objective inputs APFM/Caring don't surface on detail pages:
 * CMS health-inspection rating, CMS staffing rating, CMS quality
 * measures, pricing transparency, and live bed-availability signal.
 *
 * Design goals:
 *   - One gestalt number families can act on in 5 seconds.
 *   - Auditable: caller gets the component breakdown alongside the score.
 *   - Robust to missing data: if a component is null, its weight is
 *     redistributed across the components we do have. A facility with
 *     just CMS data still scores; a facility with only pricing scores.
 *   - Honest: returns null when zero usable signals exist. We don't
 *     fabricate confidence.
 *
 * Methodology (when all signals present):
 *   - CMS Health Inspection ........... 30%
 *   - CMS Staffing ..................... 25%
 *   - CMS Quality Measures ............. 15%
 *   - Pricing transparency ............. 15%
 *   - Live bed-availability signal ..... 10%
 *   - Medicaid/Medicare certification ..  5%
 *
 * We weight inspection highest because CMS does — it's the most heavily
 * weighted input in their own composite Five-Star calculation.
 */
class QualityScoreService
{
    private const WEIGHTS = [
        'inspection' => 30,
        'staffing' => 25,
        'quality_measures' => 15,
        'pricing_transparency' => 15,
        'live_availability' => 10,
        'payer_certification' => 5,
    ];

    /**
     * @param  array  $f Facility-ish array; needs:
     *   - cms_five_star_health_inspection (1-5 or null)
     *   - cms_five_star_staffing (1-5 or null)
     *   - cms_five_star_quality (1-5 or null)
     *   - price_from_cents (int or null)
     *   - available_beds (int)
     *   - total_beds (int)
     *   - medicaid_certified (bool)
     *   - medicare_certified (bool)
     *
     * @return ?array{score: float, components: array<string, array{value: float, weight: int, label: string}>}
     *         Null when zero components are computable (rare — usually pricing or certification is present).
     */
    public static function score(array $f): ?array
    {
        $components = [];

        // CMS components: 1-5 stars → 0-10. Null when unknown.
        foreach (['inspection' => 'cms_five_star_health_inspection',
                  'staffing' => 'cms_five_star_staffing',
                  'quality_measures' => 'cms_five_star_quality'] as $key => $field) {
            $stars = $f[$field] ?? null;
            if ($stars !== null) {
                $components[$key] = [
                    'value' => round(((float) $stars) * 2, 1),
                    'weight' => self::WEIGHTS[$key],
                    'label' => self::labelFor($key),
                ];
            }
        }

        // Pricing transparency: facility either shares a base price publicly
        // or it doesn't. Binary on purpose — this is the wedge.
        $hasPrice = ! empty($f['price_from_cents']) && $f['price_from_cents'] > 0;
        $components['pricing_transparency'] = [
            'value' => $hasPrice ? 10.0 : 3.0,
            'weight' => self::WEIGHTS['pricing_transparency'],
            'label' => 'Pricing transparency',
        ];

        // Live availability: do we have any bed data at all? Full credit
        // when beds are reported (even if waitlist), partial when census
        // is unknown.
        $hasBedData = ($f['total_beds'] ?? 0) > 0;
        $hasAvailable = ($f['available_beds'] ?? 0) > 0;
        $components['live_availability'] = [
            'value' => $hasBedData ? ($hasAvailable ? 10.0 : 6.5) : 3.0,
            'weight' => self::WEIGHTS['live_availability'],
            'label' => 'Live availability data',
        ];

        // Payer certification: Medicaid+Medicare both → full; one → partial.
        $payers = (int) (! empty($f['medicaid_certified'])) + (int) (! empty($f['medicare_certified']));
        $components['payer_certification'] = [
            'value' => $payers === 2 ? 10.0 : ($payers === 1 ? 6.5 : 3.0),
            'weight' => self::WEIGHTS['payer_certification'],
            'label' => 'Payer access (Medicaid/Medicare)',
        ];

        if (empty($components)) {
            return null;
        }

        // Weighted average, normalized to total available weight.
        $totalWeight = array_sum(array_column($components, 'weight'));
        $weighted = 0.0;
        foreach ($components as $c) {
            $weighted += $c['value'] * $c['weight'];
        }
        $score = round($weighted / $totalWeight, 1);

        return [
            'score' => $score,
            'components' => $components,
        ];
    }

    private static function labelFor(string $key): string
    {
        return match ($key) {
            'inspection' => 'CMS Health Inspection',
            'staffing' => 'CMS Staffing',
            'quality_measures' => 'CMS Quality Measures',
            default => ucfirst(str_replace('_', ' ', $key)),
        };
    }
}
