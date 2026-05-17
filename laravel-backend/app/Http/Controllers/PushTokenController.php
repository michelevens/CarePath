<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Web Push subscription registration. Frontend calls
 * register() with the PushSubscription JSON it gets from the
 * browser's PushManager.subscribe() result.
 *
 * Actually delivering the push (firing Anthropic-style web-push
 * fan-out to all of a user's registered tokens) lives in a future
 * notification channel; this is just the durable subscription
 * persistence so it's ready when we wire that up.
 */
class PushTokenController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'subscription' => ['required', 'array'],
            'subscription.endpoint' => ['required', 'string'],
            'subscription.keys' => ['required', 'array'],
            'platform' => ['nullable', 'in:web_push,fcm,apns'],
        ]);

        $user = Auth::user();
        $serialized = json_encode($data['subscription']);

        // Dedup on (user_id, endpoint hash). Browsers can re-call
        // subscribe() multiple times in a session.
        $existing = DB::table('push_device_tokens')
            ->where('user_id', $user->id)
            ->where('subscription', $serialized)
            ->first();

        if ($existing) {
            DB::table('push_device_tokens')
                ->where('id', $existing->id)
                ->update(['last_used_at' => now(), 'updated_at' => now()]);
            return response()->json(['ok' => true, 'created' => false]);
        }

        DB::table('push_device_tokens')->insert([
            'id' => (string) Str::uuid(),
            'user_id' => $user->id,
            'subscription' => $serialized,
            'platform' => $data['platform'] ?? 'web_push',
            'user_agent' => substr((string) $request->userAgent(), 0, 500) ?: null,
            'last_used_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['ok' => true, 'created' => true], 201);
    }

    public function unregister(Request $request): JsonResponse
    {
        $data = $request->validate([
            'endpoint' => ['required', 'string'],
        ]);
        $user = Auth::user();

        $deleted = DB::table('push_device_tokens')
            ->where('user_id', $user->id)
            ->where('subscription', 'LIKE', '%' . $data['endpoint'] . '%')
            ->delete();

        return response()->json(['ok' => true, 'deleted' => $deleted]);
    }
}
