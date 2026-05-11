<?php

namespace Database\Seeders;

use App\Models\LevelOfCare;
use App\Models\Payer;
use App\Models\State;
use Illuminate\Database\Seeder;

/**
 * Seeds platform-wide master data. Runs on every release via Procfile;
 * idempotent — uses updateOrCreate keyed on natural identifiers.
 *
 * NOT for facility-scoped rows — those are copied per-facility by
 * TenantProvisioningService (Phase 2.2).
 */
class MasterDataSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedStates();
        $this->seedPayers();
        $this->seedLevelsOfCare();
    }

    private function seedStates(): void
    {
        $states = [
            ['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'],
            ['CA', 'California'], ['CO', 'Colorado'], ['CT', 'Connecticut'], ['DE', 'Delaware'],
            ['DC', 'District of Columbia'], ['FL', 'Florida'], ['GA', 'Georgia'], ['HI', 'Hawaii'],
            ['ID', 'Idaho'], ['IL', 'Illinois'], ['IN', 'Indiana'], ['IA', 'Iowa'],
            ['KS', 'Kansas'], ['KY', 'Kentucky'], ['LA', 'Louisiana'], ['ME', 'Maine'],
            ['MD', 'Maryland'], ['MA', 'Massachusetts'], ['MI', 'Michigan'], ['MN', 'Minnesota'],
            ['MS', 'Mississippi'], ['MO', 'Missouri'], ['MT', 'Montana'], ['NE', 'Nebraska'],
            ['NV', 'Nevada'], ['NH', 'New Hampshire'], ['NJ', 'New Jersey'], ['NM', 'New Mexico'],
            ['NY', 'New York'], ['NC', 'North Carolina'], ['ND', 'North Dakota'], ['OH', 'Ohio'],
            ['OK', 'Oklahoma'], ['OR', 'Oregon'], ['PA', 'Pennsylvania'], ['PR', 'Puerto Rico'],
            ['RI', 'Rhode Island'], ['SC', 'South Carolina'], ['SD', 'South Dakota'], ['TN', 'Tennessee'],
            ['TX', 'Texas'], ['UT', 'Utah'], ['VT', 'Vermont'], ['VA', 'Virginia'],
            ['WA', 'Washington'], ['WV', 'West Virginia'], ['WI', 'Wisconsin'], ['WY', 'Wyoming'],
        ];

        foreach ($states as [$code, $name]) {
            State::updateOrCreate(
                ['code' => $code],
                ['name' => $name, 'is_active' => true]
            );
        }

        $this->command->info("✓ states (" . count($states) . ")");
    }

    private function seedPayers(): void
    {
        $payers = [
            ['Medicare Part A',           'medicare_a',         'MCRA'],
            ['Medicare Part B',           'medicare_b',         'MCRB'],
            ['Medicare Advantage',        'medicare_advantage', 'MA'],
            ['Medicaid',                  'medicaid',           'MCD'],
            ['VA Aid & Attendance',       'va',                 'VA-AA'],
            ['Private Pay',               'private_pay',        'SELF'],
            ['Genworth LTC Insurance',    'ltc_insurance',      'GENWORTH'],
            ['John Hancock LTC',          'ltc_insurance',      'JOHN-HANCOCK'],
            ['Mutual of Omaha LTC',       'ltc_insurance',      'MUTUAL-OMAHA'],
            ['Transamerica LTC',          'ltc_insurance',      'TRANSAMERICA'],
            ['New York Life LTC',         'ltc_insurance',      'NYL'],
            ['Northwestern Mutual LTC',   'ltc_insurance',      'NWM'],
            ['MassMutual LTC',            'ltc_insurance',      'MASSMUTUAL'],
            ['Bankers Life LTC',          'ltc_insurance',      'BANKERS'],
            ['MetLife LTC (legacy)',      'ltc_insurance',      'METLIFE'],
        ];

        foreach ($payers as [$name, $type, $code]) {
            Payer::updateOrCreate(
                ['facility_id' => null, 'source' => 'master', 'code' => $code],
                ['name' => $name, 'type' => $type, 'is_active' => true]
            );
        }

        $this->command->info("✓ payers (" . count($payers) . ")");
    }

    private function seedLevelsOfCare(): void
    {
        $levels = [
            ['independent', 'Independent Living', 'Residents are fully independent; community-style amenities.', 10],
            ['assisted',    'Assisted Living',    'Help with 1–3 ADLs; medication management; meals + activities.', 20],
            ['memory',      'Memory Care',        'Specialized care for Alzheimer\'s, dementia, and cognitive impairment.', 30],
            ['skilled',     'Skilled Nursing',    'RN-staffed; sub-acute rehab, IV therapy, wound care, post-hospital recovery.', 40],
            ['hospice',     'Hospice / End of Life', 'Comfort-focused care for terminal illness; interdisciplinary team.', 50],
        ];

        foreach ($levels as [$code, $name, $desc, $order]) {
            LevelOfCare::updateOrCreate(
                ['facility_id' => null, 'code' => $code],
                [
                    'source' => 'master',
                    'name' => $name,
                    'description' => $desc,
                    'sort_order' => $order,
                    'is_active' => true,
                ]
            );
        }

        $this->command->info("✓ levels_of_care (" . count($levels) . ")");
    }
}
