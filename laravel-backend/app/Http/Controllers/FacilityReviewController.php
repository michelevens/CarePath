<?php

namespace App\Http\Controllers;

use App\Models\Admission;
use App\Models\Facility;
use App\Models\FacilityReview;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Family-facing review submission + reading + helpful voting, and
 * facility-side response. The wedge against APFM: their reviews are
 * gamed because anyone can submit. We tie verification to an admission
 * record (the family who actually placed someone here) and surface a
 * verified badge + the facility's optional response so families see
 * both sides of the conversation.
 *
 * Verification rule: a review counts as verified when EITHER
 *   - the auth user has an Admission for this facility where they're
 *     the inquirer, AND that admission has reached the `tour_scheduled`
 *     stage or later, OR
 *   - super_admin manually flips is_verified for an exceptional case
 * The verifying admission_id is recorded for auditability.
 */
class FacilityReviewController extends Controller
{
    /**
     * POST /api/facilities/{slug}/reviews
     * Auth required. Rate-limited at the route layer.
     */
    public function store(Request $request, string $slug): JsonResponse
    {
        $data = $request->validate([
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'rating_cleanliness' => ['nullable', 'integer', 'min:1', 'max:5'],
            'rating_friendliness' => ['nullable', 'integer', 'min:1', 'max:5'],
            'rating_care' => ['nullable', 'integer', 'min:1', 'max:5'],
            'rating_staff' => ['nullable', 'integer', 'min:1', 'max:5'],
            'rating_meals' => ['nullable', 'integer', 'min:1', 'max:5'],
            'rating_activities' => ['nullable', 'integer', 'min:1', 'max:5'],
            'rating_value' => ['nullable', 'integer', 'min:1', 'max:5'],
            'title' => ['nullable', 'string', 'max:160'],
            'body' => ['required', 'string', 'min:30', 'max:5000'],
            'author_relationship' => ['nullable', 'in:family,resident,staff,visitor'],
            'stay_started_at' => ['nullable', 'date'],
            'photos' => ['nullable', 'array', 'max:6'],
            'photos.*.url' => ['required_with:photos', 'url', 'max:500'],
            'photos.*.caption' => ['nullable', 'string', 'max:160'],
        ]);

        $facility = Facility::where('slug', $slug)->firstOrFail();
        $user = Auth::user();

        // One review per (user, facility) — they can edit instead.
        $existing = FacilityReview::where('facility_id', $facility->id)
            ->where('user_id', $user->id)
            ->first();
        if ($existing) {
            throw ValidationException::withMessages([
                'body' => 'You already left a review for this facility. Edit it from your account.',
            ]);
        }

        // Verification: is there a tour/admission record connecting this
        // user's email to this facility?
        $admission = Admission::where('facility_id', $facility->id)
            ->where('inquirer_email', $user->email)
            ->whereIn('stage', ['tour_scheduled', 'toured', 'assessment', 'approved', 'admitted'])
            ->orderByDesc('updated_at')
            ->first();

        $review = FacilityReview::create([
            'facility_id' => $facility->id,
            'user_id' => $user->id,
            'verified_via_admission_id' => $admission?->id,
            'is_verified' => (bool) $admission,
            'author_name' => $user->name ?: ($user->first_name . ' ' . $user->last_name),
            'author_relationship' => $data['author_relationship'] ?? 'family',
            'rating' => $data['rating'],
            'rating_cleanliness' => $data['rating_cleanliness'] ?? null,
            'rating_friendliness' => $data['rating_friendliness'] ?? null,
            'rating_care' => $data['rating_care'] ?? null,
            'rating_staff' => $data['rating_staff'] ?? null,
            'rating_meals' => $data['rating_meals'] ?? null,
            'rating_activities' => $data['rating_activities'] ?? null,
            'rating_value' => $data['rating_value'] ?? null,
            'title' => $data['title'] ?? null,
            'body' => $data['body'],
            'photos' => $data['photos'] ?? null,
            'stay_started_at' => $data['stay_started_at'] ?? null,
            'is_published' => true,
            // Unverified reviews go to pending for soft moderation;
            // verified-by-admission reviews are published immediately.
            'moderation_status' => $admission ? 'approved' : 'pending',
        ]);

        return response()->json([
            'data' => [
                'id' => $review->id,
                'is_verified' => $review->is_verified,
                'moderation_status' => $review->moderation_status,
                'message' => $admission
                    ? 'Thanks — your verified review is live.'
                    : 'Thanks — your review is pending light moderation (usually under 24h).',
            ],
        ], 201);
    }

    /**
     * POST /api/reviews/{id}/helpful
     * Toggles the current user's helpful vote. Returns the new total.
     */
    public function toggleHelpful(Request $request, string $id): JsonResponse
    {
        $user = Auth::user();
        $review = FacilityReview::findOrFail($id);

        $existing = DB::table('facility_review_helpful_votes')
            ->where('review_id', $id)
            ->where('user_id', $user->id)
            ->first();

        if ($existing) {
            DB::table('facility_review_helpful_votes')
                ->where('review_id', $id)
                ->where('user_id', $user->id)
                ->delete();
            $review->decrement('helpful_count');
            $voted = false;
        } else {
            DB::table('facility_review_helpful_votes')->insert([
                'review_id' => $id,
                'user_id' => $user->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $review->increment('helpful_count');
            $voted = true;
        }

        return response()->json([
            'data' => [
                'helpful_count' => $review->fresh()->helpful_count,
                'voted' => $voted,
            ],
        ]);
    }

    /**
     * POST /api/facility/reviews/{id}/respond
     * Facility-admin-only. One response per review; subsequent calls
     * overwrite (with audit log capturing the change).
     */
    public function respond(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'response' => ['required', 'string', 'min:20', 'max:2000'],
        ]);

        $user = Auth::user();
        $review = FacilityReview::findOrFail($id);

        // Authorize: the user must belong to this facility as an admin.
        $isAdminOnFacility = DB::table('facility_user')
            ->where('user_id', $user->id)
            ->where('facility_id', $review->facility_id)
            ->where('role', 'admin')
            ->exists();
        if (! $isAdminOnFacility && ! $user->hasRole('super_admin')) {
            abort(403, 'Only facility admins can respond.');
        }

        $review->update([
            'facility_response' => $data['response'],
            'facility_response_by_user_id' => $user->id,
            'facility_responded_at' => now(),
        ]);

        return response()->json([
            'data' => [
                'facility_response' => $review->facility_response,
                'facility_responded_at' => $review->facility_responded_at?->toIso8601String(),
            ],
        ]);
    }
}
