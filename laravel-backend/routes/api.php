<?php

use App\Http\Controllers\AiChatController;
use App\Http\Controllers\ArticleController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\FacilityClaimController;
use App\Http\Controllers\FacilityReviewController;
use App\Http\Controllers\SavedSearchController;
use App\Http\Controllers\GuideController;
use App\Http\Controllers\MarketplaceController;
use App\Http\Controllers\MessagingController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\PublicAdvisorController;
use App\Http\Controllers\PushTokenController;
use App\Http\Controllers\StripeWebhookController;
use App\Http\Controllers\Facility\AdminsController as FacilityAdminsController;
use App\Http\Controllers\Facility\AdmissionController;
use App\Http\Controllers\Facility\BillingController as FacilityBillingController;
use App\Http\Controllers\Facility\SponsoredController as FacilitySponsoredController;
use App\Http\Controllers\Facility\AnalyticsController as FacilityAnalyticsController;
use App\Http\Controllers\Family\BillingController as FamilyBillingController;
use App\Http\Controllers\Family\PlacementController as FamilyPlacementController;
use App\Http\Controllers\Hospital\EmbedController as HospitalEmbedController;
use App\Http\Controllers\Hospital\HospitalController;
use App\Http\Controllers\Referral\BillingController as ReferralBillingController;
use App\Http\Controllers\Referral\ReferralController;
use App\Http\Controllers\Facility\BedController;
use App\Http\Controllers\Facility\CarePlanController;
use App\Http\Controllers\Facility\FacilityAmenityController;
use App\Http\Controllers\Facility\FacilityDataController;
use App\Http\Controllers\Facility\FacilityPhotoController;
use App\Http\Controllers\Facility\FacilityProfileController;
use App\Http\Controllers\Facility\OverviewController as FacilityOverviewController;
use App\Http\Controllers\Network\FacilityDetailController as NetworkFacilityDetailController;
use App\Http\Controllers\Referral\FacilityDetailController as ReferralFacilityDetailController;
use App\Http\Controllers\SuperAdmin\FacilityDetailController as SuperAdminFacilityDetailController;
use App\Http\Controllers\Facility\LeadController;
use App\Http\Controllers\Facility\MedicationController;
use App\Http\Controllers\Facility\ResidentController;
use App\Http\Controllers\Facility\TourController;
use App\Http\Controllers\SuperAdmin\AuditLogController;
use App\Http\Controllers\SuperAdmin\CcldHelperController;
use App\Http\Controllers\SuperAdmin\LicensingController as SuperAdminLicensingController;
use App\Http\Controllers\SuperAdmin\MasterDataController;
use App\Http\Controllers\SuperAdmin\PlansController as SuperAdminPlansController;
use App\Http\Controllers\SuperAdmin\PrrController;
use App\Http\Controllers\SuperAdmin\ScheduledJobsController;
use App\Http\Controllers\SuperAdmin\SourcesController as SuperAdminSourcesController;
use App\Http\Controllers\SuperAdmin\SuperAdminController;
use App\Http\Controllers\SuperAdmin\UsersController as SuperAdminUsersController;
use App\Http\Controllers\TwoFactorController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => ['ok' => true, 'service' => 'carepath-api']);

// Stripe webhook — unauthenticated, signature-verified inside the
// controller via STRIPE_WEBHOOK_SECRET.
Route::post('/stripe/webhook', [StripeWebhookController::class, 'handle']);

// Hospital embed widget API — auth via X-CarePath-Embed-Key header.
// Public so the widget can fire from any hospital's static page; rate
// limited per partner inside each controller method.
Route::prefix('embed')->group(function () {
    Route::get('/config', [HospitalEmbedController::class, 'config']);
    Route::get('/facilities', [HospitalEmbedController::class, 'facilities']);
    Route::post('/inquiries', [HospitalEmbedController::class, 'inquiry']);
});

// Public marketplace — no auth.
Route::prefix('marketplace')->group(function () {
    Route::get('/facilities', [MarketplaceController::class, 'index']);
    Route::get('/suggest', [MarketplaceController::class, 'suggest']);
    Route::get('/reverse-zip', [MarketplaceController::class, 'reverseZip'])
        ->middleware('throttle:30,1');
    // Listing-event log — drives the per-facility analytics page.
    // Lightly throttled so the page-load impression batch doesn't
    // burn a request budget per visitor.
    Route::post('/track-events', [MarketplaceController::class, 'trackListingEvents'])
        ->middleware('throttle:60,1');
    Route::get('/top-cities', [MarketplaceController::class, 'topCities']);
    Route::get('/stats', [MarketplaceController::class, 'stats']);
    Route::get('/states/{state}', [MarketplaceController::class, 'state']);
    Route::get('/cities/{state}/{city}', [MarketplaceController::class, 'city']);
    Route::get('/compare', [MarketplaceController::class, 'compare']);
    // One-click family-decision PDF for 2-4 facilities. Public + ungated
    // so it can be linked from email signatures, articles, etc.
    Route::get('/compare/pdf', [MarketplaceController::class, 'comparePdf']);
    Route::get('/facilities/{slug}', [MarketplaceController::class, 'show']);

    // Public advisor profile — the page families land on to vet a
    // placement advisor. No auth required.
    Route::get('/advisors/{slug}', [PublicAdvisorController::class, 'show']);
    Route::get('/facilities/{slug}/tour-slots', [MarketplaceController::class, 'tourSlots']);
    Route::get('/facilities/{slug}/brochure', [MarketplaceController::class, 'brochure']);
    Route::post('/inquiries', [MarketplaceController::class, 'storeInquiry']);
    Route::post('/tours', [MarketplaceController::class, 'bookTour']);
    Route::post('/cost-projection', [MarketplaceController::class, 'costProjection']);
    Route::post('/leads', [MarketplaceController::class, 'captureLead']);

    // Natural-language search — translate "memory care in west Phoenix
    // under $7k that takes Medicaid" into the structured filters above.
    // Rate-limited so we don't burn Anthropic credits on abuse.
    Route::post('/ai-search', [MarketplaceController::class, 'aiSearch'])
        ->middleware('throttle:10,1');
    Route::get('/guides', [GuideController::class, 'index']);
    Route::post('/guides/{slug}/download', [GuideController::class, 'download']);

    // Sponsored-listing telemetry — public so anonymous search clicks
    // can be billed. Rate-limited inside the controller.
    Route::post('/sponsored/impressions', [MarketplaceController::class, 'recordSponsoredImpressions']);
    Route::post('/sponsored/clicks', [MarketplaceController::class, 'recordSponsoredClick']);
    Route::post('/sponsored/report', [MarketplaceController::class, 'reportSponsored']);
});

// Public content hub — articles + tools — no auth.
Route::prefix('content')->group(function () {
    Route::get('/articles', [ArticleController::class, 'index']);
    Route::get('/articles/{slug}', [ArticleController::class, 'show']);
});

// Family Pro plan catalog — public so the upsell modal can render
// even before signup. Personal-sub endpoints below require auth.
Route::get('/family/billing/plans', [FamilyBillingController::class, 'plans']);

Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']);
Route::post('/auth/verify-email', [AuthController::class, 'verifyEmail'])->name('verification.verify');

// Public — completes login when 2FA is enabled (validates via challenge_id from cache).
Route::post('/auth/2fa/challenge', [TwoFactorController::class, 'challenge']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::post('/auth/resend-verification', [AuthController::class, 'resendVerification']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::get('/me/notifications', [AuthController::class, 'notifications']);
    Route::post('/me/notifications/{id}/mark-read', [AuthController::class, 'markNotificationRead']);
    Route::post('/me/notifications/mark-all-read', [AuthController::class, 'markAllNotificationsRead']);
    Route::post('/me/active-facility', [AuthController::class, 'setActiveFacility']);

    // In-app messaging — inbox, thread, send. Broadcasts are
    // role-gated inside the controller.
    Route::get('/messaging/conversations', [MessagingController::class, 'index']);
    Route::post('/messaging/conversations', [MessagingController::class, 'store']);
    // Find-or-create conversation with a facility's admins — drives the
    // "Message facility" CTA on the placement page.
    Route::post('/messaging/conversations/with-facility', [MessagingController::class, 'storeWithFacility']);
    Route::get('/messaging/conversations/{id}', [MessagingController::class, 'show']);
    Route::post('/messaging/conversations/{id}/messages', [MessagingController::class, 'sendMessage']);
    Route::post('/messaging/broadcast', [MessagingController::class, 'broadcast']);

    // AI assistant — per-user rate-limited inside the controller.
    Route::post('/ai/chat', [AiChatController::class, 'send']);

    // Web Push subscription persistence (PWA push notifications).
    Route::post('/me/push-tokens', [PushTokenController::class, 'register']);
    Route::delete('/me/push-tokens', [PushTokenController::class, 'unregister']);
    Route::get('/me/profile', [ProfileController::class, 'show']);
    Route::put('/me/profile', [ProfileController::class, 'update']);
    Route::post('/me/complete-onboarding', [ProfileController::class, 'completeOnboarding']);

    // Facility claim submission + status. Auth required (we need a
    // user to grant the role to on approval) but no role gate —
    // anyone can claim, SuperAdmin verifies.
    Route::post('/facilities/{slug}/claim', [FacilityClaimController::class, 'submit']);
    Route::get('/facilities/{slug}/claim-status', [FacilityClaimController::class, 'status']);

    Route::prefix('auth/2fa')->group(function () {
        Route::post('/enable', [TwoFactorController::class, 'enable']);
        Route::post('/confirm', [TwoFactorController::class, 'confirm']);
        Route::post('/disable', [TwoFactorController::class, 'disable']);
        Route::get('/recovery-codes', [TwoFactorController::class, 'recoveryCodes']);
        Route::post('/recovery-codes/regenerate', [TwoFactorController::class, 'regenerateRecoveryCodes']);
    });

    Route::prefix('superadmin')
        ->middleware('role:super_admin')
        ->group(function () {
            // Dashboard payloads.
            Route::get('/stats', [SuperAdminController::class, 'stats']);
            Route::get('/recent-facilities', [SuperAdminController::class, 'recentFacilities']);
            Route::get('/tenants', [SuperAdminController::class, 'tenants']);

            // Per-facility "fact sheet" — tenant team + claims + sponsored
            // + placements + listing-event funnel + audit slice. Drives the
            // /superadmin/facilities/{slug} detail page.
            Route::get('/facilities/{slug}', [SuperAdminFacilityDetailController::class, 'show']);

            // Cross-tenant oversight tabs.
            Route::get('/verifications', [SuperAdminController::class, 'verifications']);
            Route::post('/verifications/advisors/{id}/approve', [SuperAdminController::class, 'approveAdvisor']);
            Route::post('/verifications/hospitals/{id}/approve', [SuperAdminController::class, 'approveHospital']);
            Route::get('/claims', [SuperAdminController::class, 'claims']);
            Route::post('/claims/{id}/approve', [SuperAdminController::class, 'approveClaim']);
            Route::post('/claims/{id}/reject', [SuperAdminController::class, 'rejectClaim']);

            // Scheduled-job health + manual triggers — proves the
            // Railway worker process is actually firing schedule:run.
            Route::get('/scheduled-jobs/health', [ScheduledJobsController::class, 'health']);
            Route::post('/scheduled-jobs/run/{command}', [ScheduledJobsController::class, 'runNow']);

            // Federal exclusion screening (OIG LEIE + SAM.gov SDN).
            Route::post('/screen', [SuperAdminController::class, 'screen']);
            Route::get('/subscriptions', [SuperAdminController::class, 'subscriptions']);
            Route::get('/placements', [SuperAdminController::class, 'placements']);
            Route::get('/sponsored', [SuperAdminController::class, 'sponsored']);
            Route::post('/sponsored/reports/{id}/resolve', [SuperAdminController::class, 'resolveAdReport']);

            // Facility data sources — stats + per-source ingest triggers.
            Route::get('/sources', [SuperAdminSourcesController::class, 'index']);
            Route::post('/sources/cms/run', [SuperAdminSourcesController::class, 'runCms']);
            Route::post('/sources/osm/run', [SuperAdminSourcesController::class, 'runOsm']);
            Route::post('/sources/socrata/run', [SuperAdminSourcesController::class, 'runSocrata']);
            Route::post('/sources/csv/upload', [SuperAdminSourcesController::class, 'uploadCsv']);

            // CCLD (California) county-by-county worklist helper.
            Route::get('/sources/ccld/worklist', [CcldHelperController::class, 'worklist']);

            // Public Records Request tracker for Tier-4 sources.
            Route::get('/prr', [PrrController::class, 'index']);
            Route::post('/prr', [PrrController::class, 'store']);
            Route::get('/prr/template/{source_key}', [PrrController::class, 'template']);
            Route::post('/prr/{id}/mark-received', [PrrController::class, 'markReceived']);

            // Platform-wide user management — invite, list, role assignment,
            // per-user detail page, facility memberships.
            Route::get('/users', [SuperAdminUsersController::class, 'index']);
            Route::get('/users/facility-picker', [SuperAdminUsersController::class, 'facilityPicker']);
            Route::post('/users/invite', [SuperAdminUsersController::class, 'invite']);
            Route::get('/users/{id}', [SuperAdminUsersController::class, 'show']);
            Route::put('/users/{id}/roles', [SuperAdminUsersController::class, 'updateRoles']);
            Route::put('/users/{id}/memberships', [SuperAdminUsersController::class, 'updateMemberships']);
            Route::post('/users/{id}/resend-invite', [SuperAdminUsersController::class, 'resendInvite']);

            // SubscriptionPlan management — limited-field updates only.
            Route::get('/plans', [SuperAdminPlansController::class, 'index']);
            Route::put('/plans/{id}', [SuperAdminPlansController::class, 'update']);
            Route::post('/plans/{id}/test-stripe-price', [SuperAdminPlansController::class, 'testStripePrice']);

            // State licensing reference data — browse + edit.
            Route::get('/licensing', [SuperAdminLicensingController::class, 'index']);
            Route::post('/licensing', [SuperAdminLicensingController::class, 'store']);
            Route::put('/licensing/{id}', [SuperAdminLicensingController::class, 'update']);
            Route::delete('/licensing/{id}', [SuperAdminLicensingController::class, 'destroy']);

            // Specific routes must precede the {type} wildcard.
            Route::post('/master-data/sync', [MasterDataController::class, 'sync']);
            Route::post('/cms/ingest', [MasterDataController::class, 'ingestCms']);

            Route::get('/master-data/{type}', [MasterDataController::class, 'index']);
            Route::post('/master-data/{type}', [MasterDataController::class, 'store']);
            Route::put('/master-data/{type}/{id}', [MasterDataController::class, 'update']);
            Route::delete('/master-data/{type}/{id}', [MasterDataController::class, 'destroy']);

            Route::get('/audit-log', [AuditLogController::class, 'index']);
        });

    // Network-operator portal — chain executives drilling into any
    // single facility in their portfolio. SuperAdmin bypasses the
    // membership gate inside the controller.
    Route::prefix('network')
        ->middleware('role:network_admin|super_admin')
        ->group(function () {
            Route::get('/facilities/{slug}', [NetworkFacilityDetailController::class, 'show']);
        });

    Route::prefix('facility')->middleware('facility.scope')->group(function () {
        // Glanceable overview consumed by both /admin/facility and
        // /staff/facility — frontend picks which cards to render.
        Route::get('/overview', [FacilityOverviewController::class, 'show']);

        // Billing — list available plans, fetch current subscription,
        // start checkout, cancel at period end.
        Route::get('/billing/plans', [FacilityBillingController::class, 'plans']);
        Route::get('/billing/subscription', [FacilityBillingController::class, 'show']);
        Route::post('/billing/checkout', [FacilityBillingController::class, 'checkout']);
        Route::post('/billing/cancel', [FacilityBillingController::class, 'cancel']);

        // Sponsored-listings self-serve campaign management.
        Route::get('/sponsored/campaigns', [FacilitySponsoredController::class, 'index']);
        Route::post('/sponsored/campaigns', [FacilitySponsoredController::class, 'store']);
        // Full per-campaign detail payload — drives the dedicated
        // /admin/sponsored/{id} detail page (totals, daily time-series,
        // per-variant CTR, all in one round trip).
        Route::get('/sponsored/campaigns/{id}', [FacilitySponsoredController::class, 'show']);
        Route::put('/sponsored/campaigns/{id}', [FacilitySponsoredController::class, 'update']);
        Route::delete('/sponsored/campaigns/{id}', [FacilitySponsoredController::class, 'destroy']);
        Route::get('/sponsored/stats', [FacilitySponsoredController::class, 'stats']);
        // Bid recommendations / auction insights per campaign — drives
        // the "Why didn't I win more?" panel on the campaign card.
        Route::get('/sponsored/campaigns/{id}/insights', [FacilitySponsoredController::class, 'insights']);

        // Creative variants — A/B testable headline + body per campaign.
        Route::get('/sponsored/campaigns/{id}/creatives', [FacilitySponsoredController::class, 'listCreatives']);
        Route::post('/sponsored/campaigns/{id}/creatives', [FacilitySponsoredController::class, 'storeCreative']);
        Route::put('/sponsored/creatives/{id}', [FacilitySponsoredController::class, 'updateCreative']);
        Route::delete('/sponsored/creatives/{id}', [FacilitySponsoredController::class, 'destroyCreative']);

        // Sponsored-ad monthly invoices.
        Route::get('/sponsored/invoices', [FacilitySponsoredController::class, 'listInvoices']);
        Route::get('/sponsored/invoices/{id}/pdf', [FacilitySponsoredController::class, 'invoicePdf']);

        // Listing analytics — impressions, detail views, tour requests
        // for the active facility over the last 30 days vs prior 30.
        Route::get('/listing-analytics', [FacilityAnalyticsController::class, 'listing']);
        // Per-criterion completeness checklist — drives the admin
        // "Listing completeness coach" widget.
        Route::get('/listing-completeness', [FacilityAnalyticsController::class, 'completeness']);

        // Multi-admin / staff management on the active facility.
        // Gate to facility_admin since only admins should manage
        // other admins/staff (staff can't promote themselves).
        Route::middleware('role:facility_admin')->group(function () {
            Route::get('/admins', [FacilityAdminsController::class, 'index']);
            Route::post('/admins/invite', [FacilityAdminsController::class, 'invite']);
            Route::put('/admins/{userId}/role', [FacilityAdminsController::class, 'updateRole']);
            Route::delete('/admins/{userId}', [FacilityAdminsController::class, 'remove']);
        });

        Route::get('/data/{type}', [FacilityDataController::class, 'index']);
        Route::post('/data/{type}', [FacilityDataController::class, 'store']);
        Route::put('/data/{type}/{id}', [FacilityDataController::class, 'update']);
        Route::delete('/data/{type}/{id}', [FacilityDataController::class, 'destroy']);

        // Public listing editor — what families see on /facility/{slug}.
        // Read-only address (changes need geocoding) + narrow set of
        // editable marketing/contact fields.
        Route::get('/profile', [FacilityProfileController::class, 'show']);
        Route::put('/profile', [FacilityProfileController::class, 'update']);

        // Amenities — full self-serve CRUD. Reorder is a separate
        // endpoint so the drag-to-reorder UI ships one request per
        // gesture instead of N writes.
        Route::get('/amenities', [FacilityAmenityController::class, 'index']);
        Route::post('/amenities', [FacilityAmenityController::class, 'store']);
        Route::post('/amenities/reorder', [FacilityAmenityController::class, 'reorder']);
        Route::put('/amenities/{id}', [FacilityAmenityController::class, 'update']);
        Route::delete('/amenities/{id}', [FacilityAmenityController::class, 'destroy']);

        // Photos — manager-uploaded to Cloudflare R2. Same shape as
        // amenities (list / create / update caption / reorder /
        // delete). Hard ceiling enforced server-side at 30 per
        // facility.
        Route::get('/photos', [FacilityPhotoController::class, 'index']);
        Route::post('/photos', [FacilityPhotoController::class, 'store']);
        Route::post('/photos/reorder', [FacilityPhotoController::class, 'reorder']);
        Route::put('/photos/{id}', [FacilityPhotoController::class, 'update']);
        Route::delete('/photos/{id}', [FacilityPhotoController::class, 'destroy']);

        Route::get('/beds', [BedController::class, 'index']);
        Route::put('/beds/{id}/status', [BedController::class, 'updateStatus']);
        Route::post('/beds/{id}/assign', [BedController::class, 'assign']);
        Route::post('/beds/{id}/unassign', [BedController::class, 'unassign']);

        Route::get('/residents', [ResidentController::class, 'index']);
        Route::get('/residents/{id}', [ResidentController::class, 'show']);
        Route::post('/residents/{id}/discharge', [ResidentController::class, 'discharge']);

        Route::get('/admissions', [AdmissionController::class, 'index']);
        Route::post('/admissions', [AdmissionController::class, 'store']);
        Route::get('/admissions/{id}', [AdmissionController::class, 'show']);
        Route::put('/admissions/{id}', [AdmissionController::class, 'update']);
        Route::put('/admissions/{id}/stage', [AdmissionController::class, 'updateStage']);
        Route::delete('/admissions/{id}', [AdmissionController::class, 'destroy']);

        Route::get('/care-plans', [CarePlanController::class, 'index']);
        Route::get('/care-plans/by-resident/{residentId}', [CarePlanController::class, 'showByResident']);
        Route::post('/care-plans/by-resident/{residentId}', [CarePlanController::class, 'storeForResident']);
        Route::put('/care-plans/{id}', [CarePlanController::class, 'update']);
        Route::post('/care-plans/{id}/sign', [CarePlanController::class, 'sign']);
        Route::post('/care-plans/{id}/unsign', [CarePlanController::class, 'unsign']);
        Route::post('/care-plans/{id}/items', [CarePlanController::class, 'storeItem']);
        Route::put('/care-plans/{id}/items/{itemId}', [CarePlanController::class, 'updateItem']);
        Route::delete('/care-plans/{id}/items/{itemId}', [CarePlanController::class, 'destroyItem']);

        Route::get('/medications/today', [MedicationController::class, 'todayBoard']);
        Route::get('/medications/by-resident/{residentId}', [MedicationController::class, 'indexForResident']);
        Route::post('/medications/by-resident/{residentId}', [MedicationController::class, 'storeForResident']);
        Route::put('/medications/{id}', [MedicationController::class, 'update']);
        Route::post('/medications/{id}/administer', [MedicationController::class, 'administer']);
        Route::get('/medication-history/by-resident/{residentId}', [MedicationController::class, 'historyForResident']);

        Route::get('/tours', [TourController::class, 'index']);
        Route::put('/tours/{id}/status', [TourController::class, 'updateStatus']);

        Route::get('/leads', [LeadController::class, 'index']);
        Route::put('/leads/{id}/status', [LeadController::class, 'updateStatus']);
    });

    // Family-side personal subscriptions (Family Pro). plans endpoint
    // is public above; show/checkout/cancel require auth.
    Route::prefix('family/billing')->group(function () {
        Route::get('/subscription', [FamilyBillingController::class, 'show']);
        Route::post('/checkout', [FamilyBillingController::class, 'checkout']);
        Route::post('/cancel', [FamilyBillingController::class, 'cancel']);
    });

    // Family-visible placement timeline. The "where is mom's placement"
    // surface that replaces APFM's advisor-callback-every-3-days flow.
    Route::get('/family/placements', [FamilyPlacementController::class, 'index']);
    Route::get('/family/placements/{id}', [FamilyPlacementController::class, 'show']);

    // Persisted saved searches + alert toggles. Daily sweep lives in
    // SavedSearchAlertsCommand.
    Route::get('/me/saved-searches', [SavedSearchController::class, 'index']);
    Route::post('/me/saved-searches', [SavedSearchController::class, 'store']);
    Route::put('/me/saved-searches/{id}', [SavedSearchController::class, 'update']);
    Route::delete('/me/saved-searches/{id}', [SavedSearchController::class, 'destroy']);

    // Verified facility reviews — submit, helpful-vote, facility
    // response. Verification is auto-detected when an admission record
    // links the auth user's email to the facility.
    Route::post('/facilities/{slug}/reviews', [FacilityReviewController::class, 'store'])
        ->middleware('throttle:5,60'); // 5 reviews/hr/user — abuse cap
    Route::post('/reviews/{id}/helpful', [FacilityReviewController::class, 'toggleHelpful'])
        ->middleware('throttle:30,60');
    Route::post('/facility/reviews/{id}/respond', [FacilityReviewController::class, 'respond']);

    // Placement-advisor / referral-partner portal
    Route::prefix('referral')
        ->middleware('role:referral_partner|super_admin')
        ->group(function () {
            Route::get('/profile', [ReferralController::class, 'profile']);
            Route::put('/profile', [ReferralController::class, 'updateProfile']);
            Route::post('/connect/onboarding', [ReferralController::class, 'connectOnboarding']);
            Route::get('/stats', [ReferralController::class, 'stats']);
            Route::get('/placements', [ReferralController::class, 'placements']);
            Route::get('/pipeline', [ReferralController::class, 'pipeline']);

            // Per-facility view for advisors — capacity + their own
            // placement + commission history at this facility.
            Route::get('/facilities/{slug}', [ReferralFacilityDetailController::class, 'show']);

            // Advisor SaaS subscription management.
            Route::get('/billing/plans', [ReferralBillingController::class, 'plans']);
            Route::get('/billing/subscription', [ReferralBillingController::class, 'show']);
            Route::post('/billing/checkout', [ReferralBillingController::class, 'checkout']);
            Route::post('/billing/cancel', [ReferralBillingController::class, 'cancel']);
        });

    // Hospital / discharge-planner portal
    Route::prefix('hospital')
        ->middleware('role:hospital_partner|super_admin')
        ->group(function () {
            Route::get('/profile', [HospitalController::class, 'profile']);
            Route::put('/profile', [HospitalController::class, 'updateProfile']);
            Route::get('/api-key', [HospitalController::class, 'showApiKey']);
            Route::post('/regenerate-api-key', [HospitalController::class, 'regenerateApiKey']);
            Route::post('/connect/onboarding', [HospitalController::class, 'connectOnboarding']);
            Route::get('/stats', [HospitalController::class, 'stats']);
            Route::get('/referrals', [HospitalController::class, 'referrals']);
        });
});
