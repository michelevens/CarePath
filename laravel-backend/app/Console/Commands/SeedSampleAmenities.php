<?php

namespace App\Console\Commands;

use App\Models\Facility;
use App\Models\FacilityAmenity;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Backfills facilities with a realistic curated amenity set so the
 * Amenities section on /facility/{slug} actually renders. Runs against
 * facilities that have zero amenities today; never overwrites a
 * facility that already has any. Idempotent — re-running is a no-op
 * for already-amenized facilities.
 *
 *   php artisan carepath:seed-sample-amenities             # top 200 facilities
 *   php artisan carepath:seed-sample-amenities --limit=50  # top 50 only
 *   php artisan carepath:seed-sample-amenities --all       # every active facility
 */
class SeedSampleAmenities extends Command
{
    protected $signature = 'carepath:seed-sample-amenities {--limit=200} {--all : seed every active facility}';
    protected $description = 'Backfill sample amenity sets for facilities that have none yet.';

    /**
     * Tiered amenity pool — higher-tier facilities get more, lower-
     * tier get the basics. Each amenity row is
     * [category, name, optional detail, featured?].
     */
    private array $core = [
        ['healthcare', '24-hour nursing', null, true],
        ['healthcare', 'Medication management', null, false],
        ['dining', 'Three meals daily', null, true],
        ['room', 'Private bathroom', null, false],
        ['room', 'Wi-Fi included', null, false],
        ['community', 'Outdoor courtyard', null, false],
        ['activities', 'Daily activities calendar', null, false],
        ['services', 'Housekeeping (weekly)', null, false],
        ['services', 'Laundry service', null, false],
    ];

    private array $premium = [
        ['healthcare', 'On-site physician visits', 'Weekly rounds, available on-call', true],
        ['healthcare', 'Physical therapy', null, false],
        ['healthcare', 'Occupational therapy', null, false],
        ['dining', 'Chef-prepared meals', 'Seasonal menus, dietary accommodations', true],
        ['dining', 'Private dining for family events', null, false],
        ['dining', 'Snacks & coffee bar', null, false],
        ['room', 'Walk-in shower (accessible)', null, true],
        ['room', 'Kitchenette', null, false],
        ['room', 'Cable TV', null, false],
        ['community', 'Library', null, false],
        ['community', 'Salon (hair + nails)', null, false],
        ['community', 'Walking paths & gardens', null, false],
        ['activities', 'Fitness classes', null, true],
        ['activities', 'Religious services (multi-faith)', null, false],
        ['activities', 'Game & movie nights', null, false],
        ['activities', 'Music & arts programs', null, false],
        ['services', 'Transportation (medical + outings)', null, true],
        ['services', 'Concierge service', null, false],
        ['services', 'Pet-friendly', 'Small dogs and cats welcome', false],
    ];

    public function handle(): int
    {
        $query = Facility::query()
            ->where('is_active', true)
            ->whereDoesntHave('amenities');

        if (! $this->option('all')) {
            $query->orderByDesc('cms_five_star_overall')
                ->orderByDesc('total_beds')
                ->limit((int) $this->option('limit'));
        }

        $facilities = $query->get(['id', 'name', 'cms_five_star_overall']);
        $this->info("Found {$facilities->count()} facilities with no amenities.");
        if ($facilities->isEmpty()) return self::SUCCESS;

        $seeded = 0;
        foreach ($facilities as $f) {
            // Higher-rated facilities get the premium set added on top
            // of the core — so the data plausibly reflects what good
            // facilities advertise.
            $stars = (int) ($f->cms_five_star_overall ?? 3);
            $pool = $this->core;
            if ($stars >= 4) {
                $pool = array_merge($pool, $this->premium);
            } elseif ($stars >= 3) {
                $pool = array_merge($pool, array_slice($this->premium, 0, 10));
            }

            $rows = [];
            $order = 0;
            foreach ($pool as [$cat, $name, $detail, $featured]) {
                $rows[] = [
                    'id' => (string) \Illuminate\Support\Str::uuid(),
                    'facility_id' => $f->id,
                    'category' => $cat,
                    'name' => $name,
                    'detail' => $detail,
                    'is_featured' => $featured,
                    'is_active' => true,
                    'sort_order' => $order++,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
            DB::table('facility_amenities')->insert($rows);
            $seeded++;
        }

        $this->info("Seeded amenities for {$seeded} facilities.");
        return self::SUCCESS;
    }
}
