<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Master data tables — Phase 2.1 (first three types).
 *
 * Pattern: SuperAdmin maintains master rows. On facility provisioning,
 * master rows are copied into the same table with facility_id set and
 * source='master' (a snapshot). Facilities may add their own with
 * source='custom'.
 *
 * `states` is master-only (no facility_id) — US states + DC + territories
 * are not tenant-scoped, they're universal reference data.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('states', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 2)->unique(); // AZ, CA, NY, etc.
            $table->string('name');
            $table->string('ombudsman_phone')->nullable();
            $table->string('ombudsman_email')->nullable();
            $table->string('regulator_name')->nullable();
            $table->string('regulator_url')->nullable();
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('payers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('facility_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('source')->default('master'); // master | custom
            $table->string('name');
            $table->string('type'); // medicare_a | medicare_b | medicare_advantage | medicaid | ltc_insurance | private_pay | va | other
            $table->string('code')->nullable();
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['facility_id', 'source']);
            $table->index('type');
        });

        Schema::create('levels_of_care', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('facility_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('source')->default('master');
            $table->string('code'); // independent | assisted | skilled | memory | hospice
            $table->string('name');
            $table->text('description')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['facility_id', 'code']);
            $table->index(['facility_id', 'source']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('levels_of_care');
        Schema::dropIfExists('payers');
        Schema::dropIfExists('states');
    }
};
