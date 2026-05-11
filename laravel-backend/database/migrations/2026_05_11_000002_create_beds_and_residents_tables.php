<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('residents', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('facility_id')->constrained()->cascadeOnDelete();
            $table->string('first_name');
            $table->string('last_name');
            $table->date('date_of_birth')->nullable();
            $table->date('admission_date')->nullable();
            $table->date('discharge_date')->nullable();
            $table->string('level_of_care')->nullable();
            $table->string('primary_payer')->nullable();
            $table->string('mrn')->nullable();
            $table->timestamps();

            $table->index(['facility_id', 'discharge_date']);
        });

        Schema::create('beds', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('facility_id')->constrained()->cascadeOnDelete();
            $table->string('room_number');
            $table->string('bed_label')->nullable();
            $table->string('level_of_care')->nullable();
            $table->string('status')->default('available'); // available | reserved | occupied | offline
            $table->foreignUuid('resident_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();

            $table->unique(['facility_id', 'room_number', 'bed_label']);
            $table->index(['facility_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('beds');
        Schema::dropIfExists('residents');
    }
};
