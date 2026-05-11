<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('facilities', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('type'); // snf | assisted_living | memory_care | ccrc
            $table->string('address_line_1');
            $table->string('address_line_2')->nullable();
            $table->string('city');
            $table->string('state', 2);
            $table->string('zip', 10);
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->string('website')->nullable();
            $table->boolean('medicaid_certified')->default(false);
            $table->boolean('medicare_certified')->default(false);
            $table->unsignedTinyInteger('cms_five_star_overall')->nullable();
            $table->unsignedTinyInteger('cms_five_star_health_inspection')->nullable();
            $table->unsignedTinyInteger('cms_five_star_staffing')->nullable();
            $table->unsignedTinyInteger('cms_five_star_quality')->nullable();
            $table->unsignedInteger('total_beds')->default(0);
            $table->unsignedInteger('price_from_cents')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['state', 'city']);
            $table->index('type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('facilities');
    }
};
