<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('facility_id')->nullable();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action');
            $table->string('auditable_type');
            $table->string('auditable_id');
            $table->json('before')->nullable();
            $table->json('after')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamp('occurred_at')->index();

            $table->index(['auditable_type', 'auditable_id']);
            $table->index('facility_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
