<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('medications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('facility_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('resident_id')->constrained()->cascadeOnDelete();

            $table->string('name'); // e.g. Lisinopril 10 mg
            $table->string('dose')->nullable(); // 10 mg, 5 mL, etc.
            $table->string('route')->nullable(); // PO | SL | IM | SC | IV | top | inh | pr
            $table->string('frequency')->nullable(); // BID | TID | QID | QHS | QAM | PRN | weekly
            $table->json('schedule_times')->nullable(); // ["08:00", "20:00"] for BID
            $table->text('indication')->nullable(); // for hypertension, anxiety, etc.
            $table->string('prescriber')->nullable();
            $table->date('start_date')->nullable();
            $table->date('stop_date')->nullable();
            $table->boolean('is_prn')->default(false);
            $table->boolean('is_active')->default(true);
            $table->text('notes')->nullable();

            $table->timestamps();

            $table->index(['resident_id', 'is_active']);
            $table->index(['facility_id']);
        });

        Schema::create('medication_administrations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('facility_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('medication_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('resident_id')->constrained()->cascadeOnDelete();
            $table->foreignId('administered_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('administered_by_name')->nullable(); // snapshot for stability

            $table->timestamp('administered_at');
            $table->string('status'); // given | refused | held | missed
            $table->string('scheduled_time')->nullable(); // "08:00" — which slot this admin event covered
            $table->date('scheduled_date')->nullable(); // the day of the scheduled dose
            $table->text('notes')->nullable();

            $table->timestamps();

            $table->index(['resident_id', 'administered_at']);
            $table->index(['medication_id', 'scheduled_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('medication_administrations');
        Schema::dropIfExists('medications');
    }
};
