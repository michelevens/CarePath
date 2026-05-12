<?php

namespace Database\Seeders;

use App\Models\CarePlan;
use App\Models\CarePlanItem;
use App\Models\Facility;
use App\Models\Resident;
use Illuminate\Database\Seeder;

/**
 * Seeds care plans for the first N active residents in Sunset Manor so the
 * Staff portal has something to walk through. Idempotent — one plan per
 * resident.
 */
class DemoCarePlansSeeder extends Seeder
{
    /**
     * Per-level care plan templates. Each level has 3-4 goals and
     * 2-3 interventions per goal.
     *
     * @var array<string, array{summary: string, items: array<int, array{kind: string, category: string, description: string, frequency?: string, responsible_role?: string, target_days?: int}>}>
     */
    private const TEMPLATES = [
        'assisted' => [
            'summary' => 'Assisted living plan focused on maintaining functional independence and quality of life.',
            'items' => [
                ['kind' => 'goal',         'category' => 'adl',          'description' => 'Maintain independence with grooming and bathing with cueing only', 'target_days' => 90],
                ['kind' => 'intervention', 'category' => 'adl',          'description' => 'CNA to provide morning grooming cues', 'frequency' => 'daily', 'responsible_role' => 'CNA'],
                ['kind' => 'intervention', 'category' => 'adl',          'description' => 'Stand-by assist with shower; ensure non-slip mat in place', 'frequency' => 'twice_daily', 'responsible_role' => 'CNA'],
                ['kind' => 'goal',         'category' => 'mobility',     'description' => 'Ambulate to dining room independently 3x daily', 'target_days' => 60],
                ['kind' => 'intervention', 'category' => 'mobility',     'description' => 'Rolling walker within reach at all times', 'frequency' => 'daily', 'responsible_role' => 'CNA'],
                ['kind' => 'goal',         'category' => 'safety',       'description' => 'Remain free of falls for 90 days', 'target_days' => 90],
                ['kind' => 'intervention', 'category' => 'safety',       'description' => 'Hourly safety checks during waking hours', 'frequency' => 'daily', 'responsible_role' => 'CNA'],
                ['kind' => 'intervention', 'category' => 'safety',       'description' => 'PT to update fall risk assessment monthly', 'frequency' => 'monthly', 'responsible_role' => 'PT'],
            ],
        ],
        'skilled' => [
            'summary' => 'Sub-acute skilled care with focus on rehab, wound care, and clinical management.',
            'items' => [
                ['kind' => 'goal',         'category' => 'wound',        'description' => 'Stage 2 sacral pressure ulcer healed within 30 days', 'target_days' => 30],
                ['kind' => 'intervention', 'category' => 'wound',        'description' => 'Wound dressing change with hydrocolloid q72h', 'frequency' => 'tid', 'responsible_role' => 'RN'],
                ['kind' => 'intervention', 'category' => 'wound',        'description' => 'Reposition q2h and document', 'frequency' => 'qid', 'responsible_role' => 'CNA'],
                ['kind' => 'goal',         'category' => 'mobility',     'description' => 'Improve transfer ability to mod-A within 4 weeks', 'target_days' => 28],
                ['kind' => 'intervention', 'category' => 'mobility',     'description' => 'PT 5x/week, sessions of 45 min', 'frequency' => 'daily', 'responsible_role' => 'PT'],
                ['kind' => 'intervention', 'category' => 'mobility',     'description' => 'OT to address ADL retraining', 'frequency' => 'tid', 'responsible_role' => 'OT'],
                ['kind' => 'goal',         'category' => 'meds',         'description' => 'Stabilize on oral anticoagulant therapy with INR 2.0-3.0', 'target_days' => 21],
                ['kind' => 'intervention', 'category' => 'meds',         'description' => 'Weekly INR draw + warfarin dose adjustment', 'frequency' => 'weekly', 'responsible_role' => 'RN'],
            ],
        ],
        'memory' => [
            'summary' => 'Memory-care plan emphasizing safety, behavioral support, and meaningful engagement.',
            'items' => [
                ['kind' => 'goal',         'category' => 'safety',       'description' => 'Remain in memory-care unit without elopement attempts', 'target_days' => 90],
                ['kind' => 'intervention', 'category' => 'safety',       'description' => 'WanderGuard system check at start of every shift', 'frequency' => 'tid', 'responsible_role' => 'RN'],
                ['kind' => 'intervention', 'category' => 'safety',       'description' => 'Visual safety check q15min during waking hours', 'frequency' => 'daily', 'responsible_role' => 'CNA'],
                ['kind' => 'goal',         'category' => 'behavior',     'description' => 'Reduce sundowning agitation episodes from daily to <2/week', 'target_days' => 60],
                ['kind' => 'intervention', 'category' => 'behavior',     'description' => 'Dim lights and play calming music after 4pm', 'frequency' => 'daily', 'responsible_role' => 'CNA'],
                ['kind' => 'intervention', 'category' => 'behavior',     'description' => 'Validation therapy approach during interactions', 'frequency' => 'daily', 'responsible_role' => 'CNA'],
                ['kind' => 'goal',         'category' => 'cognition',    'description' => 'Maintain participation in 1 group activity daily', 'target_days' => 90],
                ['kind' => 'intervention', 'category' => 'psychosocial', 'description' => 'Reminiscence-therapy sessions Tue/Thu', 'frequency' => 'weekly', 'responsible_role' => 'SW'],
            ],
        ],
    ];

    public function run(): void
    {
        $facility = Facility::where('slug', 'sunset-manor')->first();
        if (! $facility) {
            return;
        }

        $residents = Resident::query()
            ->where('facility_id', $facility->id)
            ->where('status', 'active')
            ->orderBy('last_name')
            ->take(12)
            ->get();

        $created = 0;

        foreach ($residents as $resident) {
            $template = self::TEMPLATES[$resident->level_of_care] ?? self::TEMPLATES['assisted'];

            $plan = CarePlan::firstOrCreate(
                ['resident_id' => $resident->id],
                [
                    'facility_id' => $resident->facility_id,
                    'status' => 'active',
                    'started_at' => now()->subDays(rand(7, 60))->toDateString(),
                    'summary' => $template['summary'],
                ]
            );

            // Skip if plan already has items (idempotent across re-runs).
            if ($plan->items()->exists()) {
                continue;
            }

            $sort = 10;
            $lastGoalId = null;

            foreach ($template['items'] as $itemSpec) {
                $itemData = [
                    'care_plan_id' => $plan->id,
                    'kind' => $itemSpec['kind'],
                    'category' => $itemSpec['category'],
                    'description' => $itemSpec['description'],
                    'sort_order' => $sort,
                ];

                if ($itemSpec['kind'] === 'goal') {
                    $itemData['status'] = 'open';
                    if (isset($itemSpec['target_days'])) {
                        $itemData['target_date'] = now()->addDays($itemSpec['target_days'])->toDateString();
                    }
                    $item = CarePlanItem::create($itemData);
                    $lastGoalId = $item->id;
                } else {
                    $itemData['parent_id'] = $lastGoalId;
                    $itemData['frequency'] = $itemSpec['frequency'] ?? null;
                    $itemData['responsible_role'] = $itemSpec['responsible_role'] ?? null;
                    CarePlanItem::create($itemData);
                }

                $sort += 10;
            }

            $created++;
        }

        $this->command->info("✓ care plans seeded ({$created} new)");
    }
}
