<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use App\Services\Billing\StripeClientFactory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

/**
 * SubscriptionPlan management for the SuperAdmin. Intentionally
 * constrained — see STRIPE_ACTIVATION.md and the prior design note:
 *
 *   - Plans are deploy-controlled in source of truth
 *     (SubscriptionPlansSeeder). This endpoint exposes the SAFE
 *     subset for live edits — what doesn't break existing subscribers.
 *   - We DON'T expose monthly_cents / annual_cents editing here. A
 *     "real" price change requires a new Stripe Price ID anyway;
 *     forcing the user through "create new plan + deprecate old" is
 *     less of a footgun than "edit the price and silently desync
 *     local vs Stripe".
 *   - Creating a new plan needs to spin up a Stripe Product + Prices.
 *     That's a v2 flow; for now, add the row via the seeder + redeploy.
 *
 * What IS editable here:
 *   - is_active (toggle on/off — pauses NEW signups; existing subs
 *     remain on the plan they signed up for)
 *   - name, sort_order (cosmetic)
 *   - included_seats, placement_cap_per_year (gating, not billing)
 *   - features array (gating, not billing)
 *   - stripe_price_id_monthly / _annual (the wiring step — pasting
 *     IDs you just created in the Stripe dashboard)
 */
class PlansController extends Controller
{
    /**
     * Canonical feature flag catalog. Hardcoded so the UI shows the
     * superadmin a checklist, not a free-text JSON editor — typos
     * silently break gating elsewhere in the app.
     */
    public const KNOWN_FEATURES = [
        // facility-side
        'claim_listing', 'respond_to_inquiries', 'cms_data_visible',
        'bed_board_sync', 'admissions_kanban', 'tour_calendar',
        'mds_tools', 'brochure_customization', 'lead_routing',
        'basic_analytics', 'facility_data_editor',
        'multi_facility_dashboard', 'saml_sso', 'white_label_family_portal',
        'api_access', 'dedicated_csm', 'custom_billing',
        // advisor-side
        'crm_pipeline', 'e_signature_basic', 'payout_dashboard',
        'calendar_sync', 'public_advisor_page',
        'team_seats', 'custom_branded_family_pages',
        'advanced_pipeline_analytics', 'agency_dashboard',
        'unlimited_seats', 'white_label',
        'training_mode_admin', 'volume_commission_rebate',
        // family-side
        'search', 'compare', 'tour_request', 'save_facility',
        'saved_search', 'cost_projection', 'guides_download',
        'document_vault', 'custom_cost_projection_report',
        'comparison_reports_pdf', 'premium_support',
        'multi_member_sharing',
    ];

    public function __construct(
        private readonly StripeClientFactory $stripe,
    ) {}

    /**
     * GET /api/superadmin/plans
     */
    public function index(): JsonResponse
    {
        $plans = SubscriptionPlan::query()
            ->withCount(['subscriptions as active_subscriptions_count' => function ($q) {
                $q->whereIn('status', Subscription::ACTIVE_STATUSES);
            }])
            ->orderBy('audience')
            ->orderBy('sort_order')
            ->get();

        return response()->json([
            'data' => $plans->map(fn ($p) => [
                'id' => $p->id,
                'slug' => $p->slug,
                'name' => $p->name,
                'audience' => $p->audience,
                'tier' => $p->tier,
                'monthly_cents' => $p->monthly_cents,
                'annual_cents' => $p->annual_cents,
                'included_seats' => $p->included_seats,
                'placement_cap_per_year' => $p->placement_cap_per_year,
                'stripe_price_id_monthly' => $p->stripe_price_id_monthly,
                'stripe_price_id_annual' => $p->stripe_price_id_annual,
                'features' => $p->features ?? [],
                'is_active' => (bool) $p->is_active,
                'sort_order' => $p->sort_order,
                'active_subscriptions_count' => (int) ($p->active_subscriptions_count ?? 0),
            ]),
            'known_features' => self::KNOWN_FEATURES,
            'audiences' => SubscriptionPlan::AUDIENCES,
            'tiers' => SubscriptionPlan::TIERS,
        ]);
    }

    /**
     * PUT /api/superadmin/plans/{id}
     *
     * Limited-field update. Price fields are deliberately omitted —
     * see class doc. Returns the refreshed plan so the UI reflects
     * server-side normalization.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'name' => ['nullable', 'string', 'max:120'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:9999'],
            'included_seats' => ['nullable', 'integer', 'min:1', 'max:9999'],
            'placement_cap_per_year' => ['nullable', 'integer', 'min:0'],
            'stripe_price_id_monthly' => ['nullable', 'string', 'max:191'],
            'stripe_price_id_annual' => ['nullable', 'string', 'max:191'],
            'features' => ['nullable', 'array'],
            'features.*' => ['string', Rule::in(self::KNOWN_FEATURES)],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $plan = SubscriptionPlan::findOrFail($id);
        $plan->fill($data);
        $plan->save();

        return response()->json([
            'ok' => true,
            'data' => $plan->refresh(),
        ]);
    }

    /**
     * POST /api/superadmin/plans/{id}/test-stripe-price
     *
     * Pings Stripe to confirm the configured price IDs resolve.
     * Returns the price's recurring interval + unit amount so the
     * superadmin can sanity-check before flipping a plan live.
     */
    public function testStripePrice(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'cycle' => ['required', Rule::in(['monthly', 'annual'])],
        ]);

        $plan = SubscriptionPlan::findOrFail($id);
        $priceId = $data['cycle'] === 'annual'
            ? $plan->stripe_price_id_annual
            : $plan->stripe_price_id_monthly;

        if (! $priceId) {
            return response()->json([
                'ok' => false,
                'error' => "No Stripe Price ID set for {$data['cycle']} on plan {$plan->slug}.",
            ], 422);
        }

        $client = $this->stripe->client();
        if (! $client) {
            return response()->json([
                'ok' => false,
                'error' => 'STRIPE_SECRET not configured — running in stub mode.',
            ], 503);
        }

        try {
            $price = $client->prices->retrieve($priceId);
            $product = isset($price->product)
                ? $client->products->retrieve($price->product)
                : null;
        } catch (\Throwable $e) {
            Log::warning('PlansController::testStripePrice — Stripe lookup failed', [
                'plan_slug' => $plan->slug,
                'price_id' => $priceId,
                'error' => $e->getMessage(),
            ]);
            return response()->json([
                'ok' => false,
                'error' => $e->getMessage(),
            ], 502);
        }

        return response()->json([
            'ok' => true,
            'stripe' => [
                'price_id' => $price->id,
                'active' => $price->active,
                'unit_amount_cents' => $price->unit_amount,
                'currency' => strtoupper($price->currency ?? 'usd'),
                'interval' => $price->recurring->interval ?? null,
                'product_name' => $product->name ?? null,
                'product_active' => $product->active ?? null,
            ],
        ]);
    }
}
