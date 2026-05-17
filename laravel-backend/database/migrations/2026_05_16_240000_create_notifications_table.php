<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Laravel's standard database-channel notifications table.
 *
 * Until now CarePath's existing Notification classes wrote to the
 * mail channel only and the topbar bell was hand-rolled from
 * dashboard counts. This table is the persistence layer so:
 *
 *   - Notifications get a history per user (read/unread state)
 *   - The topbar bell reads the same data the dashboards use
 *   - Future channels (push, SMS) hang off the same record
 *   - In-app messaging pushes new-message notifications here too
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('type');                 // PHP class name of the Notification
            // notifiable is the User (or other) the notification is
            // FOR. morphs gives unsigned bigint id + class string
            // which works for our bigint user.id.
            $table->morphs('notifiable');
            $table->text('data');                   // payload + UI hints (json)
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
