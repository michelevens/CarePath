<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tours', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('facility_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('admission_id')->nullable()->constrained()->nullOnDelete();

            $table->timestamp('starts_at');
            $table->unsignedInteger('duration_minutes')->default(60);

            $table->string('tour_type'); // in_person | virtual | self_guided
            $table->string('meeting_url')->nullable(); // for virtual tours

            $table->string('attendee_name');
            $table->string('attendee_email');
            $table->string('attendee_phone')->nullable();
            $table->string('relationship_to_prospect')->nullable();
            $table->string('prospect_first_name');
            $table->string('prospect_last_name');
            $table->string('prospect_level_of_care')->nullable();

            // Lifecycle
            $table->string('status')->default('confirmed');
            // confirmed | rescheduled | completed | no_show | cancelled

            $table->text('notes')->nullable();
            $table->text('cancellation_reason')->nullable();
            $table->timestamp('reminded_24h_at')->nullable();
            $table->timestamp('reminded_2h_at')->nullable();

            $table->timestamps();

            $table->index(['facility_id', 'starts_at']);
            $table->index(['status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tours');
    }
};
