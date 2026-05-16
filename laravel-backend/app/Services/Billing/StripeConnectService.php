<?php

namespace App\Services\Billing;

use App\Models\AdvisorProfile;
use Illuminate\Support\Facades\Log;

/**
 * Stripe Connect Express integration for advisor (and future
 * hospital-partner) payouts. We use Express accounts because:
 *   - Stripe handles KYC, identity verification, banking setup
 *   - Advisor gets a Stripe-hosted dashboard for tax docs + payouts
 *   - We can do destination charges with application_fee_amount
 *     so the commission split is enforced by Stripe, not us.
 *
 * Today: stubs that log + write local state. Wire to real Stripe API
 * once STRIPE_SECRET + STRIPE_CONNECT_CLIENT_ID are in the env and we
 * have an advisor signed up to test against.
 */
class StripeConnectService
{
    /**
     * Generate an onboarding link for an advisor to complete Stripe
     * Connect Express setup. If they don't have an account yet,
     * create one first. Returns the URL the advisor should be sent to.
     */
    public function generateOnboardingLink(AdvisorProfile $advisor): string
    {
        if (! $advisor->stripe_account_id) {
            $advisor->stripe_account_id = $this->createConnectAccount($advisor);
            $advisor->stripe_account_status = 'pending';
            $advisor->save();
        }

        // TODO[stripe]:
        //   $link = \Stripe\AccountLink::create([
        //     'account' => $advisor->stripe_account_id,
        //     'refresh_url' => config('app.public_site_url') . '/referral/payouts/refresh',
        //     'return_url'  => config('app.public_site_url') . '/referral/payouts/return',
        //     'type' => 'account_onboarding',
        //   ]);
        //   return $link->url;
        Log::info('StripeConnectService::generateOnboardingLink (stub)', [
            'advisor_id' => $advisor->id,
            'stripe_account_id' => $advisor->stripe_account_id,
        ]);
        return '/referral/payouts/stub-onboarding?account=' . $advisor->stripe_account_id;
    }

    /**
     * Create a new Express account for an advisor. Returns the
     * Stripe account ID.
     */
    private function createConnectAccount(AdvisorProfile $advisor): string
    {
        // TODO[stripe]:
        //   $account = \Stripe\Account::create([
        //     'type' => 'express',
        //     'country' => 'US',
        //     'email' => $advisor->user->email,
        //     'capabilities' => [
        //       'transfers' => ['requested' => true],
        //     ],
        //     'business_type' => 'individual',
        //     'metadata' => ['advisor_profile_id' => $advisor->id],
        //   ]);
        //   return $account->id;
        return 'acct_stub_' . substr($advisor->id, 0, 8);
    }

    /**
     * Refresh local state from Stripe — called from webhook handler
     * or admin-triggered re-sync. Updates stripe_account_status.
     */
    public function syncAccountStatus(AdvisorProfile $advisor): void
    {
        // TODO[stripe]:
        //   $account = \Stripe\Account::retrieve($advisor->stripe_account_id);
        //   $status = $account->charges_enabled && $account->payouts_enabled
        //     ? 'active'
        //     : ($account->requirements->disabled_reason ? 'restricted' : 'verifying');
        //   $advisor->update(['stripe_account_status' => $status]);
        Log::info('StripeConnectService::syncAccountStatus (stub)', [
            'advisor_id' => $advisor->id,
        ]);
    }
}
