<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The placement-commission half of the monetization model.
 *
 * advisor_profiles — extends users with the business + license + bank
 * data we need to actually pay them via Stripe Connect.
 *
 * placements — one row per successful move-in we facilitated. Drives
 * retention-based payouts (commission split happens here, not on
 * admissions). Source of truth for revenue + 1099 generation.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('advisor_profiles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            // users.id is bigint — FKs back into it must be foreignId.
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('agency_name', 191)->nullable();
            $table->string('agency_slug', 191)->nullable()->unique();
            $table->string('agency_website')->nullable();
            $table->text('bio')->nullable();
            $table->string('phone', 30)->nullable();
            // Service area + state licensure: some states require referral
            // agencies to be licensed (CA, MA, others). Store the license
            // numbers per state we're licensed in.
            $table->json('licensed_states')->nullable(); // e.g. {"CA":"RCFE-123","MA":"AL-9876"}
            $table->json('service_area_zips')->nullable();
            // Stripe Connect — what we use to pay them. Express account
            // by default; status moves through Stripe's onboarding states.
            $table->string('stripe_account_id')->nullable()->unique();
            $table->string('stripe_account_status', 30)->default('not_connected');
            // Compensation transparency — surfaced on advisor profile.
            // The "vetted advisor network" promise depends on this being
            // disclosed and accurate.
            $table->unsignedTinyInteger('commission_split_advisor_pct')->default(82);
            $table->unsignedTinyInteger('commission_split_platform_pct')->default(18);
            $table->boolean('charges_families')->default(false);
            $table->unsignedInteger('family_consultation_fee_cents')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('is_accepting_referrals')->default(true);
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();

            $table->index(['is_active', 'is_accepting_referrals']);
        });

        Schema::create('placements', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('facility_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('admission_id')->constrained()->cascadeOnDelete();
            // Advisor is nullable: direct facility placements (no advisor)
            // still get recorded so we can charge the facility a smaller
            // direct-placement fee.
            $table->foreignId('advisor_user_id')->nullable()->constrained('users');
            $table->foreignUuid('resident_id')->nullable()->constrained();

            // Money. All amounts in cents. Gross is what the facility owes;
            // platform_fee + advisor_payout sum to gross.
            $table->unsignedInteger('gross_fee_cents');
            $table->unsignedInteger('platform_fee_cents');
            $table->unsignedInteger('advisor_payout_cents')->default(0);
            $table->unsignedTinyInteger('platform_split_pct'); // snapshot of split at admit time
            $table->string('currency', 3)->default('USD');

            // Status + retention milestones. Industry-standard placement
            // fees are split: e.g. 70% at admission (after rescission),
            // 30% at 90-day stay. Track each milestone so we can release
            // payouts progressively.
            $table->string('status', 30)->default('pending'); // pending | confirmed | rescinded | retained_30d | retained_90d | paid_in_full | disputed
            $table->date('admitted_on')->nullable();
            $table->date('rescission_window_ends_on')->nullable();
            $table->date('retention_30d_milestone_on')->nullable();
            $table->date('retention_90d_milestone_on')->nullable();
            $table->date('confirmed_on')->nullable();
            $table->date('rescinded_on')->nullable();

            // Payout state. Mirror of what Stripe Connect tells us.
            $table->string('stripe_transfer_id')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->unsignedInteger('amount_paid_cents')->default(0);

            // Attribution — how did we know to credit this advisor / source?
            $table->string('attribution_source', 60)->nullable(); // marketplace | advisor_link | hospital_widget | direct
            $table->json('attribution_context')->nullable();

            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['status', 'admitted_on']);
            $table->index(['advisor_user_id', 'status']);
            $table->index(['facility_id', 'admitted_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('placements');
        Schema::dropIfExists('advisor_profiles');
    }
};
