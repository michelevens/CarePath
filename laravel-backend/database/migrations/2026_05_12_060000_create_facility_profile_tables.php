<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // External photo URLs for now (Cloudflare R2 hookup is Phase 4.2b).
        Schema::create('facility_photos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('facility_id')->constrained()->cascadeOnDelete();
            $table->string('url', 500);
            $table->string('caption')->nullable();
            $table->string('category')->nullable(); // exterior | common_room | dining | suite | outdoor | clinical
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['facility_id', 'sort_order']);
        });

        // Pricing structure — base rate + level-of-care adders + ancillary fees.
        // Transparent pricing is the wedge against APFM's "call for pricing".
        Schema::create('facility_pricing_tiers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('facility_id')->constrained()->cascadeOnDelete();
            $table->string('tier_type'); // base | level_adder | ancillary | community_fee
            $table->string('name'); // "Studio base rate", "Memory care premium", "Medication management"
            $table->string('level_of_care')->nullable(); // independent | assisted | memory | skilled | hospice
            $table->unsignedInteger('amount_cents'); // monthly amount (or one-time for community_fee)
            $table->string('billing_cadence')->default('monthly'); // monthly | one_time | per_visit
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['facility_id', 'tier_type']);
        });

        // Reviews — verified ones are tied to a resident_id (the reviewer
        // actually stayed there). Marketing-only reviews are flagged is_verified=false.
        Schema::create('facility_reviews', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('facility_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('resident_id')->nullable()->constrained()->nullOnDelete();
            $table->string('author_name');
            $table->string('author_relationship')->nullable(); // family | resident | staff | visitor
            $table->unsignedTinyInteger('rating'); // 1-5
            $table->string('title')->nullable();
            $table->text('body');
            $table->boolean('is_verified')->default(false);
            $table->date('stay_started_at')->nullable();
            $table->boolean('is_published')->default(true);
            $table->timestamps();

            $table->index(['facility_id', 'is_published']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('facility_reviews');
        Schema::dropIfExists('facility_pricing_tiers');
        Schema::dropIfExists('facility_photos');
    }
};
