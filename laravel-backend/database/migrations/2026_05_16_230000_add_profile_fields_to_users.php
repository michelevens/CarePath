<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Profile fields on the User row. Up to now we only carried name +
 * email + password, which is enough for auth but not for any of the
 * actual workflows — admins need a phone, advisors have a mailing
 * address for 1099s, family members want their tour confirmations
 * to land at the right number.
 *
 * Column-naming follows ShiftPulse + ClinicLink conventions for
 * cross-portfolio consistency:
 *   first_name / last_name (optional refinement of `name`)
 *   phone, title, profile_picture
 *   address_line_1/2 + city + state + zip
 *   time_zone (IANA)
 *   notification_preferences (json — channels we may grow over time)
 *   onboarding_completed + _at + _data (staged onboarding flow)
 *   last_login_at (admin visibility into user activity)
 *
 * `name` stays as the canonical display field for back-compat;
 * first/last are optional and used for personalized contexts
 * (email greetings, sort order).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Direct identity / contact.
            $table->string('first_name', 60)->nullable()->after('name');
            $table->string('last_name', 60)->nullable()->after('first_name');
            $table->string('phone', 30)->nullable()->after('email');
            $table->string('title', 120)->nullable()->after('phone');
            $table->string('profile_picture', 500)->nullable()->after('title');

            // Mailing address — advisor 1099s + facility admin paper
            // compliance docs.
            $table->string('address_line_1', 191)->nullable()->after('profile_picture');
            $table->string('address_line_2', 191)->nullable()->after('address_line_1');
            $table->string('city', 120)->nullable()->after('address_line_2');
            $table->string('state', 2)->nullable()->after('city');
            $table->string('zip', 10)->nullable()->after('state');

            // Time zone for showing dates/tours in the user's
            // local time. IANA name e.g. 'America/New_York'.
            $table->string('time_zone', 60)->nullable()->after('zip');

            // Channel-preferences JSON so we can add (sms, push…)
            // without further migrations. Shape:
            //   { email_marketing: bool, email_transactional: bool,
            //     sms_reminders: bool, sms_marketing: bool }
            // Transactional channels default-on; marketing default-off.
            $table->json('notification_preferences')->nullable()->after('time_zone');

            // Onboarding completion — flips true once a user has
            // finished the first-run wizard (set phone, set time
            // zone, etc.). The frontend uses this to nag/redirect.
            $table->boolean('onboarding_completed')->default(false)->after('notification_preferences');
            $table->timestamp('onboarding_completed_at')->nullable()->after('onboarding_completed');
            $table->json('onboarding_data')->nullable()->after('onboarding_completed_at');

            // Last-login tracking — populated by AuthController on
            // successful login. Used by SuperAdmin user detail page
            // to spot inactive accounts.
            $table->timestamp('last_login_at')->nullable()->after('onboarding_data');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'first_name', 'last_name',
                'phone', 'title', 'profile_picture',
                'address_line_1', 'address_line_2', 'city', 'state', 'zip',
                'time_zone',
                'notification_preferences',
                'onboarding_completed', 'onboarding_completed_at', 'onboarding_data',
                'last_login_at',
            ]);
        });
    }
};
