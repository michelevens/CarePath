<?php

namespace App\Services\Billing;

use App\Models\Facility;
use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Log;

/**
 * Local-side subscription lifecycle. Wraps the Stripe-side flow so the
 * rest of the app can do `SubscriptionService::start($facility, 'facility-pro')`
 * without knowing about Stripe internals.
 *
 * Today: writes/reads the local mirror table only. Stripe API calls are
 * stubbed and logged so the rest of the codebase can be built against
 * the interface. Once STRIPE_SECRET is configured in the env, switch
 * the stub methods to real Stripe\Checkout\Session::create() / etc.
 */
class SubscriptionService
{
    /**
     * Look up the active subscription for a subscriber. Returns null
     * when the subscriber is on the free tier (no subscription row).
     */
    public function activeFor(Model $subscriber): ?Subscription
    {
        return Subscription::query()
            ->where('subscriber_type', $subscriber->getMorphClass())
            ->where('subscriber_id', $subscriber->getKey())
            ->whereIn('status', Subscription::ACTIVE_STATUSES)
            ->latest()
            ->first();
    }

    /**
     * Does the subscriber have a feature flag? Used by middleware /
     * gating helpers. Free-tier subscribers fall through to the default
     * features in the Free plan for their audience.
     */
    public function hasFeature(Model $subscriber, string $featureKey): bool
    {
        $sub = $this->activeFor($subscriber);
        if ($sub) {
            return $sub->plan->hasFeature($featureKey);
        }
        // Fall back to the free plan for this subscriber's audience.
        $audience = $this->audienceFor($subscriber);
        $free = SubscriptionPlan::query()
            ->where('audience', $audience)
            ->where('tier', 'free')
            ->where('is_active', true)
            ->first();
        return $free?->hasFeature($featureKey) ?? false;
    }

    /**
     * Begin a checkout for the given subscriber + plan. Returns either
     * a Stripe Checkout URL (production) or a stub URL (dev). The
     * actual `Subscription` row is created when Stripe's webhook fires
     * `customer.subscription.created`, not here.
     */
    public function startCheckout(Model $subscriber, SubscriptionPlan $plan, string $cycle = 'monthly'): string
    {
        // TODO[stripe]: call Stripe\Checkout\Session::create() with the
        // plan's stripe_price_id_{monthly|annual}, customer email, success
        // URL, cancel URL, metadata = {subscriber_type, subscriber_id}.
        Log::info('SubscriptionService::startCheckout (stub)', [
            'subscriber_type' => $subscriber->getMorphClass(),
            'subscriber_id' => $subscriber->getKey(),
            'plan_slug' => $plan->slug,
            'cycle' => $cycle,
        ]);
        return '/billing/stub-checkout?plan=' . $plan->slug;
    }

    /**
     * Cancel at period end. Local status moves to 'canceled' only when
     * the webhook fires; this just signals Stripe.
     */
    public function cancelAtPeriodEnd(Subscription $sub): void
    {
        // TODO[stripe]: \Stripe\Subscription::update($sub->stripe_subscription_id, ['cancel_at_period_end' => true]);
        Log::info('SubscriptionService::cancelAtPeriodEnd (stub)', [
            'subscription_id' => $sub->id,
        ]);
        $sub->update(['canceled_at' => now()]);
    }

    /**
     * Map a subscriber instance to its plan audience.
     */
    private function audienceFor(Model $subscriber): string
    {
        return match (true) {
            $subscriber instanceof Facility => 'facility',
            $subscriber instanceof User => 'advisor', // assume advisor; family users typically don't subscribe
            default => 'facility',
        };
    }
}
