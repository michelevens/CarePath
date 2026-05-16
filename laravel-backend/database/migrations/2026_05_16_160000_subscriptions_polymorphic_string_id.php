<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Convert subscriptions.subscriber_id from uuid → varchar(36) so the
 * polymorphic column can hold both Facility (uuid) and User (bigint
 * cast to string) ids. Without this, /api/family/billing checkout +
 * the DemoMonetizationSeeder both fail with
 *   SQLSTATE[22P02]: invalid input syntax for type uuid: "1"
 * because users.id is bigint while the original uuidMorphs helper
 * created subscriber_id as uuid.
 *
 * Pre-launch — truncating subscriptions is acceptable; the demo
 * seeder repopulates Facility Pro + Family Pro on the same deploy.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Drop any existing rows; they were uuid-only Facility subs
        // and the seeder repopulates them. Doing this before the
        // ALTER avoids a "cannot cast uuid → varchar implicitly"
        // surprise on a populated table.
        DB::table('subscriptions')->truncate();

        Schema::table('subscriptions', function (Blueprint $table) {
            // The original `uuidMorphs('subscriber')` created an index
            // on (subscriber_type, subscriber_id). Drop it before
            // changing the column type, then re-add it after.
            $table->dropIndex(['subscriber_type', 'subscriber_id']);
        });

        // Postgres-specific ALTER. doctrine/dbal isn't installed and
        // Laravel's portable change() can't handle the uuid → varchar
        // shift on Postgres without it.
        DB::statement('ALTER TABLE subscriptions ALTER COLUMN subscriber_id TYPE varchar(36) USING subscriber_id::text');

        Schema::table('subscriptions', function (Blueprint $table) {
            $table->index(['subscriber_type', 'subscriber_id']);
        });
    }

    public function down(): void
    {
        DB::table('subscriptions')->truncate();

        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropIndex(['subscriber_type', 'subscriber_id']);
        });

        DB::statement('ALTER TABLE subscriptions ALTER COLUMN subscriber_id TYPE uuid USING subscriber_id::uuid');

        Schema::table('subscriptions', function (Blueprint $table) {
            $table->index(['subscriber_type', 'subscriber_id']);
        });
    }
};
