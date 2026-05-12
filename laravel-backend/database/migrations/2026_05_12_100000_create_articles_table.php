<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('articles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('slug')->unique();
            $table->string('title');
            $table->string('subtitle')->nullable();
            $table->string('hero_image_url', 500)->nullable();
            $table->string('category'); // care_basics | medicare | medicaid | va | dementia | transition | financial | legal
            $table->json('tags')->nullable();
            $table->text('summary');
            $table->longText('body'); // Markdown / HTML
            $table->string('author_name')->default('CarePath Editorial');
            $table->string('author_title')->nullable();
            $table->unsignedInteger('reading_time_minutes')->default(5);
            $table->boolean('is_featured')->default(false);
            $table->boolean('is_published')->default(true);
            $table->timestamp('published_at')->nullable();
            $table->timestamps();

            $table->index(['is_published', 'published_at']);
            $table->index('category');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('articles');
    }
};
