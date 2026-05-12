<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('care_plans', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('facility_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('resident_id')->constrained()->cascadeOnDelete();

            $table->string('status')->default('draft'); // draft | active | on_hold | archived
            $table->date('started_at')->nullable();
            $table->timestamp('signed_at')->nullable();
            $table->foreignId('signed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('signed_by_name')->nullable(); // captured at sign time so it's stable
            $table->text('summary')->nullable();

            $table->timestamps();

            $table->unique(['resident_id']); // one active care plan per resident
            $table->index(['facility_id', 'status']);
        });

        // Goals (kind=goal) define what we want to achieve. Interventions
        // (kind=intervention) are the actions taken. A goal may have many
        // interventions linked via parent_id; standalone interventions are
        // allowed (parent_id null).
        Schema::create('care_plan_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('care_plan_id')->constrained('care_plans')->cascadeOnDelete();
            $table->foreignUuid('parent_id')->nullable()->constrained('care_plan_items')->nullOnDelete();

            $table->string('kind'); // goal | intervention
            $table->string('category')->nullable(); // adl | mobility | nutrition | behavior | safety | meds | wound | psychosocial
            $table->text('description');

            // Goals use status + target_date; interventions use frequency + responsible_role.
            $table->string('status')->default('open'); // open | met | discontinued | in_progress
            $table->date('target_date')->nullable();
            $table->string('frequency')->nullable(); // daily | twice_daily | tid | qid | weekly | prn
            $table->string('responsible_role')->nullable(); // RN | LPN | CNA | PT | OT | ST | SW | DT
            $table->timestamp('completed_at')->nullable();

            $table->unsignedInteger('sort_order')->default(0);

            $table->timestamps();

            $table->index(['care_plan_id', 'kind']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('care_plan_items');
        Schema::dropIfExists('care_plans');
    }
};
