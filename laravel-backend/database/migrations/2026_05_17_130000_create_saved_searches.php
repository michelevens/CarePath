<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Persisted saved searches with alert subscription.
 *
 * Existing UX has saved searches in localStorage only; this adds
 * server-side persistence so the daily artisan command can re-run
 * each search and fire push/email alerts when new facilities match
 * (the "when memory care opens in your radius, I'll tell you"
 * promise that beats APFM's clunky version of the same feature).
 *
 * `last_seen_facility_ids` is the change-detection cursor: each
 * alert run diffs the current result set against this list and
 * sends new IDs.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('saved_searches', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            $table->string('name', 120); // family-supplied label
            $table->json('params');      // SearchPage query params

            // Alert subscription — independent toggles per channel
            // so a family can have in-app alerts without email spam.
            $table->boolean('alerts_push')->default(true);
            $table->boolean('alerts_email')->default(false);

            // Change-detection cursor + run history.
            $table->json('last_seen_facility_ids')->nullable();
            $table->timestamp('last_run_at')->nullable();
            $table->timestamp('last_alerted_at')->nullable();
            $table->unsignedInteger('total_alerts_sent')->default(0);

            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            // Prevent duplicate identical-query saves per user.
            $table->index(['user_id'], 'saved_searches_user_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('saved_searches');
    }
};
