<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // CMS F-tags — federal nursing-home survey deficiency codes.
        // Master-only (like states): identical for every facility, not
        // tenant-scoped, so no facility_id / source columns.
        Schema::create('cms_f_tags', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 10)->unique(); // F600, F812, etc.
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('category')->nullable(); // resident_rights, quality_of_life, environment, etc.
            $table->string('severity_max', 2)->nullable(); // A-L scope/severity grid letter
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Credential templates — RN, LPN, CNA, MA, etc. Facility-scoped so
        // a facility can add a state-specific or specialty credential
        // (e.g. "Dementia Care Specialist") on top of the master set.
        Schema::create('credential_templates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('facility_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('source')->default('master');
            $table->string('code'); // RN, LPN, CNA, MA, NP, PA, etc.
            $table->string('name');
            $table->text('description')->nullable();
            $table->unsignedInteger('renewal_months')->default(24);
            $table->boolean('requires_state_license')->default(true);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['facility_id', 'code']);
            $table->index(['facility_id', 'source']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('credential_templates');
        Schema::dropIfExists('cms_f_tags');
    }
};
