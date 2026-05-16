<?php

namespace App\Http\Controllers\Facility;

use App\Http\Controllers\Controller;
use App\Models\Facility;
use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use App\Services\Billing\SubscriptionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

/**
 * Facility-side subscription management. All endpoints require an
 * authenticated user whose active_facility_id is set — the facility-
 * admin role check happens in routes/api.php via middleware.
 */
class BillingController extends Controller
{
    public function __construct(
        private readonly SubscriptionService $subs,
    ) {}

    /**
     * GET /api/facility/billing/plans
     * Returns all active facility-audience plans for the picker UI.
     */
    public function plans(): JsonResponse
    {
        $plans = SubscriptionPlan::query()
            ->where('audience', 'facility')
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get()
            ->map(fn ($p) => $this->serializePlan($p));

        return response()->json(['data' => $plans]);
    }

    /**
     * GET /api/facility/billing/subscription
     * Current subscription for the user's active facility, plus the
     * plan it's on (Free if no active subscription).
     */
    public function show(Request $request): JsonResponse
    {
        $facility = $this->facilityOrFail($request);
        $sub = $this->subs->activeFor($facility);

        return response()->json([
            'data' => [
                'facility' => [
                    'id' => $facility->id,
                    'name' => $facility->name,
                    'subscription_tier' => $facility->subscription_tier ?? 'free',
                    'subscription_status' => $facility->subscription_status ?? 'active',
                ],
                'subscription' => $sub ? [
                    'id' => $sub->id,
                    'status' => $sub->status,
                    'billing_cycle' => $sub->billing_cycle,
                    'current_period_ends_at' => $sub->current_period_ends_at,
                    'canceled_at' => $sub->canceled_at,
                    'trial_ends_at' => $sub->trial_ends_at,
                    'plan' => $this->serializePlan($sub->plan),
                ] : [
                    // No active subscription = facility is on free tier.
                    'status' => 'free',
                    'plan' => $this->serializePlan(
                        SubscriptionPlan::where('audience', 'facility')
                            ->where('tier', 'free')
                            ->where('is_active', true)
                            ->first()
                    ),
                ],
            ],
        ]);
    }

    /**
     * POST /api/facility/billing/checkout
     * Initiates a plan change. Returns a Stripe Checkout URL (or stub
     * URL in dev). Caller redirects the browser to it; the local
     * Subscription row is created when the webhook fires.
     */
    public function checkout(Request $request): JsonResponse
    {
        $data = $request->validate([
            'plan_slug' => ['required', 'string'],
            'billing_cycle' => ['nullable', 'in:monthly,annual'],
        ]);

        $facility = $this->facilityOrFail($request);
        $plan = SubscriptionPlan::query()
            ->where('slug', $data['plan_slug'])
            ->where('audience', 'facility')
            ->where('is_active', true)
            ->firstOrFail();

        // Free tier doesn't go through Stripe — just downgrade locally.
        // The active paid subscription will continue until current_period_ends_at;
        // here we just cancel-at-period-end and the webhook flips the cache.
        if ($plan->tier === 'free') {
            $existing = $this->subs->activeFor($facility);
            if ($existing) {
                $this->subs->cancelAtPeriodEnd($existing);
            }
            return response()->json([
                'ok' => true,
                'message' => $existing
                    ? 'Plan will downgrade at the end of your current billing cycle.'
                    : 'Already on the free tier.',
            ]);
        }

        $url = $this->subs->startCheckout(
            $facility,
            $plan,
            $data['billing_cycle'] ?? 'monthly'
        );

        return response()->json(['checkout_url' => $url]);
    }

    /**
     * POST /api/facility/billing/cancel
     * Cancels at end of current period. The user keeps paid features
     * until then.
     */
    public function cancel(Request $request): JsonResponse
    {
        $facility = $this->facilityOrFail($request);
        $sub = $this->subs->activeFor($facility);

        if (! $sub) {
            throw ValidationException::withMessages([
                'subscription' => 'No active subscription to cancel.',
            ]);
        }

        $this->subs->cancelAtPeriodEnd($sub);

        return response()->json([
            'ok' => true,
            'cancels_at' => $sub->current_period_ends_at,
        ]);
    }

    private function facilityOrFail(Request $request): Facility
    {
        $user = Auth::user();
        if (! $user || ! $user->active_facility_id) {
            abort(403, 'No active facility for the authenticated user.');
        }
        $facility = Facility::find($user->active_facility_id);
        if (! $facility) {
            abort(404, 'Active facility not found.');
        }
        return $facility;
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
