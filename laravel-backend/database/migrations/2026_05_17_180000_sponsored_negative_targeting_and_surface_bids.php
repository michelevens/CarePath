<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Two campaign-level optimizations:
 *
 * 1. NEGATIVE TARGETING — exclude_states + exclude_types. Stops a
 *    Phoenix-only AL facility from paying to show on Tucson SNF
 *    searches just because they didn't tighten target_cities. Small
 *    cost-efficiency wins typically save 5-10% of wasted spend.
 *
 * 2. PER-SURFACE BID MULTIPLIERS — surface_bid_multipliers JSON.
 *    Different surfaces convert at different rates. Embed (hospital
 *    discharge planner) is highest intent and worth bidding more on;
 *    state landing pages are window-shopping and worth less. Lets
 *    facilities tune CPC per surface without managing 4 separate
 *    campaigns.
 *
 * Shape:
 *   {"search": 1.0, "city_page": 0.8, "state_page": 0.6, "embed": 1.4}
 * Missing surface defaults to 1.0 (no adjustment).
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('sponsored_campaigns', function (Blueprint $table) {
            $table->json('exclude_states')->nullable()->after('target_cities');
            $table->json('exclude_types')->nullable()->after('exclude_states');
            $table->json('surface_bid_multipliers')->nullable()->after('cpc_bid_cents');
        });
    }

    public function down(): void
    {
        Schema::table('sponsored_campaigns', function (Blueprint $table) {
            $table->dropColumn(['exclude_states', 'exclude_types', 'surface_bid_multipliers']);
        });
    }
};
