<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * In-app messaging: conversations + participants + messages.
 *
 * Modeled on the ClinicLink schema (proven across student/preceptor
 * threads + broadcast announcements). One conversation can be a 1:1
 * exchange (family ↔ facility, advisor ↔ family) or a broadcast
 * (facility admin → all current families).
 *
 * Tier-2 polish (per-conversation unread counts in a separate table)
 * deferred — the read_at on conversation_participants + a left join
 * to messages is fine at our volume.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('conversations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('subject', 191)->nullable();
            // Broadcasts: a one-to-many conversation where new
            // recipients don't reply and the thread isn't shown to
            // other recipients. Set by BroadcastModal.
            $table->boolean('is_broadcast')->default(false);
            // Optional facility scoping — admin broadcasts to "our
            // families" filter on facility_id; family ↔ facility
            // threads carry the facility for context.
            $table->foreignUuid('facility_id')->nullable()->constrained()->nullOnDelete();
            // Who started the thread (for display).
            $table->foreignId('started_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('last_message_at')->nullable();
            $table->timestamps();

            $table->index(['facility_id', 'last_message_at']);
            $table->index('is_broadcast');
        });

        Schema::create('conversation_participants', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('conversation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            // Last time this user opened the thread. Drives unread.
            $table->timestamp('last_read_at')->nullable();
            // Soft-leave: hide from this user's inbox but keep audit.
            $table->timestamp('left_at')->nullable();
            $table->timestamps();

            $table->unique(['conversation_id', 'user_id']);
            $table->index(['user_id', 'last_read_at']);
        });

        Schema::create('messages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('conversation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sender_user_id')->constrained('users')->cascadeOnDelete();
            $table->text('body');
            $table->timestamp('sent_at')->useCurrent();
            $table->timestamps();

            $table->index(['conversation_id', 'sent_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('messages');
        Schema::dropIfExists('conversation_participants');
        Schema::dropIfExists('conversations');
    }
};
