<?php

namespace Database\Seeders;

use App\Models\Facility;
use App\Models\FacilityPhoto;
use App\Models\FacilityPricingTier;
use App\Models\FacilityReview;
use App\Models\Resident;
use Illuminate\Database\Seeder;

/**
 * Seeds photo gallery, pricing tier structure, and verified reviews for
 * the two demo facilities so the marketplace profile page has real,
 * varied content. Idempotent — keyed on URL / tier name / review body.
 */
class DemoFacilityProfileSeeder extends Seeder
{
    /**
     * Unsplash photo URLs — open license, no attribution required. Each
     * category has 1-2 photos.
     *
     * @var array<int, array{url: string, caption: string, category: string}>
     */
    private const SUNSET_PHOTOS = [
        ['url' => 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&q=80', 'caption' => 'Sunset Manor — exterior', 'category' => 'exterior'],
        ['url' => 'https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=1200&q=80', 'caption' => 'Sunlit common room', 'category' => 'common_room'],
        ['url' => 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=80', 'caption' => 'Dining hall', 'category' => 'dining'],
        ['url' => 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=1200&q=80', 'caption' => 'Private suite', 'category' => 'suite'],
        ['url' => 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200&q=80', 'caption' => 'Courtyard garden', 'category' => 'outdoor'],
        ['url' => 'https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=1200&q=80', 'caption' => 'Nursing station', 'category' => 'clinical'],
    ];

    /**
     * @var array<int, array{url: string, caption: string, category: string}>
     */
    private const WILLOW_PHOTOS = [
        ['url' => 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&q=80', 'caption' => 'Willow Creek — entry', 'category' => 'exterior'],
        ['url' => 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=1200&q=80', 'caption' => 'Skilled rehab gym', 'category' => 'clinical'],
        ['url' => 'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=1200&q=80', 'caption' => 'Resident lounge', 'category' => 'common_room'],
        ['url' => 'https://images.unsplash.com/photo-1577412647305-991150c7d163?w=1200&q=80', 'caption' => 'Private rehab suite', 'category' => 'suite'],
        ['url' => 'https://images.unsplash.com/photo-1517637382994-f02da38c6728?w=1200&q=80', 'caption' => 'Therapy garden', 'category' => 'outdoor'],
    ];

    /**
     * @var array<int, array{tier_type: string, name: string, level: ?string, amount: int, cadence: string, notes: ?string}>
     */
    private const SUNSET_PRICING = [
        ['tier_type' => 'community_fee', 'name' => 'Community fee',                  'level' => null,        'amount' => 250000, 'cadence' => 'one_time', 'notes' => 'One-time, refundable up to 30 days'],
        ['tier_type' => 'base',          'name' => 'Studio suite — base rate',      'level' => 'assisted',  'amount' => 450000, 'cadence' => 'monthly',  'notes' => '450 sq ft, kitchenette'],
        ['tier_type' => 'base',          'name' => 'One bedroom — base rate',       'level' => 'assisted',  'amount' => 580000, 'cadence' => 'monthly',  'notes' => '650 sq ft'],
        ['tier_type' => 'level_adder',   'name' => 'Memory care premium',           'level' => 'memory',    'amount' => 180000, 'cadence' => 'monthly',  'notes' => 'Adds to base rate'],
        ['tier_type' => 'level_adder',   'name' => 'High-acuity care',              'level' => 'skilled',   'amount' => 220000, 'cadence' => 'monthly',  'notes' => 'For residents requiring extensive ADL assistance'],
        ['tier_type' => 'ancillary',     'name' => 'Medication management',         'level' => null,        'amount' => 35000,  'cadence' => 'monthly',  'notes' => 'Per resident'],
        ['tier_type' => 'ancillary',     'name' => 'Personal laundry service',      'level' => null,        'amount' => 12000,  'cadence' => 'monthly',  'notes' => null],
        ['tier_type' => 'ancillary',     'name' => 'In-room cable + Wi-Fi',         'level' => null,        'amount' => 7500,   'cadence' => 'monthly',  'notes' => null],
        ['tier_type' => 'ancillary',     'name' => 'Beauty salon visit',            'level' => null,        'amount' => 4500,   'cadence' => 'per_visit', 'notes' => null],
    ];

    /**
     * @var array<int, array{tier_type: string, name: string, level: ?string, amount: int, cadence: string, notes: ?string}>
     */
    private const WILLOW_PRICING = [
        ['tier_type' => 'community_fee', 'name' => 'Admission fee',                 'level' => null,        'amount' => 150000, 'cadence' => 'one_time', 'notes' => null],
        ['tier_type' => 'base',          'name' => 'Semi-private room — base',     'level' => 'skilled',   'amount' => 750000, 'cadence' => 'monthly',  'notes' => 'Shared room'],
        ['tier_type' => 'base',          'name' => 'Private room — base',          'level' => 'skilled',   'amount' => 920000, 'cadence' => 'monthly',  'notes' => null],
        ['tier_type' => 'level_adder',   'name' => 'IV therapy',                   'level' => 'skilled',   'amount' => 75000,  'cadence' => 'monthly',  'notes' => null],
        ['tier_type' => 'level_adder',   'name' => 'Wound care specialist',        'level' => 'skilled',   'amount' => 60000,  'cadence' => 'monthly',  'notes' => null],
        ['tier_type' => 'ancillary',     'name' => 'PT/OT (covered by Medicare A)','level' => null,        'amount' => 0,      'cadence' => 'per_visit','notes' => 'Included for qualifying stays'],
    ];

    /**
     * @var array<int, array{author: string, relationship: string, rating: int, title: string, body: string, verified: bool, stay_offset_days: int}>
     */
    private const SUNSET_REVIEWS = [
        ['author' => 'Emily R.',    'relationship' => 'family',   'rating' => 5, 'title' => 'Genuinely caring staff',                  'body' => 'My mom has been at Sunset Manor for 14 months. The CNAs know her by name, her preferences, her stories. They send me photos from holiday parties. Worth every dollar.', 'verified' => true,  'stay_offset_days' => 420],
        ['author' => 'David L.',    'relationship' => 'family',   'rating' => 4, 'title' => 'Strong on the basics',                    'body' => 'Clean, well-staffed, organized. Medication management has been flawless for my father. Activities calendar could be more varied, but the fundamentals are right.', 'verified' => true,  'stay_offset_days' => 200],
        ['author' => 'Patricia M.', 'relationship' => 'family',   'rating' => 5, 'title' => 'Memory care unit is exceptional',         'body' => 'When my mother\'s dementia advanced, the team worked with us through every transition. Sundowning episodes dropped dramatically with their structured evenings.', 'verified' => true,  'stay_offset_days' => 305],
        ['author' => 'James K.',    'relationship' => 'resident', 'rating' => 5, 'title' => 'A real home',                              'body' => 'I came here after my wife passed. Was dreading it. Three months in, I have friends I play cards with every Tuesday and a courtyard I tend to. Better than I expected.', 'verified' => true,  'stay_offset_days' => 95],
        ['author' => 'Sandra T.',   'relationship' => 'family',   'rating' => 3, 'title' => 'Mixed experience',                        'body' => 'Daytime staff are wonderful. Night-shift coverage felt thinner — twice my dad waited too long for a bathroom call. Management was responsive when raised.', 'verified' => true,  'stay_offset_days' => 60],
        ['author' => 'Anonymous',   'relationship' => 'family',   'rating' => 4, 'title' => 'Transparent billing',                     'body' => 'Pricing was clearly laid out from the start. No surprise fees. That alone set them apart from three other places we toured.', 'verified' => false, 'stay_offset_days' => 30],
        ['author' => 'Marcus P.',   'relationship' => 'family',   'rating' => 5, 'title' => 'Saved us through a tough transition',     'body' => 'Hospital discharged my father with three weeks notice. Sunset Manor walked us through Medicaid paperwork, payer changes, and admission in 9 days flat.', 'verified' => true,  'stay_offset_days' => 165],
    ];

    /**
     * @var array<int, array{author: string, relationship: string, rating: int, title: string, body: string, verified: bool, stay_offset_days: int}>
     */
    private const WILLOW_REVIEWS = [
        ['author' => 'Linda H.',  'relationship' => 'family',   'rating' => 5, 'title' => 'Best rehab in the city',          'body' => 'My husband had a hip replacement at 78. The PT team got him from wheelchair to walker in 12 days. Discharge home with confidence.', 'verified' => true,  'stay_offset_days' => 45],
        ['author' => 'Robert F.', 'relationship' => 'resident', 'rating' => 4, 'title' => 'Solid clinical care',             'body' => 'Wound care nurse was excellent — she caught a beginning pressure point before it broke skin. Food is hospital-grade though.', 'verified' => true,  'stay_offset_days' => 22],
        ['author' => 'Mary S.',   'relationship' => 'family',   'rating' => 5, 'title' => 'Medicare A stay went smoothly',   'body' => 'They handled the 100-day Medicare benefit period transparently. Got an exit plan and home health referral on day 70 — no surprises.', 'verified' => true,  'stay_offset_days' => 75],
        ['author' => 'Anonymous', 'relationship' => 'visitor',  'rating' => 3, 'title' => 'Clinical feel',                   'body' => 'Capable team but feels institutional. Probably the right fit for sub-acute rehab, less so for long-term placement.', 'verified' => false, 'stay_offset_days' => 5],
    ];

    public function run(): void
    {
        $sunset = Facility::where('slug', 'sunset-manor')->first();
        $willow = Facility::where('slug', 'willow-creek-snf')->first();

        if ($sunset) {
            $this->seedFacility($sunset, self::SUNSET_PHOTOS, self::SUNSET_PRICING, self::SUNSET_REVIEWS);
        }
        if ($willow) {
            $this->seedFacility($willow, self::WILLOW_PHOTOS, self::WILLOW_PRICING, self::WILLOW_REVIEWS);
        }

        // Backfill price_from_cents for both demo facilities from the lowest
        // base rate in their pricing tiers so the search card shows a number.
        foreach ([$sunset, $willow] as $f) {
            if (! $f) continue;
            $minBase = FacilityPricingTier::query()
                ->where('facility_id', $f->id)
                ->where('tier_type', 'base')
                ->where('billing_cadence', 'monthly')
                ->min('amount_cents');
            if ($minBase) {
                $f->update(['price_from_cents' => $minBase]);
            }
        }
    }

    /**
     * @param  array<int, array{url: string, caption: string, category: string}>  $photos
     * @param  array<int, array{tier_type: string, name: string, level: ?string, amount: int, cadence: string, notes: ?string}>  $pricing
     * @param  array<int, array{author: string, relationship: string, rating: int, title: string, body: string, verified: bool, stay_offset_days: int}>  $reviews
     */
    private function seedFacility(Facility $facility, array $photos, array $pricing, array $reviews): void
    {
        foreach ($photos as $i => $p) {
            FacilityPhoto::updateOrCreate(
                ['facility_id' => $facility->id, 'url' => $p['url']],
                [
                    'caption' => $p['caption'],
                    'category' => $p['category'],
                    'sort_order' => ($i + 1) * 10,
                    'is_active' => true,
                ]
            );
        }

        foreach ($pricing as $i => $t) {
            FacilityPricingTier::updateOrCreate(
                ['facility_id' => $facility->id, 'name' => $t['name']],
                [
                    'tier_type' => $t['tier_type'],
                    'level_of_care' => $t['level'],
                    'amount_cents' => $t['amount'],
                    'billing_cadence' => $t['cadence'],
                    'notes' => $t['notes'],
                    'sort_order' => ($i + 1) * 10,
                    'is_active' => true,
                ]
            );
        }

        // Pair the first 2 verified reviews with real seeded residents so the
        // "verified stay" badge ties to actual data.
        $residents = Resident::where('facility_id', $facility->id)
            ->where('status', 'active')
            ->take(2)
            ->get();

        foreach ($reviews as $i => $r) {
            FacilityReview::updateOrCreate(
                ['facility_id' => $facility->id, 'body' => $r['body']],
                [
                    'resident_id' => ($i < 2 && $r['verified']) ? ($residents[$i]->id ?? null) : null,
                    'author_name' => $r['author'],
                    'author_relationship' => $r['relationship'],
                    'rating' => $r['rating'],
                    'title' => $r['title'],
                    'is_verified' => $r['verified'],
                    'stay_started_at' => now()->subDays($r['stay_offset_days'])->toDateString(),
                    'is_published' => true,
                ]
            );
        }

        $this->command->info("✓ profile data for {$facility->name}: " . count($photos) . " photos, " . count($pricing) . " tiers, " . count($reviews) . " reviews");
    }
}
