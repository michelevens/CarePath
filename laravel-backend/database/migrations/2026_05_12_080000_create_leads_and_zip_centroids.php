<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Captures soft leads — anyone who interacts with the marketplace
        // (saved a search, ran a cost projection, asked to be notified of
        // openings) without yet committing to a tour. Distinct from
        // Admission (which requires a prospective resident name).
        Schema::create('leads', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('facility_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignUuid('admission_id')->nullable()->constrained()->nullOnDelete();

            $table->string('source'); // cost_projection | saved_search | availability_alert | newsletter | other
            $table->string('email');
            $table->string('phone')->nullable();
            $table->string('name')->nullable();
            $table->string('zip', 10)->nullable();
            $table->string('relationship_to_prospect')->nullable();

            // Snapshot of whatever the lead was about — e.g. for a saved
            // search this would include filters; for cost_projection the
            // inputs + result summary.
            $table->json('context')->nullable();

            // Marketing attribution
            $table->string('utm_source')->nullable();
            $table->string('utm_medium')->nullable();
            $table->string('utm_campaign')->nullable();
            $table->string('referrer', 500)->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();

            $table->string('status')->default('new'); // new | contacted | converted | unsubscribed
            $table->timestamp('contacted_at')->nullable();
            $table->timestamps();

            $table->index(['facility_id', 'status']);
            $table->index(['email']);
        });

        // Static ZIP-code centroids — populated by a separate seeder so the
        // marketplace can compute radius search without an external geocoder.
        Schema::create('zip_centroids', function (Blueprint $table) {
            $table->string('zip', 5)->primary();
            $table->string('city', 80)->nullable();
            $table->string('state', 2)->nullable();
            $table->decimal('latitude', 10, 6);
            $table->decimal('longitude', 10, 6);
            $table->timestamps();

            $table->index(['state']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('zip_centroids');
        Schema::dropIfExists('leads');
    }
};
