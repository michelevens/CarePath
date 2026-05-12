<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('beds', function (Blueprint $table) {
            $table->string('floor')->nullable()->after('bed_label');
            $table->string('unit')->nullable()->after('floor');
            $table->text('notes')->nullable()->after('status');
        });

        Schema::table('residents', function (Blueprint $table) {
            $table->string('status')->default('active')->after('mrn'); // active | discharged | deceased
            $table->text('notes')->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('beds', function (Blueprint $table) {
            $table->dropColumn(['floor', 'unit', 'notes']);
        });

        Schema::table('residents', function (Blueprint $table) {
            $table->dropColumn(['status', 'notes']);
        });
    }
};
