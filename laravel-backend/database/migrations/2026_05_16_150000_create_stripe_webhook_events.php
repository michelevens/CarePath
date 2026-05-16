<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Idempotency log for Stripe webhooks. Stripe will retry any non-2xx
 * delivery up to 3 days; without this table a transient timeout
 * downstream of a transfer.created handler would double-increment
 * placements.amount_paid_cents on retry.
 *
 * We INSERT the event id at the top of the handler under a unique
 * constraint; a duplicate insert is caught and the rest of the handler
 * short-circuits to a 200-OK.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stripe_webhook_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('stripe_event_id')->unique();
            $table->string('event_type', 80);
            $table->timestamp('processed_at')->useCurrent();
            $table->index('event_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stripe_webhook_events');
    }
};
