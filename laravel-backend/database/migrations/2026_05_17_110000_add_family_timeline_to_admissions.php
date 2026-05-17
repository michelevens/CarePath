<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Family-visible placement timeline.
 *
 * `family_events` is an append-only JSON array of milestones the family
 * is allowed to see ("Inquiry sent", "Tour scheduled for May 18", "Move-
 * in on May 28"). Distinct from the AuditLog (which has every field
 * change including internal notes) — this is the curated family view.
 *
 * Each event has shape:
 *   { key, label, occurred_at (ISO8601), note?, stage? }
 *
 * Stored as JSON on the admission row because the read pattern is
 * always "show me this placement's timeline" — a single-row read, no
 * cross-table aggregation needed. Append happens via
 * Admission::recordFamilyEvent so writers never touch the column
 * directly.
 *
 * Backfill: synthesize a single "Inquiry sent" event for every existing
 * admission so the timeline isn't empty on first load.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('admissions', function (Blueprint $table) {
            $table->json('family_events')->nullable()->after('notes');
        });

        // Backfill existing admissions with a single synthesized
        // "Inquiry sent" event at created_at so the timeline isn't
        // empty for placements that already exist.
        $rows = DB::table('admissions')->select('id', 'created_at')->get();
        foreach ($rows as $row) {
            $events = [[
                'key' => 'inquiry_sent',
                'label' => 'Inquiry sent',
                'occurred_at' => (string) $row->created_at,
                'stage' => 'inquiry',
            ]];
            DB::table('admissions')
                ->where('id', $row->id)
                ->update(['family_events' => json_encode($events)]);
        }
    }

    public function down(): void
    {
        Schema::table('admissions', function (Blueprint $table) {
            $table->dropColumn('family_events');
        });
    }
};
