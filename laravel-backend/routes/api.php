<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\Facility\FacilityDataController;
use App\Http\Controllers\SuperAdmin\AuditLogController;
use App\Http\Controllers\SuperAdmin\MasterDataController;
use App\Http\Controllers\TwoFactorController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => ['ok' => true, 'service' => 'carepath-api']);

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
    });
});
