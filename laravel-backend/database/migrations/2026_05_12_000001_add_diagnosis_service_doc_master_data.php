<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ICD-10 diagnosis codes — facility-scoped because facilities may add
        // local variants or rarely-used dx codes their population needs.
        Schema::create('diagnosis_codes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('facility_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('source')->default('master');
            $table->string('code', 12); // ICD-10: M81.0, F03.90, etc.
            $table->string('description');
            $table->string('category')->nullable(); // cardiology, endocrine, neuro_dementia, etc.
            $table->boolean('is_chronic')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['facility_id', 'code']);
            $table->index(['facility_id', 'category']);
        });

        // HCPCS billing codes — what we bill the payer per encounter/visit/day.
        Schema::create('service_codes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('facility_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('source')->default('master');
            $table->string('code', 12); // G0299, T1015, etc.
            $table->string('description');
            $table->string('unit_type')->default('per_visit'); // per_15_min | per_visit | per_day | per_hour
            $table->decimal('default_unit_amount_cents', 12, 2)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['facility_id', 'code']);
            $table->index(['facility_id', 'source']);
        });

        // Operational service types — what staff actually do (separate from
        // what we bill). e.g. "RN assessment", "PT session", "transport".
        Schema::create('service_types', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('facility_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('source')->default('master');
            $table->string('code', 60);
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('requires_credential_code', 60)->nullable(); // links to credential_templates.code
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['facility_id', 'code']);
            $table->index(['facility_id', 'source']);
        });

        // Document presets — admission packet, plan of care, MDS, etc.
        // Templates that get attached to a resident or filed for compliance.
        Schema::create('doc_presets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('facility_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('source')->default('master');
            $table->string('code', 60);
            $table->string('name');
            $table->string('category')->nullable(); // admission, care_planning, regulatory, discharge
            $table->text('description')->nullable();
            $table->boolean('requires_signature')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['facility_id', 'code']);
            $table->index(['facility_id', 'category']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('doc_presets');
        Schema::dropIfExists('service_types');
        Schema::dropIfExists('service_codes');
        Schema::dropIfExists('diagnosis_codes');
    }
};
