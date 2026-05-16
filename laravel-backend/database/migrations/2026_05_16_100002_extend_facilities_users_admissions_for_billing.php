<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Wire existing tenants into the monetization flow.
 *
 * facilities — cache current plan tier for fast gating (a join to
 * subscriptions on every request is too expensive). Plan lives in
 * subscriptions; the cached tier here is the source of truth at
 * read-time and is updated by SubscriptionService on plan changes.
 *
 * users — Stripe customer/connect IDs, so we don't have to query
 * subscriptions to know whether a user has billing set up.
 *
 * admissions — `sourced_by_user_id` lets us attribute placements to
 * the advisor (or hospital case-manager) who sourced the inquiry.
 * Nullable since direct-facility inquiries have no advisor.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('facilities', function (Blueprint $table) {
            $table->string('subscription_tier', 20)->default('free')->after('is_active');
            $table->string('subscription_status', 30)->default('active')->after('subscription_tier');
            $table->string('stripe_customer_id')->nullable()->after('subscription_status');

            $table->index('subscription_tier');
        });

        Schema::table('users', function (Blueprint $table) {
            // Subscriptions (when a user holds a personal sub — Family Pro,
            // Advisor Solo, etc.). Facilities use facilities.stripe_customer_id.
            $table->string('stripe_customer_id')->nullable()->after('remember_token');

            // Connect — set once an advisor (or hospital partner) onboards
            // for payouts. Mirrors advisor_profiles.stripe_account_id when
            // both exist, but kept on users for cross-role payouts too.
            $table->string('stripe_account_id')->nullable()->after('stripe_customer_id');
            $table->string('stripe_account_status', 30)->default('not_connected')->after('stripe_account_id');
        });

        Schema::table('admissions', function (Blueprint $table) {
            $table->foreignUuid('sourced_by_user_id')
                ->nullable()
                ->after('facility_id')
                ->constrained('users');
            $table->string('attribution_source', 60)->nullable()->after('sourced_by_user_id');
            $table->json('attribution_context')->nullable()->after('attribution_source');

            $table->index('sourced_by_user_id');
        });
    }

    public function down(): void
    {
        Schema::table('admissions', function (Blueprint $table) {
            $table->dropForeign(['sourced_by_user_id']);
            $table->dropColumn(['sourced_by_user_id', 'attribution_source', 'attribution_context']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['stripe_customer_id', 'stripe_account_id', 'stripe_account_status']);
        });

        Schema::table('facilities', function (Blueprint $table) {
            $table->dropColumn(['subscription_tier', 'subscription_status', 'stripe_customer_id']);
        });
    }
};
