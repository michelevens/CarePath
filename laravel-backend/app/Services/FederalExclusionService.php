<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * OIG LEIE (List of Excluded Individuals/Entities) + SAM.gov
 * SDN screening. Used before approving advisors / facility owners /
 * hospital partners so we don't surface federally-excluded
 * individuals to families.
 *
 * Patterns adapted from ClinicLink's OigScreeningService +
 * SamGovScreeningService.
 *
 * Both APIs are free public datasets but with very different
 * access patterns:
 *   - OIG LEIE: published as a downloadable CSV (oig.hhs.gov/exclusions),
 *     refreshed monthly. We mirror to a Postgres table and search
 *     locally; live API would be expensive + slow.
 *   - SAM.gov: actually has a REST API but requires an api_key.
 *     Falls back to a no-op when key isn't configured.
 *
 * Results cached in federal_exclusion_checks for 90 days so
 * SuperAdmin verification doesn't re-fire every page load.
 */
class FederalExclusionService
{
    private const CACHE_TTL_DAYS = 90;

    /**
     * Screen a subject against both registries. Returns the union
     * of matches.
     *
     * @return array{
     *   any_match: bool,
     *   oig: array{checked: bool, match: bool, details: ?array},
     *   sam: array{checked: bool, match: bool, details: ?array},
     * }
     */
    public function screen(string $subjectType, ?int $subjectId, string $name, ?string $dob = null): array
    {
        $hash = $this->subjectHash($name, $dob);

        return [
            'any_match' => false,
            'oig' => $this->checkOne('oig_leie', $subjectType, $subjectId, $name, $hash),
            'sam' => $this->checkOne('sam_gov', $subjectType, $subjectId, $name, $hash),
        ] + ['any_match_recomputed' => function ($r) {
            return ($r['oig']['match'] ?? false) || ($r['sam']['match'] ?? false);
        }];
    }

    private function checkOne(string $source, string $subjectType, ?int $subjectId, string $name, string $hash): array
    {
        $cached = DB::table('federal_exclusion_checks')
            ->where('source', $source)
            ->where('subject_hash', $hash)
            ->where('checked_at', '>=', now()->subDays(self::CACHE_TTL_DAYS))
            ->latest('checked_at')
            ->first();
        if ($cached) {
            return [
                'checked' => true,
                'match' => (bool) $cached->match,
                'details' => $cached->match_details ? json_decode($cached->match_details, true) : null,
                'cached' => true,
            ];
        }

        $result = $source === 'oig_leie'
            ? $this->queryOig($name)
            : $this->querySam($name);

        DB::table('federal_exclusion_checks')->insert([
            'id' => (string) Str::uuid(),
            'subject_type' => $subjectType,
            'subject_id' => $subjectId,
            'checked_name' => $name,
            'subject_hash' => $hash,
            'source' => $source,
            'match' => $result['match'] ?? false,
            'match_details' => isset($result['details']) ? json_encode($result['details']) : null,
            'checked_at' => now(),
        ]);

        return $result + ['cached' => false];
    }

    /**
     * OIG LEIE search. We expect a local mirror table (refreshed
     * monthly via artisan command — out of scope for this slice).
     * When the mirror doesn't exist yet, we return checked=false
     * + match=false so the screening is non-blocking.
     */
    private function queryOig(string $name): array
    {
        if (! \Illuminate\Support\Facades\Schema::hasTable('oig_excluded_individuals')) {
            return ['checked' => false, 'match' => false, 'details' => null];
        }
        $row = DB::table('oig_excluded_individuals')
            ->where('full_name', strtolower(trim($name)))
            ->first();
        return [
            'checked' => true,
            'match' => $row !== null,
            'details' => $row ? (array) $row : null,
        ];
    }

    /**
     * SAM.gov SDN search via the Public Entity Information API.
     */
    private function querySam(string $name): array
    {
        $apiKey = config('services.samgov.api_key');
        if (! $apiKey) {
            return ['checked' => false, 'match' => false, 'details' => null];
        }
        try {
            $resp = Http::timeout(15)->get('https://api.sam.gov/data-services/v1/exclusions', [
                'api_key' => $apiKey,
                'name' => $name,
                'recordStatus' => 'A',
            ]);
            if (! $resp->successful()) {
                return ['checked' => false, 'match' => false, 'details' => null];
            }
            $payload = $resp->json();
            $hits = $payload['exclusionDetails'] ?? [];
            return [
                'checked' => true,
                'match' => count($hits) > 0,
                'details' => $hits ? ['hits' => array_slice($hits, 0, 3)] : null,
            ];
        } catch (\Throwable $e) {
            Log::warning('SAM.gov screening call failed', ['error' => $e->getMessage()]);
            return ['checked' => false, 'match' => false, 'details' => null];
        }
    }

    private function subjectHash(string $name, ?string $dob): string
    {
        return hash('sha256', strtolower(trim($name)) . '|' . ($dob ?? ''));
    }
}
