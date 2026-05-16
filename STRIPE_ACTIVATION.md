# Stripe Activation Playbook

> Step-by-step from "code shipped, no real money flowing" to "live revenue across all 5 stubbed monetization streams." Read top-to-bottom; **do not skip steps**. Every step is required.

The product code is already wired for real Stripe — every billing service checks `StripeClientFactory::client()` per-request and flips from stub to real Stripe the moment `STRIPE_SECRET` lands in the env. No code deploy needed for activation.

---

## 1. Stripe account + Connect platform setup (one-time, ~30 min)

### 1.1 Create Stripe account

- Go to https://dashboard.stripe.com/register
- Use a CarePath-business email (NOT a personal account)
- Country: US
- Business type: Company

### 1.2 Enable Connect

- In dashboard, go to **Settings → Connect → Get started**
- Pick **Standard or Express** — choose **Express** (we use Express in `StripeConnectService::createConnectAccount()` with `'type' => 'express'`)
- Enable **Transfers** capability (required for `Stripe\Transfer::create()` calls to advisors / hospitals)
- Brand the onboarding: upload CarePath logo, set brand color (`#7c3aed` to match our violet primary)
- Set the **Connect platform Terms of Service** link (use a public-facing URL like carepath.io/connect-tos when ready)

### 1.3 Note your Connect Client ID

- Visible at Settings → Connect → Settings
- Looks like `ca_xxx`
- Save it — goes into `STRIPE_CONNECT_CLIENT_ID` env var below

### 1.4 Start in **Test Mode** (toggle top-right of dashboard)

All steps below assume Test Mode until you've fully end-to-end tested. Switch to Live only after seeding a fake advisor → fake placement → fake payout works without errors.

---

## 2. Create Products + Prices in Stripe (one-time per plan)

We have **8 plans** in `subscription_plans`. Each one needs a Stripe Product + 1-2 Prices (monthly + optional annual).

### 2.1 Reference list (slug → display)

| slug | name | monthly | annual |
|---|---|---|---|
| `facility-pro` | Facility · Pro | $299 | $2,870 |
| `facility-network` | Facility · Network | $999 | $9,590 |
| `advisor-solo` | Advisor · Solo | $79 | $759 |
| `advisor-team` | Advisor · Team | $199 | $1,910 |
| `advisor-agency` | Advisor · Agency | $499 | $4,790 |
| `family-pro` | Family · Pro | $29 | $290 |

(`facility-free`, `family-free` are free tiers — no Stripe Product needed.)

### 2.2 For each plan above

1. **Products → + Add product**
2. Name: copy from "name" column
3. Pricing: **Recurring**, Monthly, $X.XX
4. Click **Save product** — note the `prod_xxx` ID (you can ignore this if you only have one price per product)
5. Click into the product → **+ Add another price** → Recurring, Yearly, $Y.YY
6. Note both `price_xxx` IDs (monthly + annual)

### 2.3 Paste price IDs into `subscription_plans`

Easiest: SQL via Railway console (or `php artisan tinker`).

```sql
UPDATE subscription_plans SET stripe_price_id_monthly = 'price_xxx_facility_pro_monthly',
                              stripe_price_id_annual  = 'price_xxx_facility_pro_annual'
WHERE slug = 'facility-pro';
-- repeat for each of the 6 paid plans
```

Or via `php artisan tinker`:
```php
\App\Models\SubscriptionPlan::where('slug', 'facility-pro')->update([
    'stripe_price_id_monthly' => 'price_xxx',
    'stripe_price_id_annual' => 'price_yyy',
]);
```

---

## 3. Webhook endpoint (one-time)

### 3.1 Add the endpoint

- Stripe dashboard → **Developers → Webhooks → + Add endpoint**
- Endpoint URL: `https://carepath-api-production.up.railway.app/api/stripe/webhook`
- Events to send — select these 6 exactly:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
  - `account.updated`
  - `transfer.created`
- Click **Add endpoint**

### 3.2 Copy the signing secret

After creating the endpoint, click **Reveal** under "Signing secret". Looks like `whsec_xxx`. Goes into `STRIPE_WEBHOOK_SECRET` env var below.

---

## 4. Env vars on Railway

Settings → Variables → add these 4. `STRIPE_KEY` and `STRIPE_SECRET` come from **Developers → API keys** (use the **Test** versions until step 7).

```
STRIPE_KEY=pk_test_...                 # publishable
STRIPE_SECRET=sk_test_...              # secret server key
STRIPE_WEBHOOK_SECRET=whsec_...        # from step 3.2
STRIPE_CONNECT_CLIENT_ID=ca_...        # from step 1.3
```

**The moment `STRIPE_SECRET` is set, all billing services flip to real Stripe.** No deploy needed — `StripeClientFactory` checks the env per-request.

---

## 5. Procfile worker for scheduled jobs

Without this, the placement-milestone advancement and sponsored-spend reset don't run.

Edit `laravel-backend/Procfile`:
```
web: php artisan migrate --force && php artisan db:seed --force && php artisan serve --host=0.0.0.0 --port=${PORT:-8000}
worker: while true; do php artisan schedule:run --verbose --no-interaction; sleep 60; done
```

Then in Railway, **add a new service** that uses the same repo + `Procfile` and selects the `worker` process. This runs `schedule:run` every minute, which fires:
- `placements:advance-milestones` (hourly)
- `sponsored:reset-daily` (UTC midnight)

---

## 6. End-to-end test (in Test Mode)

You'll need test data — see `DemoMonetizationSeeder` (next file). After seeding:

### 6.1 Test facility-pro subscription flow

1. Log in as a facility admin (any demo facility-admin account)
2. Visit `/admin/billing`
3. Click "Choose Pro" → redirected to Stripe Checkout (test mode)
4. Use Stripe test card `4242 4242 4242 4242`, any future expiry, any CVC
5. Submit → Stripe webhook fires → local `Subscription` row created
6. Refresh `/admin/billing` — current plan shows "Facility · Pro · active"

### 6.2 Test advisor Connect onboarding

1. Log in as a referral_partner user
2. Visit `/referral/profile`
3. Click "Connect Stripe" → redirected to Stripe Express onboarding
4. Use test data (any name, SSN `000-00-0000`, etc.)
5. Complete onboarding → returned to `/referral/profile?connect=done`
6. Webhook `account.updated` fires → `stripe_account_status` flips to `active`
7. "Payout-ready" pill appears on `/referral`

### 6.3 Test placement payout flow

1. Manually create an admission with `attribution_source='advisor_link'`, `sourced_by_user_id=<advisor's user_id>`, `stage='admitted'`
2. Run `php artisan placements:advance-milestones --dry-run` — should show the placement as eligible
3. Run without `--dry-run` — placement created
4. Backdate the `retention_30d_milestone_on` to yesterday
5. Run `php artisan placements:advance-milestones` — releases 70% via `Stripe\Transfer::create()`
6. Check Stripe dashboard → Connect → Transfers — should see the transfer to the test advisor's Express account

### 6.4 Test sponsored listings billing

1. Log in as facility admin
2. Visit `/admin/sponsored` → create a campaign with $1 daily budget, $0.50 CPC
3. Open `/search?state=<facility's state>` in incognito → sponsored result appears at top
4. Click it → click POST fires → `spent_today_cents` increments by 50
5. Click again to bust budget → campaign auto-flips to `depleted`, stops appearing

---

## 7. Switch to Live Mode

Only after step 6 passes end-to-end.

1. Stripe dashboard → toggle to **Live mode** (top-right)
2. Recreate all 6 Prices in live mode (Stripe doesn't carry test data over). Update `subscription_plans` rows with live `price_xxx` IDs.
3. Recreate the webhook endpoint in live mode → update `STRIPE_WEBHOOK_SECRET`
4. Update env vars to live keys (`pk_live_`, `sk_live_`)
5. Test ONE real transaction with a real card you control to confirm money lands in your Stripe balance.

---

## 8. Operational basics for week 1

- **Daily Stripe dashboard check**: Disputes, failed payments, failed payouts.
- **Daily Railway logs**: search for `production.ERROR` and any `SubscriptionService` / `StripeConnectService` / `PlacementCommissionService` warnings.
- **Per-advisor verification**: confirm each new advisor's Stripe Connect onboarding completed (their `stripe_account_status` should be `active`, not `pending` or `restricted`).
- **Webhook health**: Stripe dashboard → Webhooks → check delivery success rate. Anything below 99% means our endpoint is intermittently failing — investigate.

---

## 9. If something blows up

- **Subscription not appearing after checkout**: webhook signature mismatch. Check `STRIPE_WEBHOOK_SECRET` matches the endpoint you copied from.
- **Connect onboarding redirects loop**: `return_url` / `refresh_url` mismatch with your `APP_URL`. Confirm Stripe dashboard return URLs.
- **Transfer create fails with `insufficient_capabilities`**: advisor's Express account didn't enable Transfers. Re-run onboarding.
- **Webhook spamming `signature verification failed`**: `STRIPE_WEBHOOK_SECRET` not set, or there's a proxy stripping the `Stripe-Signature` header (Railway should pass it through).

For anything unexplained, env var `APP_DEBUG=true` temporarily + check Railway logs for the actual stack trace, then flip back to `false`.
