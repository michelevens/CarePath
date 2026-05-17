<?php

namespace App\Http\Controllers;

use App\Services\AiChatService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;

/**
 * Thin proxy for the AI assistant. Auth-gated and per-user rate-
 * limited so a runaway client can't spike our Anthropic bill.
 */
class AiChatController extends Controller
{
    public function send(Request $request, AiChatService $service): JsonResponse
    {
        $user = Auth::user();
        $key = 'ai-chat:' . $user->id;
        if (RateLimiter::tooManyAttempts($key, 30)) {
            $seconds = RateLimiter::availableIn($key);
            return response()->json([
                'reply' => "You've hit the per-hour chat limit. Try again in {$seconds}s.",
                'rate_limited' => true,
            ], 429);
        }
        RateLimiter::hit($key, 3600); // 30/hour per user

        $data = $request->validate([
            'message' => ['required', 'string', 'max:4000'],
            'history' => ['nullable', 'array'],
            'history.*.role' => ['required_with:history', 'in:user,assistant'],
            'history.*.content' => ['required_with:history', 'string', 'max:4000'],
            'current_page' => ['nullable', 'string', 'max:191'],
        ]);

        $result = $service->reply(
            $user,
            $data['history'] ?? [],
            $data['message'],
            $data['current_page'] ?? null,
        );

        return response()->json([
            'reply' => $result['reply'],
            'stubbed' => $result['stubbed'] ?? false,
        ]);
    }
}
