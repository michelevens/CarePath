<?php

use App\Http\Controllers\ArticleController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\GuideController;
use App\Http\Controllers\MarketplaceController;
use App\Http\Controllers\Facility\AdmissionController;
use App\Http\Controllers\Facility\BedController;
use App\Http\Controllers\Facility\CarePlanController;
use App\Http\Controllers\Facility\FacilityDataController;
use App\Http\Controllers\Facility\LeadController;
use App\Http\Controllers\Facility\MedicationController;
use App\Http\Controllers\Facility\ResidentController;
use App\Http\Controllers\Facility\TourController;
use App\Http\Controllers\SuperAdmin\AuditLogController;
use App\Http\Controllers\SuperAdmin\MasterDataController;
use App\Http\Controllers\TwoFactorController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => ['ok' => true, 'service' => 'carepath-api']);

// Public marketplace — no auth.
Route::prefix('marketplace')->group(function () {
    Route::get('/facilities', [MarketplaceController::class, 'index']);
    Route::get('/suggest', [MarketplaceController::class, 'suggest']);
    Route::get('/top-cities', [MarketplaceController::class, 'topCities']);
    Route::get('/stats', [MarketplaceController::class, 'stats']);
    Route::get('/states/{state}', [MarketplaceController::class, 'state']);
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
});

// Public content hub — articles + tools — no auth.
Route::prefix('content')->group(function () {
    Route::get('/articles', [ArticleController::class, 'index']);
    Route::get('/articles/{slug}', [ArticleController::class, 'show']);
});

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
});
