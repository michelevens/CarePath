<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use PragmaRX\Google2FA\Google2FA;

class TwoFactorController extends Controller
{
    public function __construct(private readonly Google2FA $google2fa)
    {
    }

    /**
     * Begin 2FA enrollment — generate a fresh secret and return the otpauth
     * URI for QR rendering. The secret is NOT yet active; the user must
     * confirm a TOTP code before two_factor_confirmed_at is set.
     */
    public function enable(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->hasTwoFactorEnabled()) {
            throw ValidationException::withMessages([
                'two_factor' => 'Two-factor authentication is already enabled.',
            ]);
        }

        $secret = $this->google2fa->generateSecretKey();
        $user->two_factor_secret = $secret;
        $user->two_factor_confirmed_at = null;
        $user->save();

        $otpauthUrl = $this->google2fa->getQRCodeUrl(
            config('app.name', 'CarePath'),
            $user->email,
            $secret
        );

        return response()->json([
            'secret' => $secret,
            'otpauth_url' => $otpauthUrl,
        ]);
    }

    /**
     * Confirm the first TOTP code, finalize enrollment, and return one-time
     * recovery codes (the only time these are returned in plaintext).
     */
    public function confirm(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'size:6'],
        ]);

        $user = $request->user();

        if (! $user->two_factor_secret) {
            throw ValidationException::withMessages([
                'code' => 'Start enrollment first.',
            ]);
        }

        if ($user->hasTwoFactorEnabled()) {
            throw ValidationException::withMessages([
                'code' => 'Already confirmed.',
            ]);
        }

        if (! $this->google2fa->verifyKey($user->two_factor_secret, $data['code'])) {
            throw ValidationException::withMessages([
                'code' => 'Invalid code. Try again.',
            ]);
        }

        $recoveryCodes = $this->generateRecoveryCodes();
        $user->two_factor_recovery_codes = $recoveryCodes;
        $user->two_factor_confirmed_at = now();
        $user->save();

        return response()->json([
            'recovery_codes' => $recoveryCodes,
        ]);
    }

    /**
     * Disable 2FA — requires the user's current password as a second factor
     * for safety even if the TOTP device is compromised.
     */
    public function disable(Request $request): JsonResponse
    {
        $data = $request->validate([
            'password' => ['required', 'string'],
        ]);

        $user = $request->user();

        if (! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'password' => 'Password is incorrect.',
            ]);
        }

        $user->two_factor_secret = null;
        $user->two_factor_recovery_codes = null;
        $user->two_factor_confirmed_at = null;
        $user->save();

        return response()->json(['ok' => true]);
    }

    public function recoveryCodes(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->hasTwoFactorEnabled()) {
            throw ValidationException::withMessages([
                'two_factor' => 'Two-factor authentication is not enabled.',
            ]);
        }

        return response()->json([
            'recovery_codes' => $user->two_factor_recovery_codes,
        ]);
    }

    public function regenerateRecoveryCodes(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->hasTwoFactorEnabled()) {
            throw ValidationException::withMessages([
                'two_factor' => 'Two-factor authentication is not enabled.',
            ]);
        }

        $codes = $this->generateRecoveryCodes();
        $user->two_factor_recovery_codes = $codes;
        $user->save();

        return response()->json(['recovery_codes' => $codes]);
    }

    /**
     * Second step of login for 2FA-enabled accounts. Accepts a short-lived
     * challenge id (issued by AuthController::login) plus either a TOTP code
     * or a single-use recovery code. On success, issues the real API token.
     */
    public function challenge(Request $request): JsonResponse
    {
        $data = $request->validate([
            'challenge_id' => ['required', 'string'],
            'code' => ['nullable', 'string'],
            'recovery_code' => ['nullable', 'string'],
            'device_name' => ['nullable', 'string', 'max:60'],
        ]);

        if (empty($data['code']) && empty($data['recovery_code'])) {
            throw ValidationException::withMessages([
                'code' => 'Provide a code or a recovery code.',
            ]);
        }

        $payload = cache()->pull('2fa_challenge:'.$data['challenge_id']);
        if (! $payload || ! isset($payload['user_id'])) {
            throw ValidationException::withMessages([
                'challenge_id' => 'Challenge is invalid or expired. Please sign in again.',
            ]);
        }

        $throttleKey = '2fa-challenge:'.$payload['user_id'].'|'.$request->ip();
        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            // Re-store challenge so the user can retry once the lockout expires.
            cache()->put('2fa_challenge:'.$data['challenge_id'], $payload, now()->addMinutes(5));
            throw ValidationException::withMessages([
                'code' => "Too many attempts. Try again in {$seconds} seconds.",
            ]);
        }

        $user = User::findOrFail($payload['user_id']);

        $verified = false;
        if (! empty($data['code'])) {
            $verified = $this->google2fa->verifyKey($user->two_factor_secret, $data['code']);
        }
        if (! $verified && ! empty($data['recovery_code'])) {
            $codes = $user->two_factor_recovery_codes ?? [];
            $supplied = strtolower(trim($data['recovery_code']));
            $remaining = array_values(array_filter($codes, fn ($c) => strtolower($c) !== $supplied));
            if (count($remaining) < count($codes)) {
                $verified = true;
                $user->two_factor_recovery_codes = $remaining;
                $user->save();
            }
        }

        if (! $verified) {
            RateLimiter::hit($throttleKey, 600);
            // Re-store challenge so the user can retry.
            cache()->put('2fa_challenge:'.$data['challenge_id'], $payload, now()->addMinutes(5));
            throw ValidationException::withMessages([
                'code' => 'Invalid code.',
            ]);
        }

        RateLimiter::clear($throttleKey);

        $deviceName = $data['device_name'] ?? ($request->userAgent() ?: 'web');
        $token = $user->createToken($deviceName)->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $user->toAuthPayload(),
        ]);
    }

    /**
     * @return array<int, string>
     */
    private function generateRecoveryCodes(int $count = 8): array
    {
        return collect(range(1, $count))
            ->map(fn () => Str::random(10).'-'.Str::random(10))
            ->all();
    }
}
