<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * OSM-sourced facilities often have a name + lat/lon + street but no
 * addr:city or addr:postcode tag. Make city/zip/address nullable so
 * we can still ingest them — reverse-geocoding can fill the gaps later.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('facilities', function (Blueprint $table) {
            $table->string('address_line_1')->nullable()->change();
            $table->string('city')->nullable()->change();
            $table->string('zip', 10)->nullable()->change();
        });
    }

    public function down(): void
    {
        // No-op down — making columns NOT NULL again would fail on existing
        // OSM rows with missing values.
    }
};
