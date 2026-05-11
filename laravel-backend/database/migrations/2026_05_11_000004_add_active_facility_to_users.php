<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->uuid('active_facility_id')->nullable()->after('email');
        });

        Schema::create('facility_user', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('facility_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('role'); // staff | admin | network | referral
            $table->timestamps();

            $table->unique(['facility_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('facility_user');
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('active_facility_id');
        });
    }
};
