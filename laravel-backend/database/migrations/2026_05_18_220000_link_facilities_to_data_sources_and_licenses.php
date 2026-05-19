<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Replace the loose-string joins between facilities, data_source_schemas,
 * and state_license_categories with real foreign keys.
 *
 * Before this migration:
 *   - facilities.data_source was a varchar that "happened to" match
 *     data_source_schemas.source_key
 *   - facilities.license_category / license_subtype were varchars that
 *     "happened to" line up with state_license_categories rows
 *   - state license metadata (accepted_populations, payer_programs,
 *     funding_authority) was snapshot-copied into facilities at ingest
 *     time, so a regulator reclassification left existing facilities
 *     frozen on the old definitions forever
 *
 * After this migration:
 *   - facilities.data_source_id → data_source_schemas.id (FK)
 *   - facilities.state_license_category_id → state_license_categories.id (FK)
 *   - data_source_schemas.default_state_license_category_id → state_license_categories.id (FK)
 *     (so a feed's default categorization lives in one place)
 *
 * The original string columns (data_source, license_category, license_subtype,
 * accepted_populations, payer_programs, funding_authority) stay in place as
 * denormalized accelerators — keeps existing search queries fast, lets us
 * roll back if anything breaks. A future migration can drop them once
 * everything reads through the joins.
 */
return new class extends Migration
{
    public function up(): void
    {
        // 1. Add FK columns. Nullable on facilities + data_source_schemas
        //    because not every row will have a clean match (older imports,
        //    CMS-only facilities, OSM rows for facilities that aren't in
        //    any state catalog).
        Schema::table('facilities', function (Blueprint $table) {
            $table->foreignUuid('data_source_id')
                ->nullable()
                ->after('data_source')
                ->constrained('data_source_schemas')
                ->nullOnDelete();

            $table->foreignUuid('state_license_category_id')
                ->nullable()
                ->after('license_subtype')
                ->constrained('state_license_categories')
                ->nullOnDelete();

            // Index both directions so the new relations are fast.
            $table->index('data_source_id');
            $table->index('state_license_category_id');
        });

        Schema::table('data_source_schemas', function (Blueprint $table) {
            $table->foreignUuid('default_state_license_category_id')
                ->nullable()
                ->after('default_license_subtype')
                ->constrained('state_license_categories')
                ->nullOnDelete();
        });

        // 2. Backfill the FKs from the existing string columns. Best-effort
        //    matching — any row that doesn't match stays NULL, gets flagged
        //    in a follow-up audit.

        // a) facilities.data_source_id ← lookup by source_key
        DB::statement(<<<'SQL'
            UPDATE facilities f
            SET data_source_id = dss.id
            FROM data_source_schemas dss
            WHERE f.data_source IS NOT NULL
              AND f.data_source != ''
              AND dss.source_key = f.data_source
              AND f.data_source_id IS NULL
        SQL);

        // b) facilities.state_license_category_id ← lookup by
        //    (state, canonical_type, license_subtype) tuple
        DB::statement(<<<'SQL'
            UPDATE facilities f
            SET state_license_category_id = slc.id
            FROM state_license_categories slc
            WHERE slc.state = f.state
              AND slc.canonical_type = f.type
              AND COALESCE(slc.license_subtype, '') = COALESCE(f.license_subtype, '')
              AND f.state_license_category_id IS NULL
        SQL);

        // c) data_source_schemas.default_state_license_category_id ← same
        //    tuple, applied to the schema's own state + default type/subtype.
        DB::statement(<<<'SQL'
            UPDATE data_source_schemas dss
            SET default_state_license_category_id = slc.id
            FROM state_license_categories slc
            WHERE slc.state = dss.state
              AND slc.canonical_type = dss.default_canonical_type
              AND COALESCE(slc.license_subtype, '') = COALESCE(dss.default_license_subtype, '')
              AND dss.default_state_license_category_id IS NULL
        SQL);
    }

    public function down(): void
    {
        Schema::table('data_source_schemas', function (Blueprint $table) {
            $table->dropConstrainedForeignId('default_state_license_category_id');
        });

        Schema::table('facilities', function (Blueprint $table) {
            $table->dropIndex(['state_license_category_id']);
            $table->dropIndex(['data_source_id']);
            $table->dropConstrainedForeignId('state_license_category_id');
            $table->dropConstrainedForeignId('data_source_id');
        });
    }
};
