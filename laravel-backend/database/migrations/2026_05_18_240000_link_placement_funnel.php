<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Complete the conversion-funnel chain: Lead → Admission → Placement,
 * with an optional Sponsored-Click attribution arrow into each step.
 *
 * Before this migration, Placement only knew its Admission. To trace
 * a placement back to its originating marketing Lead OR Sponsored
 * Click you had to:
 *   - JOIN placements → admissions → leads (via email + facility)
 *   - JOIN placements → admissions → sponsored_clicks
 *
 * Both worked but were slow + opaque, and a Placement-side analytics
 * view (`/admin/sponsored/{id}` ROAS, `/superadmin/placements` mix)
 * had to recompute attribution per query.
 *
 * After this migration:
 *   placements.lead_id           → leads.id           (FK, nullable)
 *   placements.sponsored_click_id → sponsored_clicks.id (FK, nullable)
 *
 * Backfilled in the same migration from the existing data (admission's
 * sponsored_click_id, and a best-effort facility + email match for
 * the lead).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('placements', function (Blueprint $table) {
            $table->foreignUuid('lead_id')
                ->nullable()
                ->after('resident_id')
                ->constrained('leads')
                ->nullOnDelete();

            // sponsored_clicks.id is a bigint (per the
            // 2026_05_17_150000_sponsored_conversion_tracking migration),
            // not a uuid — so we use foreignId, not foreignUuid.
            $table->foreignId('sponsored_click_id')
                ->nullable()
                ->after('lead_id')
                ->constrained('sponsored_clicks')
                ->nullOnDelete();

            $table->index('lead_id');
            $table->index('sponsored_click_id');
        });

        // Backfill #1: placements.sponsored_click_id ← admission's already-
        // attributed click. SponsoredAttributionService writes
        // admissions.sponsored_click_id on every tour request; we just
        // copy that forward into placements.
        DB::statement(<<<'SQL'
            UPDATE placements p
            SET sponsored_click_id = a.sponsored_click_id
            FROM admissions a
            WHERE p.admission_id = a.id
              AND a.sponsored_click_id IS NOT NULL
              AND p.sponsored_click_id IS NULL
        SQL);

        // Backfill #2: placements.lead_id ← a lead with the same facility
        // + the admission's inquirer_email. Best-effort (a lead doesn't
        // always exist for every admission), strict enough to not
        // mis-attribute.
        DB::statement(<<<'SQL'
            UPDATE placements p
            SET lead_id = (
                SELECT l.id
                FROM leads l
                JOIN admissions a ON a.id = p.admission_id
                WHERE l.facility_id = a.facility_id
                  AND lower(l.email) = lower(a.inquirer_email)
                ORDER BY l.created_at DESC
                LIMIT 1
            )
            WHERE p.lead_id IS NULL
        SQL);
    }

    public function down(): void
    {
        Schema::table('placements', function (Blueprint $table) {
            $table->dropIndex(['sponsored_click_id']);
            $table->dropIndex(['lead_id']);
            $table->dropConstrainedForeignId('sponsored_click_id');
            $table->dropConstrainedForeignId('lead_id');
        });
    }
};
