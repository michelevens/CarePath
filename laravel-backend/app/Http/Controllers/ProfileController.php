<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * Per-user profile editor. Backs /settings/profile.
 *
 * The auth payload returned by /me already includes the profile
 * fields (so PortalShell can render avatar + name without a second
 * round trip); this controller covers the full edit surface.
 */
class ProfileController extends Controller
{
    /**
     * GET /api/me/profile
     *
     * Full profile payload — includes the address + comms prefs
     * that aren't on the leaner /me auth response.
     */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'email' => $user->email,
                'phone' => $user->phone,
                'title' => $user->title,
                'profile_picture' => $user->profile_picture,
                'address_line_1' => $user->address_line_1,
                'address_line_2' => $user->address_line_2,
                'city' => $user->city,
                'state' => $user->state,
                'zip' => $user->zip,
                'time_zone' => $user->time_zone,
                'notification_preferences' => $user->notification_preferences ?? $this->defaultPrefs(),
                'onboarding_completed' => (bool) $user->onboarding_completed,
                'last_login_at' => $user->last_login_at,
                'created_at' => $user->created_at,
            ],
        ]);
    }

    /**
     * PUT /api/me/profile
     */
    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['nullable', 'string', 'max:120'],
            'first_name' => ['nullable', 'string', 'max:60'],
            'last_name' => ['nullable', 'string', 'max:60'],
            'phone' => ['nullable', 'string', 'max:30'],
            'title' => ['nullable', 'string', 'max:120'],
            'profile_picture' => ['nullable', 'url', 'max:500'],
            'address_line_1' => ['nullable', 'string', 'max:191'],
            'address_line_2' => ['nullable', 'string', 'max:191'],
            'city' => ['nullable', 'string', 'max:120'],
            'state' => ['nullable', 'string', 'size:2'],
            'zip' => ['nullable', 'string', 'max:10'],
            'time_zone' => ['nullable', 'string', 'max:60'],
            'notification_preferences' => ['nullable', 'array'],
            'notification_preferences.email_transactional' => ['nullable', 'boolean'],
            'notification_preferences.email_marketing' => ['nullable', 'boolean'],
            'notification_preferences.sms_reminders' => ['nullable', 'boolean'],
            'notification_preferences.sms_marketing' => ['nullable', 'boolean'],
        ]);

        $user = $request->user();

        // Derive `name` from first+last when both set and the user
        // didn't explicitly override it — keeps the legacy display
        // field in sync without surprising people who set it directly.
        if (
            isset($data['first_name'], $data['last_name'])
            && ! isset($data['name'])
        ) {
            $data['name'] = trim($data['first_name'] . ' ' . $data['last_name']);
        }

        // Uppercase state for consistency with our facility data.
        if (isset($data['state'])) {
            $data['state'] = strtoupper($data['state']);
        }

        $user->update($data);

        return response()->json([
            'data' => $user->fresh()->toAuthPayload(),
        ]);
    }

    /**
     * POST /api/me/complete-onboarding
     *
     * Stamps onboarding_completed + _at + persists the wizard
     * answers so the staged-onboarding nag goes away.
     */
    public function completeOnboarding(Request $request): JsonResponse
    {
        $data = $request->validate([
            'data' => ['nullable', 'array'],
        ]);

        $user = $request->user();
        $user->update([
            'onboarding_completed' => true,
            'onboarding_completed_at' => now(),
            'onboarding_data' => $data['data'] ?? null,
        ]);

        return response()->json(['ok' => true, 'data' => $user->toAuthPayload()]);
    }

    private function defaultPrefs(): array
    {
        return [
            'email_transactional' => true,    // tour confirmations, claim decisions
            'email_marketing' => false,
            'sms_reminders' => false,
            'sms_marketing' => false,
        ];
    }
}
