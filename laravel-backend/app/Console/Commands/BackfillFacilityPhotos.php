<?php

namespace App\Console\Commands;

use App\Models\Facility;
use App\Models\FacilityPhoto;
use Illuminate\Console\Command;

/**
 * Backfills curated Unsplash photos onto facilities that don't have any
 * of their own yet (typically the 8.4k CMS-ingested ones). Unsplash
 * images are free for commercial use, no attribution required.
 *
 * The pool is partitioned by what kind of feel each level evokes:
 *   - assisted/independent  → bright communal spaces, courtyards
 *   - skilled/snf           → clinical rooms, rehab, nursing
 *   - memory                → calm sensory rooms, gardens, light
 *
 * Usage:
 *   php artisan photos:backfill              # all facilities w/ no photos
 *   php artisan photos:backfill --state=AZ   # one state
 *   php artisan photos:backfill --limit=100  # cap how many to touch
 */
class BackfillFacilityPhotos extends Command
{
    protected $signature = 'photos:backfill
        {--state= : 2-letter state code to limit scope}
        {--limit= : Max number of facilities to touch}';

    protected $description = 'Assign curated stock photos to facilities that have none';

    /**
     * @var array<string, array<int, array{url: string, caption: string, category: string}>>
     */
    private const POOLS = [
        // Assisted living / independent living vibe
        'assisted' => [
            ['url' => 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1600&q=80', 'caption' => 'Building exterior', 'category' => 'exterior'],
            ['url' => 'https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=1600&q=80', 'caption' => 'Sunlit common room', 'category' => 'common_room'],
            ['url' => 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1600&q=80', 'caption' => 'Dining hall', 'category' => 'dining'],
            ['url' => 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=1600&q=80', 'caption' => 'Resident suite', 'category' => 'suite'],
            ['url' => 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1600&q=80', 'caption' => 'Courtyard garden', 'category' => 'outdoor'],
            ['url' => 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1600&q=80', 'caption' => 'Living area', 'category' => 'common_room'],
            ['url' => 'https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=1600&q=80', 'caption' => 'Patio', 'category' => 'outdoor'],
            ['url' => 'https://images.unsplash.com/photo-1622372738946-62e02505feb3?w=1600&q=80', 'caption' => 'Lounge', 'category' => 'common_room'],
        ],
        // Skilled nursing / SNF / rehab vibe — clinical but warm
        'skilled' => [
            ['url' => 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1600&q=80', 'caption' => 'Facility entrance', 'category' => 'exterior'],
            ['url' => 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=1600&q=80', 'caption' => 'Rehab therapy gym', 'category' => 'clinical'],
            ['url' => 'https://images.unsplash.com/photo-1577412647305-991150c7d163?w=1600&q=80', 'caption' => 'Private rehab suite', 'category' => 'suite'],
            ['url' => 'https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=1600&q=80', 'caption' => 'Nursing station', 'category' => 'clinical'],
            ['url' => 'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=1600&q=80', 'caption' => 'Resident lounge', 'category' => 'common_room'],
            ['url' => 'https://images.unsplash.com/photo-1551076805-e1869033e561?w=1600&q=80', 'caption' => 'Physical therapy', 'category' => 'clinical'],
            ['url' => 'https://images.unsplash.com/photo-1583912086096-8c60d75a53f9?w=1600&q=80', 'caption' => 'Clinical care space', 'category' => 'clinical'],
            ['url' => 'https://images.unsplash.com/photo-1517637382994-f02da38c6728?w=1600&q=80', 'caption' => 'Therapy garden', 'category' => 'outdoor'],
        ],
        // Memory care — calm, sensory-friendly, light-filled
        'memory' => [
            ['url' => 'https://images.unsplash.com/photo-1574180566232-aaad1b5b8450?w=1600&q=80', 'caption' => 'Memory care wing', 'category' => 'exterior'],
            ['url' => 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=1600&q=80', 'caption' => 'Sensory garden', 'category' => 'outdoor'],
            ['url' => 'https://images.unsplash.com/photo-1567696911980-2eed69a46042?w=1600&q=80', 'caption' => 'Activity room', 'category' => 'common_room'],
            ['url' => 'https://images.unsplash.com/photo-1612880100166-eddd5d77fcc8?w=1600&q=80', 'caption' => 'Private suite', 'category' => 'suite'],
            ['url' => 'https://images.unsplash.com/photo-1532614338840-ab30cf10ed36?w=1600&q=80', 'caption' => 'Communal living', 'category' => 'common_room'],
            ['url' => 'https://images.unsplash.com/photo-1559692048-79a3f837883d?w=1600&q=80', 'caption' => 'Garden walkway', 'category' => 'outdoor'],
        ],
    ];

    public function handle(): int
    {
        $state = $this->option('state');
        $limit = $this->option('limit') ? (int) $this->option('limit') : null;

        $query = Facility::query()
            ->where('is_active', true)
            ->whereDoesntHave('photos');

        if ($state) {
            $query->where('state', strtoupper($state));
        }

        if ($limit) {
            $query->limit($limit);
        }

        $total = $query->count();
        $this->info("Backfilling photos for {$total} facilities" . ($state ? " in {$state}" : '') . '…');

        $touched = 0;
        $photosCreated = 0;

        $query->chunkById(200, function ($facilities) use (&$touched, &$photosCreated) {
            foreach ($facilities as $facility) {
                $pool = $this->poolFor($facility);
                if (empty($pool)) continue;

                $hashSeed = crc32($facility->id);
                $count = 5;
                $rotated = collect($pool)
                    ->sortBy(fn ($_, $i) => ($i + $hashSeed) % count($pool))
                    ->take($count)
                    ->values();

                $sort = 10;
                foreach ($rotated as $p) {
                    FacilityPhoto::create([
                        'facility_id' => $facility->id,
                        'url' => $p['url'],
                        'caption' => $p['caption'],
                        'category' => $p['category'],
                        'sort_order' => $sort,
                        'is_active' => true,
                    ]);
                    $sort += 10;
                    $photosCreated++;
                }
                $touched++;
            }
        });

        $this->info("✓ touched {$touched} facilities, created {$photosCreated} photos");

        return self::SUCCESS;
    }

    /**
     * @return array<int, array{url: string, caption: string, category: string}>
     */
    private function poolFor(Facility $facility): array
    {
        $type = $facility->type ?? 'snf';
        $level = match ($type) {
            'snf' => 'skilled',
            'memory_care' => 'memory',
            'assisted_living' => 'assisted',
            'ccrc' => 'assisted',
            'independent_living' => 'assisted',
            'group_home', 'adult_family_home' => 'assisted',
            'icf_iid' => 'skilled',
            default => 'assisted',
        };

        // Mix in 1-2 photos from another pool for variety so the same
        // 5-photo grid doesn't repeat across nearby facilities.
        $primary = self::POOLS[$level];
        $secondary = $level === 'skilled' ? self::POOLS['assisted'] : self::POOLS['skilled'];

        return array_merge($primary, array_slice($secondary, 0, 3));
    }
}
