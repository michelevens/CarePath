<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Resolves the active facility for the authenticated user and binds it onto
 * the request as `facility_id`. Downstream queries should use this id to
 * scope all reads/writes (or rely on a global Eloquent scope).
 *
 * Modeled after InsureFlow's AgencyScope middleware.
 */
class FacilityScope
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $facilityId = $request->header('X-Facility-Id') ?? $user->active_facility_id;

        if (! $facilityId) {
            return response()->json([
                'message' => 'No active facility selected',
            ], 403);
        }

        // TODO: verify user actually has access to this facility via facility_user pivot

        $request->attributes->set('facility_id', $facilityId);

        return $next($request);
    }
}
