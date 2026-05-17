<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Strengthen facility_reviews so verified-by-admission, facility
 * responses, photo proof, and helpfulness voting all work end-to-end.
 *
 * The wedge against APFM: their reviews are notoriously gamed because
 * anyone can submit one. We tie verification to an admission record
 * (the family who actually placed someone) and surface a verified
 * badge + the facility's optional response so families see both sides.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('facility_reviews', function (Blueprint $table) {
            // Auth-user linkage so we can prevent dupes per user/facility
            // and so the user can edit / withdraw their own review later.
            $table->foreignId('user_id')
                ->nullable()
                ->after('resident_id')
                ->constrained('users')
                ->nullOnDelete();

            // Admission-record verification: when this is set, the
            // is_verified flag is justified — there's a real placement
            // record showing this family actually toured/admitted here.
            $table->foreignUuid('verified_via_admission_id')
                ->nullable()
                ->after('user_id')
                ->constrained('admissions')
                ->nullOnDelete();

            // Photo proof — JSON array of {url, caption?}. Limits enforced
            // at the controller layer (max 6 photos per review).
            $table->json('photos')->nullable()->after('body');

            // Facility-side response: a single threaded response from the
            // facility admin. Surfaces "the facility cares enough to
            // engage" — a real trust signal.
            $table->text('facility_response')->nullable()->after('photos');
            $table->foreignId('facility_response_by_user_id')
                ->nullable()
                ->after('facility_response')
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamp('facility_responded_at')->nullable()
                ->after('facility_response_by_user_id');

            // Social-proof signal — number of distinct users who marked
            // this review helpful. Stored denormalized; toggle table below.
            $table->unsignedInteger('helpful_count')->default(0)->after('is_verified');

            // Moderation status — published reviews go through a light
            // review-then-publish flow for the first 24h to catch abuse.
            // Default 'approved' so the existing flow doesn't break.
            $table->string('moderation_status', 20)
                ->default('approved')
                ->after('is_published'); // pending | approved | rejected | flagged

            // Soft-decline reason for super-admin / facility-admin context.
            $table->text('moderation_notes')->nullable()->after('moderation_status');

            $table->index(['user_id', 'facility_id'], 'reviews_user_facility_idx');
        });

        // Helpful-votes pivot — keyed by (review, user) so each person
        // counts once. Drives the helpful_count denormalized column.
        Schema::create('facility_review_helpful_votes', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('review_id')
                ->constrained('facility_reviews')
                ->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['review_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('facility_review_helpful_votes');
        Schema::table('facility_reviews', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropForeign(['verified_via_admission_id']);
            $table->dropForeign(['facility_response_by_user_id']);
            $table->dropIndex('reviews_user_facility_idx');
            $table->dropColumn([
                'user_id',
                'verified_via_admission_id',
                'photos',
                'facility_response',
                'facility_response_by_user_id',
                'facility_responded_at',
                'helpful_count',
                'moderation_status',
                'moderation_notes',
            ]);
        });
    }
};
