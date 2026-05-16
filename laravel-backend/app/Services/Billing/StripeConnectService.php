<?php

namespace App\Services\Billing;

use App\Models\AdvisorProfile;
use Illuminate\Support\Facades\Log;

/**
 * Stripe Connect Express integration for advisor (and future
 * hospital-partner) payouts. Express accounts because:
 *   - Stripe handles KYC, identity verification, banking setup
 *   - Advisor gets a Stripe-hosted dashboard for tax docs + payouts
 *   - We use destination charges with application_fee_amount so the
 *     commission split is enforced by Stripe, not by us.
 *
 * Real Stripe API calls fire when STRIPE_SECRET is configured.
 * Otherwise the methods log + return stub state so the rest of the
 * advisor portal remains testable.
 */
class StripeConnectService
{
    public function __construct(
        private readonly StripeClientFactory $stripe,
    ) {}

    /**
     * Generate an onboarding link for an advisor to complete Stripe
     * Connect Express setup. If they don't have an account yet,
     * create one first.
     */
    public function generateOnboardingLink(AdvisorProfile $advisor): string
    {
        $client = $this->stripe->client();

        if (! $advisor->stripe_account_id) {
            $accountId = $this->createConnectAccount($advisor);
            $advisor->update([
                'stripe_account_id' => $accountId,
                'stripe_account_status' => $client ? 'pending' : 'pending',
            ]);
        }

        $siteUrl = rtrim((string) config('app.public_site_url', config('app.url')), '/');

        if (! $client) {
            Log::info('StripeConnectService::generateOnboardingLink (stub — no STRIPE_SECRET)', [
                'advisor_id' => $advisor->id,
                'stripe_account_id' => $advisor->stripe_account_id,
            ]);
            return '/referral/payouts/stub-onboarding?account=' . $advisor->stripe_account_id;
        }

        try {
            $link = $client->accountLinks->create([
                'account' => $advisor->stripe_account_id,
                'refresh_url' => $siteUrl . '/referral/profile?connect=refresh',
                'return_url' => $siteUrl . '/referral/profile?connect=done',
                'type' => 'account_onboarding',
            ]);
        } catch (\Throwable $e) {
            Log::error('StripeConnectService::generateOnboardingLink — AccountLink create failed', [
                'advisor_id' => $advisor->id,
                'stripe_account_id' => $advisor->stripe_account_id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }

        return $link->url;
    }

    /**
     * Create a new Express account for an advisor. Returns the Stripe
     * account ID. Called by generateOnboardingLink on first run.
     */
    private function createConnectAccount(AdvisorProfile $advisor): string
    {
        $client = $this->stripe->client();

        if (! $client) {
            // Dev — generate a stub ID so the rest of the flow has
            // something to reference.
            return 'acct_stub_' . substr($advisor->id, 0, 8);
        }

        try {
            $account = $client->accounts->create([
                'type' => 'express',
                'country' => 'US',
                'email' => $advisor->user?->email,
                'capabilities' => [
                    'transfers' => ['requested' => true],
                ],
                'business_type' => 'individual',
                'metadata' => [
                    'advisor_profile_id' => (string) $advisor->id,
                    'user_id' => (string) $advisor->user_id,
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('StripeConnectService::createConnectAccount — Account create failed', [
                'advisor_id' => $advisor->id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }

        return $account->id;
    }

    /**
     * Refresh local state from Stripe — called from webhook handler
     * (account.updated) or admin-triggered re-sync. Updates
     * stripe_account_status by inspecting charges_enabled +
     * payouts_enabled + requirements.disabled_reason.
     */
    public function syncAccountStatus(AdvisorProfile $advisor): void
    {
        $client = $this->stripe->client();

        if (! $client || ! $advisor->stripe_account_id || str_starts_with($advisor->stripe_account_id, 'acct_stub_')) {
            Log::info('StripeConnectService::syncAccountStatus (stub or no account)', [
                'advisor_id' => $advisor->id,
                'stripe_account_id' => $advisor->stripe_account_id,
            ]);
            return;
        }

        try {
            $account = $client->accounts->retrieve($advisor->stripe_account_id);
        } catch (\Throwable $e) {
            Log::error('StripeConnectService::syncAccountStatus — Account retrieve failed', [
                'advisor_id' => $advisor->id,
                'error' => $e->getMessage(),
            ]);
            return;
        }

        $charges = (bool) ($account->charges_enabled ?? false);
        $payouts = (bool) ($account->payouts_enabled ?? false);
        $disabledReason = $account->requirements->disabled_reason ?? null;
        $currentlyDue = $account->requirements->currently_due ?? [];

        $status = match (true) {
            $charges && $payouts                  => 'active',
            ! empty($disabledReason)              => 'restricted',
            ! empty($currentlyDue)                => 'pending',
            default                                => 'verifying',
        };

        $advisor->update(['stripe_account_status' => $status]);
        // Mirror to user row for cross-portal access.
        if ($advisor->user) {
            $advisor->user->update(['stripe_account_status' => $status]);
        }
    }
}
