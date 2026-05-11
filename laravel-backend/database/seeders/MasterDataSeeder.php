<?php

namespace Database\Seeders;

use App\Models\CmsFTag;
use App\Models\CredentialTemplate;
use App\Models\DiagnosisCode;
use App\Models\DocPreset;
use App\Models\LevelOfCare;
use App\Models\Payer;
use App\Models\ServiceCode;
use App\Models\ServiceType;
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
        $this->seedDiagnosisCodes();
        $this->seedServiceCodes();
        $this->seedServiceTypes();
        $this->seedDocPresets();
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

    /**
     * Top ~40 ICD-10 codes seen in LTC populations.
     */
    private function seedDiagnosisCodes(): void
    {
        $diagnoses = [
            // Cardiovascular
            ['I10',     'Essential (primary) hypertension',                        'cardiology', true],
            ['I50.9',   'Heart failure, unspecified',                              'cardiology', true],
            ['I48.91',  'Unspecified atrial fibrillation',                         'cardiology', true],
            ['I25.10',  'Coronary artery disease without angina pectoris',         'cardiology', true],
            ['I63.9',   'Cerebral infarction, unspecified (stroke)',               'cardiology', true],
            // Endocrine
            ['E11.9',   'Type 2 diabetes mellitus without complications',          'endocrine',  true],
            ['E78.5',   'Hyperlipidemia, unspecified',                             'endocrine',  true],
            ['E03.9',   'Hypothyroidism, unspecified',                             'endocrine',  true],
            // Neuro / dementia
            ['F03.90',  'Unspecified dementia without behavioral disturbance',     'neuro_dementia', true],
            ['F03.91',  'Unspecified dementia with behavioral disturbance',        'neuro_dementia', true],
            ['G30.9',   'Alzheimer\'s disease, unspecified',                       'neuro_dementia', true],
            ['G20',     'Parkinson\'s disease',                                    'neuro_dementia', true],
            ['G31.83',  'Dementia with Lewy bodies',                               'neuro_dementia', true],
            // Musculoskeletal
            ['M81.0',   'Age-related osteoporosis without current path. fracture', 'musculoskeletal', true],
            ['M19.90',  'Unspecified osteoarthritis, unspecified site',            'musculoskeletal', true],
            ['M54.50',  'Low back pain, unspecified',                              'musculoskeletal', true],
            // Respiratory
            ['J44.9',   'COPD, unspecified',                                       'respiratory', true],
            ['J18.9',   'Pneumonia, unspecified organism',                         'respiratory', false],
            // Renal
            ['N18.6',   'End stage renal disease',                                 'renal',      true],
            ['N18.3',   'CKD stage 3',                                             'renal',      true],
            // GU / UTI
            ['N39.0',   'Urinary tract infection, site not specified',             'genitourinary', false],
            ['R32',     'Unspecified urinary incontinence',                        'genitourinary', true],
            // Mental health
            ['F32.9',   'Major depressive disorder, single episode, unspecified',  'mental_health', true],
            ['F41.9',   'Anxiety disorder, unspecified',                           'mental_health', true],
            ['F31.9',   'Bipolar disorder, unspecified',                           'mental_health', true],
            // Skin / wounds
            ['L89.90',  'Pressure ulcer of unspecified site, unspecified stage',   'integumentary', false],
            ['L97.909', 'Non-pressure chronic ulcer of unspecified site',          'integumentary', true],
            // Falls / injury
            ['Z91.81',  'History of falling',                                      'injury',     true],
            ['R26.81',  'Unsteadiness on feet',                                    'neuro_dementia', true],
            // Nutrition
            ['E43',     'Unspecified severe protein-calorie malnutrition',         'nutrition',  false],
            ['R63.6',   'Underweight',                                             'nutrition',  false],
            ['K59.00',  'Constipation, unspecified',                               'gastrointestinal', true],
            // Sensory
            ['H91.93',  'Unspecified hearing loss, bilateral',                     'sensory',    true],
            ['H54.7',   'Unspecified visual loss',                                 'sensory',    true],
            // GI
            ['K21.9',   'GERD without esophagitis',                                'gastrointestinal', true],
            // Care management
            ['Z51.5',   'Encounter for palliative care',                           'care_management', false],
            ['Z79.01',  'Long term (current) use of anticoagulants',               'care_management', true],
            ['Z79.899', 'Other long term (current) drug therapy',                  'care_management', true],
        ];

        foreach ($diagnoses as [$code, $description, $category, $chronic]) {
            DiagnosisCode::updateOrCreate(
                ['facility_id' => null, 'code' => $code],
                [
                    'source' => 'master',
                    'description' => $description,
                    'category' => $category,
                    'is_chronic' => $chronic,
                    'is_active' => true,
                ]
            );
        }

        $this->command->info("✓ diagnosis_codes (" . count($diagnoses) . ")");
    }

    /**
     * Common HCPCS / CPT billing codes used in SNF + AL.
     */
    private function seedServiceCodes(): void
    {
        $codes = [
            ['G0299', 'Direct skilled nursing services by a registered nurse', 'per_15_min'],
            ['G0300', 'Direct skilled nursing services by a licensed practical nurse', 'per_15_min'],
            ['G0151', 'Services performed by a qualified physical therapist', 'per_15_min'],
            ['G0152', 'Services performed by a qualified occupational therapist', 'per_15_min'],
            ['G0153', 'Services performed by a qualified speech-language pathologist', 'per_15_min'],
            ['G0156', 'Services of home health/hospice aide', 'per_15_min'],
            ['G0155', 'Services of a clinical social worker', 'per_15_min'],
            ['G0162', 'Skilled services by RN for management of patient care plan', 'per_15_min'],
            ['T1015', 'Clinic visit/encounter, all-inclusive', 'per_visit'],
            ['T1019', 'Personal care services, per 15 minutes', 'per_15_min'],
            ['T1020', 'Personal care services, per diem', 'per_day'],
            ['99304', 'Initial nursing facility care, per day, low complexity', 'per_visit'],
            ['99307', 'Subsequent nursing facility care, per day, problem-focused', 'per_visit'],
            ['99315', 'Nursing facility discharge management, 30 min or less', 'per_visit'],
            ['90834', 'Psychotherapy, 45 minutes with patient', 'per_visit'],
        ];

        foreach ($codes as [$code, $description, $unit]) {
            ServiceCode::updateOrCreate(
                ['facility_id' => null, 'code' => $code],
                [
                    'source' => 'master',
                    'description' => $description,
                    'unit_type' => $unit,
                    'is_active' => true,
                ]
            );
        }

        $this->command->info("✓ service_codes (" . count($codes) . ")");
    }

    private function seedServiceTypes(): void
    {
        $types = [
            ['NURSING_RN',     'RN assessment / treatment',  'RN'],
            ['NURSING_LPN',    'LPN treatment / med pass',   'LPN'],
            ['CNA_CARE',       'CNA personal care / ADLs',   'CNA'],
            ['PT',             'Physical therapy',           null],
            ['OT',             'Occupational therapy',       null],
            ['ST',             'Speech therapy',             null],
            ['SOCIAL_WORK',    'Social work consult',        'SW'],
            ['DIETITIAN',      'Dietitian consult',          'DT'],
            ['ACTIVITIES',     'Activities / recreation',    null],
            ['TRANSPORT',      'Transportation',             null],
            ['CHAPLAIN',       'Chaplain / spiritual care',  null],
            ['WOUND_CARE',     'Wound care specialist',      'RN'],
        ];

        foreach ($types as [$code, $name, $credCode]) {
            ServiceType::updateOrCreate(
                ['facility_id' => null, 'code' => $code],
                [
                    'source' => 'master',
                    'name' => $name,
                    'requires_credential_code' => $credCode,
                    'is_active' => true,
                ]
            );
        }

        $this->command->info("✓ service_types (" . count($types) . ")");
    }

    private function seedDocPresets(): void
    {
        $presets = [
            ['ADMISSION_PACKET',   'Admission packet',              'admission',     true],
            ['CONSENT_TREATMENT',  'Consent for treatment',         'admission',     true],
            ['ADVANCE_DIRECTIVE',  'Advance directive',             'admission',     true],
            ['POLST',              'POLST / MOLST form',            'admission',     true],
            ['NOTICE_PRIVACY',     'HIPAA notice of privacy practices', 'admission', true],
            ['PLAN_OF_CARE',       'Plan of care',                  'care_planning', true],
            ['MDS_3',              'MDS 3.0 assessment',            'care_planning', false],
            ['FALL_RISK',          'Fall risk assessment',          'care_planning', false],
            ['PRESSURE_ULCER',     'Braden scale (pressure ulcer)', 'care_planning', false],
            ['DISCHARGE_SUMMARY',  'Discharge summary',             'discharge',     true],
            ['INCIDENT_REPORT',    'Incident / accident report',    'regulatory',    false],
            ['F_TAG_PLAN_OF_CORRECTION', 'Plan of correction (F-tag)', 'regulatory', true],
        ];

        foreach ($presets as [$code, $name, $category, $needsSig]) {
            DocPreset::updateOrCreate(
                ['facility_id' => null, 'code' => $code],
                [
                    'source' => 'master',
                    'name' => $name,
                    'category' => $category,
                    'requires_signature' => $needsSig,
                    'is_active' => true,
                ]
            );
        }

        $this->command->info("✓ doc_presets (" . count($presets) . ")");
    }
}
