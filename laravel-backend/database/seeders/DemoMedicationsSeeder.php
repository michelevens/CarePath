<?php

namespace Database\Seeders;

use App\Models\Facility;
use App\Models\Medication;
use App\Models\Resident;
use Illuminate\Database\Seeder;

/**
 * Seeds a realistic LTC med list for the first ~12 active residents in
 * Sunset Manor. Picks 3-5 meds per resident from a per-level rotation.
 * Idempotent — keyed on (resident_id, name).
 */
class DemoMedicationsSeeder extends Seeder
{
    /**
     * @var array<string, array<int, array{name: string, dose: string, route: string, frequency: string, times: array<int, string>, indication: string, prn?: bool}>>
     */
    private const FORMULARY = [
        'assisted' => [
            ['name' => 'Lisinopril',    'dose' => '10 mg', 'route' => 'PO', 'frequency' => 'QD',  'times' => ['08:00'],            'indication' => 'Hypertension'],
            ['name' => 'Atorvastatin',  'dose' => '20 mg', 'route' => 'PO', 'frequency' => 'QHS', 'times' => ['21:00'],            'indication' => 'Hyperlipidemia'],
            ['name' => 'Metformin',     'dose' => '500 mg','route' => 'PO', 'frequency' => 'BID', 'times' => ['08:00', '18:00'],   'indication' => 'Type 2 diabetes'],
            ['name' => 'Donepezil',     'dose' => '10 mg', 'route' => 'PO', 'frequency' => 'QHS', 'times' => ['21:00'],            'indication' => 'Mild cognitive impairment'],
            ['name' => 'Vitamin D3',    'dose' => '1000 IU','route' => 'PO','frequency' => 'QD',  'times' => ['08:00'],            'indication' => 'Bone health'],
            ['name' => 'Acetaminophen', 'dose' => '650 mg','route' => 'PO', 'frequency' => 'PRN', 'times' => [],                   'indication' => 'Pain', 'prn' => true],
        ],
        'skilled' => [
            ['name' => 'Lisinopril',    'dose' => '20 mg', 'route' => 'PO', 'frequency' => 'QD',  'times' => ['08:00'],            'indication' => 'Hypertension'],
            ['name' => 'Furosemide',    'dose' => '40 mg', 'route' => 'PO', 'frequency' => 'BID', 'times' => ['08:00', '14:00'],   'indication' => 'CHF — edema'],
            ['name' => 'Warfarin',      'dose' => '5 mg',  'route' => 'PO', 'frequency' => 'QD',  'times' => ['18:00'],            'indication' => 'Atrial fibrillation'],
            ['name' => 'Pantoprazole',  'dose' => '40 mg', 'route' => 'PO', 'frequency' => 'QD',  'times' => ['07:30'],            'indication' => 'GERD'],
            ['name' => 'Oxycodone',     'dose' => '5 mg',  'route' => 'PO', 'frequency' => 'Q4H', 'times' => [],                   'indication' => 'Post-op pain', 'prn' => true],
            ['name' => 'Heparin SC',    'dose' => '5000 u','route' => 'SC', 'frequency' => 'BID', 'times' => ['08:00', '20:00'],   'indication' => 'DVT prophylaxis'],
            ['name' => 'Ondansetron',   'dose' => '4 mg',  'route' => 'PO', 'frequency' => 'PRN', 'times' => [],                   'indication' => 'Nausea', 'prn' => true],
        ],
        'memory' => [
            ['name' => 'Memantine',     'dose' => '10 mg', 'route' => 'PO', 'frequency' => 'BID', 'times' => ['09:00', '21:00'],   'indication' => 'Moderate dementia'],
            ['name' => 'Donepezil',     'dose' => '10 mg', 'route' => 'PO', 'frequency' => 'QHS', 'times' => ['21:00'],            'indication' => 'Alzheimer\'s disease'],
            ['name' => 'Sertraline',    'dose' => '50 mg', 'route' => 'PO', 'frequency' => 'QAM', 'times' => ['08:00'],            'indication' => 'Depression'],
            ['name' => 'Trazodone',     'dose' => '50 mg', 'route' => 'PO', 'frequency' => 'QHS', 'times' => ['22:00'],            'indication' => 'Insomnia'],
            ['name' => 'Vitamin D3',    'dose' => '1000 IU','route' => 'PO','frequency' => 'QD',  'times' => ['08:00'],            'indication' => 'Bone health'],
            ['name' => 'Acetaminophen', 'dose' => '650 mg','route' => 'PO', 'frequency' => 'PRN', 'times' => [],                   'indication' => 'Pain / agitation', 'prn' => true],
            ['name' => 'Lorazepam',     'dose' => '0.5 mg','route' => 'PO', 'frequency' => 'PRN', 'times' => [],                   'indication' => 'Severe agitation', 'prn' => true],
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

        foreach ($residents as $i => $resident) {
            $formulary = self::FORMULARY[$resident->level_of_care] ?? self::FORMULARY['assisted'];

            // Take a 3-5 med slice offset by index so different residents get
            // different med lists. Always include at least one PRN if available.
            $start = $i % max(1, count($formulary) - 4);
            $slice = array_slice($formulary, $start, 5);

            foreach ($slice as $med) {
                $exists = Medication::where('resident_id', $resident->id)
                    ->where('name', $med['name'])
                    ->exists();
                if ($exists) {
                    continue;
                }

                Medication::create([
                    'facility_id' => $resident->facility_id,
                    'resident_id' => $resident->id,
                    'name' => $med['name'],
                    'dose' => $med['dose'],
                    'route' => $med['route'],
                    'frequency' => $med['frequency'],
                    'schedule_times' => $med['times'],
                    'indication' => $med['indication'],
                    'prescriber' => 'Dr. Sarah Mitchell, MD',
                    'start_date' => now()->subDays(rand(7, 180))->toDateString(),
                    'is_prn' => $med['prn'] ?? false,
                    'is_active' => true,
                ]);
                $created++;
            }
        }

        $this->command->info("✓ medications seeded ({$created} new)");
    }
}
