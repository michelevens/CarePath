<?php

namespace App\Services;

use App\Models\StateLicenseCategory;

/**
 * Translates state-specific facility license categories into
 * CarePath's canonical 8-type schema using the per-state lookup
 * tables in state_license_categories (seeded from research +
 * SuperAdmin-editable). Falls back to a generic alias normalizer
 * when no state-specific mapping exists, then flags genuinely
 * unknown values for SuperAdmin review.
 *
 * Returns a tagged result the CSV/OSM ingesters can use to:
 *   - skip rejected categories (e.g. CA ARF, WA ESF — wrong audience)
 *   - persist license_category + license_subtype for traceability
 *   - record the eligibility data so the family-facing UI can show
 *     "this is an IDD-only home" / "Medicaid accepted" labels
 */
class FacilityTypeNormalizer
{
    /**
     * @return array{
     *   canonical: ?string,
     *   license_subtype: ?string,
     *   license_category: string,
     *   rejected: bool,
     *   rejection_reason: ?string,
     *   accepted_populations: ?array,
     *   payer_programs: ?array,
     *   funding_authority: ?string,
     *   eligibility_notes: ?string,
     *   matched: bool,
     * }
     */
    public function normalize(string $rawType, ?string $state): array
    {
        $state = $state ? strtoupper($state) : null;
        $rawType = trim($rawType);
        $category = $state
            ? StateLicenseCategory::lookup($state, $rawType)
            : null;

        if ($category) {
            return [
                'canonical' => $category->canonical_type,
                'license_subtype' => $category->license_subtype,
                'license_category' => $category->source_term,
                'rejected' => (bool) $category->rejected,
                'rejection_reason' => $category->rejection_reason,
                'accepted_populations' => $category->accepted_populations,
                'payer_programs' => $category->payer_programs,
                'funding_authority' => $category->funding_authority,
                'eligibility_notes' => $category->eligibility_notes,
                'matched' => true,
            ];
        }

        // Fallback alias normalizer — covers cases where the state
        // table doesn't have a row yet (smaller states, edge terms).
        $fallback = $this->fallbackAlias($rawType);
        return [
            'canonical' => $fallback,
            'license_subtype' => null,
            'license_category' => $rawType,
            'rejected' => false,
            'rejection_reason' => null,
            'accepted_populations' => null,
            'payer_programs' => null,
            'funding_authority' => null,
            'eligibility_notes' => null,
            'matched' => false,  // caller should log this for SuperAdmin review
        ];
    }

    private function fallbackAlias(string $raw): ?string
    {
        $t = strtolower(trim($raw));
        return match (true) {
            in_array($t, ['snf', 'nursing home', 'nursing_home', 'skilled nursing', 'nursing facility'], true) => 'snf',
            in_array($t, ['memory care', 'memory_care', 'alzheimer', 'dementia care'], true) => 'memory_care',
            in_array($t, ['ccrc', 'continuing care', 'life plan'], true) => 'ccrc',
            in_array($t, ['alf', 'assisted living', 'assisted_living'], true) => 'assisted_living',
            in_array($t, ['il', 'independent living', 'independent_living', 'retirement community', '55+'], true) => 'independent_living',
            in_array($t, ['group home', 'group_home'], true) => 'group_home',
            in_array($t, ['afh', 'adult family home', 'adult_family_home'], true) => 'adult_family_home',
            in_array($t, ['icf/iid', 'icf_iid', 'icf-iid', 'intermediate care'], true) => 'icf_iid',
            default => null,
        };
    }
}
