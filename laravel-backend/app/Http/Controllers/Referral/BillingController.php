<?php

namespace App\Http\Controllers\Referral;

use App\Http\Controllers\Controller;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Services\Billing\SubscriptionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

/**
 * Advisor-side personal subscription management. Subscriber is the
 * authenticated User (the advisor). Plans are filtered to
 * audience='advisor' so the same UI pattern works as facility and
 * family billing without leaking plans across audiences.
 */
class BillingController extends Controller
{
    public function __construct(
        private readonly SubscriptionService $subs,
    ) {}

    /**
     * GET /api/referral/billing/plans
     */
    public function plans(): JsonResponse
    {
        $plans = SubscriptionPlan::query()
            ->where('audience', 'advisor')
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get()
            ->map(fn ($p) => $this->serializePlan($p));

        return response()->json(['data' => $plans]);
    }

    /**
     * GET /api/referral/billing/subscription
     */
    public function show(): JsonResponse
    {
        $user = $this->userOrFail();
        $sub = $this->subs->activeFor($user);

        return response()->json([
            'data' => [
                'user' => ['id' => $user->id, 'email' => $user->email],
                'subscription' => $sub && $sub->plan?->audience === 'advisor' ? [
                    'id' => $sub->id,
                    'status' => $sub->status,
                    'billing_cycle' => $sub->billing_cycle,
                    'current_period_ends_at' => $sub->current_period_ends_at,
                    'canceled_at' => $sub->canceled_at,
                    'trial_ends_at' => $sub->trial_ends_at,
                    'plan' => $this->serializePlan($sub->plan),
                ] : [
                    'status' => 'none',
                    'plan' => null, // advisors have no free tier — payouts gated on Connect, not on a plan
                ],
            ],
        ]);
    }

    /**
     * POST /api/referral/billing/checkout
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
            ->where('audience', 'advisor')
            ->where('is_active', true)
            ->firstOrFail();

        $url = $this->subs->startCheckout(
            $user,
            $plan,
            $data['billing_cycle'] ?? 'monthly'
        );

        return response()->json(['checkout_url' => $url]);
    }

    /**
     * POST /api/referral/billing/cancel
     */
    public function cancel(): JsonResponse
    {
        $user = $this->userOrFail();
        $sub = $this->subs->activeFor($user);

        if (! $sub || $sub->plan?->audience !== 'advisor') {
            throw ValidationException::withMessages([
                'subscription' => 'No active advisor subscription to cancel.',
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
            'placement_cap_per_year' => $plan->placement_cap_per_year,
            'features' => $plan->features ?? [],
        ];
    }
}
