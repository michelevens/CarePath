<?php

namespace App\Services\Billing;

use App\Models\Facility;
use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Log;

/**
 * Local-side subscription lifecycle. Wraps Stripe so the rest of the
 * app can do `SubscriptionService::start($facility, 'facility-pro')`
 * without knowing about Stripe internals.
 *
 * When STRIPE_SECRET is set, real Stripe Checkout / Subscription API
 * calls go through StripeClientFactory. When unset (dev/staging without
 * keys), the methods log + return stub URLs so the rest of the UI
 * remains testable.
 */
class SubscriptionService
{
    public function __construct(
        private readonly StripeClientFactory $stripe,
    ) {}

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
        $client = $this->stripe->client();

        // Dev / no-Stripe-key path — return a stub URL the UI can recognize.
        if (! $client) {
            Log::info('SubscriptionService::startCheckout (stub — no STRIPE_SECRET)', [
                'subscriber_type' => $subscriber->getMorphClass(),
                'subscriber_id' => $subscriber->getKey(),
                'plan_slug' => $plan->slug,
                'cycle' => $cycle,
            ]);
            return '/billing/stub-checkout?plan=' . $plan->slug;
        }

        $priceId = $cycle === 'annual'
            ? $plan->stripe_price_id_annual
            : $plan->stripe_price_id_monthly;

        if (! $priceId) {
            Log::warning('SubscriptionService::startCheckout — plan missing Stripe price ID', [
                'plan_slug' => $plan->slug,
                'cycle' => $cycle,
            ]);
            throw new \RuntimeException(
                "Plan {$plan->slug} is not yet configured for {$cycle} billing. "
                . "Set its stripe_price_id_{$cycle} column to the Stripe Price ID."
            );
        }

        // Pull or create the Stripe customer ID for this subscriber.
        $customerId = $this->ensureCustomer($subscriber, $client);

        $siteUrl = rtrim((string) config('app.public_site_url', config('app.url')), '/');

        try {
            $session = $client->checkout->sessions->create([
                'mode' => 'subscription',
                'customer' => $customerId,
                'line_items' => [[
                    'price' => $priceId,
                    'quantity' => 1,
                ]],
                'success_url' => $siteUrl . '/billing/success?cs={CHECKOUT_SESSION_ID}',
                'cancel_url' => $siteUrl . '/billing/canceled',
                'subscription_data' => [
                    'metadata' => [
                        'subscriber_type' => $subscriber instanceof Facility ? 'facility' : 'user',
                        'subscriber_id' => (string) $subscriber->getKey(),
                        'plan_slug' => $plan->slug,
                    ],
                ],
                'metadata' => [
                    'subscriber_type' => $subscriber instanceof Facility ? 'facility' : 'user',
                    'subscriber_id' => (string) $subscriber->getKey(),
                    'plan_slug' => $plan->slug,
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('SubscriptionService::startCheckout — Stripe Checkout create failed', [
                'plan_slug' => $plan->slug,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }

        return $session->url;
    }

    /**
     * Cancel at period end. Local status moves to 'canceled' only when
     * the webhook fires; this just signals Stripe.
     */
    public function cancelAtPeriodEnd(Subscription $sub): void
    {
        $client = $this->stripe->client();

        if ($client && $sub->stripe_subscription_id) {
            try {
                $client->subscriptions->update($sub->stripe_subscription_id, [
                    'cancel_at_period_end' => true,
                ]);
            } catch (\Throwable $e) {
                Log::error('SubscriptionService::cancelAtPeriodEnd — Stripe call failed', [
                    'subscription_id' => $sub->id,
                    'stripe_subscription_id' => $sub->stripe_subscription_id,
                    'error' => $e->getMessage(),
                ]);
                throw $e;
            }
        } else {
            Log::info('SubscriptionService::cancelAtPeriodEnd (stub — no Stripe or no stripe_subscription_id)', [
                'subscription_id' => $sub->id,
            ]);
        }

        $sub->update(['canceled_at' => now()]);
    }

    /**
     * Ensure a Stripe customer exists for this subscriber and return
     * its ID. Caches the new ID onto the subscriber row so future
     * checkouts reuse the same customer (unified billing dashboard).
     */
    private function ensureCustomer(Model $subscriber, \Stripe\StripeClient $client): string
    {
        $existing = $subscriber->stripe_customer_id ?? null;
        if ($existing) return $existing;

        $email = match (true) {
            $subscriber instanceof Facility => $subscriber->email,
            $subscriber instanceof User => $subscriber->email,
            default => null,
        };
        $name = match (true) {
            $subscriber instanceof Facility => $subscriber->name,
            $subscriber instanceof User => $subscriber->name,
            default => null,
        };

        $customer = $client->customers->create(array_filter([
            'email' => $email,
            'name' => $name,
            'metadata' => [
                'subscriber_type' => $subscriber instanceof Facility ? 'facility' : 'user',
                'subscriber_id' => (string) $subscriber->getKey(),
            ],
        ]));

        $subscriber->update(['stripe_customer_id' => $customer->id]);
        return $customer->id;
    }

    /**
     * Map a subscriber instance to its plan audience for free-tier
     * feature fallbacks.
     */
    private function audienceFor(Model $subscriber): string
    {
        if ($subscriber instanceof Facility) {
            return 'facility';
        }
        if ($subscriber instanceof User) {
            return $subscriber->hasRole('referral_partner') ? 'advisor' : 'family';
        }
        return 'facility';
    }
}
