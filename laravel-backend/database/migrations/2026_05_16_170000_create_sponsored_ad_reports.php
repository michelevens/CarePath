<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * User-submitted reports against sponsored ad slots. Backs the
 * "Report this ad" link on every sponsored facility card. Reports
 * feed the SuperAdmin Sponsored tab so the team can investigate
 * misleading claims, wrong-location targeting, ratings discrepancies,
 * etc.
 *
 * Both anonymous (session-only) and authenticated reports are
 * supported — most reports will come from anonymous family browsers,
 * so requiring login would suppress signal.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sponsored_ad_reports', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('campaign_id')->constrained('sponsored_campaigns')->cascadeOnDelete();
            $table->foreignUuid('facility_id')->constrained()->cascadeOnDelete();
            // Reporter — either the authenticated user, the browser
            // session, or just the IP. The fewer fields populated, the
            // less weight the report carries during triage.
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('session_id', 60)->nullable();
            $table->string('ip_address', 45)->nullable();

            // Why the report. Constrained enum so we can aggregate.
            $table->string('reason', 30); // misleading | wrong_location | low_quality | off_policy | other
            $table->text('notes')->nullable();

            // Triage state. Set by SuperAdmin when working the queue.
            $table->string('status', 20)->default('open'); // open | reviewing | dismissed | actioned
            $table->string('resolution_action', 40)->nullable(); // warning_sent | campaign_paused | campaign_ended | no_action
            $table->text('resolution_notes')->nullable();
            $table->foreignId('resolved_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('resolved_at')->nullable();

            $table->timestamps();

            $table->index(['status', 'created_at']);
            $table->index(['campaign_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sponsored_ad_reports');
    }
};
