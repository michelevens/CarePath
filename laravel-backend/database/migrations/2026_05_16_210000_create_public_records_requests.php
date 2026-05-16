<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tracks Tier-4 public records requests filed against state agencies
 * that don't publish bulk data (FL APD being the canonical example).
 *
 * Each row records: which data source we asked, when we filed, who
 * we contacted, when to follow up. Drives the "needs attention"
 * alerts on the Data Sources tab so the SuperAdmin doesn't forget
 * to chase a stale request or re-file annually.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('public_records_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('source_key', 60);                  // FK soft-ref to data_source_schemas
            $table->string('contact_email', 191);
            $table->string('subject', 191);
            $table->text('body');                              // copy of what we sent
            $table->timestamp('filed_at');
            // Statutes typically give the agency 30 days. We default
            // the follow-up to filed_at + 30d.
            $table->date('follow_up_on');
            $table->timestamp('response_received_at')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('filed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('source_key');
            $table->index(['response_received_at', 'follow_up_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('public_records_requests');
    }
};
