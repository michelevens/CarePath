<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Listing-level analytics events — every appearance in search, every
 * detail-page view, and every tour request gets logged here so the
 * facility admin's analytics page can show ROI on their listing.
 *
 * Drives the "Your listing was shown 1,247 times this week, clicked
 * 89×, generated 4 tour requests" surface that justifies Pro tier
 * subscriptions.
 *
 * Append-only, partitioned-by-day in spirit (we index on
 * occurred_at). Distinct from sponsored_impressions/clicks which
 * cover paid placement only.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('facility_listing_events', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->foreignUuid('facility_id')->constrained()->cascadeOnDelete();

            // kind: impression (appeared in search results)
            //       detail_view (someone opened the facility page)
            //       tour_request (lead submitted)
            //       phone_click (clicked the displayed phone number)
            $table->string('kind', 30);

            // Anonymous browser session for de-dup + funnel reasoning.
            $table->string('session_id', 60)->nullable();
            // Auth user id when available (helps dedupe across devices).
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            // Coarse referrer context — search filters, landing-page,
            // city-page slug — so admins can see what's driving traffic.
            $table->string('source', 60)->nullable(); // search | city_page | state_page | direct | sponsored | embed
            $table->json('context')->nullable();

            $table->timestamp('occurred_at')->useCurrent();

            $table->index(['facility_id', 'occurred_at']);
            $table->index(['facility_id', 'kind', 'occurred_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('facility_listing_events');
    }
};
