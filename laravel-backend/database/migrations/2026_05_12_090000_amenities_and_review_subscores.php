<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('facility_amenities', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('facility_id')->constrained()->cascadeOnDelete();
            $table->string('category'); // healthcare | dining | room | community | activities | services
            $table->string('name');
            $table->text('detail')->nullable();
            $table->boolean('is_featured')->default(false);
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['facility_id', 'category']);
        });

        // Sub-score ratings on every review so the marketplace can show a
        // multi-dimension breakdown (a la APFM's Cleanliness / Friendliness
        // / Care / Staff / Meals / Activities / Value tiles).
        Schema::table('facility_reviews', function (Blueprint $table) {
            $table->unsignedTinyInteger('rating_cleanliness')->nullable()->after('rating');
            $table->unsignedTinyInteger('rating_friendliness')->nullable()->after('rating_cleanliness');
            $table->unsignedTinyInteger('rating_care')->nullable()->after('rating_friendliness');
            $table->unsignedTinyInteger('rating_staff')->nullable()->after('rating_care');
            $table->unsignedTinyInteger('rating_meals')->nullable()->after('rating_staff');
            $table->unsignedTinyInteger('rating_activities')->nullable()->after('rating_meals');
            $table->unsignedTinyInteger('rating_value')->nullable()->after('rating_activities');
        });
    }

    public function down(): void
    {
        Schema::table('facility_reviews', function (Blueprint $table) {
            $table->dropColumn([
                'rating_cleanliness',
                'rating_friendliness',
                'rating_care',
                'rating_staff',
                'rating_meals',
                'rating_activities',
                'rating_value',
            ]);
        });
        Schema::dropIfExists('facility_amenities');
    }
};
