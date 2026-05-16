# CarePath Monetization Architecture

> System-level reference for how money flows through CarePath. Pairs with
> `CLAUDE.md` (product positioning) and `ROADMAP.md` (phasing). Update
> this file when you change pricing, commission split structure, or
> add a new revenue stream.

## TL;DR

CarePath is a **multi-sided marketplace + SaaS platform**. Families
search free, always. Three groups pay:

- **Facilities** — SaaS subscriptions (Free / Pro / Network)
- **Placement advisors** — SaaS subscriptions + commission split on
  platform-sourced placements
- **Hospitals + researchers** (future) — widget license, data API

The wedge vs. APFM is *aligned incentives*, not "no monetization": we
make more when families find the **right** fit (retention-based payout
schedule) rather than any fit (lead-auction). See "Retention-based
payouts" below.

## Schema map

```
subscription_plans               ← public catalog of paid plans
  └── subscriptions              ← polymorphic; one row per active
                                    facility / advisor / family Pro sub

advisor_profiles                 ← extends users; Stripe Connect + license
  └── placements                 ← one row per facilitated move-in
                                    drives commission split + payouts

facilities.subscription_tier     ← cached for fast read-time gating
facilities.stripe_customer_id    ← Stripe billing handle

users.stripe_customer_id         ← personal Stripe customer (Family / Advisor)
users.stripe_account_id          ← Stripe Connect Express account
users.stripe_account_status      ← mirror of Stripe's onboarding state

admissions.sourced_by_user_id    ← who sourced this inquiry (advisor/hospital)
admissions.attribution_source    ← marketplace | advisor_link | hospital_widget | direct
admissions.attribution_context   ← UTM / campaign / referrer context
```

## Service surface

| Service | Today | When Stripe is configured |
|---|---|---|
| `SubscriptionService` | local mirror reads/writes, gating via `hasFeature()`, stub checkout URLs | `Stripe\Checkout\Session::create()`, webhook handlers |
| `StripeConnectService` | stub Express account creation, logs everything | `Stripe\Account::create()`, `Stripe\AccountLink::create()` |
| `PlacementCommissionService` | computes split, advances retention milestones, schedules payouts | `Stripe\Transfer::create()` with destination + metadata |

## The 8 revenue streams (by status)

| # | Stream | Schema-ready | Service stub | UI | Stripe wiring |
|---|---|---|---|---|---|
| 1 | Facility SaaS subs | ✅ | ✅ | ❌ | ❌ |
| 2 | Placement commission take-rate | ✅ | ✅ | ❌ | ❌ |
| 3 | Advisor SaaS subs | ✅ | ✅ | ❌ | ❌ |
| 4 | Hospital discharge widget | ❌ (needs `hospital_partners` table) | ❌ | ❌ | ❌ |
| 5 | Sponsored listings | ❌ (needs `sponsored_listings` table) | ❌ | ❌ | ❌ |
| 6 | Family Pro tier | ✅ | ✅ | ❌ | ❌ |
| 7 | Data API license | ❌ (needs `api_keys` + usage metering) | ❌ | ❌ | ❌ |
| 8 | Newsletter sponsorship | manual / out-of-band | n/a | n/a | n/a |

## Retention-based payouts

Industry-standard placement fees pay 100% at admission. APFM, Caring,
and the lead-broker network operate this way — once the contract is
signed, the advisor is paid regardless of whether the resident stays a
week or a year. This rewards any placement, not the right one.

CarePath splits the advisor's portion across milestones:

| Milestone | Released | Triggered when |
|---|---|---|
| Pending → Confirmed | $0 | Rescission window (7d) closes |
| → Retained 30d | 70% of advisor payout | Resident still admitted 30 days post-move |
| → Retained 90d | 30% of advisor payout | Resident still admitted 90 days post-move |
| → Paid in full | n/a | Both milestones cleared |

A `placements:advance-milestones` scheduled job runs nightly and calls
`PlacementCommissionService::advanceMilestones()` for every active
placement. Rescissions inside the 7-day window void all payouts; later
disputes use the `disputed` status and human-resolved reversals.

This costs us a little in advisor recruiting friction (they're used to
pay-on-admission). We compensate with:

- A higher base split for verified-network advisors (82/18 vs ~15/85
  industry default)
- The "Vetted advisor network" trust badge surfaced on advisor
  profiles, requiring compensation transparency disclosure
- Faster lead flow at scale than they can source independently

## Commission split mechanics

Split is **snapshotted at admission time** on the `placements` row
(`platform_split_pct`). Changing an advisor's `commission_split_*_pct`
on their profile does NOT retroactively affect already-recorded
placements — only future ones. This protects both sides if you adjust
the program later.

Default splits:

| Advisor tier | Platform | Advisor |
|---|---|---|
| Solo (default) | 18% | 82% |
| Team | 18% | 82% |
| Agency | 15% | 85% (volume rebate) |
| Verified premium (manual) | 12.5% | 87.5% |
| Direct (no advisor) | 100% | n/a — facility pays direct-placement fee at lower gross |

Stripe Connect uses `destination` charges with `application_fee_amount`
once wired, so the split is enforced by Stripe rather than us — Stripe
sends the advisor share directly to their Connect account and credits
our platform balance with the application fee.

## Plan catalog

Source of truth: `database/seeders/SubscriptionPlansSeeder.php`.
Idempotent — re-runs on every release. Stripe price IDs are seeded as
NULL; create the prices in the Stripe dashboard then update the rows
manually or via a follow-up data migration.

Pricing:

| Audience | Tier | Monthly | Annual | Notes |
|---|---|---|---|---|
| Facility | Free | $0 | $0 | Listing + CMS data visible |
| Facility | Pro | $299 | $2,870 (20% off) | 5 seats, full ops portal |
| Facility | Network | $999/fac | $9,590 | 25 seats, SSO, white-label, API |
| Advisor | Solo | $79 | $759 | 1 seat, 50 placements/yr cap |
| Advisor | Team | $199 | $1,910 | 5 seats, 200 placements/yr cap |
| Advisor | Agency | $499 | $4,790 | Unlimited |
| Family | Free | $0 | $0 | All search/compare/save/guides |
| Family | Pro | $29 | $290 (17% off) | Document vault, multi-member sharing |

## Feature gating

Every plan carries a `features[]` array (snake_case keys). Check at
runtime:

```php
app(SubscriptionService::class)->hasFeature($facility, 'admissions_kanban')
```

Free-plan features are returned by fallback for subscribers without an
active subscription. Plan key strings should NOT be hardcoded into the
codebase scattered — define a central enum in
`app/Support/Features.php` (TODO) as the feature set grows.

## To activate (turning the stubs into real billing)

In order:

1. **Stripe dashboard setup**
   - Create Stripe account
   - Enable Stripe Connect (Express)
   - Create Prices for each plan; copy IDs into `subscription_plans`
     (`stripe_price_id_monthly` / `_annual`)
   - Configure Connect platform settings (logo, branding, T&Cs)

2. **Env vars (Railway + local `.env`)**
   ```
   STRIPE_KEY=pk_live_...                # publishable
   STRIPE_SECRET=sk_live_...             # secret server key
   STRIPE_WEBHOOK_SECRET=whsec_...       # one per webhook endpoint
   STRIPE_CONNECT_CLIENT_ID=ca_...
   ```

3. **Replace TODO[stripe] blocks** in:
   - `app/Services/Billing/SubscriptionService.php`
   - `app/Services/Billing/StripeConnectService.php`
   - `app/Services/Billing/PlacementCommissionService.php` (`releasePayout()`)

4. **Webhook handler**
   - New `POST /api/stripe/webhook` route (unauthenticated, signature-verified)
   - Events to handle:
     - `customer.subscription.created` → create local `Subscription`
     - `customer.subscription.updated` → mirror status/period
     - `customer.subscription.deleted` → mark canceled
     - `invoice.payment_failed` → status → `past_due`
     - `account.updated` (Connect) → update `advisor_profiles.stripe_account_status`
     - `transfer.created` → record `placements.stripe_transfer_id`

5. **Scheduled jobs**
   - `placements:advance-milestones` (nightly) — promote pending → confirmed → retained_30d → retained_90d → paid_in_full
   - `subscriptions:reconcile` (hourly) — sanity check local mirror vs. Stripe

6. **UI for billing**
   - Facility admin → `/admin/billing` (plan picker, current plan, change/cancel)
   - Advisor / referral portal → `/referral/payouts` (Connect onboarding link, payout history, 1099 download)
   - SuperAdmin → `/superadmin/billing` (cross-tenant subscription view, manual overrides)

## Legal / compliance (named so you don't forget)

- **State referral-agency licensure**: some states (CA, MA, others)
  require placement agencies to be licensed. `advisor_profiles.licensed_states`
  is the storage location; UI needs verification capture + display.
- **TCPA**: don't collect phone with implicit "we'll call you" consent.
  Phone is optional everywhere on the family side; advisor-facing
  flows can require phone for payout/identity reasons.
- **1099-NEC**: Stripe Connect Express handles 1099 generation for US
  advisors automatically; surface the download link in the payout
  dashboard.
- **HIPAA**: Subscription/payout data is NOT PHI but Lead/Admission
  data IS. Keep them separated in any data exports.
- **GDPR / CCPA**: Family Pro subscribers can request data deletion.
  Build `users:purge` job that handles this end-to-end including
  Stripe customer deletion.

## Future schema additions (not built yet)

- `hospital_partners` — for the hospital discharge widget
- `sponsored_listings` — for boosted listings revenue
- `api_keys` + `api_usage` — for data licensing
- `placement_fee_overrides` (per-facility) — currently we use a
  platform-wide default in `PlacementCommissionService::DEFAULT_FACILITY_PLACEMENT_FEE_CENTS`;
  bigger contracts will need per-facility overrides
