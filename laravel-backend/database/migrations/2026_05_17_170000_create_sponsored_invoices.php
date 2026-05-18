<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Monthly sponsored-ad invoices per facility. Aggregates the
 * billed_cents from sponsored_clicks for a (facility, billing month)
 * pair, generates a PDF, and (optionally) posts a Stripe Invoice
 * for auto-charge.
 *
 * Without this, billed_cents accumulates invisibly — facilities have
 * no record of what they owe or paid. This makes billing legible.
 *
 * One row per (facility, period_start). Idempotent: re-running the
 * bill command for the same month is a no-op when a row already
 * exists with status != 'draft'.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('sponsored_invoices', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('facility_id')->constrained()->cascadeOnDelete();

            $table->date('period_start'); // first day of the billing month
            $table->date('period_end');   // last day of the billing month

            $table->unsignedInteger('total_clicks');
            $table->unsignedInteger('subtotal_cents');
            $table->unsignedInteger('discount_cents')->default(0); // refunded clicks (invalid clicks, fraud)
            $table->unsignedInteger('amount_due_cents'); // subtotal - discount

            // status: draft → sent → paid | failed | void
            $table->string('status', 20)->default('draft');

            // Stripe linkage (optional — present only when configured).
            $table->string('stripe_invoice_id')->nullable()->unique();
            $table->string('stripe_invoice_url', 500)->nullable();

            $table->timestamp('issued_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->text('notes')->nullable();

            // PDF artifact URL (R2 / S3 / local).
            $table->string('pdf_url', 500)->nullable();

            // Per-campaign breakdown snapshot at invoice time.
            $table->json('line_items')->nullable();

            $table->timestamps();

            $table->unique(['facility_id', 'period_start']);
            $table->index(['facility_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sponsored_invoices');
    }
};
