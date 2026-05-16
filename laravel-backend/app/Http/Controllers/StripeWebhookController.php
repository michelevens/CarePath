<?php

namespace App\Http\Controllers;

use App\Models\AdvisorProfile;
use App\Models\Facility;
use App\Models\Placement;
use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Stripe\Webhook;

/**
 * Stripe sends events here when something changes on their side.
 * Signature-verified using STRIPE_WEBHOOK_SECRET so the endpoint can
 * stay unauthenticated.
 *
 * Events handled:
 *   - customer.subscription.created / .updated / .deleted
 *   - invoice.payment_failed
 *   - account.updated  (Connect onboarding state changes)
 *   - transfer.created (payout to advisor)
 *
 * Anything else is logged + ignored. We never throw 4xx on unknown
 * event types — Stripe will retry on non-2xx and we don't want them
 * banging on us.
 */
class StripeWebhookController extends Controller
{
    /**
     * POST /api/stripe/webhook
     */
    public function handle(Request $request): JsonResponse
    {
        $secret = config('services.stripe.webhook_secret');
        $signature = $request->header('Stripe-Signature');

        // In dev / before Stripe is configured, the secret will be null.
        // We log + 200-OK in that case so manual cURL probes don't 500.
        if (! $secret || ! $signature) {
            Log::warning('Stripe webhook received without verification config', [
                'has_secret' => (bool) $secret,
                'has_signature' => (bool) $signature,
            ]);
            return response()->json(['ok' => true, 'verified' => false]);
        }

        try {
            $event = Webhook::constructEvent($request->getContent(), $signature, $secret);
        } catch (\Exception $e) {
            Log::error('Stripe webhook signature verification failed', [
                'error' => $e->getMessage(),
            ]);
            return response()->json(['error' => 'Invalid signature'], 400);
        }

        Log::info('Stripe webhook received', [
            'type' => $event->type,
            'id' => $event->id,
        ]);

        match ($event->type) {
            'customer.subscription.created',
            'customer.subscription.updated'   => $this->handleSubscriptionUpsert($event->data->object),
            'customer.subscription.deleted'   => $this->handleSubscriptionDeleted($event->data->object),
            'invoice.payment_failed'          => $this->handlePaymentFailed($event->data->object),
            'account.updated'                 => $this->handleConnectAccountUpdated($event->data->object),
            'transfer.created'                => $this->handleTransferCreated($event->data->object),
            default                            => Log::info('Stripe webhook unhandled event type', ['type' => $event->type]),
        };

        return response()->json(['ok' => true]);
    }

    /**
     * Create or update the local Subscription mirror. The Stripe
     * Subscription object carries metadata we set at checkout time:
     *   metadata.subscriber_type = "facility" | "user"
     *   metadata.subscriber_id   = uuid
     *   metadata.plan_slug       = "facility-pro" | ...
     */
    private function handleSubscriptionUpsert($stripeSub): void
    {
        $metadata = $stripeSub->metadata ?? null;
        $subscriberType = $metadata->subscriber_type ?? null;
        $subscriberId = $metadata->subscriber_id ?? null;
        $planSlug = $metadata->plan_slug ?? null;

        if (! $subscriberType || ! $subscriberId || ! $planSlug) {
            Log::warning('Stripe sub upsert missing metadata', [
                'stripe_id' => $stripeSub->id,
                'metadata' => (array) ($metadata ?? []),
            ]);
            return;
        }

        $plan = SubscriptionPlan::where('slug', $planSlug)->first();
        if (! $plan) {
            Log::warning('Stripe sub references unknown plan', [
                'plan_slug' => $planSlug,
                'stripe_id' => $stripeSub->id,
            ]);
            return;
        }

        $sub = Subscription::updateOrCreate(
            ['stripe_subscription_id' => $stripeSub->id],
            [
                'subscriber_type' => $subscriberType === 'facility' ? Facility::class : User::class,
                'subscriber_id' => $subscriberId,
                'subscription_plan_id' => $plan->id,
                'stripe_customer_id' => $stripeSub->customer ?? null,
                'status' => $stripeSub->status,
                'billing_cycle' => self::detectCycle($stripeSub),
                'trial_ends_at' => self::ts($stripeSub->trial_end ?? null),
                'current_period_started_at' => self::ts($stripeSub->current_period_start ?? null),
                'current_period_ends_at' => self::ts($stripeSub->current_period_end ?? null),
                'canceled_at' => self::ts($stripeSub->canceled_at ?? null),
                'ended_at' => self::ts($stripeSub->ended_at ?? null),
            ],
        );

        // Mirror the active tier onto the facility for fast read-time
        // gating. (Users with personal subs don't need the cache —
        // their nav already loads via /me.)
        if ($subscriberType === 'facility') {
            $facility = Facility::find($subscriberId);
            if ($facility) {
                $facility->update([
                    'subscription_tier' => $sub->isActive() ? $plan->tier : 'free',
                    'subscription_status' => $sub->status,
                ]);
            }
        }
    }

    private function handleSubscriptionDeleted($stripeSub): void
    {
        $sub = Subscription::where('stripe_subscription_id', $stripeSub->id)->first();
        if (! $sub) return;

        $sub->update([
            'status' => 'canceled',
            'ended_at' => self::ts($stripeSub->ended_at ?? null) ?? now(),
        ]);

        if ($sub->subscriber_type === Facility::class) {
            Facility::where('id', $sub->subscriber_id)
                ->update(['subscription_tier' => 'free', 'subscription_status' => 'canceled']);
        }
    }

    /**
     * Failed invoice — mark sub past_due so gating can warn the user
     * (and downgrade after the grace period).
     */
    private function handlePaymentFailed($invoice): void
    {
        $stripeSubId = $invoice->subscription ?? null;
        if (! $stripeSubId) return;

        $sub = Subscription::where('stripe_subscription_id', $stripeSubId)->first();
        if (! $sub) return;

        $sub->update(['status' => 'past_due']);

        if ($sub->subscriber_type === Facility::class) {
            Facility::where('id', $sub->subscriber_id)
                ->update(['subscription_status' => 'past_due']);
        }
    }

    /**
     * Stripe Connect Express account onboarding state changed —
     * mirror the new status onto the advisor profile.
     */
    private function handleConnectAccountUpdated($account): void
    {
        $profile = AdvisorProfile::where('stripe_account_id', $account->id)->first();
        if (! $profile) return;

        $status = match (true) {
            ($account->charges_enabled ?? false) && ($account->payouts_enabled ?? false) => 'active',
            (! empty($account->requirements?->disabled_reason ?? null))                  => 'restricted',
            (! empty($account->requirements?->currently_due ?? []))                      => 'pending',
            default                                                                       => 'verifying',
        };

        $profile->update(['stripe_account_status' => $status]);
        // Mirror to user row for cross-portal access.
        if ($profile->user) {
            $profile->user->update(['stripe_account_status' => $status]);
        }
    }

    /**
     * A payout was made to an advisor — record the transfer ID on the
     * matching placement (we set metadata.placement_id when creating
     * the transfer).
     */
    private function handleTransferCreated($transfer): void
    {
        $placementId = $transfer->metadata->placement_id ?? null;
        if (! $placementId) return;

        $placement = Placement::find($placementId);
        if (! $placement) return;

        $placement->update([
            'stripe_transfer_id' => $transfer->id,
            'paid_at' => now(),
            'amount_paid_cents' => $placement->amount_paid_cents + ($transfer->amount ?? 0),
        ]);
    }

    private static function detectCycle($stripeSub): string
    {
        // Stripe sub items carry the price; the price's recurring.interval
        // is 'month' or 'year'.
        $interval = $stripeSub->items->data[0]->price->recurring->interval ?? 'month';
        return $interval === 'year' ? 'annual' : 'monthly';
    }

    private static function ts(?int $unix): ?\DateTimeInterface
    {
        return $unix ? \Carbon\CarbonImmutable::createFromTimestamp($unix) : null;
    }
}
