<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Lead management workflow: notes, follow-up dates, assignment, +
 * a lead_activities table for the per-lead activity log.
 *
 * Before this migration the Lead model had only contacted_at as a
 * timestamp marker; no way to record what was said, what's next, or
 * who's working it. After:
 *
 *   leads.notes              text       — free-form latest notes
 *   leads.next_follow_up_at  timestamp  — when to act next
 *   leads.assigned_user_id   bigint FK  — who owns this lead
 *
 *   lead_activities table — append-only log per lead with type
 *   (status_change, note, email_sent, call_logged, etc), the user
 *   who did it, the payload (status from/to, note text, etc), and
 *   when. Drives the per-lead activity timeline in the SuperAdmin
 *   Leads drawer.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->text('notes')->nullable()->after('relationship_to_prospect');
            $table->timestamp('next_follow_up_at')->nullable()->after('contacted_at');
            $table->foreignId('assigned_user_id')->nullable()->after('next_follow_up_at')
                ->constrained('users')->nullOnDelete();
            $table->index('next_follow_up_at');
            $table->index('assigned_user_id');
        });

        Schema::create('lead_activities', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('lead_id')->constrained('leads')->cascadeOnDelete();
            // status_change | note | email_sent | call_logged | followup_set | webhook_sent
            $table->string('type', 40);
            $table->foreignId('actor_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('body')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index(['lead_id', 'created_at']);
            $table->index('type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lead_activities');
        Schema::table('leads', function (Blueprint $table) {
            $table->dropIndex(['assigned_user_id']);
            $table->dropIndex(['next_follow_up_at']);
            $table->dropConstrainedForeignId('assigned_user_id');
            $table->dropColumn('next_follow_up_at');
            $table->dropColumn('notes');
        });
    }
};
