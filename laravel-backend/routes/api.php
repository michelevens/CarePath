<?php

use App\Http\Controllers\ArticleController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\GuideController;
use App\Http\Controllers\MarketplaceController;
use App\Http\Controllers\StripeWebhookController;
use App\Http\Controllers\Facility\AdmissionController;
use App\Http\Controllers\Facility\BillingController as FacilityBillingController;
use App\Http\Controllers\Facility\SponsoredController as FacilitySponsoredController;
use App\Http\Controllers\Family\BillingController as FamilyBillingController;
use App\Http\Controllers\Hospital\EmbedController as HospitalEmbedController;
use App\Http\Controllers\Hospital\HospitalController;
use App\Http\Controllers\Referral\BillingController as ReferralBillingController;
use App\Http\Controllers\Referral\ReferralController;
use App\Http\Controllers\Facility\BedController;
use App\Http\Controllers\Facility\CarePlanController;
use App\Http\Controllers\Facility\FacilityDataController;
use App\Http\Controllers\Facility\LeadController;
use App\Http\Controllers\Facility\MedicationController;
use App\Http\Controllers\Facility\ResidentController;
use App\Http\Controllers\Facility\TourController;
use App\Http\Controllers\SuperAdmin\AuditLogController;
use App\Http\Controllers\SuperAdmin\MasterDataController;
use App\Http\Controllers\SuperAdmin\SuperAdminController;
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
    Route::get('/top-cities', [MarketplaceController::class, 'topCities']);
    Route::get('/stats', [MarketplaceController::class, 'stats']);
    Route::get('/states/{state}', [MarketplaceController::class, 'state']);
    Route::get('/cities/{state}/{city}', [MarketplaceController::class, 'city']);
    Route::get('/compare', [MarketplaceController::class, 'compare']);
    Route::get('/facilities/{slug}', [MarketplaceController::class, 'show']);
    Route::get('/facilities/{slug}/tour-slots', [MarketplaceController::class, 'tourSlots']);
    Route::get('/facilities/{slug}/brochure', [MarketplaceController::class, 'brochure']);
    Route::post('/inquiries', [MarketplaceController::class, 'storeInquiry']);
    Route::post('/tours', [MarketplaceController::class, 'bookTour']);
    Route::post('/cost-projection', [MarketplaceController::class, 'costProjection']);
    Route::post('/leads', [MarketplaceController::class, 'captureLead']);
    Route::get('/guides', [GuideController::class, 'index']);
    Route::post('/guides/{slug}/download', [GuideController::class, 'download']);

    // Sponsored-listing telemetry — public so anonymous search clicks
    // can be billed. Rate-limited inside the controller.
    Route::post('/sponsored/impressions', [MarketplaceController::class, 'recordSponsoredImpressions']);
    Route::post('/sponsored/clicks', [MarketplaceController::class, 'recordSponsoredClick']);
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
    Route::post('/me/active-facility', [AuthController::class, 'setActiveFacility']);

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

            // Cross-tenant oversight tabs.
            Route::get('/verifications', [SuperAdminController::class, 'verifications']);
            Route::post('/verifications/advisors/{id}/approve', [SuperAdminController::class, 'approveAdvisor']);
            Route::post('/verifications/hospitals/{id}/approve', [SuperAdminController::class, 'approveHospital']);
            Route::get('/subscriptions', [SuperAdminController::class, 'subscriptions']);
            Route::get('/placements', [SuperAdminController::class, 'placements']);
            Route::get('/sponsored', [SuperAdminController::class, 'sponsored']);

            // Specific routes must precede the {type} wildcard.
            Route::post('/master-data/sync', [MasterDataController::class, 'sync']);
            Route::post('/cms/ingest', [MasterDataController::class, 'ingestCms']);

            Route::get('/master-data/{type}', [MasterDataController::class, 'index']);
            Route::post('/master-data/{type}', [MasterDataController::class, 'store']);
            Route::put('/master-data/{type}/{id}', [MasterDataController::class, 'update']);
            Route::delete('/master-data/{type}/{id}', [MasterDataController::class, 'destroy']);

            Route::get('/audit-log', [AuditLogController::class, 'index']);
        });

    Route::prefix('facility')->middleware('facility.scope')->group(function () {
        // Billing — list available plans, fetch current subscription,
        // start checkout, cancel at period end.
        Route::get('/billing/plans', [FacilityBillingController::class, 'plans']);
        Route::get('/billing/subscription', [FacilityBillingController::class, 'show']);
        Route::post('/billing/checkout', [FacilityBillingController::class, 'checkout']);
        Route::post('/billing/cancel', [FacilityBillingController::class, 'cancel']);

        // Sponsored-listings self-serve campaign management.
        Route::get('/sponsored/campaigns', [FacilitySponsoredController::class, 'index']);
        Route::post('/sponsored/campaigns', [FacilitySponsoredController::class, 'store']);
        Route::put('/sponsored/campaigns/{id}', [FacilitySponsoredController::class, 'update']);
        Route::delete('/sponsored/campaigns/{id}', [FacilitySponsoredController::class, 'destroy']);
        Route::get('/sponsored/stats', [FacilitySponsoredController::class, 'stats']);

        Route::get('/data/{type}', [FacilityDataController::class, 'index']);
        Route::post('/data/{type}', [FacilityDataController::class, 'store']);
        Route::put('/data/{type}/{id}', [FacilityDataController::class, 'update']);
        Route::delete('/data/{type}/{id}', [FacilityDataController::class, 'destroy']);

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
