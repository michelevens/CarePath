<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => ['ok' => true, 'service' => 'carepath-api']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', fn (Request $r) => $r->user());

    Route::middleware('facility.scope')->group(function () {
        // Facility-scoped endpoints go here
        // Route::apiResource('beds', BedController::class);
        // Route::apiResource('residents', ResidentController::class);
    });
});
