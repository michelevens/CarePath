<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Counties as a real entity. Replaces facilities.county (varchar) with
 * a real FK to a counties table so:
 *
 *   - "Show me everything in Miami-Dade" is an indexed lookup, not a
 *     case-sensitive string scan across 21k rows
 *   - County landing pages (/senior-living/{state}/{county}) become
 *     possible without sluggifying free-text
 *   - We can attach denormalized facility_count, popular_facility_count,
 *     etc. for SEO + analytics
 *   - Future FIPS-code enrichment from the Census Bureau dataset has a
 *     real home
 *
 * The counties table seeds itself from existing facility data — every
 * distinct (state, county) tuple gets one row. We don't have FIPS codes
 * yet (Census Bureau download isn't wired); that's a follow-up.
 *
 * facilities.county (string) stays in place as a denormalized
 * accelerator + fallback for the ~21% of facilities without county data.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('counties', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('state', 2);
            $table->string('name', 100);
            $table->string('fips_code', 5)->nullable()->unique();
            $table->unsignedInteger('facility_count')->default(0); // denormalized
            $table->timestamps();

            $table->unique(['state', 'name']);
            $table->index('state');
        });

        Schema::table('facilities', function (Blueprint $table) {
            $table->foreignUuid('county_id')
                ->nullable()
                ->after('county')
                ->constrained('counties')
                ->nullOnDelete();
            $table->index('county_id');
        });

        // Seed counties from existing facility data. Every distinct
        // (state, county) tuple becomes a row.
        DB::statement(<<<'SQL'
            INSERT INTO counties (id, state, name, facility_count, created_at, updated_at)
            SELECT
              gen_random_uuid(),
              state,
              county,
              0,
              NOW(),
              NOW()
            FROM (
              SELECT DISTINCT state, county
              FROM facilities
              WHERE state IS NOT NULL
                AND state != ''
                AND county IS NOT NULL
                AND county != ''
            ) t
            ON CONFLICT (state, name) DO NOTHING
        SQL);

        // Link facilities to their newly-created county rows.
        DB::statement(<<<'SQL'
            UPDATE facilities f
            SET county_id = c.id
            FROM counties c
            WHERE c.state = f.state
              AND c.name = f.county
              AND f.county_id IS NULL
        SQL);

        // Populate the denormalized facility_count.
        DB::statement(<<<'SQL'
            UPDATE counties c
            SET facility_count = (
              SELECT COUNT(*)
              FROM facilities f
              WHERE f.county_id = c.id
                AND f.is_active = true
            )
        SQL);
    }

    public function down(): void
    {
        Schema::table('facilities', function (Blueprint $table) {
            $table->dropIndex(['county_id']);
            $table->dropConstrainedForeignId('county_id');
        });
        Schema::dropIfExists('counties');
    }
};
