<?php

namespace Database\Seeders;

use App\Models\Facility;
use App\Models\FacilityAmenity;
use App\Models\FacilityReview;
use Illuminate\Database\Seeder;

/**
 * Seeds a thorough amenity set for both demo facilities so the marketplace
 * profile reads like a real APFM/Caring.com listing. Also backfills review
 * sub-scores onto existing seeded reviews so the multi-metric breakdown
 * card renders meaningfully.
 */
class DemoAmenitiesSeeder extends Seeder
{
    /**
     * @var array<string, array<int, string|array{string, string}>>
     *   category => list of names (or [name, detail])
     */
    private const SUNSET_AMENITIES = [
        'healthcare' => [
            'Medication management',
            'Incontinence care',
            'Memory care wing',
            'Diabetic care',
            'Wound care (RN-supervised)',
            'On-call physician',
            'Physical therapy on-site',
            'Occupational therapy',
            'Speech-language therapy',
            ['24/7 nursing presence', 'RN on-site round the clock'],
            'Hospice coordination',
            'Behavioral health consult',
        ],
        'dining' => [
            'Restaurant-style dining',
            'Anytime dining',
            'Professional chef',
            'Special diet — diabetic',
            'Special diet — low-sodium',
            'Special diet — pureed',
            'Special diet — gluten-free',
            'Vegetarian options',
            'Vegan options',
            'Kosher options',
            'Room service for unwell residents',
            'Family dining room',
            'Guest meal program',
        ],
        'room' => [
            'Kitchenette',
            'Walk-in closets',
            'Private bath',
            'Wheelchair-accessible showers',
            'Emergency pull cords',
            'Cable / satellite TV',
            'High-speed Wi-Fi',
            'Air-conditioned',
            'Heating (individual control)',
            'Smoke detectors',
        ],
        'community' => [
            'Courtyard garden',
            'Walking paths',
            'Library',
            'Beauty salon + barber',
            'Café / bistro',
            'Movie theater',
            'Game room',
            'Fitness center',
            'Arts & crafts studio',
            'Worship / chapel space',
            'Computer / media lounge',
            'Private dining room (family gatherings)',
            'Pet-friendly (cats + small dogs)',
            'Smoke-free campus',
        ],
        'activities' => [
            'Brain fitness sessions',
            'Gardening club',
            'Live music weekly',
            'Holiday parties',
            'Religious services (multi-denominational)',
            'BBQs & social hour',
            'Art classes',
            'Educational speakers',
            'Stretching + chair yoga',
            'Day trips (museums, shopping)',
            'Movie nights',
            'Bingo + card games',
            'Birthday celebrations',
            'Intergenerational programs (with local school)',
            'Walking club',
            'Cooking demonstrations',
        ],
        'services' => [
            'Housekeeping (weekly)',
            'Personal laundry',
            'Transportation — medical appointments',
            'Transportation — group outings',
            'Concierge desk',
            'Mail handling',
            '24/7 front desk',
            'Visiting podiatrist',
            'Visiting dentist',
            'Visiting audiologist',
            'Languages spoken — English, Spanish',
        ],
    ];

    /**
     * @var array<string, array<int, string|array{string, string}>>
     */
    private const WILLOW_AMENITIES = [
        'healthcare' => [
            'Sub-acute rehab unit',
            'IV therapy',
            'Wound care specialist',
            '24/7 skilled nursing',
            'Respiratory therapy',
            'Tracheostomy care',
            'Tube feeding (PEG/NG)',
            'Pain management program',
            'Cardiac rehab',
            'Stroke recovery program',
            'Hospice on premises',
            'Discharge planning + home health coordination',
        ],
        'dining' => [
            'Three meals daily',
            'Therapeutic diets',
            'Pureed / mechanical-soft',
            'Cardiac diet',
            'Renal diet',
            'Tray service for room-bound residents',
        ],
        'room' => [
            'Hospital-grade beds',
            'Private + semi-private rooms',
            'Bedside oxygen ports',
            'Emergency call pendant',
            'Cable TV',
            'Wi-Fi',
            'Telephone',
        ],
        'community' => [
            'Therapy gym (3,000 sq ft)',
            'Resident lounge',
            'Family visiting area',
            'Outdoor therapy garden',
            'Chapel space',
            'Smoke-free',
        ],
        'activities' => [
            'Recreational therapy',
            'Card / board games',
            'Music therapy',
            'Pet therapy visits',
            'Religious services',
            'Discharge planning workshops',
            'Family support group',
        ],
        'services' => [
            'Housekeeping (daily)',
            'Personal laundry',
            'Transportation for follow-up appointments',
            '24/7 admissions desk',
            'Social work + case management',
            'Languages — English, Spanish',
        ],
    ];

    public function run(): void
    {
        foreach ([
            'sunset-manor' => self::SUNSET_AMENITIES,
            'willow-creek-snf' => self::WILLOW_AMENITIES,
        ] as $slug => $catalog) {
            $facility = Facility::where('slug', $slug)->first();
            if (! $facility) continue;
            $this->seedAmenitiesFor($facility, $catalog);
        }

        // Backfill review sub-scores so the multi-metric panel has data.
        FacilityReview::query()
            ->whereNull('rating_cleanliness')
            ->get()
            ->each(function (FacilityReview $r) {
                $base = $r->rating;
                $jitter = fn () => max(1, min(5, $base + rand(-1, 1)));
                $r->update([
                    'rating_cleanliness' => $jitter(),
                    'rating_friendliness' => $jitter(),
                    'rating_care' => $jitter(),
                    'rating_staff' => $jitter(),
                    'rating_meals' => $jitter(),
                    'rating_activities' => $jitter(),
                    'rating_value' => $jitter(),
                ]);
            });

        $this->command->info('✓ amenities + review sub-scores seeded');
    }

    /**
     * @param  array<string, array<int, string|array{string, string}>>  $catalog
     */
    private function seedAmenitiesFor(Facility $facility, array $catalog): void
    {
        $sort = 0;
        foreach ($catalog as $category => $items) {
            foreach ($items as $i => $item) {
                [$name, $detail] = is_array($item) ? $item : [$item, null];
                $sort += 10;
                FacilityAmenity::updateOrCreate(
                    [
                        'facility_id' => $facility->id,
                        'category' => $category,
                        'name' => $name,
                    ],
                    [
                        'detail' => $detail,
                        'is_featured' => $i < 3, // first 3 per category surface above the fold
                        'is_active' => true,
                        'sort_order' => $sort,
                    ]
                );
            }
        }
    }
}
