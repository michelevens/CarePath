<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:191', 'unique:users,email'],
            'password' => ['required', 'confirmed', PasswordRule::defaults()],
            'device_name' => ['nullable', 'string', 'max:60'],
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => strtolower($data['email']),
            'password' => Hash::make($data['password']),
        ]);

        $user->sendEmailVerificationNotification();

        $deviceName = $data['device_name'] ?? ($request->userAgent() ?: 'web');
        $token = $user->createToken($deviceName)->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $user->toAuthPayload(),
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'device_name' => ['nullable', 'string', 'max:60'],
        ]);

        $throttleKey = strtolower($credentials['email']).'|'.$request->ip();

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            throw ValidationException::withMessages([
                'email' => "Too many attempts. Try again in {$seconds} seconds.",
            ]);
        }

        if (! Auth::attempt(['email' => $credentials['email'], 'password' => $credentials['password']])) {
            RateLimiter::hit($throttleKey, 900);
            throw ValidationException::withMessages([
                'email' => 'Invalid credentials.',
            ]);
        }

        RateLimiter::clear($throttleKey);

        $user = $request->user() ?? User::where('email', $credentials['email'])->firstOrFail();

        if ($user->hasTwoFactorEnabled()) {
            // Don't issue an API token yet — second step required.
            $challengeId = Str::random(40);
            cache()->put(
                '2fa_challenge:'.$challengeId,
                ['user_id' => $user->id],
                now()->addMinutes(5)
            );

            // Log this user out of the password guard — we never want the
            // password check alone to count as a valid session.
            Auth::logout();

            return response()->json([
                'two_factor_required' => true,
                'challenge_id' => $challengeId,
            ]);
        }

        $deviceName = $credentials['device_name'] ?? ($request->userAgent() ?: 'web');
        $token = $user->createToken($deviceName)->plainTextToken;

        // Stamp last_login_at — surfaces on SuperAdmin user detail
        // page + powers "inactive account" heuristics.
        $user->forceFill(['last_login_at' => now()])->saveQuietly();

        return response()->json([
            'token' => $token,
            'user' => $user->toAuthPayload(),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['ok' => true]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $request->user()->toAuthPayload(),
        ]);
    }

    /**
     * GET /api/me/notifications
     *
     * Lightweight notifications-bell payload for the topbar.
     * Polled per minute. Counts only — clicking an item navigates
     * to the relevant detail surface. Per-role:
     *   super_admin     → pending claims + advisor/hospital
     *                     verifications + overdue PRRs
     *   facility_admin  → new inquiries on active facility (last 7d)
     *   referral_partner→ placements with pending payouts
     */
    public function notifications(Request $request): JsonResponse
    {
        $user = $request->user();
        $items = [];
        $total = 0;

        if ($user->hasRole('super_admin')) {
            $pendingClaims = \App\Models\FacilityClaim::where('status', 'pending')->count();
            $pendingAdvisors = \App\Models\AdvisorProfile::whereNull('verified_at')->count();
            $pendingHospitals = \App\Models\HospitalPartner::whereNull('verified_at')->count();
            $overduePrr = \App\Models\PublicRecordsRequest::whereNull('response_received_at')
                ->whereDate('follow_up_on', '<', now())
                ->count();

            if ($pendingClaims > 0) {
                $items[] = ['kind' => 'pending_claims', 'count' => $pendingClaims,
                    'label' => "{$pendingClaims} facility claim" . ($pendingClaims !== 1 ? 's' : '') . ' pending',
                    'href' => '/superadmin/verifications'];
            }
            if ($pendingAdvisors > 0) {
                $items[] = ['kind' => 'pending_advisors', 'count' => $pendingAdvisors,
                    'label' => "{$pendingAdvisors} advisor verification" . ($pendingAdvisors !== 1 ? 's' : ''),
                    'href' => '/superadmin/verifications'];
            }
            if ($pendingHospitals > 0) {
                $items[] = ['kind' => 'pending_hospitals', 'count' => $pendingHospitals,
                    'label' => "{$pendingHospitals} hospital verification" . ($pendingHospitals !== 1 ? 's' : ''),
                    'href' => '/superadmin/verifications'];
            }
            if ($overduePrr > 0) {
                $items[] = ['kind' => 'overdue_prr', 'count' => $overduePrr,
                    'label' => "{$overduePrr} public records request" . ($overduePrr !== 1 ? 's' : '') . ' overdue',
                    'href' => '/superadmin/sources'];
            }
            $total += $pendingClaims + $pendingAdvisors + $pendingHospitals + $overduePrr;
        }

        if ($user->hasRole('facility_admin') && $user->active_facility_id) {
            $newInquiries = \App\Models\Admission::query()
                ->where('facility_id', $user->active_facility_id)
                ->where('stage', 'inquiry')
                ->where('created_at', '>=', now()->subDays(7))
                ->count();
            if ($newInquiries > 0) {
                $items[] = ['kind' => 'new_inquiries', 'count' => $newInquiries,
                    'label' => "{$newInquiries} new inquir" . ($newInquiries !== 1 ? 'ies' : 'y') . ' this week',
                    'href' => '/admin/leads'];
                $total += $newInquiries;
            }
        }

        if ($user->hasRole('referral_partner')) {
            $unpaidPayouts = \App\Models\Placement::where('advisor_user_id', $user->id)
                ->whereIn('status', ['confirmed', 'retained_30d'])
                ->whereRaw('amount_paid_cents < advisor_payout_cents')
                ->count();
            if ($unpaidPayouts > 0) {
                $items[] = ['kind' => 'unpaid_payouts', 'count' => $unpaidPayouts,
                    'label' => "{$unpaidPayouts} placement" . ($unpaidPayouts !== 1 ? 's' : '') . ' with pending payout',
                    'href' => '/referral/payouts'];
                $total += $unpaidPayouts;
            }
        }

        return response()->json(['data' => ['total' => $total, 'items' => $items]]);
    }

    public function setActiveFacility(Request $request): JsonResponse
    {
        $data = $request->validate([
            'facility_id' => ['required', 'uuid'],
        ]);

        $user = $request->user();
        $isMember = $user->facilities()->where('facilities.id', $data['facility_id'])->exists();

        // Super admins can switch into any facility; everyone else needs a
        // facility_user pivot row.
        if (! $isMember && ! $user->hasRole('super_admin')) {
            throw ValidationException::withMessages([
                'facility_id' => 'You do not have access to that facility.',
            ]);
        }

        $user->active_facility_id = $data['facility_id'];
        $user->save();

        return response()->json([
            'user' => $user->fresh()->toAuthPayload(),
        ]);
    }

    public function verifyEmail(Request $request): JsonResponse
    {
        $data = $request->validate([
            'id' => ['required', 'integer'],
            'hash' => ['required', 'string'],
            'expires' => ['required', 'integer'],
            'signature' => ['required', 'string'],
        ]);

        if (! $request->hasValidSignature(absolute: false)) {
            throw ValidationException::withMessages([
                'email' => 'Verification link is invalid or expired.',
            ]);
        }

        $user = User::findOrFail($data['id']);

        if (! hash_equals(sha1($user->getEmailForVerification()), $data['hash'])) {
            throw ValidationException::withMessages([
                'email' => 'Verification link does not match this account.',
            ]);
        }

        if (! $user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
            event(new Verified($user));
        }

        return response()->json(['ok' => true, 'user' => $user->toAuthPayload()]);
    }

    public function resendVerification(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return response()->json(['ok' => true, 'message' => 'Already verified.']);
        }

        $key = 'verify-resend:'.$user->id;
        if (RateLimiter::tooManyAttempts($key, 3)) {
            throw ValidationException::withMessages([
                'email' => 'Too many resends. Wait a few minutes.',
            ]);
        }
        RateLimiter::hit($key, 300);

        $user->sendEmailVerificationNotification();

        return response()->json(['ok' => true]);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $key = 'forgot-password:'.strtolower($data['email']).'|'.$request->ip();
        if (RateLimiter::tooManyAttempts($key, 3)) {
            $seconds = RateLimiter::availableIn($key);
            throw ValidationException::withMessages([
                'email' => "Too many attempts. Try again in {$seconds} seconds.",
            ]);
        }
        RateLimiter::hit($key, 600);

        Password::sendResetLink(['email' => $data['email']]);

        return response()->json(['ok' => true]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'confirmed', PasswordRule::defaults()],
        ]);

        $status = Password::reset($data, function (User $user, string $password) {
            $user->forceFill([
                'password' => Hash::make($password),
                'remember_token' => Str::random(60),
            ])->save();

            $user->tokens()->delete();
        });

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'email' => __($status),
            ]);
        }

        return response()->json(['ok' => true]);
    }
}
