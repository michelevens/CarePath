<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Track per-facility license category + client eligibility data
 * sourced from the state_license_categories reference table at
 * ingest time. These columns let the family-facing UI surface
 * "this is an IDD-only group home funded by APD iBudget" instead
 * of just "Group Home", and let advisors filter on payer programs.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('facilities', function (Blueprint $table) {
            // What the state's licensure file literally called this
            // facility (e.g. "Type B Assisted Living", "RCFE",
            // "Group Home"). Preserved for audit + traceability.
            $table->string('license_category', 191)->nullable()->after('type');
            // Normalized acuity bucket (e.g. 'type_a', 'rcfe', 'ecc',
            // 'apd_idd'). Lets the UI show subtype-specific labels.
            $table->string('license_subtype', 64)->nullable()->after('license_category');
            // Client populations the facility serves.
            $table->json('accepted_populations')->nullable()->after('license_subtype');
            // Payer programs the facility participates in.
            $table->json('payer_programs')->nullable()->after('accepted_populations');
            // Funding authority distinct from regulator (e.g. APD).
            $table->string('funding_authority', 191)->nullable()->after('payer_programs');

            $table->index('license_subtype');
        });
    }

    public function down(): void
    {
        Schema::table('facilities', function (Blueprint $table) {
            $table->dropIndex(['license_subtype']);
            $table->dropColumn([
                'license_category', 'license_subtype',
                'accepted_populations', 'payer_programs', 'funding_authority',
            ]);
        });
    }
};
