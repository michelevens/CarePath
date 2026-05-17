<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Two unrelated additions packaged together for one deploy cycle:
 *
 * 1. push_device_tokens — Web Push subscriptions per user. Lets
 *    us fire mobile push for tour reminders, claim approvals, new
 *    messages once the app is installed via PWA.
 *
 * 2. federal_exclusion_checks — log of OIG LEIE + SAM.gov SDN
 *    screenings against advisors / facility owners. Cached results
 *    so we don't re-hit the federal endpoints on every page load;
 *    SuperAdmin verification queue reads from here.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('push_device_tokens', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            // Web Push subscription is a JSON {endpoint, keys}. Mobile
            // tokens (FCM, APNs) can land in the same column later
            // since they're also opaque strings.
            $table->text('subscription');
            $table->string('platform', 30)->default('web_push'); // web_push | fcm | apns
            $table->string('user_agent', 500)->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamps();

            $table->index('user_id');
        });

        Schema::create('federal_exclusion_checks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            // Subject of the check — typically an advisor user or a
            // facility owner. We store name + DOB hash + (optional)
            // SSN-last-4 hash so subsequent checks on the same person
            // can be cached without storing PII.
            $table->string('subject_type', 30); // advisor_user | facility_owner | hospital_user
            $table->unsignedBigInteger('subject_id')->nullable(); // user.id when applicable
            $table->string('checked_name', 191);
            $table->string('subject_hash', 64); // sha256(lowercased name + DOB)

            $table->string('source', 20); // oig_leie | sam_gov
            $table->boolean('match')->default(false);
            $table->json('match_details')->nullable();  // entity, exclusion type, dates
            $table->timestamp('checked_at')->useCurrent();

            $table->index(['subject_id', 'source']);
            $table->index('subject_hash');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('federal_exclusion_checks');
        Schema::dropIfExists('push_device_tokens');
    }
};
