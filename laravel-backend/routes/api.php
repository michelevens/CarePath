<?php

use App\Http\Controllers\AuthController;
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

    Route::prefix('superadmin/master-data')
        ->middleware('role:super_admin')
        ->group(function () {
            Route::get('/{type}', [MasterDataController::class, 'index']);
            Route::post('/{type}', [MasterDataController::class, 'store']);
            Route::put('/{type}/{id}', [MasterDataController::class, 'update']);
            Route::delete('/{type}/{id}', [MasterDataController::class, 'destroy']);
        });

    Route::middleware('facility.scope')->group(function () {
        // Facility-scoped endpoints — added in Phase 2.2+
    });
});
