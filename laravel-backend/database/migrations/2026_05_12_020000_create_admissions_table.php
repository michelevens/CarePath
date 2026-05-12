<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admissions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('facility_id')->constrained()->cascadeOnDelete();

            // Stage in the funnel.
            $table->string('stage')->default('inquiry');
            // inquiry | tour_scheduled | toured | assessment | approved | admitted | declined | withdrew

            // Inquirer (family / referral partner).
            $table->string('inquirer_name');
            $table->string('inquirer_phone')->nullable();
            $table->string('inquirer_email')->nullable();
            $table->string('inquirer_relationship')->nullable(); // adult_child | spouse | poa | self | hospital | other

            // Prospective resident.
            $table->string('prospect_first_name');
            $table->string('prospect_last_name');
            $table->date('prospect_dob')->nullable();
            $table->string('prospect_level_of_care')->nullable(); // assisted | skilled | memory | hospice | independent
            $table->string('prospect_primary_payer')->nullable();

            // Pipeline metadata.
            $table->date('target_admit_date')->nullable();
            $table->foreignId('assigned_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamp('stage_changed_at')->nullable();

            // Link to the resident record once admitted (and to a bed once placed).
            $table->foreignUuid('resident_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignUuid('bed_id')->nullable()->constrained()->nullOnDelete();

            $table->timestamps();

            $table->index(['facility_id', 'stage']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admissions');
    }
};
