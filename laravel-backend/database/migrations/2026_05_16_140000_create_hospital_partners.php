<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Hospital partners — case managers / discharge planners who embed
 * the CarePath search widget in their EHR or discharge-planning
 * software. Attributed referrals earn the hospital a placement-fee
 * cut (default 12% — lower than advisor split because the hospital
 * does less hand-holding; they introduce, advisors close).
 *
 * Auth model: each hospital_partner row is owned by one User with
 * role=hospital_partner. The widget itself authenticates via the
 * api_key column (UUID); the user logs into the portal via password
 * + 2FA like every other portal user.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hospital_partners', function (Blueprint $table) {
            $table->uuid('id')->primary();
            // users.id is bigint (Laravel default + Sanctum/Spatie use it
            // that way). The monetization tables themselves use uuid
            // primaries, but every FK back into users has to be a bigint
            // foreignId or the constraint won't bind.
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('name', 191);                        // hospital / system name
            $table->string('slug', 191)->unique();
            $table->string('partner_type', 30)->default('hospital'); // hospital | health_system | rehab | snf_discharge | accountable_care
            $table->string('contact_phone', 30)->nullable();
            $table->json('service_area_zips')->nullable();
            $table->json('service_area_states')->nullable();
            // Per-widget public auth token. Only the sha256 hash is
            // persisted — the plaintext is surfaced to the partner
            // exactly once at generation time. api_key_prefix is the
            // first 10 chars of the plaintext (e.g. "wk_a1b2c3d") so
            // ops + the portal UI can identify which key is in use
            // without ever needing the secret.
            $table->string('api_key_hash', 64)->unique();
            $table->string('api_key_prefix', 12);
            $table->timestamp('api_key_rotated_at')->nullable();
            // Connect — same shape as advisor_profiles. We use the
            // partner's stripe_account_id directly for transfers.
            $table->string('stripe_account_id')->nullable()->unique();
            $table->string('stripe_account_status', 30)->default('not_connected');
            $table->unsignedTinyInteger('commission_split_partner_pct')->default(12);
            $table->unsignedTinyInteger('commission_split_platform_pct')->default(88);
            // Lifecycle
            $table->boolean('is_active')->default(true);
            $table->boolean('is_accepting_referrals')->default(true);
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();

            $table->index(['is_active', 'is_accepting_referrals']);
            $table->index('partner_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hospital_partners');
    }
};
