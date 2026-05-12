<?php

namespace Database\Seeders;

use App\Models\Admission;
use App\Models\Facility;
use Illuminate\Database\Seeder;

/**
 * Sample admissions in flight across the kanban stages so the board has
 * realistic content. Keyed on (facility_id, inquirer_email) so a
 * re-run won't duplicate.
 */
class DemoAdmissionsSeeder extends Seeder
{
    public function run(): void
    {
        $facility = Facility::where('slug', 'sunset-manor')->first();
        if (! $facility) {
            return;
        }

        $rows = [
            // inquiry
            ['inquiry', 'Emily Chen',      'emily.chen@example.com',     'adult_child', 'Harold',  'Chen',      'assisted', 'private_pay',    null,  null],
            ['inquiry', 'Marcus Patel',    'marcus.p@example.com',       'adult_child', 'Anaya',   'Patel',     'memory',   'ltc_insurance',  null,  null],
            // tour scheduled
            ['tour_scheduled', 'Sarah Brooks', 'sarah.b@example.com',    'spouse',      'Tom',     'Brooks',    'assisted', 'private_pay',    7,     null],
            ['tour_scheduled', 'Hospital Discharge — Banner', 'cm.banner@example.com', 'hospital', 'Frank', 'Hill', 'skilled', 'medicare_a', 5, null],
            // toured
            ['toured',   'David Wong',     'david.w@example.com',        'poa',         'Grace',   'Wong',      'memory',   'medicaid',       14,    null],
            // assessment
            ['assessment', 'Linda Davis',  'linda.d@example.com',        'adult_child', 'Roy',     'Davis',     'skilled',  'medicare_a',     10,    'Awaiting PT/OT screen'],
            // approved
            ['approved', 'Discharge planner — St. Joseph', 'planner@stjoseph.example', 'hospital', 'Mary',   'Sullivan',  'skilled',  'medicare_a',     4,     'Ready to admit Monday'],
            // declined (recently)
            ['declined', 'Anonymous',      'past-inquiry@example.com',   'adult_child', 'Walter',  'Stevens',   'assisted', 'private_pay',    null,  'Chose another community closer to family'],
        ];

        foreach ($rows as [$stage, $inquirer, $email, $rel, $first, $last, $level, $payer, $daysAhead, $notes]) {
            Admission::updateOrCreate(
                [
                    'facility_id' => $facility->id,
                    'inquirer_email' => $email,
                ],
                [
                    'stage' => $stage,
                    'inquirer_name' => $inquirer,
                    'inquirer_relationship' => $rel,
                    'prospect_first_name' => $first,
                    'prospect_last_name' => $last,
                    'prospect_level_of_care' => $level,
                    'prospect_primary_payer' => $payer,
                    'target_admit_date' => $daysAhead ? now()->addDays($daysAhead)->toDateString() : null,
                    'notes' => $notes,
                    'stage_changed_at' => now()->subHours(rand(1, 96)),
                ]
            );
        }

        $this->command->info("✓ admissions at {$facility->name} (" . count($rows) . ")");
    }
}
