<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Role;

/**
 * Platform-wide user management. Lives behind role:super_admin.
 *
 * Self-signup creates an unscoped User (no role) — that path is fine
 * for prospective families browsing the marketplace. Every other user
 * type (advisor, hospital, facility admin/staff, network) goes
 * through invite-by-superadmin: we want to vet who gets a portal
 * before they have access, not after.
 */
class UsersController extends Controller
{
    /**
     * Roles the superadmin can grant. Mirrors RolePermissionSeeder.
     * super_admin is intentionally omitted from the assignable list
     * — promoting another user to super_admin is a sensitive enough
     * action that it should be done explicitly via a separate code
     * path (or via Tinker for now), not casually from the UI.
     */
    public const ASSIGNABLE_ROLES = [
        'network_admin',
        'facility_admin',
        'facility_staff',
        'referral_partner',
        'hospital_partner',
        'family_member',
        'resident',
    ];

    /**
     * GET /api/superadmin/users
     *
     * Paginated list with search + role filter. Eager-loads roles so
     * the list view can render the role chips without N+1.
     */
    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'role' => ['nullable', 'string'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:500'],
        ]);

        $query = User::query()
            ->with('roles:id,name')
            ->select(['id', 'name', 'email', 'email_verified_at', 'created_at',
                      'two_factor_confirmed_at', 'active_facility_id'])
            ->orderByDesc('created_at');

        if (! empty($data['q'])) {
            $needle = '%' . $data['q'] . '%';
            $query->where(function ($q) use ($needle) {
                $q->where('name', 'ILIKE', $needle)
                  ->orWhere('email', 'ILIKE', $needle);
            });
        }

        if (! empty($data['role'])) {
            $query->whereHas('roles', fn ($q) => $q->where('name', $data['role']));
        }

        $rows = $query->limit($data['limit'] ?? 200)->get();

        return response()->json([
            'data' => $rows->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'email_verified' => (bool) $u->email_verified_at,
                'two_factor_enabled' => (bool) $u->two_factor_confirmed_at,
                'roles' => $u->roles->pluck('name')->all(),
                'created_at' => $u->created_at,
            ]),
            'summary' => [
                'total' => User::count(),
                'verified' => User::whereNotNull('email_verified_at')->count(),
                'by_role' => $this->byRoleCounts(),
            ],
            'assignable_roles' => self::ASSIGNABLE_ROLES,
        ]);
    }

    /**
     * POST /api/superadmin/users/invite
     *
     * Create a User with a random unsettable password, assign the
     * requested role, and email them a password-reset link so they
     * set their own. Idempotent on email collision: if the user
     * exists we update name + add the role rather than failing.
     */
    public function invite(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:191'],
            'name' => ['required', 'string', 'max:120'],
            'role' => ['required', Rule::in(self::ASSIGNABLE_ROLES)],
        ]);

        $email = strtolower($data['email']);
        $user = User::firstOrNew(['email' => $email]);

        $created = ! $user->exists;
        if ($created) {
            $user->name = $data['name'];
            // Random password — they'll never use it because they set
            // their own via the reset link. We just need a value so
            // the column isn't null.
            $user->password = Hash::make(Str::random(40));
            // Auto-verify the email since the invite itself implies a
            // trusted off-platform vetting step.
            $user->email_verified_at = now();
            $user->save();
        } else {
            // Existing account — keep current name unless empty.
            if (empty($user->name)) {
                $user->name = $data['name'];
                $user->save();
            }
        }

        // syncRoles wipes the array; we add instead so an existing
        // user can hold multiple roles (e.g. facility_admin who's
        // also a referral_partner).
        $user->assignRole($data['role']);

        // Send the set-password email. Uses Laravel's standard
        // password-reset broker, so the user lands on /reset-password
        // via the existing frontend route.
        Password::sendResetLink(['email' => $email]);

        return response()->json([
            'ok' => true,
            'created' => $created,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'roles' => $user->roles()->pluck('name')->all(),
            ],
        ], $created ? 201 : 200);
    }

    /**
     * PUT /api/superadmin/users/{id}/roles
     *
     * Replace the user's role list. super_admin is filtered out of
     * the input (see ASSIGNABLE_ROLES note above); existing super
     * admins keep their role unless explicitly demoted via a
     * separate code path.
     */
    public function updateRoles(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'roles' => ['required', 'array'],
            'roles.*' => [Rule::in(self::ASSIGNABLE_ROLES)],
        ]);

        $user = User::findOrFail($id);
        $hadSuperAdmin = $user->hasRole('super_admin');

        $user->syncRoles($data['roles']);

        // Preserve super_admin if the user already had it — syncRoles
        // would have wiped it.
        if ($hadSuperAdmin) {
            $user->assignRole('super_admin');
        }

        return response()->json([
            'ok' => true,
            'roles' => $user->roles()->pluck('name')->all(),
        ]);
    }

    /**
     * POST /api/superadmin/users/{id}/resend-invite
     *
     * Re-fires the password-reset email. Useful when an invite link
     * has expired (Laravel's default is 60 min).
     */
    public function resendInvite(int $id): JsonResponse
    {
        $user = User::findOrFail($id);
        Password::sendResetLink(['email' => $user->email]);
        return response()->json(['ok' => true]);
    }

    private function byRoleCounts(): array
    {
        return Role::query()
            ->withCount('users')
            ->get(['id', 'name'])
            ->mapWithKeys(fn ($r) => [$r->name => (int) $r->users_count])
            ->all();
    }
}
