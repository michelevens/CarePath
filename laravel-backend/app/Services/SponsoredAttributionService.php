<?php

namespace App\Services;

use App\Models\Admission;
use App\Models\Lead;
use Illuminate\Support\Facades\DB;

/**
 * Attributes leads + admissions to the sponsored click that drove
 * them. The 30-day attribution window matches typical senior-care
 * tour-to-decision lead times. Same-session matching is the strongest
 * signal; we fall back to same-facility-recent-click when session
 * mismatches (e.g. user cleared cookies between click and submit).
 *
 * The attributed_value_cents on the click drives the ROAS column on
 * the facility analytics page.
 */
class SponsoredAttributionService
{
    public const ATTRIBUTION_WINDOW_DAYS = 30;

    /**
     * Estimated value of a single tour request (rough industry
     * benchmark — actual placement fees are 50-100% of first month).
     * Surfaces as the "value" of tour-request conversions for ROAS;
     * actual admission conversions use the real placement fee.
     */
    public const ESTIMATED_TOUR_VALUE_CENTS = 50_000; // $500 — conservative

    /**
     * Find and stamp the sponsored click that drove this lead. Idempotent.
     */
    public function attributeLead(Lead $lead): ?int
    {
        if ($lead->sponsored_click_id || ! $lead->facility_id) {
            return $lead->sponsored_click_id;
        }

        // Prefer same-session click within the window.
        $sessionId = $this->extractSessionFromContext($lead);
        $cutoff = now()->subDays(self::ATTRIBUTION_WINDOW_DAYS);

        $query = DB::table('sponsored_clicks')
            ->where('facility_id', $lead->facility_id)
            ->where('clicked_at', '>=', $cutoff);

        $click = $sessionId
            ? (clone $query)->where('session_id', $sessionId)->orderByDesc('clicked_at')->first()
            : null;

        if (! $click) {
            // Fallback: any click for this facility in the window from
            // any session — weaker signal, but better than nothing.
            $click = $query->orderByDesc('clicked_at')->first();
        }

        if (! $click) return null;

        $lead->sponsored_click_id = $click->id;
        $lead->save();

        DB::table('sponsored_clicks')
            ->where('id', $click->id)
            ->whereNull('converted_at')  // first conversion wins
            ->update([
                'converted_at' => now(),
                'converted_to' => 'tour_request',
                'attributed_value_cents' => self::ESTIMATED_TOUR_VALUE_CENTS,
            ]);

        return $click->id;
    }

    /**
     * Stamp + escalate conversion when an admission is created. Three
     * matching strategies, in order:
     *   1. Same session id (from X-Carepath-Session-Id header) +
     *      same facility, within the 30-day window
     *   2. Same facility, any session, within the window — weaker but
     *      still useful when cookies were cleared
     *   3. Walk back through the originating lead's click_id
     */
    public function attributeAdmission(
        Admission $admission,
        ?string $sessionId = null,
        ?int $placementFeeCents = null,
    ): ?int {
        if ($admission->sponsored_click_id) {
            return $admission->sponsored_click_id;
        }

        $cutoff = now()->subDays(self::ATTRIBUTION_WINDOW_DAYS);
        $query = DB::table('sponsored_clicks')
            ->where('facility_id', $admission->facility_id)
            ->where('clicked_at', '>=', $cutoff);

        $click = $sessionId
            ? (clone $query)->where('session_id', $sessionId)->orderByDesc('clicked_at')->first()
            : null;

        if (! $click) {
            // Try same facility, any session.
            $click = $query->orderByDesc('clicked_at')->first();
        }

        if (! $click) {
            // Last resort: walk back through the originating lead.
            $lead = Lead::query()
                ->where('facility_id', $admission->facility_id)
                ->where('email', strtolower((string) $admission->inquirer_email))
                ->whereNotNull('sponsored_click_id')
                ->orderByDesc('created_at')
                ->first();
            if (! $lead) return null;
            $click = DB::table('sponsored_clicks')->find($lead->sponsored_click_id);
            if (! $click) return null;
        }

        $admission->sponsored_click_id = $click->id;
        $admission->save();

        // Admission is a stronger conversion than tour_request — always
        // upgrade the type + use placement fee if supplied.
        DB::table('sponsored_clicks')
            ->where('id', $click->id)
            ->update([
                'converted_at' => $click->converted_at ?? now(),
                'converted_to' => 'admission',
                'attributed_value_cents' => $placementFeeCents
                    ?? self::ESTIMATED_TOUR_VALUE_CENTS * 10,
            ]);

        return $click->id;
    }

    /**
     * Lead context JSON sometimes carries the session id; otherwise
     * the lead has no session correlation and we fall back to facility
     * + window matching.
     */
    private function extractSessionFromContext(Lead $lead): ?string
    {
        $ctx = $lead->context ?? [];
        return $ctx['session_id'] ?? null;
    }
}
