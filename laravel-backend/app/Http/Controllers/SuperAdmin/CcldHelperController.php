<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Facility;
use Illuminate\Http\JsonResponse;

/**
 * Helper for the California CCLD facility search (RCFE etc.).
 *
 * CCLD is a Tier-2 source — the search portal at ccld.dss.ca.gov is
 * JavaScript-rendered and they intentionally cap per-search results.
 * Rather than scrape (brittle, eventually blocked), we surface a
 * county-by-county worklist for the SuperAdmin: a clickable URL
 * per county that opens a pre-filtered CCLD search, plus per-
 * county tracking of "how many CA facilities did we already
 * ingest from this county" so it's obvious which counties still
 * need attention.
 */
class CcldHelperController extends Controller
{
    /** All 58 CA counties — used to build the worklist. */
    private const CA_COUNTIES = [
        'Alameda', 'Alpine', 'Amador', 'Butte', 'Calaveras', 'Colusa',
        'Contra Costa', 'Del Norte', 'El Dorado', 'Fresno', 'Glenn',
        'Humboldt', 'Imperial', 'Inyo', 'Kern', 'Kings', 'Lake',
        'Lassen', 'Los Angeles', 'Madera', 'Marin', 'Mariposa',
        'Mendocino', 'Merced', 'Modoc', 'Mono', 'Monterey', 'Napa',
        'Nevada', 'Orange', 'Placer', 'Plumas', 'Riverside',
        'Sacramento', 'San Benito', 'San Bernardino', 'San Diego',
        'San Francisco', 'San Joaquin', 'San Luis Obispo', 'San Mateo',
        'Santa Barbara', 'Santa Clara', 'Santa Cruz', 'Shasta', 'Sierra',
        'Siskiyou', 'Solano', 'Sonoma', 'Stanislaus', 'Sutter', 'Tehama',
        'Trinity', 'Tulare', 'Tuolumne', 'Ventura', 'Yolo', 'Yuba',
    ];

    /**
     * GET /api/superadmin/sources/ccld/worklist
     */
    public function worklist(): JsonResponse
    {
        // Count CA facilities currently ingested per county so the
        // SuperAdmin can see progress.
        $countsByCounty = Facility::query()
            ->where('state', 'CA')
            ->where('data_source', 'ca_cdss')
            ->selectRaw('county, count(*) as c')
            ->groupBy('county')
            ->pluck('c', 'county');

        $items = collect(self::CA_COUNTIES)->map(function ($county) use ($countsByCounty) {
            // CCLD's search URL accepts ?County={Name}+County&FacType=RCFE
            // which pre-fills the facility-type + county filter, leaving
            // just the "search" click for the user.
            $countyParam = str_replace(' ', '+', $county);
            return [
                'county' => $county,
                'rcfe_search_url' => "https://www.ccld.dss.ca.gov/carefacilitysearch/Search/AdultCare?County={$countyParam}+County&FacType=RCFE",
                'facility_count_ingested' => (int) ($countsByCounty[$county] ?? 0),
            ];
        });

        return response()->json([
            'data' => $items,
            'summary' => [
                'total_counties' => count(self::CA_COUNTIES),
                'covered' => $items->where('facility_count_ingested', '>', 0)->count(),
                'remaining' => $items->where('facility_count_ingested', 0)->count(),
                'total_ingested' => (int) $countsByCounty->sum(),
            ],
        ]);
    }
}
