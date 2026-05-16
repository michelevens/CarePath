<?php

namespace App\Services\Billing;

use Stripe\StripeClient;

/**
 * Thin DI seam for the Stripe SDK. Returns null when STRIPE_SECRET
 * isn't configured so each calling service can degrade gracefully
 * (log + stub URL) instead of throwing a 500.
 *
 * Caching the client per-request avoids paying the SDK construction
 * cost on every Stripe call inside a single web request.
 */
class StripeClientFactory
{
    private ?StripeClient $cached = null;
    private bool $resolved = false;

    public function client(): ?StripeClient
    {
        if ($this->resolved) {
            return $this->cached;
        }
        $secret = config('services.stripe.secret');
        $this->cached = $secret ? new StripeClient($secret) : null;
        $this->resolved = true;
        return $this->cached;
    }

    public function isConfigured(): bool
    {
        return $this->client() !== null;
    }
}
