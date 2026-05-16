<?php

namespace Database\Seeders;

use App\Models\DataSourceSchema;
use Illuminate\Database\Seeder;

/**
 * Catalog of facility-data sources CarePath ingests, classified by
 * access tier and pre-loaded with each one's column mappings + ops
 * instructions. Seeded from documented research (Q2 2026).
 *
 * To onboard a new source: add an entry here OR add it via SuperAdmin
 * → Data sources (the table is editable).
 */
class DataSourceSchemasSeeder extends Seeder
{
    public function run(): void
    {
        foreach ($this->sources() as $row) {
            DataSourceSchema::updateOrCreate(
                ['source_key' => $row['source_key']],
                $row,
            );
        }
        $this->command->info('✓ DataSourceSchemasSeeder: ' . count($this->sources()) . ' sources cataloged');
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function sources(): array
    {
        return [
            // ── CMS Provider Information (federal SNF data) ──────────
            // Tier 1: full open API. Already wired via CmsIngestService.
            [
                'source_key' => 'cms_pdc',
                'display_name' => 'CMS Nursing Home Compare — Provider Information',
                'state' => null,
                'regulator' => 'CMS',
                'access_tier' => 1,
                'update_frequency' => 'monthly',
                'cost' => 'free',
                'api_endpoint' => 'https://data.cms.gov/provider-data/api/1/datastore/query/4pq5-n9py/0',
                'docs_url' => 'https://data.cms.gov/provider-data/dataset/4pq5-n9py',
                'default_canonical_type' => 'snf',
                'column_mappings' => [
                    'cms_certification_number_ccn' => 'cms_certification_number',
                    'provider_name' => 'name',
                    'provider_address' => 'address_line_1',
                    'citytown' => 'city',
                    'state' => 'state',
                    'zip_code' => 'zip',
                    'countyparish' => 'county',
                    'latitude' => 'latitude',
                    'longitude' => 'longitude',
                    'telephone_number' => 'phone',
                    'ownership_type' => 'ownership_type',
                    'number_of_certified_beds' => 'total_beds',
                    'average_number_of_residents_per_day' => 'average_residents_per_day',
                    'overall_rating' => 'cms_five_star_overall',
                    'health_inspection_rating' => 'cms_five_star_health_inspection',
                    'staffing_rating' => 'cms_five_star_staffing',
                    'qm_rating' => 'cms_five_star_quality',
                ],
                'access_instructions' => 'Automated. Runs from SuperAdmin → Data sources or via `php artisan cms:ingest --state=XX`. Public API, no auth.',
                'contact_email' => null,
                'contact_phone' => null,
            ],

            // ── OpenStreetMap (long tail for ALF / MC / IL) ──────────
            [
                'source_key' => 'osm_overpass',
                'display_name' => 'OpenStreetMap — Overpass API',
                'state' => null,
                'regulator' => null,
                'access_tier' => 1,
                'update_frequency' => 'continuous',
                'cost' => 'free',
                'api_endpoint' => 'https://overpass-api.de/api/interpreter',
                'docs_url' => 'https://wiki.openstreetmap.org/wiki/Key:social_facility',
                'default_canonical_type' => null,
                'column_mappings' => [
                    'name' => 'name',
                    'addr:street' => 'address_line_1',
                    'addr:city' => 'city',
                    'addr:state' => 'state',
                    'addr:postcode' => 'zip',
                    'phone' => 'phone',
                    'contact:phone' => 'phone',
                    'website' => 'website',
                    'social_facility:for' => 'license_category',
                ],
                'access_instructions' => 'Automated via `php artisan facilities:ingest-osm --state=XX`. Crowdsourced, quality variable. Use as fallback for ALF/MC/IL where state licensure data is hard to get.',
            ],

            // ── Florida AHCA (ALF / NH / AFCH) ───────────────────────
            // Tier 3: paid bulk order, mail check, quarterly.
            [
                'source_key' => 'fl_ahca',
                'display_name' => 'Florida AHCA — FloridaHealthFinder',
                'state' => 'FL',
                'regulator' => 'AHCA',
                'access_tier' => 3,
                'update_frequency' => 'quarterly',
                'cost' => 'paid',
                'api_endpoint' => null,
                'docs_url' => 'https://quality.healthfinder.fl.gov/Researchers/Order-Data/',
                'default_canonical_type' => null,
                'column_mappings' => [
                    // FL AHCA Excel exports use these column headers.
                    'Facility Name' => 'name',
                    'License Number' => 'license_no',
                    'License Type' => 'license_category',
                    'Address' => 'address_line_1',
                    'City' => 'city',
                    'State' => 'state',
                    'Zip' => 'zip',
                    'County' => 'county',
                    'Phone' => 'phone',
                    'Administrator' => 'administrator_name',
                    'Licensed Beds' => 'total_beds',
                ],
                'access_instructions' => "1. Visit https://quality.healthfinder.fl.gov/Researchers/Order-Data/ and download the order form PDF.\n2. Fill out the form for the dataset you need (ALF, NH, AFCH).\n3. Mail with check (NO credit cards) made out to 'Agency for Health Care Administration' to:\n   AHCA Office of Data Dissemination and Transparency\n   2727 Mahan Drive\n   Tallahassee, FL 32308\n4. Wait 2-4 weeks for email delivery of CSV/Excel.\n5. Upload via SuperAdmin → Data sources → Upload.\n\nFree alternative: search + per-result export at https://quality.healthfinder.fl.gov/Facility-Search/FacilityLocateSearch (manual, not bulk).",
                'contact_email' => 'contactus@ahca.myflorida.com',
                'contact_phone' => '(850) 412-3772',
            ],

            // ── Florida APD (Group Home — IDD) ───────────────────────
            // Tier 4: no bulk export, public records request only.
            [
                'source_key' => 'fl_apd',
                'display_name' => 'Florida APD — Group Homes (IDD)',
                'state' => 'FL',
                'regulator' => 'APD',
                'access_tier' => 4,
                'update_frequency' => 'annual',
                'cost' => 'public_records_request',
                'api_endpoint' => null,
                'docs_url' => 'https://resourcedirectory.apd.myflorida.com/',
                'default_canonical_type' => 'group_home',
                'default_license_subtype' => 'apd_idd',
                'column_mappings' => [
                    // APD typically responds to records requests with
                    // an Excel sheet using these headers (verified Q2 2026).
                    'Provider Name' => 'name',
                    'License Number' => 'license_no',
                    'Address' => 'address_line_1',
                    'City' => 'city',
                    'State' => 'state',
                    'Zip Code' => 'zip',
                    'County' => 'county',
                    'Contact Phone' => 'phone',
                    'Geographic Area Served' => 'service_area_notes',
                    'Services' => 'services_offered',
                ],
                'access_instructions' => "No bulk download is published. File a Florida Public Records Request (Statute 119.07):\n\n1. Email PublicRecords@apdcares.org with subject 'Public Records Request — Licensed Group Home Provider List, statewide'.\n2. Request: 'Current list of all APD-licensed group homes in Florida including provider name, license number, address, city, county, ZIP, contact phone, and services offered.'\n3. APD has 30 days to respond (Florida statute).\n4. Upload the resulting Excel/CSV via SuperAdmin → Data sources → Upload, selecting 'fl_apd' as the source.\n5. Set a calendar reminder to re-file annually.",
                'contact_email' => 'PublicRecords@apdcares.org',
                'contact_phone' => '(850) 921-3779',
            ],

            // ── California CDSS / CCLD (RCFE / ARF) ──────────────────
            // Tier 2: search + per-result Excel export.
            [
                'source_key' => 'ca_cdss',
                'display_name' => 'California CDSS — Community Care Licensing',
                'state' => 'CA',
                'regulator' => 'CDSS',
                'access_tier' => 2,
                'update_frequency' => 'quarterly',
                'cost' => 'free',
                'api_endpoint' => null,
                'docs_url' => 'https://cdss.ca.gov/inforesources/cdss-programs/community-care-licensing/ccld-data',
                'default_canonical_type' => null,
                'column_mappings' => [
                    'Facility Number' => 'license_no',
                    'Facility Name' => 'name',
                    'Facility Type' => 'license_category',
                    'Facility Address' => 'address_line_1',
                    'Facility City' => 'city',
                    'Facility State' => 'state',
                    'Facility Zip' => 'zip',
                    'County Name' => 'county',
                    'Facility Telephone Number' => 'phone',
                    'Facility Capacity' => 'total_beds',
                    'Facility Status' => 'license_status',
                ],
                'access_instructions' => "1. Visit https://www.ccld.dss.ca.gov/carefacilitysearch/\n2. Search by 'Residential Care for the Elderly' to pull RCFE list (or 'Adult Residential' for ARF — which we auto-reject).\n3. Click 'Download Data' on the results page → Excel file.\n4. Upload via SuperAdmin → Data sources → Upload with source='ca_cdss'.",
                'contact_email' => 'CCLD@dss.ca.gov',
                'contact_phone' => '(916) 651-8848',
            ],

            // ── Texas HHSC LTC Provider Search ───────────────────────
            // Tier 2: search portal with CSV export from results.
            [
                'source_key' => 'tx_hhsc',
                'display_name' => 'Texas HHSC — Long-Term Care Provider Search',
                'state' => 'TX',
                'regulator' => 'HHSC',
                'access_tier' => 2,
                'update_frequency' => 'quarterly',
                'cost' => 'free',
                'api_endpoint' => null,
                'docs_url' => 'https://apps.hhs.texas.gov/LTCSearch/',
                'default_canonical_type' => null,
                'column_mappings' => [
                    'Provider Name' => 'name',
                    'License Number' => 'license_no',
                    'Provider Type' => 'license_category',
                    'Address' => 'address_line_1',
                    'City' => 'city',
                    'State' => 'state',
                    'Zip' => 'zip',
                    'County' => 'county',
                    'Phone' => 'phone',
                    'Capacity' => 'total_beds',
                ],
                'access_instructions' => "1. Visit https://apps.hhs.texas.gov/LTCSearch/\n2. Choose provider type (Assisted Living, Nursing Facility, ICF/IID).\n3. Use 'Export to Excel' on results page.\n4. Upload via SuperAdmin → Data sources → Upload with source='tx_hhsc'.\n5. Note: search results are capped at 500 per query — paginate by county for full-state pulls.",
                'contact_email' => 'webmaster@hhsc.state.tx.us',
            ],

            // ── New York DOH ACF Profiles ────────────────────────────
            // Tier 1-ish: Socrata-backed via health.data.ny.gov.
            [
                'source_key' => 'ny_doh',
                'display_name' => 'New York DOH — Adult Care Facility Profiles',
                'state' => 'NY',
                'regulator' => 'DOH',
                'access_tier' => 1,
                'update_frequency' => 'monthly',
                'cost' => 'free',
                'api_endpoint' => 'https://health.data.ny.gov/resource/sn5m-dv52.json',
                'docs_url' => 'https://profiles.health.ny.gov/acf/',
                'default_canonical_type' => null,
                'column_mappings' => [
                    'facility_name' => 'name',
                    'operator_certificate_number' => 'license_no',
                    'facility_type_description' => 'license_category',
                    'address_line_1' => 'address_line_1',
                    'city' => 'city',
                    'state' => 'state',
                    'zip_code' => 'zip',
                    'county' => 'county',
                    'phone_number' => 'phone',
                    'total_beds' => 'total_beds',
                ],
                'access_instructions' => 'Socrata-backed REST API on health.data.ny.gov — fully automatable. Adapter pending implementation.',
                'contact_email' => 'opendata@health.ny.gov',
            ],

            // ── Washington DSHS RCS Provider Directory ───────────────
            // Tier 2: search + PDF/Excel download.
            [
                'source_key' => 'wa_dshs',
                'display_name' => 'Washington DSHS — Residential Care Services',
                'state' => 'WA',
                'regulator' => 'DSHS',
                'access_tier' => 2,
                'update_frequency' => 'quarterly',
                'cost' => 'free',
                'api_endpoint' => null,
                'docs_url' => 'https://www.dshs.wa.gov/altsa/residential-care-services',
                'default_canonical_type' => null,
                'column_mappings' => [
                    'Provider Name' => 'name',
                    'License Number' => 'license_no',
                    'License Type' => 'license_category',
                    'Address' => 'address_line_1',
                    'City' => 'city',
                    'State' => 'state',
                    'Zip' => 'zip',
                    'County' => 'county',
                    'Phone' => 'phone',
                    'Capacity' => 'total_beds',
                ],
                'access_instructions' => '1. Visit https://www.dshs.wa.gov/altsa/residential-care-services and download the Provider Directory PDF (or request Excel via webmaster).' . PHP_EOL . '2. Convert PDF tables to CSV (Tabula or similar).' . PHP_EOL . '3. Upload with source=\'wa_dshs\'.',
            ],

            // ── Georgia DCH (PCH + ALC) ──────────────────────────────
            [
                'source_key' => 'ga_dch',
                'display_name' => 'Georgia DCH — Personal Care Homes + Assisted Living Communities',
                'state' => 'GA',
                'regulator' => 'DCH',
                'access_tier' => 2,
                'update_frequency' => 'quarterly',
                'cost' => 'free',
                'api_endpoint' => null,
                'docs_url' => 'https://dch.georgia.gov/divisionsoffices/hfrd/facilities-provider-information/personal-care-homes',
                'default_canonical_type' => null,
                'column_mappings' => [
                    'Facility Name' => 'name',
                    'Permit Number' => 'license_no',
                    'Facility Type' => 'license_category',
                    'Address' => 'address_line_1',
                    'City' => 'city',
                    'State' => 'state',
                    'Zip Code' => 'zip',
                    'County' => 'county',
                    'Phone Number' => 'phone',
                    'Licensed Capacity' => 'total_beds',
                ],
                'access_instructions' => "1. Visit Georgia DCH HFRD facility list; download per-type CSV.\n2. Upload with source='ga_dch'.\n3. PCH and ALC are separate exports — combine before upload OR upload each.",
                'contact_email' => 'hfrd@dch.ga.gov',
            ],

            // ── Pennsylvania DHS OLTL (PCH + ALR) ────────────────────
            [
                'source_key' => 'pa_oltl',
                'display_name' => 'Pennsylvania DHS OLTL — PCH + ALR Provider Lists',
                'state' => 'PA',
                'regulator' => 'OLTL',
                'access_tier' => 2,
                'update_frequency' => 'quarterly',
                'cost' => 'free',
                'api_endpoint' => null,
                'docs_url' => 'https://www.pa.gov/agencies/dhs/resources/licensing/pch-alr-licensing',
                'default_canonical_type' => null,
                'column_mappings' => [
                    'Facility Name' => 'name',
                    'License Number' => 'license_no',
                    'License Type' => 'license_category',
                    'Address' => 'address_line_1',
                    'City' => 'city',
                    'State' => 'state',
                    'Zip Code' => 'zip',
                    'County' => 'county',
                    'Phone' => 'phone',
                    'Beds' => 'total_beds',
                ],
                'access_instructions' => "Quarterly Excel lists published on OLTL's licensing page. Download both PCH and ALR files, upload each with source='pa_oltl'.",
            ],

            // ── Ohio ODH ─────────────────────────────────────────────
            [
                'source_key' => 'oh_odh',
                'display_name' => 'Ohio ODH — Residential Care + Nursing Home Directory',
                'state' => 'OH',
                'regulator' => 'ODH',
                'access_tier' => 2,
                'update_frequency' => 'quarterly',
                'cost' => 'free',
                'docs_url' => 'https://odh.ohio.gov/know-our-programs/residential-care-facilities-assisted-living',
                'column_mappings' => [
                    'Facility Name' => 'name',
                    'License Number' => 'license_no',
                    'Facility Type' => 'license_category',
                    'Address' => 'address_line_1',
                    'City' => 'city',
                    'State' => 'state',
                    'Zip' => 'zip',
                    'County' => 'county',
                    'Phone' => 'phone',
                    'Capacity' => 'total_beds',
                ],
                'access_instructions' => 'Search ODH Bureau of Regulatory Operations site; export each result page.',
            ],

            // ── Illinois IDPH ────────────────────────────────────────
            [
                'source_key' => 'il_idph',
                'display_name' => 'Illinois IDPH — Assisted Living + Shared Housing',
                'state' => 'IL',
                'regulator' => 'IDPH',
                'access_tier' => 2,
                'update_frequency' => 'quarterly',
                'cost' => 'free',
                'docs_url' => 'https://dph.illinois.gov/topics-services/health-care-regulation/assisted-living',
                'column_mappings' => [
                    'Facility Name' => 'name',
                    'License #' => 'license_no',
                    'Type' => 'license_category',
                    'Street Address' => 'address_line_1',
                    'City' => 'city',
                    'State' => 'state',
                    'Zip' => 'zip',
                    'County' => 'county',
                    'Phone' => 'phone',
                ],
                'access_instructions' => "IDPH publishes quarterly facility lists. CILA data (DD adults) is separate, from IDHS — file as separate source 'il_idhs' if needed.",
            ],

            // ── Generic manual upload — for any state we haven't pre-mapped
            [
                'source_key' => 'manual_upload',
                'display_name' => 'Manual upload (generic)',
                'state' => null,
                'regulator' => null,
                'access_tier' => 4,
                'update_frequency' => 'on_request',
                'cost' => 'free',
                'docs_url' => null,
                'column_mappings' => [
                    'name' => 'name',
                    'license_no' => 'license_no',
                    'type' => 'license_category',
                    'address_line_1' => 'address_line_1',
                    'city' => 'city',
                    'state' => 'state',
                    'zip' => 'zip',
                    'county' => 'county',
                    'phone' => 'phone',
                    'total_beds' => 'total_beds',
                    'latitude' => 'latitude',
                    'longitude' => 'longitude',
                ],
                'access_instructions' => 'Use for any state not pre-mapped. CSV must use canonical column names (see above) — or add a new source entry with custom column_mappings before upload.',
            ],
        ];
    }
}
