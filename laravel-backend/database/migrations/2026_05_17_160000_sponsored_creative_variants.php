<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Creative variants for sponsored listings — A/B testable custom
 * headline + body per campaign. Without this, every ad uses the
 * facility's own name and a default subtitle; small wording changes
 * typically move CTR 5-10%, which compounds across thousands of
 * impressions.
 *
 * Schema choice: keep the variant rows in a separate table rather
 * than JSON on the campaign so the impression/click tables can FK
 * to a specific variant for clean per-variant CTR rollups.
 *
 * When a campaign has zero variants, the renderer falls back to the
 * facility name + default subtitle (existing behavior — no breaking
 * change). When 1+ active variants exist, the selector picks one per
 * impression (round-robin by hash of session id for even split).
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('sponsored_creatives', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('campaign_id')->constrained('sponsored_campaigns')->cascadeOnDelete();
            $table->string('label', 60)->nullable(); // A / B / "Photo-led" — facility-supplied tag
            $table->string('headline', 160);
            $table->string('body', 400)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['campaign_id', 'is_active']);
        });

        // Per-variant attribution on impressions + clicks for clean
        // per-variant CTR. Nullable to keep historical rows working.
        Schema::table('sponsored_impressions', function (Blueprint $table) {
            $table->foreignUuid('creative_id')->nullable()->after('campaign_id')
                ->constrained('sponsored_creatives')->nullOnDelete();
            $table->index(['creative_id', 'shown_at']);
        });
        Schema::table('sponsored_clicks', function (Blueprint $table) {
            $table->foreignUuid('creative_id')->nullable()->after('campaign_id')
                ->constrained('sponsored_creatives')->nullOnDelete();
            $table->index(['creative_id', 'clicked_at']);
        });
    }

    public function down(): void
    {
        Schema::table('sponsored_clicks', function (Blueprint $table) {
            $table->dropForeign(['creative_id']);
            $table->dropIndex(['creative_id', 'clicked_at']);
            $table->dropColumn('creative_id');
        });
        Schema::table('sponsored_impressions', function (Blueprint $table) {
            $table->dropForeign(['creative_id']);
            $table->dropIndex(['creative_id', 'shown_at']);
            $table->dropColumn('creative_id');
        });
        Schema::dropIfExists('sponsored_creatives');
    }
};
