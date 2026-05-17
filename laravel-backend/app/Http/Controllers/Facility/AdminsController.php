<?php

namespace App\Http\Controllers\Facility;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Manages who else has admin / staff access to the active facility.
 *
 * Only callable by users with role:facility_admin (gated in routes)
 * AND scoped to the active facility via facility.scope middleware.
 * A facility admin can:
 *   - List everyone currently on the facility_user pivot
 *   - Invite a new admin / staff member (creates User if needed,
 *     sets pivot role, sends set-password link)
 *   - Change another member's pivot role (staff <-> admin)
 *   - Remove a member (drops the pivot row; user keeps their
 *     account, just loses access to this facility)
 *
 * They cannot remove themselves (avoids accidental self-lockout
 * when there's only one admin on the facility).
 */
class AdminsController extends Controller
{
    public const PIVOT_ROLES = ['admin', 'staff'];

    public function index(Request $request): JsonResponse
    {
        $facilityId = $request->attributes->get('facility_id');

        $members = DB::table('facility_user as fu')
            ->join('users', 'users.id', '=', 'fu.user_id')
            ->where('fu.facility_id', $facilityId)
            ->orderBy('fu.role')
            ->orderBy('users.name')
            ->get([
                'users.id', 'users.name', 'users.email',
                'users.email_verified_at', 'users.two_factor_confirmed_at',
                'fu.role as pivot_role', 'fu.created_at as added_at',
            ]);

        return response()->json([
            'data' => $members->map(fn ($m) => [
                'id' => $m->id,
                'name' => $m->name,
                'email' => $m->email,
                'email_verified' => (bool) $m->email_verified_at,
                'two_factor_enabled' => (bool) $m->two_factor_confirmed_at,
                'pivot_role' => $m->pivot_role,
                'added_at' => $m->added_at,
                'is_you' => (int) $m->id === (int) $request->user()->id,
            ]),
        ]);
    }

    /**
     * POST /api/facility/admins/invite
     *
     * Creates the user (or reuses an existing account by email),
     * adds the facility_user pivot, assigns the matching spatie
     * role, and emails a set-password link. Mirrors the SuperAdmin
     * UsersController::invite flow but scoped to this facility +
     * limited to staff/admin pivot roles.
     */
    public function invite(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:191'],
            'pivot_role' => ['required', Rule::in(self::PIVOT_ROLES)],
        ]);

        $facilityId = $request->attributes->get('facility_id');
        $email = strtolower($data['email']);

        DB::transaction(function () use ($data, $email, $facilityId) {
            $user = User::firstOrNew(['email' => $email]);
            $created = ! $user->exists;
            if ($created) {
                $user->name = $data['name'];
                $user->password = Hash::make(Str::random(40));
                $user->email_verified_at = now();
                $user->save();
            } elseif (empty($user->name)) {
                $user->name = $data['name'];
                $user->save();
            }

            $spatieRole = $data['pivot_role'] === 'admin' ? 'facility_admin' : 'facility_staff';
            $user->assignRole($spatieRole);

            DB::table('facility_user')->updateOrInsert(
                ['facility_id' => $facilityId, 'user_id' => $user->id],
                ['role' => $data['pivot_role'], 'updated_at' => now(), 'created_at' => now()],
            );

            if (empty($user->active_facility_id)) {
                $user->update(['active_facility_id' => $facilityId]);
            }

            if ($created) {
                Password::sendResetLink(['email' => $email]);
            }
        });

        return response()->json(['ok' => true], 201);
    }

    /**
     * PUT /api/facility/admins/{userId}/role
     */
    public function updateRole(Request $request, int $userId): JsonResponse
    {
        $data = $request->validate([
            'pivot_role' => ['required', Rule::in(self::PIVOT_ROLES)],
        ]);

        $facilityId = $request->attributes->get('facility_id');
        $this->refuseSelf($request, $userId, "You can't change your own role on this facility.");

        DB::table('facility_user')
            ->where('facility_id', $facilityId)
            ->where('user_id', $userId)
            ->update(['role' => $data['pivot_role'], 'updated_at' => now()]);

        // Ensure the user has the matching spatie role too.
        $spatieRole = $data['pivot_role'] === 'admin' ? 'facility_admin' : 'facility_staff';
        User::find($userId)?->assignRole($spatieRole);

        return response()->json(['ok' => true]);
    }

    /**
     * DELETE /api/facility/admins/{userId}
     *
     * Removes the user from this facility. Their account stays;
     * they just lose access to this facility's data. If they were
     * the last admin we refuse — the facility would be orphaned.
     */
    public function remove(Request $request, int $userId): JsonResponse
    {
        $facilityId = $request->attributes->get('facility_id');
        $this->refuseSelf($request, $userId, "You can't remove yourself. Ask another admin or contact CarePath support.");

        $adminCount = DB::table('facility_user')
            ->where('facility_id', $facilityId)
            ->where('role', 'admin')
            ->count();

        $isLastAdminTarget = DB::table('facility_user')
            ->where('facility_id', $facilityId)
            ->where('user_id', $userId)
            ->where('role', 'admin')
            ->exists();

        if ($isLastAdminTarget && $adminCount <= 1) {
            throw ValidationException::withMessages([
                'user' => 'Cannot remove the only admin. Promote another member to admin first.',
            ]);
        }

        DB::table('facility_user')
            ->where('facility_id', $facilityId)
            ->where('user_id', $userId)
            ->delete();

        return response()->json(['ok' => true]);
    }

    private function refuseSelf(Request $request, int $userId, string $message): void
    {
        if ((int) $request->user()?->id === $userId) {
            throw ValidationException::withMessages(['user' => $message]);
        }
    }
}
