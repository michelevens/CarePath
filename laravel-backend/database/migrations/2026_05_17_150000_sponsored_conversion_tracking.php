<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Sponsored-listings conversion tracking — turn the existing impression
 * + click telemetry into a real ROAS surface. Without this, facilities
 * see "you got 89 clicks" instead of "you got 89 clicks, 4 tour
 * requests, 1 likely move-in worth ~$N". CTR is a vanity metric on
 * a senior-care marketplace; placements are what pay the bills.
 *
 * Schema:
 *   - leads.sponsored_click_id — soft attribution. When a Lead is
 *     created within 30d of a sponsored click in the same session
 *     for the same facility, MarketplaceController stamps the click.
 *   - admissions.sponsored_click_id — same idea, fired when a Lead
 *     converts to an admission, copying the click linkage forward.
 *   - sponsored_clicks.converted_at + converted_to — record the
 *     conversion timestamp + type on the click itself so the campaign
 *     stats endpoint can roll up without scanning leads/admissions
 *     every request.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->unsignedBigInteger('sponsored_click_id')->nullable()->after('admission_id');
            $table->index('sponsored_click_id');
        });

        Schema::table('admissions', function (Blueprint $table) {
            $table->unsignedBigInteger('sponsored_click_id')->nullable()->after('bed_id');
            $table->index('sponsored_click_id');
        });

        Schema::table('sponsored_clicks', function (Blueprint $table) {
            // Conversion summary recorded on the click for fast roll-up.
            $table->timestamp('converted_at')->nullable()->after('clicked_at');
            $table->string('converted_to', 30)->nullable()->after('converted_at'); // tour_request | admission
            // Snapshot of the value the conversion represents — for
            // tour requests this is "estimated value", for admissions
            // it's the actual placement fee snapshot if available.
            $table->unsignedInteger('attributed_value_cents')->nullable()->after('converted_to');
            $table->index('converted_at');
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->dropIndex(['sponsored_click_id']);
            $table->dropColumn('sponsored_click_id');
        });
        Schema::table('admissions', function (Blueprint $table) {
            $table->dropIndex(['sponsored_click_id']);
            $table->dropColumn('sponsored_click_id');
        });
        Schema::table('sponsored_clicks', function (Blueprint $table) {
            $table->dropIndex(['converted_at']);
            $table->dropColumn(['converted_at', 'converted_to', 'attributed_value_cents']);
        });
    }
};
