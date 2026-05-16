<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Foundation tables for the SaaS-subscription side of the monetization
 * model. Covers Facility Pro, Advisor Solo/Team/Agency, and Family Pro
 * tiers. Stripe is the source of truth for billing state; these tables
 * mirror what we need locally for gating, reporting, and audit.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Canonical catalog of plans we sell. Seeded from
        // SubscriptionPlansSeeder; updated only by SuperAdmin.
        Schema::create('subscription_plans', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('slug', 60)->unique();
            $table->string('name', 120);
            $table->string('audience', 20);          // facility | advisor | family
            $table->string('tier', 30);              // free | pro | team | agency | network | enterprise
            $table->unsignedInteger('monthly_cents');
            $table->unsignedInteger('annual_cents')->nullable();
            $table->unsignedSmallInteger('included_seats')->default(1);
            $table->unsignedInteger('placement_cap_per_year')->nullable(); // null = unlimited
            $table->string('stripe_price_id_monthly')->nullable();
            $table->string('stripe_price_id_annual')->nullable();
            $table->json('features')->nullable();   // freeform feature flags for gating
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['audience', 'tier']);
        });

        // Polymorphic — a subscription belongs to either a Facility,
        // a User (advisor or family Pro), or a network (future). We
        // store the morph so gating can be uniform across tenant types.
        Schema::create('subscriptions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuidMorphs('subscriber');         // subscriber_type + subscriber_id
            $table->foreignUuid('subscription_plan_id')->constrained();
            $table->string('stripe_subscription_id')->nullable()->unique();
            $table->string('stripe_customer_id')->nullable();
            $table->string('status', 30);             // trialing | active | past_due | canceled | incomplete | unpaid
            $table->string('billing_cycle', 20)->default('monthly'); // monthly | annual
            $table->timestamp('trial_ends_at')->nullable();
            $table->timestamp('current_period_started_at')->nullable();
            $table->timestamp('current_period_ends_at')->nullable();
            $table->timestamp('canceled_at')->nullable();
            $table->timestamp('ended_at')->nullable();
            $table->json('metadata')->nullable();    // promo codes, custom enterprise terms, etc.
            $table->timestamps();

            $table->index(['status', 'current_period_ends_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscriptions');
        Schema::dropIfExists('subscription_plans');
    }
};
