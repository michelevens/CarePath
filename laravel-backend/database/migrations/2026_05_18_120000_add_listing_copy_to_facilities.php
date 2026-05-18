<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('facilities', function (Blueprint $table) {
            // Hero one-liner shown above the photo strip on the detail
            // page and in compact result cards. Kept short — the long
            // story goes in `description`.
            $table->string('tagline', 200)->nullable()->after('website');
            // Long-form "About this community" body. Markdown is rendered
            // as plain text on the public page for now (no Markdown parser
            // bundled); future copy work can swap to MDX without a schema
            // change.
            $table->text('description')->nullable()->after('tagline');
        });
    }

    public function down(): void
    {
        Schema::table('facilities', function (Blueprint $table) {
            $table->dropColumn(['tagline', 'description']);
        });
    }
};
