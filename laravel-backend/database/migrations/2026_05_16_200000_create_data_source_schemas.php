<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Canonical reference for every data source CarePath ingests
 * facility data from — federal (CMS), per-state (AHCA, CDSS,
 * HHSC, ...), and OSM. Drives:
 *
 *   - The CSV-upload adapter: it picks the right column mapping
 *     based on which source the SuperAdmin selects at upload time.
 *   - The Data Sources tab: shows access tier, update frequency,
 *     ops instructions, last successful run.
 *
 * "Access tier" classifies how easy a source is to ingest:
 *   1 = open data portal with public API (CMS, NY DOH Socrata)
 *   2 = search-only website with per-result CSV export
 *   3 = paid bulk data order (FL AHCA — mail check)
 *   4 = no bulk export; public records request only (FL APD)
 *
 * Update frequency on the state side is mostly quarterly or annual
 * for Tier 3/4 sources — these aren't real-time pipelines, they're
 * "remember to refresh in 90 days" reminders.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('data_source_schemas', function (Blueprint $table) {
            $table->uuid('id')->primary();

            // Stable lookup key — what gets stamped on facility.data_source.
            $table->string('source_key', 60)->unique();
            $table->string('display_name', 191);
            $table->string('state', 2)->nullable();          // null = federal
            $table->string('regulator', 64)->nullable();     // AHCA, CDSS, HHSC, ...

            // Access classification.
            $table->unsignedTinyInteger('access_tier');      // 1..4
            $table->string('update_frequency', 30);          // 'monthly'|'quarterly'|'annual'|'on_request'|'continuous'
            $table->string('cost', 30);                       // 'free'|'paid'|'public_records_request'

            // Programmatic access (Tier 1/2).
            $table->string('api_endpoint', 500)->nullable();
            $table->string('docs_url', 500)->nullable();

            // For sources that are intrinsically single-type — saves
            // the adapter from having to map per-row.
            $table->string('default_canonical_type', 32)->nullable(); // 'snf', 'group_home'
            $table->string('default_license_subtype', 64)->nullable();

            // Column mapping: source's header → our canonical column.
            // e.g. { "Provider Name": "name", "ZIP Code": "zip" }.
            // Used by CsvUploadAdapter when SuperAdmin uploads this
            // source's file.
            $table->json('column_mappings')->nullable();

            // Free-text ops instructions — what a SuperAdmin needs
            // to actually retrieve the data. Shown on the source
            // detail panel.
            $table->text('access_instructions')->nullable();
            $table->string('contact_email', 191)->nullable();
            $table->string('contact_phone', 30)->nullable();

            // Bookkeeping — last successful import + row count.
            $table->timestamp('last_imported_at')->nullable();
            $table->unsignedInteger('last_imported_count')->nullable();

            $table->timestamps();

            $table->index('state');
            $table->index('access_tier');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('data_source_schemas');
    }
};
