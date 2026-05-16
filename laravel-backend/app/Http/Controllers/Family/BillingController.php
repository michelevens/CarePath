<?php

namespace App\Http\Controllers\Family;

use App\Http\Controllers\Controller;
use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Services\Billing\SubscriptionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

/**
 * Family-side personal subscription management. The subscriber is the
 * authenticated User (not a Facility) — Family Pro is a per-user plan.
 *
 * Mirrors Facility\BillingController almost exactly; kept separate so
 * future per-audience logic (e.g. household sharing in Family Pro)
 * lives here rather than in a forking controller.
 */
class BillingController extends Controller
{
    public function __construct(
        private readonly SubscriptionService $subs,
    ) {}

    /**
     * GET /api/family/billing/plans
     */
    public function plans(): JsonResponse
    {
        $plans = SubscriptionPlan::query()
            ->where('audience', 'family')
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get()
            ->map(fn ($p) => $this->serializePlan($p));

        return response()->json(['data' => $plans]);
    }

    /**
     * GET /api/family/billing/subscription
     */
    public function show(): JsonResponse
    {
        $user = $this->userOrFail();
        $sub = $this->subs->activeFor($user);

        // A single User can hold both advisor + family subscriptions
        // (advisor by virtue of role, family Pro by personal choice).
        // Only surface the family sub on this endpoint to avoid the
        // upsell modal mis-rendering an advisor plan as "your Family Pro".
        $familySub = $sub && $sub->plan?->audience === 'family' ? $sub : null;

        return response()->json([
            'data' => [
                'user' => ['id' => $user->id, 'email' => $user->email],
                'subscription' => $familySub ? [
                    'id' => $familySub->id,
                    'status' => $familySub->status,
                    'billing_cycle' => $familySub->billing_cycle,
                    'current_period_ends_at' => $familySub->current_period_ends_at,
                    'canceled_at' => $familySub->canceled_at,
                    'trial_ends_at' => $familySub->trial_ends_at,
                    'plan' => $this->serializePlan($familySub->plan),
                ] : [
                    'status' => 'free',
                    'plan' => $this->serializePlan(
                        SubscriptionPlan::where('audience', 'family')
                            ->where('tier', 'free')
                            ->where('is_active', true)
                            ->first()
                    ),
                ],
            ],
        ]);
    }

    /**
     * POST /api/family/billing/checkout
     */
    public function checkout(Request $request): JsonResponse
    {
        $data = $request->validate([
            'plan_slug' => ['required', 'string'],
            'billing_cycle' => ['nullable', 'in:monthly,annual'],
        ]);

        $user = $this->userOrFail();
        $plan = SubscriptionPlan::query()
            ->where('slug', $data['plan_slug'])
            ->where('audience', 'family')
            ->where('is_active', true)
            ->firstOrFail();

        if ($plan->tier === 'free') {
            $existing = $this->subs->activeFor($user);
            if ($existing) {
                $this->subs->cancelAtPeriodEnd($existing);
            }
            return response()->json([
                'ok' => true,
                'message' => $existing
                    ? 'Pro will end at the end of your current billing cycle.'
                    : 'Already on the free tier.',
            ]);
        }

        $url = $this->subs->startCheckout(
            $user,
            $plan,
            $data['billing_cycle'] ?? 'monthly'
        );

        return response()->json(['checkout_url' => $url]);
    }

    /**
     * POST /api/family/billing/cancel
     */
    public function cancel(): JsonResponse
    {
        $user = $this->userOrFail();
        $sub = $this->subs->activeFor($user);

        if (! $sub || $sub->plan?->audience !== 'family') {
            throw ValidationException::withMessages([
                'subscription' => 'No active family subscription to cancel.',
            ]);
        }

        $this->subs->cancelAtPeriodEnd($sub);

        return response()->json([
            'ok' => true,
            'cancels_at' => $sub->current_period_ends_at,
        ]);
    }

    private function userOrFail(): User
    {
        $user = Auth::user();
        if (! $user) abort(401);
        return $user;
    }

    private function serializePlan(?SubscriptionPlan $plan): ?array
    {
        if (! $plan) return null;
        return [
            'slug' => $plan->slug,
            'name' => $plan->name,
            'tier' => $plan->tier,
            'audience' => $plan->audience,
            'monthly_cents' => $plan->monthly_cents,
            'annual_cents' => $plan->annual_cents,
            'included_seats' => $plan->included_seats,
            'features' => $plan->features ?? [],
        ];
    }
}
