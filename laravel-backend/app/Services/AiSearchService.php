<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Translate a free-text family query into the structured filter shape
 * the SearchPage already understands. The wedge: APFM/Caring/Seniorly
 * route this kind of query ("I need memory care in west Phoenix that
 * takes Medicaid waiver under $7k with private rooms") to a phone
 * advisor. We translate it into filters and run the existing search
 * in one round trip — zero phone calls, full self-serve.
 *
 * Falls back to a deterministic best-effort parser when no API key is
 * configured so the feature stays alive in dev (we extract obvious
 * tokens: state codes, ZIPs, dollar amounts, "medicaid"/"medicare",
 * known care-type words).
 */
class AiSearchService
{
    public const DEFAULT_MODEL = 'claude-haiku-4-5';

    /** @var array<string, string> care type aliases the stub recognizes */
    private const STUB_CARE_KEYWORDS = [
        'memory' => 'memory_care',
        'dementia' => 'memory_care',
        'alzheimer' => 'memory_care',
        'assisted' => 'assisted_living',
        'al ' => 'assisted_living',
        'independent' => 'independent_living',
        'il ' => 'independent_living',
        'skilled nursing' => 'snf',
        'snf' => 'snf',
        'nursing home' => 'snf',
        'rehab' => 'snf',
        'ccrc' => 'ccrc',
        'continuing care' => 'ccrc',
        'group home' => 'group_home',
        'adult family home' => 'adult_family_home',
        'afh' => 'adult_family_home',
    ];

    /**
     * @param  string  $query free text from the user
     * @param  ?array  $context optional {origin_zip, origin_state, current_filters}
     *
     * @return array{filters: array<string, mixed>, explain: string, stubbed: bool}
     */
    public function parse(string $query, ?array $context = null): array
    {
        $query = mb_substr(trim($query), 0, 1000);
        if ($query === '') {
            return ['filters' => [], 'explain' => '', 'stubbed' => false];
        }

        $apiKey = config('services.anthropic.api_key');
        if (! $apiKey) {
            return $this->stubParse($query);
        }

        try {
            $resp = Http::timeout(15)
                ->withHeaders([
                    'x-api-key' => $apiKey,
                    'anthropic-version' => '2023-06-01',
                    'content-type' => 'application/json',
                ])
                ->post('https://api.anthropic.com/v1/messages', [
                    'model' => config('services.anthropic.model', self::DEFAULT_MODEL),
                    'max_tokens' => 400,
                    'system' => $this->systemPrompt(),
                    'messages' => [[
                        'role' => 'user',
                        'content' => $this->userPrompt($query, $context),
                    ]],
                ]);

            if (! $resp->successful()) {
                Log::warning('AiSearch parse failed', ['status' => $resp->status()]);
                return $this->stubParse($query);
            }

            $text = $resp->json('content.0.text', '');
            $parsed = $this->extractJson($text);
            if (! is_array($parsed)) return $this->stubParse($query);

            return [
                'filters' => $this->sanitizeFilters($parsed['filters'] ?? []),
                'explain' => (string) ($parsed['explain'] ?? ''),
                'stubbed' => false,
            ];
        } catch (\Throwable $e) {
            Log::error('AiSearch threw', ['e' => $e->getMessage()]);
            return $this->stubParse($query);
        }
    }

    private function systemPrompt(): string
    {
        return <<<'PROMPT'
You translate plain-English senior-care searches into structured filter
JSON for a marketplace. Output ONLY valid JSON, no prose, no markdown
fences. Schema:

{
  "filters": {
    "care_type": one of [assisted_living, memory_care, snf, ccrc, independent_living, group_home, adult_family_home, icf_iid] or null,
    "state": uppercase 2-letter US state code or null,
    "city": city name or null,
    "zip": 5-digit ZIP or null,
    "radius_miles": integer (default 25 when location is set, else null),
    "max_price_cents": integer dollars * 100 or null,
    "medicaid_only": boolean (true only if the user mentions Medicaid acceptance),
    "min_five_star": integer 1-5 or null (when user says "high rated" set to 4),
    "special_needs": array of strings from [wheelchair, diabetes_management, oxygen, behavioral_dementia, hospice_friendly, private_room, pet_friendly, lgbtq_welcoming],
    "q": free-text fallback term (facility name when user types one) or null
  },
  "explain": one-sentence plain-English restatement of what you understood, e.g. "Looking for memory care in Phoenix, AZ under $7,000/mo that accepts Medicaid."
}

Rules:
- Convert "$7k" / "$7000" / "7 thousand" to max_price_cents 700000.
- Recognize neighborhood names (e.g. "west phoenix" -> city: "Phoenix").
- "Private room" maps to special_needs ["private_room"] not q.
- "Veteran" or "VA" does NOT set medicaid_only.
- If the user only names a facility ("Sunrise Clermont"), populate q and clear care_type.
- Don't invent locations: if no place is mentioned, leave state/city/zip null.
PROMPT;
    }

    private function userPrompt(string $query, ?array $context): string
    {
        $ctx = '';
        if ($context) {
            $bits = [];
            if (! empty($context['origin_zip'])) $bits[] = "User's known ZIP: {$context['origin_zip']}";
            if (! empty($context['origin_state'])) $bits[] = "User's state: {$context['origin_state']}";
            if (! empty($bits)) $ctx = "\n\nContext:\n" . implode("\n", $bits);
        }
        return "Parse this query into filter JSON. Query: \"\"\"{$query}\"\"\"{$ctx}";
    }

    /** Extract the first JSON object from a model response. */
    private function extractJson(string $text): mixed
    {
        $text = trim($text);
        // Strip code fences if the model added them despite instructions.
        $text = preg_replace('/^```(?:json)?\s*|\s*```$/m', '', $text);
        $start = strpos($text, '{');
        $end = strrpos($text, '}');
        if ($start === false || $end === false || $end <= $start) return null;
        $json = substr($text, $start, $end - $start + 1);
        $decoded = json_decode($json, true);
        return is_array($decoded) ? $decoded : null;
    }

    /** Clamp model output to legal values so we never trust it blindly. */
    private function sanitizeFilters(array $f): array
    {
        $careEnum = ['assisted_living', 'memory_care', 'snf', 'ccrc', 'independent_living', 'group_home', 'adult_family_home', 'icf_iid'];
        $needsEnum = ['wheelchair', 'diabetes_management', 'oxygen', 'behavioral_dementia', 'hospice_friendly', 'private_room', 'pet_friendly', 'lgbtq_welcoming'];

        $out = [];
        if (! empty($f['care_type']) && in_array($f['care_type'], $careEnum, true)) {
            $out['care_type'] = $f['care_type'];
        }
        if (! empty($f['state']) && is_string($f['state']) && preg_match('/^[A-Za-z]{2}$/', $f['state'])) {
            $out['state'] = strtoupper($f['state']);
        }
        if (! empty($f['city']) && is_string($f['city'])) {
            $out['city'] = mb_substr(trim($f['city']), 0, 120);
        }
        if (! empty($f['zip']) && preg_match('/^\d{5}$/', (string) $f['zip'])) {
            $out['zip'] = (string) $f['zip'];
        }
        if (! empty($f['radius_miles']) && is_numeric($f['radius_miles'])) {
            $out['radius_miles'] = max(1, min(200, (int) $f['radius_miles']));
        }
        if (! empty($f['max_price_cents']) && is_numeric($f['max_price_cents'])) {
            $out['max_price_cents'] = max(0, (int) $f['max_price_cents']);
        }
        if (isset($f['medicaid_only']) && is_bool($f['medicaid_only'])) {
            $out['medicaid_only'] = $f['medicaid_only'];
        }
        if (! empty($f['min_five_star']) && is_numeric($f['min_five_star'])) {
            $out['min_five_star'] = max(1, min(5, (int) $f['min_five_star']));
        }
        if (! empty($f['special_needs']) && is_array($f['special_needs'])) {
            $out['special_needs'] = array_values(array_intersect($f['special_needs'], $needsEnum));
        }
        if (! empty($f['q']) && is_string($f['q'])) {
            $out['q'] = mb_substr(trim($f['q']), 0, 120);
        }

        return $out;
    }

    /**
     * Deterministic fallback so the UI works without an API key.
     * Catches the obvious tokens — better than nothing.
     */
    private function stubParse(string $query): array
    {
        $q = strtolower($query);
        $f = [];

        // Care type
        foreach (self::STUB_CARE_KEYWORDS as $needle => $type) {
            if (str_contains($q, $needle)) {
                $f['care_type'] = $type;
                break;
            }
        }

        // ZIP
        if (preg_match('/\b(\d{5})\b/', $query, $m)) {
            $f['zip'] = $m[1];
            $f['radius_miles'] = 25;
        }

        // State (two-letter, surrounded by word boundaries, uppercase)
        if (preg_match('/\b([A-Z]{2})\b/', $query, $m) && $m[1] !== 'IL' && $m[1] !== 'AL') {
            // Avoid AL/IL false-matches with assisted living / independent living
            $f['state'] = $m[1];
        }

        // Dollar amount
        if (preg_match('/\$\s*([\d,\.]+)\s*(k|thousand)?/i', $query, $m)) {
            $n = (float) str_replace(',', '', $m[1]);
            if (! empty($m[2])) $n *= 1000;
            $f['max_price_cents'] = (int) round($n * 100);
        }

        // Medicaid
        if (str_contains($q, 'medicaid')) $f['medicaid_only'] = true;

        // Rating
        if (preg_match('/(top|high|best).{0,20}(rated|rating|stars?)/i', $query)) {
            $f['min_five_star'] = 4;
        }

        // Special needs keyword pass
        $needsMap = [
            'private room' => 'private_room',
            'pet' => 'pet_friendly',
            'wheelchair' => 'wheelchair',
            'oxygen' => 'oxygen',
            'lgbtq' => 'lgbtq_welcoming',
            'hospice' => 'hospice_friendly',
            'diabet' => 'diabetes_management',
        ];
        $found = [];
        foreach ($needsMap as $needle => $code) {
            if (str_contains($q, $needle)) $found[] = $code;
        }
        if ($found) $f['special_needs'] = array_values(array_unique($found));

        return [
            'filters' => $f,
            'explain' => 'Parsed locally (no AI key configured) — refine the filters if needed.',
            'stubbed' => true,
        ];
    }
}
