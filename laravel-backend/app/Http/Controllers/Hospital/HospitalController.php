<?php

namespace App\Http\Controllers\Hospital;

use App\Http\Controllers\Controller;
use App\Models\Admission;
use App\Models\HospitalPartner;
use App\Models\Placement;
use App\Models\User;
use App\Services\Billing\StripeClientFactory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Hospital / discharge-planner portal. All endpoints require an
 * authenticated user with role=hospital_partner (gated in routes).
 *
 * The widget itself authenticates via the api_key column on
 * hospital_partners; the portal user logs in normally.
 */
class HospitalController extends Controller
{
    public function __construct(
        private readonly StripeClientFactory $stripe,
    ) {}

    /**
     * GET /api/hospital/profile
     * Returns the partner profile + Connect status. Creates an empty
     * row on first call so the UI always has something to edit.
     */
    public function profile(): JsonResponse
    {
        $user = $this->userOrFail();
        $partner = $this->ensurePartner($user);

        return response()->json([
            'data' => $this->serialize($partner),
        ]);
    }

    /**
     * PUT /api/hospital/profile
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $this->userOrFail();
        $partner = $this->ensurePartner($user);

        $data = $request->validate([
            'name' => ['nullable', 'string', 'max:191'],
            'partner_type' => ['nullable', 'in:hospital,health_system,rehab,snf_discharge,accountable_care'],
            'contact_phone' => ['nullable', 'string', 'max:30'],
            'service_area_zips' => ['nullable', 'array'],
            'service_area_zips.*' => ['string', 'regex:/^\d{5}$/'],
            'service_area_states' => ['nullable', 'array'],
            'service_area_states.*' => ['string', 'size:2'],
            'is_accepting_referrals' => ['nullable', 'boolean'],
        ]);

        // Derive slug from name on first save.
        if (! empty($data['name']) && ! $partner->slug) {
            $candidate = Str::slug($data['name']);
            $slug = $candidate;
            $i = 0;
            while (HospitalPartner::where('slug', $slug)->where('id', '!=', $partner->id)->exists()) {
                $i++;
                $slug = $candidate . '-' . $i;
            }
            $data['slug'] = $slug;
        }

        $partner->update($data);

        return response()->json(['data' => $this->serialize($partner->refresh())]);
    }

    /**
     * POST /api/hospital/regenerate-api-key
     * Mints a fresh widget key and returns the plaintext exactly once.
     * The old key stops working immediately (the previous hash is
     * overwritten). The plaintext is also cached for 10 minutes so a
     * page reload during the "copy this key" UX still works.
     */
    public function regenerateApiKey(): JsonResponse
    {
        $user = $this->userOrFail();
        $partner = $this->ensurePartner($user);

        $plaintext = $partner->rotateApiKey();
        Cache::put($this->plaintextCacheKey($partner), $plaintext, now()->addMinutes(10));

        return response()->json([
            'data' => [
                'api_key' => $plaintext,
                'api_key_prefix' => $partner->api_key_prefix,
                'message' => 'New API key generated. Copy it now — it is shown only once. Update your widget embed code; the old key has been revoked.',
            ],
        ]);
    }

    /**
     * GET /api/hospital/api-key
     * Returns the public prefix always; returns the plaintext only if
     * still within the 10-minute "just generated" window. Otherwise
     * the partner must rotate to view a usable secret.
     */
    public function showApiKey(): JsonResponse
    {
        $user = $this->userOrFail();
        $partner = $this->ensurePartner($user);

        $plaintext = Cache::get($this->plaintextCacheKey($partner));

        return response()->json([
            'data' => [
                'api_key' => $plaintext,                  // may be null after the reveal window
                'api_key_prefix' => $partner->api_key_prefix,
                'api_key_rotated_at' => $partner->api_key_rotated_at,
            ],
        ]);
    }

    private function plaintextCacheKey(HospitalPartner $partner): string
    {
        return "hospital-partner-fresh-key:{$partner->id}";
    }

    /**
     * POST /api/hospital/connect/onboarding
     * Generates a Stripe Connect Express onboarding URL for the partner.
     * Inline rather than using StripeConnectService since the service
     * is shaped around AdvisorProfile; hospital flow is identical.
     */
    public function connectOnboarding(): JsonResponse
    {
        $user = $this->userOrFail();
        $partner = $this->ensurePartner($user);
        $client = $this->stripe->client();
        $siteUrl = rtrim((string) config('app.public_site_url', config('app.url')), '/');

        // Create Stripe account on first call.
        if (! $partner->stripe_account_id) {
            if ($client) {
                try {
                    $account = $client->accounts->create([
                        'type' => 'express',
                        'country' => 'US',
                        'email' => $user->email,
                        'capabilities' => ['transfers' => ['requested' => true]],
                        'business_type' => 'company',
                        'metadata' => [
                            'hospital_partner_id' => (string) $partner->id,
                            'user_id' => (string) $user->id,
                        ],
                    ]);
                    $accountId = $account->id;
                } catch (\Throwable $e) {
                    Log::error('HospitalController::connectOnboarding — Account create failed', [
                        'partner_id' => $partner->id,
                        'error' => $e->getMessage(),
                    ]);
                    abort(502, 'Failed to create Stripe Connect account.');
                }
            } else {
                $accountId = 'acct_stub_' . substr($partner->id, 0, 8);
            }
            $partner->update([
                'stripe_account_id' => $accountId,
                'stripe_account_status' => 'pending',
            ]);
        }

        // Generate onboarding link.
        if ($client) {
            try {
                $link = $client->accountLinks->create([
                    'account' => $partner->stripe_account_id,
                    'refresh_url' => $siteUrl . '/hospital/profile?connect=refresh',
                    'return_url' => $siteUrl . '/hospital/profile?connect=done',
                    'type' => 'account_onboarding',
                ]);
                $url = $link->url;
            } catch (\Throwable $e) {
                Log::error('HospitalController::connectOnboarding — AccountLink create failed', [
                    'partner_id' => $partner->id,
                    'error' => $e->getMessage(),
                ]);
                abort(502, 'Failed to generate onboarding link.');
            }
        } else {
            $url = '/hospital/payouts/stub-onboarding?account=' . $partner->stripe_account_id;
        }

        // Mirror to user row.
        $user->update([
            'stripe_account_id' => $partner->stripe_account_id,
            'stripe_account_status' => $partner->stripe_account_status,
        ]);

        return response()->json([
            'data' => [
                'onboarding_url' => $url,
                'stripe_account_status' => $partner->stripe_account_status,
            ],
        ]);
    }

    /**
     * GET /api/hospital/stats
     */
    public function stats(): JsonResponse
    {
        $user = $this->userOrFail();
        $startOfYear = now()->startOfYear();
        $startOfMonth = now()->startOfMonth();

        $yearPlacements = Placement::query()
            ->where('advisor_user_id', $user->id)       // hospital users reuse advisor_user_id for attribution
            ->where('attribution_source', 'hospital_widget')
            ->where('admitted_on', '>=', $startOfYear)
            ->get(['advisor_payout_cents', 'amount_paid_cents', 'status']);

        $earningsYtdCents = (int) $yearPlacements->sum('amount_paid_cents');
        $pendingPayoutsCents = (int) $yearPlacements
            ->whereIn('status', ['pending', 'confirmed', 'retained_30d'])
            ->sum(fn ($p) => max(0, $p->advisor_payout_cents - $p->amount_paid_cents));

        $referralsThisMonth = Admission::query()
            ->where('sourced_by_user_id', $user->id)
            ->where('attribution_source', 'hospital_widget')
            ->where('created_at', '>=', $startOfMonth)
            ->count();

        $admittedThisMonth = Admission::query()
            ->where('sourced_by_user_id', $user->id)
            ->where('attribution_source', 'hospital_widget')
            ->where('stage', 'admitted')
            ->where('stage_changed_at', '>=', $startOfMonth)
            ->count();

        $conversionPct = $referralsThisMonth > 0
            ? (int) round(($admittedThisMonth / $referralsThisMonth) * 100)
            : 0;

        return response()->json([
            'data' => [
                'earnings_ytd_cents' => $earningsYtdCents,
                'pending_payouts_cents' => $pendingPayoutsCents,
                'referrals_this_month' => $referralsThisMonth,
                'admitted_this_month' => $admittedThisMonth,
                'conversion_pct' => $conversionPct,
            ],
        ]);
    }

    /**
     * GET /api/hospital/referrals
     */
    public function referrals(): JsonResponse
    {
        $user = $this->userOrFail();
        $admissions = Admission::query()
            ->where('sourced_by_user_id', $user->id)
            ->where('attribution_source', 'hospital_widget')
            ->with(['facility:id,name,slug,city,state'])
            ->orderByDesc('created_at')
            ->limit(200)
            ->get();

        $byStage = $admissions->groupBy('stage')->map->count();

        return response()->json([
            'data' => [
                'admissions' => $admissions->map(fn ($a) => [
                    'id' => $a->id,
                    'stage' => $a->stage,
                    'inquirer_name' => $a->inquirer_name,
                    'prospect_first_name' => $a->prospect_first_name,
                    'prospect_last_name' => $a->prospect_last_name,
                    'prospect_level_of_care' => $a->prospect_level_of_care,
                    'target_admit_date' => $a->target_admit_date,
                    'facility' => $a->facility ? [
                        'name' => $a->facility->name,
                        'slug' => $a->facility->slug,
                        'city' => $a->facility->city,
                        'state' => $a->facility->state,
                    ] : null,
                    'created_at' => $a->created_at,
                ]),
                'by_stage' => $byStage,
            ],
        ]);
    }

    /**
     * Ensure the authenticated user has a HospitalPartner row. Lazily
     * creates with a fresh API key on first call so portal landing
     * works for newly-invited hospital users.
     */
    private function ensurePartner(User $user): HospitalPartner
    {
        return DB::transaction(function () use ($user) {
            $partner = HospitalPartner::where('user_id', $user->id)->first();
            if ($partner) return $partner;

            $slug = 'partner-' . Str::lower(Str::random(8));
            // Mint the plaintext first so the row's api_key_hash /
            // _prefix are populated on the initial INSERT (the hash
            // column is NOT NULL). We then cache the plaintext so
            // showApiKey() can surface it once in the partner's first
            // session, after which it's gone forever.
            $plaintext = HospitalPartner::mintPlaintext();
            $partner = new HospitalPartner([
                'user_id' => $user->id,
                'name' => '',
                'slug' => $slug,
                'partner_type' => 'hospital',
                'is_active' => true,
                'is_accepting_referrals' => true,
                'commission_split_partner_pct' => 12,
                'commission_split_platform_pct' => 88,
            ]);
            $partner->forceFill([
                'api_key_hash' => HospitalPartner::hashKey($plaintext),
                'api_key_prefix' => substr($plaintext, 0, 10),
                'api_key_rotated_at' => now(),
            ])->save();
            Cache::put($this->plaintextCacheKey($partner), $plaintext, now()->addMinutes(10));
            return $partner;
        });
    }

    private function userOrFail(): User
    {
        $user = Auth::user();
        if (! $user) abort(401);
        return $user;
    }

    private function serialize(HospitalPartner $p): array
    {
        return [
            'id' => $p->id,
            'name' => $p->name,
            'slug' => $p->slug,
            'partner_type' => $p->partner_type,
            'contact_phone' => $p->contact_phone,
            'service_area_zips' => $p->service_area_zips ?? [],
            'service_area_states' => $p->service_area_states ?? [],
            'commission_split_partner_pct' => $p->commission_split_partner_pct,
            'commission_split_platform_pct' => $p->commission_split_platform_pct,
            'is_active' => (bool) $p->is_active,
            'is_accepting_referrals' => (bool) $p->is_accepting_referrals,
            'stripe_account_id' => $p->stripe_account_id,
            'stripe_account_status' => $p->stripe_account_status,
            'can_receive_payouts' => $p->canReceivePayouts(),
            'verified_at' => $p->verified_at,
        ];
    }
}
