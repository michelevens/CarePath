<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
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
            RateLimiter::hit($throttleKey, 900); // 15 min decay
            throw ValidationException::withMessages([
                'email' => 'Invalid credentials.',
            ]);
        }

        RateLimiter::clear($throttleKey);

        $user = $request->user() ?? User::where('email', $credentials['email'])->firstOrFail();
        $deviceName = $credentials['device_name'] ?? ($request->userAgent() ?: 'web');
        $token = $user->createToken($deviceName)->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $this->userPayload($user),
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
            'user' => $this->userPayload($request->user()),
        ]);
    }

    private function userPayload(User $user): array
    {
        $user->load('activeFacility');

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'portal' => $user->portalRole(),
            'active_facility' => $user->activeFacility ? [
                'id' => $user->activeFacility->id,
                'name' => $user->activeFacility->name,
                'slug' => $user->activeFacility->slug,
            ] : null,
        ];
    }
}
