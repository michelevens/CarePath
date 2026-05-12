<?php

namespace Database\Seeders;

use App\Models\Bed;
use App\Models\Facility;
use App\Models\Resident;
use Illuminate\Database\Seeder;

/**
 * Seeds beds + residents for the demo facility (Sunset Manor) so the
 * bed board has real data on first paint. Idempotent — uses
 * updateOrCreate keyed on (facility, room, bed_label) for beds and
 * (facility, mrn) for residents. Re-running keeps existing
 * assignments stable.
 */
class DemoCensusSeeder extends Seeder
{
    public function run(): void
    {
        $facility = Facility::where('slug', 'sunset-manor')->first();
        if (! $facility) {
            $this->command->warn('Sunset Manor not found — skipping DemoCensusSeeder.');
            return;
        }

        $this->seedBeds($facility);
        $this->seedResidents($facility);
        $this->assignBeds($facility);
    }

    private function seedBeds(Facility $facility): void
    {
        // 3 floors × 10 rooms × 2 beds (A/B) = 60 beds. Mix of levels.
        $levels = ['assisted', 'assisted', 'skilled', 'memory'];
        $count = 0;

        foreach ([1, 2, 3] as $floor) {
            for ($room = 0; $room < 10; $room++) {
                $roomNumber = ($floor * 100) + $room;
                $unit = match ($floor) {
                    1 => 'East Wing',
                    2 => 'West Wing',
                    3 => 'Memory Care Unit',
                };
                $level = $floor === 3 ? 'memory' : $levels[$room % count($levels)];

                foreach (['A', 'B'] as $label) {
                    Bed::updateOrCreate(
                        [
                            'facility_id' => $facility->id,
                            'room_number' => (string) $roomNumber,
                            'bed_label' => $label,
                        ],
                        [
                            'floor' => (string) $floor,
                            'unit' => $unit,
                            'level_of_care' => $level,
                            'status' => 'available',
                        ]
                    );
                    $count++;
                }
            }
        }

        $this->command->info("✓ beds at {$facility->name} ({$count})");
    }

    /**
     * @return array<int, array{first: string, last: string, payer: string, level: string, age: int}>
     */
    private function residentFixtures(): array
    {
        return [
            ['first' => 'Margaret', 'last' => 'Chen',      'payer' => 'private_pay',   'level' => 'assisted', 'age' => 82],
            ['first' => 'Robert',   'last' => 'Williams',  'payer' => 'medicare_a',    'level' => 'skilled',  'age' => 78],
            ['first' => 'Dorothy',  'last' => 'Johnson',   'payer' => 'medicaid',      'level' => 'memory',   'age' => 86],
            ['first' => 'James',    'last' => 'Anderson',  'payer' => 'ltc_insurance', 'level' => 'assisted', 'age' => 79],
            ['first' => 'Patricia', 'last' => 'Garcia',    'payer' => 'private_pay',   'level' => 'assisted', 'age' => 75],
            ['first' => 'Linda',    'last' => 'Martinez',  'payer' => 'medicare_a',    'level' => 'skilled',  'age' => 81],
            ['first' => 'Barbara',  'last' => 'Robinson',  'payer' => 'medicaid',      'level' => 'memory',   'age' => 88],
            ['first' => 'Susan',    'last' => 'Clark',     'payer' => 'ltc_insurance', 'level' => 'assisted', 'age' => 73],
            ['first' => 'Jessica',  'last' => 'Rodriguez', 'payer' => 'private_pay',   'level' => 'assisted', 'age' => 71],
            ['first' => 'Sarah',    'last' => 'Lewis',     'payer' => 'va',            'level' => 'skilled',  'age' => 77],
            ['first' => 'Karen',    'last' => 'Lee',       'payer' => 'medicaid',      'level' => 'memory',   'age' => 84],
            ['first' => 'Nancy',    'last' => 'Walker',    'payer' => 'private_pay',   'level' => 'assisted', 'age' => 70],
            ['first' => 'Lisa',     'last' => 'Hall',      'payer' => 'ltc_insurance', 'level' => 'assisted', 'age' => 76],
            ['first' => 'Betty',    'last' => 'Young',     'payer' => 'medicare_a',    'level' => 'skilled',  'age' => 83],
            ['first' => 'Helen',    'last' => 'King',      'payer' => 'medicaid',      'level' => 'memory',   'age' => 90],
            ['first' => 'Sandra',   'last' => 'Wright',    'payer' => 'private_pay',   'level' => 'assisted', 'age' => 72],
            ['first' => 'Donna',    'last' => 'Lopez',     'payer' => 'va',            'level' => 'skilled',  'age' => 80],
            ['first' => 'Carol',    'last' => 'Hill',      'payer' => 'medicaid',      'level' => 'memory',   'age' => 85],
            ['first' => 'Ruth',     'last' => 'Scott',     'payer' => 'medicare_a',    'level' => 'skilled',  'age' => 79],
            ['first' => 'Sharon',   'last' => 'Green',     'payer' => 'private_pay',   'level' => 'assisted', 'age' => 74],
            ['first' => 'Michelle', 'last' => 'Adams',     'payer' => 'ltc_insurance', 'level' => 'assisted', 'age' => 68],
            ['first' => 'Laura',    'last' => 'Baker',     'payer' => 'medicaid',      'level' => 'memory',   'age' => 87],
            ['first' => 'Kimberly', 'last' => 'Nelson',    'payer' => 'medicare_a',    'level' => 'skilled',  'age' => 82],
            ['first' => 'Deborah',  'last' => 'Carter',    'payer' => 'private_pay',   'level' => 'assisted', 'age' => 69],
            ['first' => 'Amy',      'last' => 'Mitchell',  'payer' => 'va',            'level' => 'skilled',  'age' => 76],
        ];
    }

    private function seedResidents(Facility $facility): void
    {
        $now = now();

        foreach ($this->residentFixtures() as $i => $r) {
            $mrn = sprintf('SM-%05d', $i + 1);
            $dob = $now->copy()->subYears($r['age'])->subMonths(($i * 11) % 12);
            $admittedDaysAgo = (($i * 47) % 730) + 30; // 30-760 days ago

            Resident::updateOrCreate(
                ['facility_id' => $facility->id, 'mrn' => $mrn],
                [
                    'first_name' => $r['first'],
                    'last_name' => $r['last'],
                    'date_of_birth' => $dob->toDateString(),
                    'admission_date' => $now->copy()->subDays($admittedDaysAgo)->toDateString(),
                    'level_of_care' => $r['level'],
                    'primary_payer' => $r['payer'],
                    'status' => 'active',
                ]
            );
        }

        $this->command->info("✓ residents at {$facility->name} (" . count($this->residentFixtures()) . ")");
    }

    /**
     * Assign residents to beds in level-of-care matched rooms. Leave 35
     * beds empty so the board shows realistic ~42% occupancy and the
     * admin can place new admissions during demos.
     */
    private function assignBeds(Facility $facility): void
    {
        $residents = Resident::query()
            ->where('facility_id', $facility->id)
            ->where('status', 'active')
            ->whereDoesntHave('bed')
            ->get();

        $assigned = 0;

        foreach ($residents as $resident) {
            $bed = Bed::query()
                ->where('facility_id', $facility->id)
                ->where('status', 'available')
                ->whereNull('resident_id')
                ->where('level_of_care', $resident->level_of_care)
                ->first();

            if (! $bed) {
                continue;
            }

            $bed->update([
                'resident_id' => $resident->id,
                'status' => 'occupied',
            ]);
            $assigned++;
        }

        $this->command->info("✓ assigned {$assigned} residents to beds");
    }
}
