<?php

namespace App\Services;

use App\Models\Facility;
use Carbon\Carbon;

/**
 * Trust signals shown on directory cards. Families scanning a list of 30
 * cards decide who to click in seconds — these badges are the difference
 * between a $9k/mo facility looking craigslist-tier vs. ready-to-tour.
 *
 * Computed server-side so card rendering stays presentational. Each badge
 * is a small dict the UI can render however it wants:
 *   { key, label, tone: 'verified'|'fresh'|'data'|'cms'|'warning' }
 *
 * Badges currently emitted (when applicable):
 *   - "Verified by CarePath"  — facility has an approved claim
 *   - "Pro listing"           — subscription tier is paid (active mgmt)
 *   - "CMS-certified"         — federal data backing (SNF only)
 *   - "Updated Xd ago"        — refreshed recently
 *   - "Live availability"     — bed data fresh enough to act on
 *   - "Real prices"           — pricing published (vs hidden)
 *   - "X photos"              — photo coverage
 *
 * Pass-through optional `$counts` keyed by facility id lets the caller
 * pre-aggregate photo counts in one query rather than N+1.
 */
class FacilityTrustService
{
    public const FRESHNESS_DAYS = 90;
    public const LIVE_AVAILABILITY_DAYS = 14;

    /**
     * @param  Facility|array  $facility
     * @param  array{photo_count?:int,is_claimed?:bool,bed_updated_at?:string|null}  $counts
     *
     * @return array<int, array{key:string,label:string,tone:string}>
     */
    public static function badges(Facility|array $facility, array $counts = []): array
    {
        $f = is_array($facility) ? $facility : $facility->toArray();
        $badges = [];

        // Verified — approved claim OR paying subscriber. Both signal a
        // real human at the facility is managing the listing.
        $isClaimed = $counts['is_claimed']
            ?? (! is_array($facility) ? $facility->claims()->where('status', 'approved')->exists() : false);
        $isPaying = ! empty($f['subscription_tier'])
            && ! in_array($f['subscription_tier'], ['free', null], true);
        if ($isClaimed || $isPaying) {
            $badges[] = [
                'key' => 'verified',
                'label' => 'Verified by CarePath',
                'tone' => 'verified',
            ];
        }

        // Pro/Enterprise tier — separately surfaced so families know the
        // listing is actively managed (more likely to respond fast).
        if ($isPaying) {
            $badges[] = [
                'key' => 'pro',
                'label' => 'Pro listing',
                'tone' => 'verified',
            ];
        }

        // CMS-certified — federal data backing. Only meaningful for SNFs
        // and dual-certified facilities; CMS doesn't rate ALs.
        if (! empty($f['cms_certification_number'])) {
            $badges[] = [
                'key' => 'cms',
                'label' => 'CMS-certified',
                'tone' => 'cms',
            ];
        }

        // Freshness — updated within the last 90 days. After that, the
        // listing is stale enough that families should call to verify.
        $updatedAt = $f['updated_at'] ?? null;
        if ($updatedAt) {
            $days = Carbon::parse($updatedAt)->diffInDays(now());
            if ($days <= self::FRESHNESS_DAYS) {
                $badges[] = [
                    'key' => 'fresh',
                    'label' => $days === 0 ? 'Updated today' : "Updated {$days}d ago",
                    'tone' => 'fresh',
                ];
            }
        }

        // Live availability — bed data refreshed in the last 14 days
        // means the available count on this card is actually actionable.
        $bedUpdated = $counts['bed_updated_at'] ?? null;
        if ($bedUpdated && Carbon::parse($bedUpdated)->diffInDays(now()) <= self::LIVE_AVAILABILITY_DAYS) {
            $badges[] = [
                'key' => 'live_availability',
                'label' => 'Live availability',
                'tone' => 'data',
            ];
        }

        // Real prices — pricing published, vs. the APFM "call to learn"
        // pattern families hate.
        if (! empty($f['price_from_cents']) && $f['price_from_cents'] > 0) {
            $badges[] = [
                'key' => 'real_prices',
                'label' => 'Real prices',
                'tone' => 'data',
            ];
        }

        // Photo coverage — surfaced only when meaningfully populated
        // (5+ photos). Stops us from emitting "1 photo" which is worse
        // than nothing.
        $photos = $counts['photo_count'] ?? 0;
        if ($photos >= 5) {
            $badges[] = [
                'key' => 'photos',
                'label' => "{$photos} photos",
                'tone' => 'data',
            ];
        }

        return $badges;
    }

    /**
     * Lightweight completeness score 0-100, useful for sort tiebreaks
     * and for facility admins to see "your listing is 70% complete."
     */
    public static function completenessPct(Facility|array $facility): int
    {
        $f = is_array($facility) ? $facility : $facility->toArray();
        $criteria = [
            'has_phone' => ! empty($f['phone']),
            'has_email' => ! empty($f['email']),
            'has_website' => ! empty($f['website']),
            'has_price' => ! empty($f['price_from_cents']),
            'has_beds' => ! empty($f['total_beds']),
            'has_address' => ! empty($f['address_line_1']),
            'has_coords' => ! empty($f['latitude']) && ! empty($f['longitude']),
            'has_payer_data' => isset($f['medicaid_certified']) || isset($f['medicare_certified']),
        ];
        $hit = count(array_filter($criteria));
        return (int) round(($hit / count($criteria)) * 100);
    }
}
