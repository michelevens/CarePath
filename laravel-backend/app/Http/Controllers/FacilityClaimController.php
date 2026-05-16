<?php

namespace App\Http\Controllers;

use App\Models\Facility;
use App\Models\FacilityClaim;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Public-facing facility claim submission. Auth required (so the
 * SuperAdmin reviewer has a user to link to + grant role to), but
 * deliberately NOT gated by any role — anyone can submit a claim
 * for any facility. The vetting happens at SuperAdmin review time.
 *
 * Approval flow lives in SuperAdminController::approveClaim().
 */
class FacilityClaimController extends Controller
{
    /**
     * POST /api/facilities/{slug}/claim
     */
    public function submit(Request $request, string $slug): JsonResponse
    {
        $user = Auth::user();
        if (! $user) abort(401, 'Sign in first to claim a facility.');

        $facility = Facility::where('slug', $slug)->where('is_active', true)->firstOrFail();

        $data = $request->validate([
            'claimer_name' => ['required', 'string', 'max:120'],
            'claimer_title' => ['nullable', 'string', 'max:120'],
            'claimer_email' => ['required', 'email', 'max:191'],
            'claimer_phone' => ['nullable', 'string', 'max:30'],
            'supporting_notes' => ['nullable', 'string', 'max:2000'],
        ]);

        // Block duplicate pending claims from the same user on the
        // same facility — they're already in the queue.
        $existing = FacilityClaim::query()
            ->where('facility_id', $facility->id)
            ->where('user_id', $user->id)
            ->whereIn('status', ['pending', 'approved'])
            ->first();
        if ($existing) {
            throw ValidationException::withMessages([
                'claim' => $existing->status === 'approved'
                    ? 'You already manage this facility.'
                    : 'You already have a pending claim for this facility.',
            ]);
        }

        $claim = DB::transaction(function () use ($facility, $user, $data) {
            return FacilityClaim::create([
                'facility_id' => $facility->id,
                'user_id' => $user->id,
                'claimer_name' => $data['claimer_name'],
                'claimer_title' => $data['claimer_title'] ?? null,
                'claimer_email' => strtolower($data['claimer_email']),
                'claimer_phone' => $data['claimer_phone'] ?? null,
                'supporting_notes' => $data['supporting_notes'] ?? null,
                'status' => 'pending',
            ]);
        });

        return response()->json([
            'ok' => true,
            'message' => "Thanks — we'll review your claim within 1-2 business days. We'll email you when it's approved.",
            'claim_id' => $claim->id,
        ], 201);
    }

    /**
     * GET /api/facilities/{slug}/claim-status
     *
     * Returns whether the authenticated user has a pending or
     * approved claim on this facility — used by the detail page to
     * swap the "Claim this facility" CTA for "Claim pending review"
     * or "You manage this facility."
     */
    public function status(Request $request, string $slug): JsonResponse
    {
        $user = Auth::user();
        if (! $user) {
            return response()->json(['data' => ['authenticated' => false, 'claim_status' => null]]);
        }

        $facility = Facility::where('slug', $slug)->firstOrFail();
        $claim = FacilityClaim::query()
            ->where('facility_id', $facility->id)
            ->where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->first();

        $isMember = $user->facilities()->where('facilities.id', $facility->id)->exists();

        return response()->json([
            'data' => [
                'authenticated' => true,
                'is_facility_member' => $isMember,
                'claim_status' => $claim?->status,
                'claim_submitted_at' => $claim?->created_at,
            ],
        ]);
    }
}
