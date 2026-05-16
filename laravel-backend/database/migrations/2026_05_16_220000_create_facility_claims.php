<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Self-serve facility-claim workflow.
 *
 * Any logged-in user can claim a facility from its public detail
 * page. The claim is held pending until SuperAdmin reviews + verifies
 * the claimant's relationship to the facility (typically via the
 * supporting notes + a quick phone/email check). On approval, the
 * user is granted `facility_admin` role + a facility_user pivot row
 * with role='admin', and can edit facility data via /admin/data.
 *
 * Multiple users can claim the same facility — first approved wins;
 * subsequent approvals stack as additional admins so co-managers
 * can both edit.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('facility_claims', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('facility_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            // Proof-of-relationship fields. We don't validate these
            // automatically — the SuperAdmin reviews them. Email
            // domain match against facility website is shown as a
            // signal in the review UI but isn't auto-approved (too
            // easy to fake).
            $table->string('claimer_name', 120);
            $table->string('claimer_title', 120)->nullable();
            $table->string('claimer_email', 191);
            $table->string('claimer_phone', 30)->nullable();
            $table->text('supporting_notes')->nullable();

            $table->string('status', 20)->default('pending'); // pending | approved | rejected | withdrawn
            $table->foreignId('reviewed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('decision_notes')->nullable();

            $table->timestamps();

            $table->index(['status', 'created_at']);
            $table->index(['facility_id', 'status']);
            $table->unique(['facility_id', 'user_id', 'status'], 'claim_unique_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('facility_claims');
    }
};
