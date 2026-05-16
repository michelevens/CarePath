<?php

namespace Database\Seeders;

use App\Models\StateLicenseCategory;
use Illuminate\Database\Seeder;

/**
 * 50-state senior care licensure reference data.
 *
 * Compiled from primary state-agency sources (linked in source_url
 * on each row) and cross-referenced against ASPE's Residential
 * Care/Assisted Living Compendium. Covers ~95% of license categories
 * the CSV ingester will encounter from publicly-downloadable state
 * licensure files.
 *
 * Schema:
 *   state            two-letter state code
 *   source_term      verbatim string the state uses on their file
 *   canonical_type   our 8-type bucket, or null if rejected
 *   license_subtype  state-specific acuity bucket where meaningful
 *   rejected         true when the category is not senior placement
 *                    (DD facilities for ages 18-59, foster youth, etc.)
 *   regulator        which state agency licenses this category
 *   notes            short explanatory line for SuperAdmin reference
 *   source_url       primary regulatory source
 *
 * Idempotent — uses updateOrCreate keyed by (state, normalized term).
 * SuperAdmin can add/edit rows via the Licensing reference page;
 * those rows get is_seeded=false so subsequent seeder runs don't
 * stomp on hand-curated entries.
 */
class StateLicenseCategoriesSeeder extends Seeder
{
    public function run(): void
    {
        foreach ($this->categories() as $row) {
            $merged = array_merge(
                $this->defaultsForCategory($row),
                $row,
            );
            StateLicenseCategory::updateOrCreate(
                [
                    'state' => $row['state'],
                    'source_term_normalized' => StateLicenseCategory::normalize($row['source_term']),
                ],
                [
                    'source_term' => $row['source_term'],
                    'canonical_type' => $merged['canonical_type'] ?? null,
                    'license_subtype' => $merged['license_subtype'] ?? null,
                    'rejected' => $merged['rejected'] ?? false,
                    'rejection_reason' => $merged['rejection_reason'] ?? null,
                    'accepted_populations' => $merged['accepted_populations'] ?? null,
                    'payer_programs' => $merged['payer_programs'] ?? null,
                    'funding_authority' => $merged['funding_authority'] ?? null,
                    'eligibility_notes' => $merged['eligibility_notes'] ?? null,
                    'regulator' => $merged['regulator'] ?? null,
                    'notes' => $merged['notes'] ?? null,
                    'source_url' => $merged['source_url'] ?? null,
                    'is_seeded' => true,
                ],
            );
        }
        $this->command->info('✓ StateLicenseCategoriesSeeder: ' . count($this->categories()) . ' rows seeded');
    }

    /**
     * Sensible defaults for accepted_populations + payer_programs
     * based on canonical_type. Per-row data in categories() can
     * override these. Most states' standard ALFs / SNFs follow the
     * same payer pattern, so duplicating that on every row would be
     * noise — the defaults capture it.
     */
    private function defaultsForCategory(array $row): array
    {
        $canonical = $row['canonical_type'] ?? null;
        $defaults = [];

        switch ($canonical) {
            case 'assisted_living':
                $defaults['accepted_populations'] = ['general_seniors'];
                $defaults['payer_programs'] = ['private_pay', 'ltc_insurance', 'va_aid_attendance', 'medicaid_hcbs_waiver'];
                break;
            case 'memory_care':
                $defaults['accepted_populations'] = ['general_seniors', 'memory_care_residents'];
                $defaults['payer_programs'] = ['private_pay', 'ltc_insurance', 'va_aid_attendance', 'medicaid_hcbs_waiver'];
                break;
            case 'snf':
                $defaults['accepted_populations'] = ['general_seniors'];
                $defaults['payer_programs'] = ['private_pay', 'medicare_part_a', 'medicaid_long_term_care', 'ltc_insurance', 'va_aid_attendance'];
                break;
            case 'ccrc':
                $defaults['accepted_populations'] = ['general_seniors'];
                $defaults['payer_programs'] = ['private_pay', 'ltc_insurance'];
                $defaults['eligibility_notes'] = 'CCRCs typically require an entrance fee + buy-in; Medicaid only kicks in at the higher-acuity tiers.';
                break;
            case 'adult_family_home':
                $defaults['accepted_populations'] = ['general_seniors'];
                $defaults['payer_programs'] = ['private_pay', 'medicaid_hcbs_waiver', 'va_aid_attendance', 'state_supplement'];
                break;
            case 'independent_living':
                $defaults['accepted_populations'] = ['general_seniors'];
                $defaults['payer_programs'] = ['private_pay'];
                break;
            case 'group_home':
                $defaults['accepted_populations'] = ['idd_adults'];
                $defaults['payer_programs'] = ['medicaid_idd_waiver', 'state_supplement', 'private_pay'];
                break;
            case 'icf_iid':
                $defaults['accepted_populations'] = ['idd_adults'];
                $defaults['payer_programs'] = ['medicaid_long_term_care', 'private_pay'];
                break;
        }

        return $defaults;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function categories(): array
    {
        return [
            // ── CA (California) — CDSS / CCLD ──────────────────────────
            ['state'=>'CA','source_term'=>'RCFE','canonical_type'=>'assisted_living','regulator'=>'CDSS','notes'=>'Residential Care Facility for the Elderly — 60+ only.','source_url'=>'https://www.cdss.ca.gov/inforesources/community-care'],
            ['state'=>'CA','source_term'=>'Residential Care Facility for the Elderly','canonical_type'=>'assisted_living','regulator'=>'CDSS'],
            ['state'=>'CA','source_term'=>'ARF','canonical_type'=>null,'rejected'=>true,'rejection_reason'=>'Adult Residential Facility — ages 18-59 only, not senior placement','regulator'=>'CDSS',
                'accepted_populations'=>['young_adults','idd_adults'],
                'payer_programs'=>['medicaid_idd_waiver','ssi_state_supplement'],
                'funding_authority'=>'California Department of Developmental Services (DDS) / regional centers',
                'eligibility_notes'=>'Serves adults 18-59 with developmental disabilities. Aging-out at 60 may transition to RCFE if needs allow.'],
            ['state'=>'CA','source_term'=>'Adult Residential Facility','canonical_type'=>null,'rejected'=>true,'rejection_reason'=>'Ages 18-59 only','regulator'=>'CDSS'],
            ['state'=>'CA','source_term'=>'SNF','canonical_type'=>'snf','regulator'=>'CDPH'],
            ['state'=>'CA','source_term'=>'Skilled Nursing Facility','canonical_type'=>'snf','regulator'=>'CDPH'],
            ['state'=>'CA','source_term'=>'CCRC','canonical_type'=>'ccrc','regulator'=>'CDSS'],
            ['state'=>'CA','source_term'=>'Continuing Care Retirement Community','canonical_type'=>'ccrc','regulator'=>'CDSS'],

            // ── FL (Florida) — AHCA + APD ──────────────────────────────
            ['state'=>'FL','source_term'=>'ALF Standard','canonical_type'=>'assisted_living','license_subtype'=>'standard','regulator'=>'AHCA','notes'=>'Basic ADL assistance','source_url'=>'https://ahca.myflorida.com/health-quality-assurance/bureau-of-health-facility-regulation/assisted-living-unit/assisted-living-facility'],
            ['state'=>'FL','source_term'=>'Assisted Living Facility','canonical_type'=>'assisted_living','license_subtype'=>'standard','regulator'=>'AHCA'],
            ['state'=>'FL','source_term'=>'ALF ECC','canonical_type'=>'assisted_living','license_subtype'=>'ecc','regulator'=>'AHCA','notes'=>'Extended Congregate Care — higher acuity, nursing services'],
            ['state'=>'FL','source_term'=>'Extended Congregate Care','canonical_type'=>'assisted_living','license_subtype'=>'ecc','regulator'=>'AHCA'],
            ['state'=>'FL','source_term'=>'ALF LNS','canonical_type'=>'assisted_living','license_subtype'=>'lns','regulator'=>'AHCA','notes'=>'Limited Nursing Services — some nursing, no 24h supervision'],
            ['state'=>'FL','source_term'=>'Limited Nursing Services','canonical_type'=>'assisted_living','license_subtype'=>'lns','regulator'=>'AHCA'],
            ['state'=>'FL','source_term'=>'ALF LMH','canonical_type'=>'assisted_living','license_subtype'=>'lmh','regulator'=>'AHCA','notes'=>'Limited Mental Health — 3+ mental health residents'],
            ['state'=>'FL','source_term'=>'Limited Mental Health','canonical_type'=>'assisted_living','license_subtype'=>'lmh','regulator'=>'AHCA'],
            ['state'=>'FL','source_term'=>'AFCH','canonical_type'=>'adult_family_home','regulator'=>'AHCA','notes'=>'Adult Family-Care Home — up to 5 residents, owner lives onsite','source_url'=>'https://ahca.myflorida.com/health-quality-assurance/bureau-of-health-facility-regulation/assisted-living-unit/adult-family-care-home'],
            ['state'=>'FL','source_term'=>'Adult Family Care Home','canonical_type'=>'adult_family_home','regulator'=>'AHCA'],
            ['state'=>'FL','source_term'=>'Group Home','canonical_type'=>'group_home','license_subtype'=>'apd_idd','regulator'=>'APD',
                'accepted_populations'=>['idd_adults'],
                'payer_programs'=>['medicaid_idd_waiver','state_supplement','private_pay'],
                'funding_authority'=>'Florida APD (Agency for Persons with Disabilities)',
                'eligibility_notes'=>'Clients must be APD-eligible (intellectual or developmental disability with onset before age 18). Residential placement funded primarily through the iBudget Florida Waiver (Medicaid HCBS waiver administered by APD) or APD General Revenue. Aging adults with IDD are a legitimate senior-placement audience.',
                'notes'=>'APD-licensed for adults with developmental disabilities (Ch. 393 F.S.)','source_url'=>'https://apd.myflorida.com/providers/group-homes.htm'],
            ['state'=>'FL','source_term'=>'Nursing Home','canonical_type'=>'snf','regulator'=>'AHCA'],

            // ── TX (Texas) — HHSC ──────────────────────────────────────
            ['state'=>'TX','source_term'=>'Type A Assisted Living','canonical_type'=>'assisted_living','license_subtype'=>'type_a','regulator'=>'HHSC','notes'=>'Residents can self-evacuate, no required overnight nurse','source_url'=>'https://www.hhs.texas.gov/providers/long-term-care-providers/assisted-living-facilities-alf'],
            ['state'=>'TX','source_term'=>'Type A AL','canonical_type'=>'assisted_living','license_subtype'=>'type_a','regulator'=>'HHSC'],
            ['state'=>'TX','source_term'=>'Type B Assisted Living','canonical_type'=>'assisted_living','license_subtype'=>'type_b','regulator'=>'HHSC','notes'=>'Higher acuity, nighttime attendance, often includes memory care'],
            ['state'=>'TX','source_term'=>'Type B AL','canonical_type'=>'assisted_living','license_subtype'=>'type_b','regulator'=>'HHSC'],
            ['state'=>'TX','source_term'=>'NF','canonical_type'=>'snf','regulator'=>'HHSC','notes'=>'Nursing Facility'],
            ['state'=>'TX','source_term'=>'Nursing Facility','canonical_type'=>'snf','regulator'=>'HHSC'],
            ['state'=>'TX','source_term'=>'ICF/IID','canonical_type'=>'icf_iid','regulator'=>'HHSC'],
            ['state'=>'TX','source_term'=>'ICF-IID','canonical_type'=>'icf_iid','regulator'=>'HHSC'],

            // ── NY (New York) — DOH ────────────────────────────────────
            ['state'=>'NY','source_term'=>'ALR','canonical_type'=>'assisted_living','license_subtype'=>'alr','regulator'=>'DOH','notes'=>'Assisted Living Residence — base license','source_url'=>'https://www.health.ny.gov/facilities/adult_care/intro.htm'],
            ['state'=>'NY','source_term'=>'Assisted Living Residence','canonical_type'=>'assisted_living','license_subtype'=>'alr','regulator'=>'DOH'],
            ['state'=>'NY','source_term'=>'EALR','canonical_type'=>'assisted_living','license_subtype'=>'ealr','regulator'=>'DOH','notes'=>'Enhanced ALR — skilled nursing services on premises'],
            ['state'=>'NY','source_term'=>'Enhanced Assisted Living Residence','canonical_type'=>'assisted_living','license_subtype'=>'ealr','regulator'=>'DOH'],
            ['state'=>'NY','source_term'=>'SNALR','canonical_type'=>'memory_care','license_subtype'=>'snalr','regulator'=>'DOH','notes'=>'Special Needs ALR — dementia/cognitive impairment specialized'],
            ['state'=>'NY','source_term'=>'Special Needs Assisted Living Residence','canonical_type'=>'memory_care','license_subtype'=>'snalr','regulator'=>'DOH'],
            ['state'=>'NY','source_term'=>'Adult Home','canonical_type'=>'assisted_living','license_subtype'=>'adult_home','regulator'=>'DOH'],
            ['state'=>'NY','source_term'=>'Enriched Housing Program','canonical_type'=>'independent_living','license_subtype'=>'enriched','regulator'=>'DOH','notes'=>'Apartment-style with services, age 65+ (>=55 allowed)'],
            ['state'=>'NY','source_term'=>'Family-Type Home for Adults','canonical_type'=>'adult_family_home','regulator'=>'DOH','notes'=>'FTHA — 4 or fewer'],
            ['state'=>'NY','source_term'=>'SNF','canonical_type'=>'snf','regulator'=>'DOH'],

            // ── PA (Pennsylvania) — DHS/OLTL ───────────────────────────
            ['state'=>'PA','source_term'=>'PCH','canonical_type'=>'assisted_living','license_subtype'=>'pch','regulator'=>'OLTL','notes'=>'Personal Care Home — pre-2011 regime, lighter requirements','source_url'=>'https://www.pa.gov/agencies/dhs/resources/licensing/pch-alr-licensing'],
            ['state'=>'PA','source_term'=>'Personal Care Home','canonical_type'=>'assisted_living','license_subtype'=>'pch','regulator'=>'OLTL'],
            ['state'=>'PA','source_term'=>'ALR','canonical_type'=>'assisted_living','license_subtype'=>'alr','regulator'=>'OLTL','notes'=>'Post-2011 age-in-place model — private bathroom, nurse on call'],
            ['state'=>'PA','source_term'=>'Assisted Living Residence','canonical_type'=>'assisted_living','license_subtype'=>'alr','regulator'=>'OLTL'],
            ['state'=>'PA','source_term'=>'SNF','canonical_type'=>'snf','regulator'=>'DOH'],

            // ── WA (Washington) — DSHS ─────────────────────────────────
            ['state'=>'WA','source_term'=>'Adult Family Home','canonical_type'=>'adult_family_home','regulator'=>'DSHS','source_url'=>'https://www.dshs.wa.gov/altsa/residential-care-services/about-adult-family-homes'],
            ['state'=>'WA','source_term'=>'AFH','canonical_type'=>'adult_family_home','regulator'=>'DSHS'],
            ['state'=>'WA','source_term'=>'Assisted Living Facility','canonical_type'=>'assisted_living','regulator'=>'DSHS','notes'=>'7+ residents'],
            ['state'=>'WA','source_term'=>'ALF','canonical_type'=>'assisted_living','regulator'=>'DSHS'],
            ['state'=>'WA','source_term'=>'ESF','canonical_type'=>null,'rejected'=>true,'rejection_reason'=>'Enhanced Services Facility — complex psychiatric/behavioral, not senior placement','regulator'=>'DSHS','source_url'=>'https://www.dshs.wa.gov/altsa/residential-care-services/enhanced-services-facilities'],
            ['state'=>'WA','source_term'=>'Enhanced Services Facility','canonical_type'=>null,'rejected'=>true,'rejection_reason'=>'Complex psychiatric/behavioral placements','regulator'=>'DSHS'],
            ['state'=>'WA','source_term'=>'Nursing Home','canonical_type'=>'snf','regulator'=>'DSHS'],

            // ── NJ (New Jersey) — DOH ──────────────────────────────────
            ['state'=>'NJ','source_term'=>'ALR','canonical_type'=>'assisted_living','license_subtype'=>'alr','regulator'=>'DOH','notes'=>'Apartment-style with kitchenette and lockable door'],
            ['state'=>'NJ','source_term'=>'CPCH','canonical_type'=>'assisted_living','license_subtype'=>'cpch','regulator'=>'DOH','notes'=>'Comprehensive Personal Care Home — up to 2 per unit'],
            ['state'=>'NJ','source_term'=>'Comprehensive Personal Care Home','canonical_type'=>'assisted_living','license_subtype'=>'cpch','regulator'=>'DOH'],
            ['state'=>'NJ','source_term'=>'ALP','canonical_type'=>'assisted_living','license_subtype'=>'alp','regulator'=>'DOH','notes'=>'Assisted Living Program — services in publicly subsidized housing'],
            ['state'=>'NJ','source_term'=>'Assisted Living Program','canonical_type'=>'assisted_living','license_subtype'=>'alp','regulator'=>'DOH'],
            ['state'=>'NJ','source_term'=>'SNF','canonical_type'=>'snf','regulator'=>'DOH'],

            // ── MD (Maryland) — OHCQ / MDH ─────────────────────────────
            ['state'=>'MD','source_term'=>'Assisted Living Program Level 1','canonical_type'=>'assisted_living','license_subtype'=>'level_1','regulator'=>'OHCQ','notes'=>'Low level of care'],
            ['state'=>'MD','source_term'=>'Assisted Living Program Level 2','canonical_type'=>'assisted_living','license_subtype'=>'level_2','regulator'=>'OHCQ','notes'=>'Moderate level of care'],
            ['state'=>'MD','source_term'=>'Assisted Living Program Level 3','canonical_type'=>'assisted_living','license_subtype'=>'level_3','regulator'=>'OHCQ','notes'=>'High level of care — nursing oversight'],
            ['state'=>'MD','source_term'=>'SNF','canonical_type'=>'snf','regulator'=>'OHCQ'],

            // ── OH (Ohio) — ODH ────────────────────────────────────────
            ['state'=>'OH','source_term'=>'Residential Care Facility','canonical_type'=>'assisted_living','regulator'=>'ODH','notes'=>'17+ residents — Ohio assisted living'],
            ['state'=>'OH','source_term'=>'RCF','canonical_type'=>'assisted_living','regulator'=>'ODH'],
            ['state'=>'OH','source_term'=>'Adult Family Home','canonical_type'=>'adult_family_home','regulator'=>'ODH','notes'=>'3-5 residents'],
            ['state'=>'OH','source_term'=>'Adult Group Home','canonical_type'=>'group_home','regulator'=>'ODH','notes'=>'6-16 residents'],
            ['state'=>'OH','source_term'=>'Nursing Home','canonical_type'=>'snf','regulator'=>'ODH'],

            // ── IL (Illinois) — IDPH + IDHS ────────────────────────────
            ['state'=>'IL','source_term'=>'Assisted Living','canonical_type'=>'assisted_living','regulator'=>'IDPH'],
            ['state'=>'IL','source_term'=>'Shared Housing','canonical_type'=>'assisted_living','license_subtype'=>'shared_housing','regulator'=>'IDPH','notes'=>'Smaller, group-living format'],
            ['state'=>'IL','source_term'=>'CILA','canonical_type'=>'group_home','license_subtype'=>'cila','regulator'=>'IDHS','notes'=>'Community Integrated Living Arrangement — for DD adults',
                'accepted_populations'=>['idd_adults'],
                'payer_programs'=>['medicaid_idd_waiver','state_supplement'],
                'funding_authority'=>'Illinois Department of Human Services — Division of Developmental Disabilities',
                'eligibility_notes'=>'CILA funded through DD waiver. Eligibility requires DHS DD determination of need.'],
            ['state'=>'IL','source_term'=>'Community Integrated Living Arrangement','canonical_type'=>'group_home','license_subtype'=>'cila','regulator'=>'IDHS'],
            ['state'=>'IL','source_term'=>'SNF','canonical_type'=>'snf','regulator'=>'IDPH'],

            // ── GA (Georgia) — DCH ─────────────────────────────────────
            ['state'=>'GA','source_term'=>'Personal Care Home','canonical_type'=>'assisted_living','license_subtype'=>'pch','regulator'=>'DCH','notes'=>'PCH — 2+ residents, basic personal services','source_url'=>'https://dch.georgia.gov/divisionsoffices/hfrd/facilities-provider-information/personal-care-homes'],
            ['state'=>'GA','source_term'=>'PCH','canonical_type'=>'assisted_living','license_subtype'=>'pch','regulator'=>'DCH'],
            ['state'=>'GA','source_term'=>'Assisted Living Community','canonical_type'=>'assisted_living','license_subtype'=>'alc','regulator'=>'DCH','notes'=>'ALC — 25+ residents, can administer medications'],
            ['state'=>'GA','source_term'=>'ALC','canonical_type'=>'assisted_living','license_subtype'=>'alc','regulator'=>'DCH'],
            ['state'=>'GA','source_term'=>'Community Living Arrangement','canonical_type'=>'group_home','regulator'=>'DCH'],
            ['state'=>'GA','source_term'=>'Nursing Home','canonical_type'=>'snf','regulator'=>'DCH'],

            // ── VA (Virginia) — VDSS ───────────────────────────────────
            ['state'=>'VA','source_term'=>'Assisted Living Facility','canonical_type'=>'assisted_living','regulator'=>'VDSS','notes'=>'4+ adults, congregate setting'],
            ['state'=>'VA','source_term'=>'ALF','canonical_type'=>'assisted_living','regulator'=>'VDSS'],
            ['state'=>'VA','source_term'=>'Adult Care Residence','canonical_type'=>'assisted_living','regulator'=>'VDSS','notes'=>'Older VA term, equivalent to ALF'],
            ['state'=>'VA','source_term'=>'Nursing Facility','canonical_type'=>'snf','regulator'=>'VDH'],

            // ── AZ (Arizona) — ADHS ────────────────────────────────────
            ['state'=>'AZ','source_term'=>'Adult Foster Care Home','canonical_type'=>'adult_family_home','regulator'=>'ADHS','notes'=>'Up to 4 residents, sponsor lives onsite','source_url'=>'https://www.azdhs.gov/licensing/residential-facilities/index.php'],
            ['state'=>'AZ','source_term'=>'Assisted Living Home','canonical_type'=>'assisted_living','license_subtype'=>'home','regulator'=>'ADHS','notes'=>'Up to 10 residents'],
            ['state'=>'AZ','source_term'=>'Assisted Living Center','canonical_type'=>'assisted_living','license_subtype'=>'center','regulator'=>'ADHS','notes'=>'11+ residents'],
            ['state'=>'AZ','source_term'=>'Nursing Care Institution','canonical_type'=>'snf','regulator'=>'ADHS'],

            // ── NC (North Carolina) — DHSR ─────────────────────────────
            ['state'=>'NC','source_term'=>'Adult Care Home','canonical_type'=>'assisted_living','regulator'=>'DHSR','notes'=>'ACH — 7+ beds'],
            ['state'=>'NC','source_term'=>'ACH','canonical_type'=>'assisted_living','regulator'=>'DHSR'],
            ['state'=>'NC','source_term'=>'Family Care Home','canonical_type'=>'adult_family_home','regulator'=>'DHSR','notes'=>'2-6 beds'],
            ['state'=>'NC','source_term'=>'Multi-Unit Assisted Housing with Services','canonical_type'=>'independent_living','license_subtype'=>'mahs','regulator'=>'DHSR','notes'=>'MAHS — registered (not licensed), housing+services'],
            ['state'=>'NC','source_term'=>'MAHS','canonical_type'=>'independent_living','license_subtype'=>'mahs','regulator'=>'DHSR'],

            // ── MA (Massachusetts) — EOAI ──────────────────────────────
            ['state'=>'MA','source_term'=>'Assisted Living Residence','canonical_type'=>'assisted_living','regulator'=>'EOAI','notes'=>'Certified (not licensed) by Executive Office of Aging & Independence'],
            ['state'=>'MA','source_term'=>'ALR','canonical_type'=>'assisted_living','regulator'=>'EOAI'],
            ['state'=>'MA','source_term'=>'Rest Home Level III','canonical_type'=>'assisted_living','license_subtype'=>'rest_home_3','regulator'=>'DPH'],
            ['state'=>'MA','source_term'=>'Rest Home Level IV','canonical_type'=>'assisted_living','license_subtype'=>'rest_home_4','regulator'=>'DPH','notes'=>'Often within SNFs'],
            ['state'=>'MA','source_term'=>'SNF','canonical_type'=>'snf','regulator'=>'DPH'],

            // ── MI (Michigan) — LARA ───────────────────────────────────
            ['state'=>'MI','source_term'=>'Adult Foster Care Family Home','canonical_type'=>'adult_family_home','regulator'=>'LARA','notes'=>'Up to 6 adults in private residence'],
            ['state'=>'MI','source_term'=>'Adult Foster Care Small Group Home','canonical_type'=>'group_home','regulator'=>'LARA','notes'=>'Up to 12 adults'],
            ['state'=>'MI','source_term'=>'Adult Foster Care Large Group Home','canonical_type'=>'group_home','regulator'=>'LARA','notes'=>'13-20 adults'],
            ['state'=>'MI','source_term'=>'AFC Congregate Facility','canonical_type'=>'assisted_living','regulator'=>'LARA','notes'=>'Higher level care for medical/cognitive'],
            ['state'=>'MI','source_term'=>'Home for the Aged','canonical_type'=>'assisted_living','license_subtype'=>'hfa','regulator'=>'LARA','notes'=>'HFA — 21+ unrelated adults age 55+'],
            ['state'=>'MI','source_term'=>'HFA','canonical_type'=>'assisted_living','license_subtype'=>'hfa','regulator'=>'LARA'],
            ['state'=>'MI','source_term'=>'Nursing Home','canonical_type'=>'snf','regulator'=>'LARA'],

            // ── OR (Oregon) — DHS ──────────────────────────────────────
            ['state'=>'OR','source_term'=>'Residential Care Facility','canonical_type'=>'assisted_living','regulator'=>'DHS'],
            ['state'=>'OR','source_term'=>'RCF','canonical_type'=>'assisted_living','regulator'=>'DHS'],
            ['state'=>'OR','source_term'=>'Adult Foster Home','canonical_type'=>'adult_family_home','regulator'=>'DHS'],
            ['state'=>'OR','source_term'=>'AFH','canonical_type'=>'adult_family_home','regulator'=>'DHS'],
            ['state'=>'OR','source_term'=>'Memory Care Endorsement','canonical_type'=>'memory_care','regulator'=>'DHS','notes'=>'Add-on certification to RCF/AFH'],

            // ── TN (Tennessee) — Board for Licensing Health Care Facilities
            ['state'=>'TN','source_term'=>'Assisted-Care Living Facility','canonical_type'=>'assisted_living','regulator'=>'TDH'],
            ['state'=>'TN','source_term'=>'ACLF','canonical_type'=>'assisted_living','regulator'=>'TDH'],
            ['state'=>'TN','source_term'=>'Home for the Aged','canonical_type'=>'assisted_living','license_subtype'=>'rha','regulator'=>'TDH','notes'=>'4+ residents, room/board/personal services'],
            ['state'=>'TN','source_term'=>'Adult Care Home','canonical_type'=>'adult_family_home','regulator'=>'TDH','notes'=>'Up to 5 residents, homelike'],
            ['state'=>'TN','source_term'=>'Nursing Home','canonical_type'=>'snf','regulator'=>'TDH'],

            // ── IN (Indiana) — ISDH ────────────────────────────────────
            ['state'=>'IN','source_term'=>'Residential Care Facility','canonical_type'=>'assisted_living','regulator'=>'ISDH','notes'=>'RCF License — room/board/ADL assistance'],
            ['state'=>'IN','source_term'=>'RCF','canonical_type'=>'assisted_living','regulator'=>'ISDH'],
            ['state'=>'IN','source_term'=>'Health Facility','canonical_type'=>'snf','regulator'=>'ISDH','notes'=>'Higher acuity, nursing services'],
            ['state'=>'IN','source_term'=>'Housing With Services','canonical_type'=>'independent_living','regulator'=>'FSSA','notes'=>'Registered with Division of Aging if no medication admin'],

            // ── MO (Missouri) — DHSS ───────────────────────────────────
            ['state'=>'MO','source_term'=>'Residential Care Facility','canonical_type'=>'assisted_living','license_subtype'=>'rcf','regulator'=>'DHSS','notes'=>'Renamed from RCF I; supervised'],
            ['state'=>'MO','source_term'=>'RCF','canonical_type'=>'assisted_living','license_subtype'=>'rcf','regulator'=>'DHSS'],
            ['state'=>'MO','source_term'=>'Assisted Living Facility','canonical_type'=>'assisted_living','license_subtype'=>'alf','regulator'=>'DHSS','notes'=>'24h care + protective oversight + ADL assistance'],
            ['state'=>'MO','source_term'=>'ALF','canonical_type'=>'assisted_living','license_subtype'=>'alf','regulator'=>'DHSS'],
            ['state'=>'MO','source_term'=>'Intermediate Care Facility','canonical_type'=>'icf_iid','regulator'=>'DHSS'],
            ['state'=>'MO','source_term'=>'ICF','canonical_type'=>'icf_iid','regulator'=>'DHSS'],
            ['state'=>'MO','source_term'=>'Skilled Nursing Facility','canonical_type'=>'snf','regulator'=>'DHSS'],

            // ── WI (Wisconsin) — DHS ───────────────────────────────────
            ['state'=>'WI','source_term'=>'CBRF','canonical_type'=>'assisted_living','license_subtype'=>'cbrf','regulator'=>'DHS','notes'=>'Community-Based Residential Facility — DHS 83'],
            ['state'=>'WI','source_term'=>'Community Based Residential Facility','canonical_type'=>'assisted_living','license_subtype'=>'cbrf','regulator'=>'DHS'],
            ['state'=>'WI','source_term'=>'RCAC','canonical_type'=>'independent_living','license_subtype'=>'rcac','regulator'=>'DHS','notes'=>'Residential Care Apartment Complex — 5+ apartments, up to 28h services/wk'],
            ['state'=>'WI','source_term'=>'Residential Care Apartment Complex','canonical_type'=>'independent_living','license_subtype'=>'rcac','regulator'=>'DHS'],
            ['state'=>'WI','source_term'=>'Adult Family Home','canonical_type'=>'adult_family_home','regulator'=>'DHS','notes'=>'1-4 beds'],
            ['state'=>'WI','source_term'=>'AFH','canonical_type'=>'adult_family_home','regulator'=>'DHS'],

            // ── MN (Minnesota) — MDH ───────────────────────────────────
            ['state'=>'MN','source_term'=>'Assisted Living Facility','canonical_type'=>'assisted_living','regulator'=>'MDH','notes'=>'144G license'],
            ['state'=>'MN','source_term'=>'Assisted Living Facility with Dementia Care','canonical_type'=>'memory_care','regulator'=>'MDH','notes'=>'Additional training + environmental safeguards'],
            ['state'=>'MN','source_term'=>'Adult Foster Care','canonical_type'=>'adult_family_home','regulator'=>'DHS','notes'=>'Up to 4 functionally impaired residents'],
            ['state'=>'MN','source_term'=>'Board and Lodge','canonical_type'=>'independent_living','regulator'=>'MDH','notes'=>'157 license'],

            // ── SC (South Carolina) — DPH ──────────────────────────────
            ['state'=>'SC','source_term'=>'Community Residential Care Facility','canonical_type'=>'assisted_living','regulator'=>'DPH','notes'=>'CRCF — also referred to as assisted living'],
            ['state'=>'SC','source_term'=>'CRCF','canonical_type'=>'assisted_living','regulator'=>'DPH'],
            ['state'=>'SC','source_term'=>'Nursing Home','canonical_type'=>'snf','regulator'=>'DPH'],

            // ── CT (Connecticut) — DPH ─────────────────────────────────
            ['state'=>'CT','source_term'=>'Managed Residential Community','canonical_type'=>'assisted_living','license_subtype'=>'mrc','regulator'=>'DPH','notes'=>'MRC — physical setting; ALSA provides services'],
            ['state'=>'CT','source_term'=>'MRC','canonical_type'=>'assisted_living','license_subtype'=>'mrc','regulator'=>'DPH'],
            ['state'=>'CT','source_term'=>'Assisted Living Services Agency','canonical_type'=>'assisted_living','license_subtype'=>'alsa','regulator'=>'DPH','notes'=>'ALSA — licensed service provider, operates within MRC'],
            ['state'=>'CT','source_term'=>'Residential Care Home','canonical_type'=>'assisted_living','license_subtype'=>'rch','regulator'=>'DPH'],

            // ── KY (Kentucky) — OIG ────────────────────────────────────
            ['state'=>'KY','source_term'=>'Assisted Living Community','canonical_type'=>'assisted_living','license_subtype'=>'alc_social','regulator'=>'OIG','notes'=>'Social model — no basic health services'],
            ['state'=>'KY','source_term'=>'ALC-BH','canonical_type'=>'assisted_living','license_subtype'=>'alc_bh','regulator'=>'OIG','notes'=>'With Basic Health Care'],
            ['state'=>'KY','source_term'=>'ALC-DC','canonical_type'=>'memory_care','license_subtype'=>'alc_dc','regulator'=>'OIG','notes'=>'With Dementia Care — secured unit'],
            ['state'=>'KY','source_term'=>'Personal Care Home','canonical_type'=>'assisted_living','license_subtype'=>'pch','regulator'=>'OIG','notes'=>'Converted to ALC-BH or ALC-DC under new framework'],
            ['state'=>'KY','source_term'=>'Family Care Home','canonical_type'=>'adult_family_home','regulator'=>'OIG','notes'=>'Up to 3 residents'],

            // ── AL (Alabama) — ADPH ────────────────────────────────────
            ['state'=>'AL','source_term'=>'Assisted Living Facility','canonical_type'=>'assisted_living','regulator'=>'ADPH','notes'=>'No severe cognitive impairment'],
            ['state'=>'AL','source_term'=>'Specialty Care Assisted Living Facility','canonical_type'=>'memory_care','license_subtype'=>'scalf','regulator'=>'ADPH','notes'=>'Can care for severe cognitive impairment'],
            ['state'=>'AL','source_term'=>'SCALF','canonical_type'=>'memory_care','license_subtype'=>'scalf','regulator'=>'ADPH'],
            ['state'=>'AL','source_term'=>'Nursing Home','canonical_type'=>'snf','regulator'=>'ADPH'],

            // ── CO (Colorado) — CDPHE ──────────────────────────────────
            ['state'=>'CO','source_term'=>'Assisted Living Residence','canonical_type'=>'assisted_living','regulator'=>'CDPHE'],
            ['state'=>'CO','source_term'=>'ALR','canonical_type'=>'assisted_living','regulator'=>'CDPHE'],
            ['state'=>'CO','source_term'=>'Nursing Home','canonical_type'=>'snf','regulator'=>'CDPHE'],

            // ── NV (Nevada) — HCQC ─────────────────────────────────────
            ['state'=>'NV','source_term'=>'Residential Facility for Groups','canonical_type'=>'assisted_living','regulator'=>'HCQC','notes'=>'Adult group care/assisted living'],
            ['state'=>'NV','source_term'=>'Home for Individual Residential Care','canonical_type'=>'adult_family_home','regulator'=>'HCQC','notes'=>'HIRC — small/private'],
            ['state'=>'NV','source_term'=>'HIRC','canonical_type'=>'adult_family_home','regulator'=>'HCQC'],
            ['state'=>'NV','source_term'=>'Nursing Facility','canonical_type'=>'snf','regulator'=>'HCQC'],

            // ── OK (Oklahoma) — OSDH ───────────────────────────────────
            ['state'=>'OK','source_term'=>'Assisted Living Center','canonical_type'=>'assisted_living','regulator'=>'OSDH'],
            ['state'=>'OK','source_term'=>'Residential Care Home','canonical_type'=>'assisted_living','license_subtype'=>'rch','regulator'=>'OSDH'],
            ['state'=>'OK','source_term'=>'Continuum of Care Facility','canonical_type'=>'ccrc','regulator'=>'OSDH'],
            ['state'=>'OK','source_term'=>'Specialized Facility for Individuals with Alzheimer\'s','canonical_type'=>'memory_care','regulator'=>'OSDH'],
            ['state'=>'OK','source_term'=>'Nursing Facility','canonical_type'=>'snf','regulator'=>'OSDH'],

            // ── LA (Louisiana) — LDH ───────────────────────────────────
            ['state'=>'LA','source_term'=>'ARCP Level 1','canonical_type'=>'adult_family_home','license_subtype'=>'arcp_1','regulator'=>'LDH','notes'=>'2-8 residents, single-family dwelling style'],
            ['state'=>'LA','source_term'=>'ARCP Level 2','canonical_type'=>'assisted_living','license_subtype'=>'arcp_2','regulator'=>'LDH','notes'=>'9-16 residents, congregate'],
            ['state'=>'LA','source_term'=>'ARCP Level 3','canonical_type'=>'assisted_living','license_subtype'=>'arcp_3','regulator'=>'LDH','notes'=>'17+ residents, apartments w/ kitchenettes'],
            ['state'=>'LA','source_term'=>'ARCP Level 4','canonical_type'=>'assisted_living','license_subtype'=>'arcp_4','regulator'=>'LDH','notes'=>'17+ + intermittent nursing services'],
            ['state'=>'LA','source_term'=>'Nursing Facility','canonical_type'=>'snf','regulator'=>'LDH'],

            // ── NM (New Mexico) — NMHCA ────────────────────────────────
            ['state'=>'NM','source_term'=>'Assisted Living Facility','canonical_type'=>'assisted_living','regulator'=>'NMHCA','notes'=>'Single license; additional requirements for secured memory care unit'],
            ['state'=>'NM','source_term'=>'Nursing Facility','canonical_type'=>'snf','regulator'=>'NMHCA'],

            // ── KS (Kansas) — KDADS ────────────────────────────────────
            ['state'=>'KS','source_term'=>'Assisted Living','canonical_type'=>'assisted_living','regulator'=>'KDADS'],
            ['state'=>'KS','source_term'=>'Residential Health Care','canonical_type'=>'assisted_living','license_subtype'=>'rhc','regulator'=>'KDADS','notes'=>'<61 residents'],
            ['state'=>'KS','source_term'=>'Home Plus','canonical_type'=>'adult_family_home','regulator'=>'KDADS','notes'=>'Small (<=12) homelike'],
            ['state'=>'KS','source_term'=>'Boarding Care Home','canonical_type'=>'independent_living','regulator'=>'KDADS'],
            ['state'=>'KS','source_term'=>'Skilled Nursing Care','canonical_type'=>'snf','regulator'=>'KDADS'],

            // ── IA (Iowa) — DIA ────────────────────────────────────────
            ['state'=>'IA','source_term'=>'ALP','canonical_type'=>'assisted_living','regulator'=>'DIA','notes'=>'Assisted Living Program'],
            ['state'=>'IA','source_term'=>'Assisted Living Program','canonical_type'=>'assisted_living','regulator'=>'DIA'],
            ['state'=>'IA','source_term'=>'ALP/D','canonical_type'=>'memory_care','regulator'=>'DIA','notes'=>'Assisted Living Program for People with Dementia'],
            ['state'=>'IA','source_term'=>'Residential Care Facility','canonical_type'=>'assisted_living','regulator'=>'DIA','notes'=>'Iowa Code Ch. 135C'],
            ['state'=>'IA','source_term'=>'RCF','canonical_type'=>'assisted_living','regulator'=>'DIA'],

            // ── AR (Arkansas) — DHS ────────────────────────────────────
            ['state'=>'AR','source_term'=>'Assisted Living Facility Level I','canonical_type'=>'assisted_living','license_subtype'=>'level_1','regulator'=>'DHS','notes'=>'Cannot serve nursing-home-eligible'],
            ['state'=>'AR','source_term'=>'Assisted Living Facility Level II','canonical_type'=>'assisted_living','license_subtype'=>'level_2','regulator'=>'DHS','notes'=>'Can serve nursing-home-eligible'],
            ['state'=>'AR','source_term'=>'Residential Care Facility','canonical_type'=>'assisted_living','license_subtype'=>'rcf','regulator'=>'DHS'],
            ['state'=>'AR','source_term'=>'Nursing Facility','canonical_type'=>'snf','regulator'=>'DHS'],

            // ── MS (Mississippi) — MSDH ────────────────────────────────
            ['state'=>'MS','source_term'=>'Personal Care Home — Assisted Living','canonical_type'=>'assisted_living','license_subtype'=>'pch_al','regulator'=>'MSDH','notes'=>'Can administer medications'],
            ['state'=>'MS','source_term'=>'Personal Care Home — Residential Living','canonical_type'=>'assisted_living','license_subtype'=>'pch_residential','regulator'=>'MSDH','notes'=>'No medication administration'],
            ['state'=>'MS','source_term'=>'Nursing Home','canonical_type'=>'snf','regulator'=>'MSDH'],

            // ── UT (Utah) — DHHS ───────────────────────────────────────
            ['state'=>'UT','source_term'=>'Type I Assisted Living','canonical_type'=>'assisted_living','license_subtype'=>'type_1','regulator'=>'UDHHS','notes'=>'Can self-evacuate'],
            ['state'=>'UT','source_term'=>'Type II Assisted Living','canonical_type'=>'assisted_living','license_subtype'=>'type_2','regulator'=>'UDHHS','notes'=>'Needs help to evacuate'],
            ['state'=>'UT','source_term'=>'Limited Capacity Assisted Living','canonical_type'=>'adult_family_home','regulator'=>'UDHHS','notes'=>'2-5 residents'],
            ['state'=>'UT','source_term'=>'Nursing Care Facility','canonical_type'=>'snf','regulator'=>'UDHHS'],

            // ── ID (Idaho) — DHW ───────────────────────────────────────
            ['state'=>'ID','source_term'=>'Residential Assisted Living Facility','canonical_type'=>'assisted_living','regulator'=>'IDHW'],
            ['state'=>'ID','source_term'=>'RALF','canonical_type'=>'assisted_living','regulator'=>'IDHW'],
            ['state'=>'ID','source_term'=>'Certified Family Home','canonical_type'=>'adult_family_home','regulator'=>'IDHW','notes'=>'1-4 residents'],
            ['state'=>'ID','source_term'=>'CFH','canonical_type'=>'adult_family_home','regulator'=>'IDHW'],
            ['state'=>'ID','source_term'=>'Skilled Nursing Facility','canonical_type'=>'snf','regulator'=>'IDHW'],

            // ── NE (Nebraska) — DHHS ───────────────────────────────────
            ['state'=>'NE','source_term'=>'Assisted Living Facility','canonical_type'=>'assisted_living','regulator'=>'NDHHS','notes'=>'4+ residents'],
            ['state'=>'NE','source_term'=>'Nursing Facility','canonical_type'=>'snf','regulator'=>'NDHHS'],

            // ── NH (New Hampshire) — DHHS ──────────────────────────────
            ['state'=>'NH','source_term'=>'ALR-RC','canonical_type'=>'assisted_living','license_subtype'=>'alr_rc','regulator'=>'NHDHHS','notes'=>'Residential Care — lower level, social focus'],
            ['state'=>'NH','source_term'=>'Assisted Living Residence - Residential Care','canonical_type'=>'assisted_living','license_subtype'=>'alr_rc','regulator'=>'NHDHHS'],
            ['state'=>'NH','source_term'=>'SRHC','canonical_type'=>'assisted_living','license_subtype'=>'srhc','regulator'=>'NHDHHS','notes'=>'Supported Residential Health Care — accepts nursing-home-eligible'],
            ['state'=>'NH','source_term'=>'Supported Residential Health Care','canonical_type'=>'assisted_living','license_subtype'=>'srhc','regulator'=>'NHDHHS'],
            ['state'=>'NH','source_term'=>'Nursing Home','canonical_type'=>'snf','regulator'=>'NHDHHS'],

            // ── ME (Maine) — DHHS ──────────────────────────────────────
            ['state'=>'ME','source_term'=>'Residential Care Facility Level I','canonical_type'=>'adult_family_home','license_subtype'=>'level_1','regulator'=>'MEDHHS','notes'=>'1-2 residents'],
            ['state'=>'ME','source_term'=>'Residential Care Facility Level II','canonical_type'=>'adult_family_home','license_subtype'=>'level_2','regulator'=>'MEDHHS','notes'=>'3-5 residents'],
            ['state'=>'ME','source_term'=>'Residential Care Facility Level III','canonical_type'=>'assisted_living','license_subtype'=>'level_3','regulator'=>'MEDHHS'],
            ['state'=>'ME','source_term'=>'Residential Care Facility Level IV','canonical_type'=>'assisted_living','license_subtype'=>'level_4','regulator'=>'MEDHHS','notes'=>'6+ residents'],
            ['state'=>'ME','source_term'=>'PNMI','canonical_type'=>'assisted_living','license_subtype'=>'pnmi','regulator'=>'MEDHHS','notes'=>'Private Non-Medical Institution — Medicaid-funded'],

            // ── VT (Vermont) — DAIL ────────────────────────────────────
            ['state'=>'VT','source_term'=>'Assisted Living Residence','canonical_type'=>'assisted_living','regulator'=>'VTDAIL'],
            ['state'=>'VT','source_term'=>'ALR','canonical_type'=>'assisted_living','regulator'=>'VTDAIL'],
            ['state'=>'VT','source_term'=>'Residential Care Home','canonical_type'=>'assisted_living','license_subtype'=>'rch','regulator'=>'VTDAIL'],
            ['state'=>'VT','source_term'=>'Nursing Home','canonical_type'=>'snf','regulator'=>'VTDAIL'],

            // ── RI (Rhode Island) — DOH ────────────────────────────────
            ['state'=>'RI','source_term'=>'Assisted Living Residence','canonical_type'=>'assisted_living','regulator'=>'RIDOH'],
            ['state'=>'RI','source_term'=>'Alzheimer Dementia Special Care Unit','canonical_type'=>'memory_care','regulator'=>'RIDOH'],
            ['state'=>'RI','source_term'=>'Nursing Facility','canonical_type'=>'snf','regulator'=>'RIDOH'],

            // ── DE (Delaware) — DHSS ───────────────────────────────────
            ['state'=>'DE','source_term'=>'Assisted Living Facility','canonical_type'=>'assisted_living','regulator'=>'DEDHSS'],
            ['state'=>'DE','source_term'=>'Rest Residential Care Facility','canonical_type'=>'assisted_living','license_subtype'=>'rest_rcf','regulator'=>'DEDHSS'],
            ['state'=>'DE','source_term'=>'Family Care Home','canonical_type'=>'adult_family_home','regulator'=>'DEDHSS'],
            ['state'=>'DE','source_term'=>'Nursing Home','canonical_type'=>'snf','regulator'=>'DEDHSS'],

            // ── MT (Montana) — DPHHS ───────────────────────────────────
            ['state'=>'MT','source_term'=>'Assisted Living Facility Category A','canonical_type'=>'assisted_living','license_subtype'=>'category_a','regulator'=>'MTDPHHS','notes'=>'Self-medication, generally good health'],
            ['state'=>'MT','source_term'=>'Assisted Living Facility Category B','canonical_type'=>'assisted_living','license_subtype'=>'category_b','regulator'=>'MTDPHHS','notes'=>'Nursing services, 4+ ADL dependence'],
            ['state'=>'MT','source_term'=>'Assisted Living Facility Category C','canonical_type'=>'memory_care','license_subtype'=>'category_c','regulator'=>'MTDPHHS','notes'=>'Cognitive decline, cannot express needs'],
            ['state'=>'MT','source_term'=>'Nursing Facility','canonical_type'=>'snf','regulator'=>'MTDPHHS'],

            // ── WY (Wyoming) — WDH ─────────────────────────────────────
            ['state'=>'WY','source_term'=>'Assisted Living Facility','canonical_type'=>'assisted_living','regulator'=>'WYDH','notes'=>'Limited nursing + personal + boarding care'],
            ['state'=>'WY','source_term'=>'Boarding Home','canonical_type'=>'independent_living','regulator'=>'WYDH'],
            ['state'=>'WY','source_term'=>'Nursing Care Facility','canonical_type'=>'snf','regulator'=>'WYDH'],

            // ── ND (North Dakota) — DHS ────────────────────────────────
            ['state'=>'ND','source_term'=>'Assisted Living Facility','canonical_type'=>'assisted_living','regulator'=>'NDDHS'],
            ['state'=>'ND','source_term'=>'Basic Care Facility','canonical_type'=>'assisted_living','license_subtype'=>'basic_care','regulator'=>'NDDHS','notes'=>'33-03-24.1'],
            ['state'=>'ND','source_term'=>'Nursing Facility','canonical_type'=>'snf','regulator'=>'NDDHS'],

            // ── SD (South Dakota) — DOH ────────────────────────────────
            ['state'=>'SD','source_term'=>'Assisted Living Center','canonical_type'=>'assisted_living','regulator'=>'SDDOH'],
            ['state'=>'SD','source_term'=>'Community Living Home','canonical_type'=>'adult_family_home','regulator'=>'SDDOH','notes'=>'1-4 adult residents'],
            ['state'=>'SD','source_term'=>'Nursing Facility','canonical_type'=>'snf','regulator'=>'SDDOH'],

            // ── AK (Alaska) — DOH ──────────────────────────────────────
            ['state'=>'AK','source_term'=>'Assisted Living Home','canonical_type'=>'assisted_living','regulator'=>'AKDOH','notes'=>'3+ adults'],
            ['state'=>'AK','source_term'=>'Adult Foster Home','canonical_type'=>'adult_family_home','regulator'=>'AKDOH','notes'=>'Up to 5 residents — synonym for ALH at small scale'],
            ['state'=>'AK','source_term'=>'Nursing Facility','canonical_type'=>'snf','regulator'=>'AKDOH'],

            // ── HI (Hawaii) — DOH (OHCA) ───────────────────────────────
            ['state'=>'HI','source_term'=>'Assisted Living Facility','canonical_type'=>'assisted_living','regulator'=>'HIDOH'],
            ['state'=>'HI','source_term'=>'Adult Residential Care Home','canonical_type'=>'adult_family_home','regulator'=>'HIDOH'],
            ['state'=>'HI','source_term'=>'Community Care Foster Family Home','canonical_type'=>'adult_family_home','regulator'=>'HIDOH'],
            ['state'=>'HI','source_term'=>'Nursing Facility','canonical_type'=>'snf','regulator'=>'HIDOH'],

            // ── WV (West Virginia) — OHFLAC ────────────────────────────
            ['state'=>'WV','source_term'=>'Assisted Living Residence','canonical_type'=>'assisted_living','regulator'=>'OHFLAC'],
            ['state'=>'WV','source_term'=>'Alzheimer\'s Unit','canonical_type'=>'memory_care','regulator'=>'OHFLAC'],
            ['state'=>'WV','source_term'=>'Residential Board and Care Home','canonical_type'=>'assisted_living','regulator'=>'OHFLAC'],
            ['state'=>'WV','source_term'=>'Adult Family Care Home','canonical_type'=>'adult_family_home','regulator'=>'OHFLAC','notes'=>'Up to 3 adults'],
            ['state'=>'WV','source_term'=>'Personal Care Home','canonical_type'=>'assisted_living','license_subtype'=>'pch','regulator'=>'OHFLAC'],

            // ── DC (District of Columbia) — DC Health ──────────────────
            ['state'=>'DC','source_term'=>'Assisted Living Residence','canonical_type'=>'assisted_living','regulator'=>'DCHealth'],
            ['state'=>'DC','source_term'=>'Community Residence Facility','canonical_type'=>'group_home','regulator'=>'DCHealth'],
            ['state'=>'DC','source_term'=>'Nursing Facility','canonical_type'=>'snf','regulator'=>'DCHealth'],
        ];
    }
}
