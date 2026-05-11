<?php

namespace Database\Seeders;

use App\Models\CmsFTag;
use App\Models\CredentialTemplate;
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
        $this->seedCmsFTags();
        $this->seedCredentialTemplates();
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

    /**
     * CMS F-tag deficiency codes most-cited at SNF surveys. Source:
     * CMS State Operations Manual Appendix PP. This is the
     * top-of-mind subset — full list is ~180 codes.
     */
    private function seedCmsFTags(): void
    {
        $ftags = [
            ['F550', 'Resident Rights / Dignity', 'resident_rights'],
            ['F600', 'Free from Abuse and Neglect', 'abuse_neglect'],
            ['F605', 'Free from Misappropriation/Exploitation', 'abuse_neglect'],
            ['F607', 'Develop/Implement Abuse/Neglect Policies', 'abuse_neglect'],
            ['F608', 'Reporting of Alleged Violations', 'abuse_neglect'],
            ['F609', 'Reporting Reasonable Suspicion of a Crime', 'abuse_neglect'],
            ['F656', 'Develop/Implement Comprehensive Care Plan', 'care_planning'],
            ['F657', 'Care Plan Timing and Revision', 'care_planning'],
            ['F676', 'Activities of Daily Living (ADLs)', 'quality_of_life'],
            ['F677', 'ADL Care Provided for Dependent Residents', 'quality_of_life'],
            ['F679', 'Activities Meet Interest/Needs of Each Resident', 'quality_of_life'],
            ['F684', 'Quality of Care', 'quality_of_care'],
            ['F686', 'Treatment/Services to Prevent/Heal Pressure Ulcers', 'quality_of_care'],
            ['F689', 'Free of Accident Hazards / Supervision / Devices', 'quality_of_care'],
            ['F690', 'Bowel/Bladder Incontinence, Catheter, UTI', 'quality_of_care'],
            ['F692', 'Nutrition / Hydration Status Maintenance', 'quality_of_care'],
            ['F695', 'Respiratory / Tracheostomy Care and Suctioning', 'quality_of_care'],
            ['F697', 'Pain Management', 'quality_of_care'],
            ['F698', 'Dialysis', 'quality_of_care'],
            ['F699', 'Trauma Informed Care', 'quality_of_care'],
            ['F725', 'Sufficient Nursing Staff', 'staffing'],
            ['F726', 'Competent Nursing Staff', 'staffing'],
            ['F740', 'Behavioral Health Services', 'behavioral_health'],
            ['F758', 'Free from Unnecessary Psychotropic Meds / PRN Use', 'pharmacy'],
            ['F761', 'Label/Store Drugs and Biologicals', 'pharmacy'],
            ['F812', 'Food Procurement, Store/Prepare/Serve - Sanitary', 'dietary'],
            ['F813', 'Personal Food Policy', 'dietary'],
            ['F814', 'Dispose Garbage and Refuse Properly', 'dietary'],
            ['F880', 'Infection Prevention & Control', 'infection_control'],
            ['F881', 'Antibiotic Stewardship Program', 'infection_control'],
            ['F884', 'Reporting - National Healthcare Safety Network', 'infection_control'],
            ['F921', 'Safe/Functional/Sanitary/Comfortable Environment', 'environment'],
        ];

        foreach ($ftags as [$code, $title, $category]) {
            CmsFTag::updateOrCreate(
                ['code' => $code],
                ['title' => $title, 'category' => $category, 'is_active' => true]
            );
        }

        $this->command->info("✓ cms_f_tags (" . count($ftags) . ")");
    }

    private function seedCredentialTemplates(): void
    {
        $credentials = [
            ['RN',   'Registered Nurse',         24, true],
            ['LPN',  'Licensed Practical Nurse', 24, true],
            ['CNA',  'Certified Nursing Assistant', 24, true],
            ['MA',   'Medical Assistant',        24, true],
            ['NP',   'Nurse Practitioner',       24, true],
            ['PA',   'Physician Assistant',      24, true],
            ['MD',   'Physician (MD/DO)',        24, true],
            ['SW',   'Social Worker (LCSW/LSW)', 24, true],
            ['DT',   'Dietitian (RD/RDN)',       24, true],
            ['CMA',  'Certified Medication Aide', 12, true],
        ];

        foreach ($credentials as [$code, $name, $renewal, $needsLicense]) {
            CredentialTemplate::updateOrCreate(
                ['facility_id' => null, 'code' => $code],
                [
                    'source' => 'master',
                    'name' => $name,
                    'renewal_months' => $renewal,
                    'requires_state_license' => $needsLicense,
                    'is_active' => true,
                ]
            );
        }

        $this->command->info("✓ credential_templates (" . count($credentials) . ")");
    }
}
