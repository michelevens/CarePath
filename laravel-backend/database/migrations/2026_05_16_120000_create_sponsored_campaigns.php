<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Sponsored listings — facilities can pay to boost their own listing
 * to the top of matching search results. CPC for v1 (charged only
 * when the badge is clicked into the detail page). FTC requires
 * "Sponsored" disclosure on every shown impression.
 *
 * Pacing: daily_budget_cents caps spend per UTC day; when today's
 * spend would exceed it, the campaign is muted until tomorrow.
 *
 * Targeting in v1 = whatever the facility is (same state/city/type as
 * the search filters). No bidding for OTHER facilities' geos — a
 * facility can only boost its own slot.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sponsored_campaigns', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('facility_id')->constrained()->cascadeOnDelete();
            $table->string('name', 120)->nullable();          // optional facility-facing name
            $table->string('status', 20)->default('draft');   // draft | active | paused | depleted | ended
            $table->unsignedInteger('daily_budget_cents');    // hard pacing cap per UTC day
            $table->unsignedInteger('total_budget_cents')->nullable(); // optional lifetime cap
            $table->unsignedInteger('cpc_bid_cents');         // what we charge per click
            $table->date('starts_on');
            $table->date('ends_on')->nullable();
            // Targeting refinements layered on top of facility-self-match.
            // null = use the facility's intrinsic location.
            $table->json('target_states')->nullable();
            $table->json('target_cities')->nullable();
            // Rolling spend cache; updated by recordClick(). Reset by a
            // nightly job at UTC midnight.
            $table->unsignedInteger('spent_today_cents')->default(0);
            $table->unsignedInteger('spent_total_cents')->default(0);
            $table->timestamp('last_spend_reset_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'starts_on', 'ends_on']);
            $table->index(['facility_id', 'status']);
        });

        // High-volume table — keep it narrow. Aggregations roll up
        // via the analytics tooling, not via JOINs at read-time.
        Schema::create('sponsored_impressions', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->foreignUuid('campaign_id')->constrained('sponsored_campaigns')->cascadeOnDelete();
            $table->foreignUuid('facility_id')->constrained()->cascadeOnDelete();
            $table->string('session_id', 60)->nullable();        // anonymous browser session
            $table->json('search_context')->nullable();          // what the search filters were
            $table->boolean('was_clicked')->default(false);
            $table->timestamp('shown_at')->useCurrent();

            $table->index(['campaign_id', 'shown_at']);
            $table->index('session_id');
        });

        Schema::create('sponsored_clicks', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->foreignUuid('campaign_id')->constrained('sponsored_campaigns')->cascadeOnDelete();
            $table->foreignUuid('facility_id')->constrained()->cascadeOnDelete();
            $table->string('session_id', 60)->nullable();
            $table->unsignedInteger('billed_cents');            // snapshot of cpc_bid_cents at click time
            $table->string('ip_address', 45)->nullable();       // for spam-click defense
            $table->string('user_agent', 500)->nullable();
            $table->timestamp('clicked_at')->useCurrent();

            $table->index(['campaign_id', 'clicked_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sponsored_clicks');
        Schema::dropIfExists('sponsored_impressions');
        Schema::dropIfExists('sponsored_campaigns');
    }
};
