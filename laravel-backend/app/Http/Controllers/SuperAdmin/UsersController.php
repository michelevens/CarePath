<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\AdvisorProfile;
use App\Models\Facility;
use App\Models\HospitalPartner;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
     * Type-aware invite. Beyond name + email + role, accepts the
     * context fields each role actually needs:
     *
     *   facility_admin / facility_staff   → facility_ids[] (pivot rows)
     *   network_admin                     → facility_ids[] (multi)
     *   referral_partner                  → agency_name (+ AdvisorProfile stub)
     *   hospital_partner                  → org_name + partner_type
     *                                       (+ HospitalPartner stub)
     *   family_member / resident          → no extra context
     *
     * Without these the user gets a role but lands in an empty portal
     * with nothing to do. Pre-creating the pivot rows + profile stubs
     * means they're immediately operational.
     */
    public function invite(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:191'],
            'name' => ['required', 'string', 'max:120'],
            'role' => ['required', Rule::in(self::ASSIGNABLE_ROLES)],
            // Type-aware context (all optional in the validator; we
            // check per-role below for required combinations).
            'facility_ids' => ['nullable', 'array'],
            'facility_ids.*' => ['uuid', 'exists:facilities,id'],
            'agency_name' => ['nullable', 'string', 'max:191'],
            'org_name' => ['nullable', 'string', 'max:191'],
            'partner_type' => ['nullable', Rule::in(HospitalPartner::PARTNER_TYPES)],
        ]);

        $email = strtolower($data['email']);

        return DB::transaction(function () use ($data, $email) {
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

            $user->assignRole($data['role']);

            // Per-role provisioning so the invitee lands in an
            // operational portal, not an empty one.
            $this->provisionByRole($user, $data['role'], $data);

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
        });
    }

    /**
     * Side-effects of granting a role on first invite. Idempotent —
     * adding a second invite for the same user just refreshes the
     * pivot rows / profile fields.
     */
    private function provisionByRole(User $user, string $role, array $data): void
    {
        $facilityIds = $data['facility_ids'] ?? [];

        if (in_array($role, ['facility_admin', 'facility_staff', 'network_admin'], true)) {
            $pivotRole = match ($role) {
                'facility_admin' => 'admin',
                'facility_staff' => 'staff',
                'network_admin' => 'network',
            };
            foreach ($facilityIds as $fid) {
                DB::table('facility_user')->updateOrInsert(
                    ['facility_id' => $fid, 'user_id' => $user->id],
                    ['role' => $pivotRole, 'created_at' => now(), 'updated_at' => now()],
                );
            }
            // Set their active facility to the first one so the
            // facility-scoped UI has something to render.
            if (! empty($facilityIds) && empty($user->active_facility_id)) {
                $user->update(['active_facility_id' => $facilityIds[0]]);
            }
        }

        if ($role === 'referral_partner') {
            $agencySlug = ! empty($data['agency_name'])
                ? Str::slug($data['agency_name'])
                : null;
            // Make slug unique if collision.
            if ($agencySlug) {
                $base = $agencySlug;
                $i = 0;
                while (AdvisorProfile::where('agency_slug', $agencySlug)
                    ->where('user_id', '!=', $user->id)->exists()
                ) {
                    $i++;
                    $agencySlug = $base . '-' . $i;
                }
            }
            AdvisorProfile::updateOrCreate(
                ['user_id' => $user->id],
                array_filter([
                    'agency_name' => $data['agency_name'] ?? null,
                    'agency_slug' => $agencySlug,
                    'is_active' => true,
                    'is_accepting_referrals' => true,
                    // verified_at deliberately null — must go through
                    // the Verifications queue before going live.
                ], fn ($v) => $v !== null),
            );
        }

        if ($role === 'hospital_partner') {
            $existing = HospitalPartner::where('user_id', $user->id)->first();
            if (! $existing) {
                $slug = ! empty($data['org_name'])
                    ? Str::slug($data['org_name'])
                    : 'partner-' . Str::lower(Str::random(8));
                $base = $slug;
                $i = 0;
                while (HospitalPartner::where('slug', $slug)->exists()) {
                    $i++;
                    $slug = $base . '-' . $i;
                }
                $plaintext = HospitalPartner::mintPlaintext();
                $partner = new HospitalPartner([
                    'user_id' => $user->id,
                    'name' => $data['org_name'] ?? '',
                    'slug' => $slug,
                    'partner_type' => $data['partner_type'] ?? 'hospital',
                    'is_active' => true,
                    'is_accepting_referrals' => true,
                ]);
                $partner->forceFill([
                    'api_key_hash' => HospitalPartner::hashKey($plaintext),
                    'api_key_prefix' => substr($plaintext, 0, 10),
                    'api_key_rotated_at' => now(),
                ])->save();
                \Illuminate\Support\Facades\Cache::put(
                    "hospital-partner-fresh-key:{$partner->id}",
                    $plaintext,
                    now()->addMinutes(10),
                );
            }
        }
    }

    /**
     * GET /api/superadmin/users/{id}
     *
     * Full per-user detail for the dedicated profile page. Eager-loads
     * everything the page renders — roles, facility memberships,
     * advisor profile, hospital partner — in one round trip.
     */
    public function show(int $id): JsonResponse
    {
        $user = User::with([
            'roles:id,name',
            'permissions:id,name',
            'facilities:id,name,slug,city,state',
            'advisorProfile',
        ])->findOrFail($id);

        $hospital = HospitalPartner::where('user_id', $user->id)
            ->with('user:id,name,email')
            ->first();

        // Recent platform activity. Audit log is the canonical source;
        // limit to 20 most recent rows touching this user.
        $audit = DB::table('audit_logs')
            ->where(function ($q) use ($user) {
                $q->where('user_id', $user->id)
                  ->orWhere(function ($q2) use ($user) {
                      $q2->where('auditable_type', User::class)
                         ->where('auditable_id', $user->id);
                  });
            })
            ->orderByDesc('created_at')
            ->limit(20)
            ->get(['id', 'event', 'auditable_type', 'auditable_id', 'created_at']);

        return response()->json([
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'email_verified' => (bool) $user->email_verified_at,
                'two_factor_enabled' => (bool) $user->two_factor_confirmed_at,
                'active_facility_id' => $user->active_facility_id,
                'stripe_customer_id' => $user->stripe_customer_id,
                'stripe_account_id' => $user->stripe_account_id,
                'stripe_account_status' => $user->stripe_account_status,
                'created_at' => $user->created_at,
                'roles' => $user->roles->pluck('name')->all(),
                'permissions' => $user->getAllPermissions()->pluck('name')->all(),
                'facility_memberships' => $user->facilities->map(fn ($f) => [
                    'id' => $f->id,
                    'name' => $f->name,
                    'slug' => $f->slug,
                    'city' => $f->city,
                    'state' => $f->state,
                    'pivot_role' => $f->pivot->role ?? null,
                ]),
                'advisor_profile' => $user->advisorProfile ? [
                    'id' => $user->advisorProfile->id,
                    'agency_name' => $user->advisorProfile->agency_name,
                    'agency_slug' => $user->advisorProfile->agency_slug,
                    'licensed_states' => $user->advisorProfile->licensed_states,
                    'stripe_account_status' => $user->advisorProfile->stripe_account_status,
                    'commission_split_advisor_pct' => $user->advisorProfile->commission_split_advisor_pct,
                    'is_active' => (bool) $user->advisorProfile->is_active,
                    'is_accepting_referrals' => (bool) $user->advisorProfile->is_accepting_referrals,
                    'verified_at' => $user->advisorProfile->verified_at,
                ] : null,
                'hospital_partner' => $hospital ? [
                    'id' => $hospital->id,
                    'name' => $hospital->name,
                    'slug' => $hospital->slug,
                    'partner_type' => $hospital->partner_type,
                    'service_area_states' => $hospital->service_area_states,
                    'stripe_account_status' => $hospital->stripe_account_status,
                    'is_active' => (bool) $hospital->is_active,
                    'verified_at' => $hospital->verified_at,
                ] : null,
                'recent_activity' => $audit,
            ],
            'assignable_roles' => self::ASSIGNABLE_ROLES,
        ]);
    }

    /**
     * PUT /api/superadmin/users/{id}/memberships
     *
     * Add / remove facility-pivot rows. Used when reassigning a
     * facility_admin between sites, adding a network admin to more
     * facilities, etc.
     */
    public function updateMemberships(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'memberships' => ['required', 'array'],
            'memberships.*.facility_id' => ['required', 'uuid', 'exists:facilities,id'],
            'memberships.*.pivot_role' => ['required', 'string', Rule::in(['staff', 'admin', 'network', 'referral'])],
        ]);

        $user = User::findOrFail($id);

        $sync = [];
        foreach ($data['memberships'] as $m) {
            $sync[$m['facility_id']] = ['role' => $m['pivot_role']];
        }
        $user->facilities()->sync($sync);

        return response()->json([
            'ok' => true,
            'memberships' => $user->facilities()->get(['facilities.id', 'name', 'slug'])->map->only(['id', 'name', 'slug']),
        ]);
    }

    /**
     * GET /api/superadmin/users/facility-picker
     *
     * Lightweight facility list for the invite + membership editor.
     * Returns id + name + city/state only. Limited to active rows.
     */
    public function facilityPicker(Request $request): JsonResponse
    {
        $q = $request->query('q');
        $query = Facility::query()
            ->where('is_active', true)
            ->select(['id', 'name', 'city', 'state']);

        if ($q) {
            $needle = '%' . $q . '%';
            $query->where(function ($w) use ($needle) {
                $w->where('name', 'ILIKE', $needle)
                  ->orWhere('city', 'ILIKE', $needle);
            });
        }

        return response()->json([
            'data' => $query->orderBy('name')->limit(50)->get(),
        ]);
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
