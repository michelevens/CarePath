import { useEffect, useMemo, useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import {
  Building2,
  Check,
  ChevronRight,
  Heart,
  Hospital,
  Loader2,
  Mail,
  Search,
  Shield,
  UserPlus,
  Users as UsersIcon,
  X,
} from "lucide-react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface FacilityPick {
  id: string
  name: string
  city: string
  state: string
}

interface UserRow {
  id: number
  name: string
  email: string
  email_verified: boolean
  two_factor_enabled: boolean
  roles: string[]
  created_at: string
}

interface UsersPayload {
  data: UserRow[]
  summary: {
    total: number
    verified: number
    by_role: Record<string, number>
  }
  assignable_roles: string[]
}

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super admin",
  network_admin: "Network admin",
  facility_admin: "Facility admin",
  facility_staff: "Facility staff",
  referral_partner: "Placement advisor",
  hospital_partner: "Hospital partner",
  family_member: "Family member",
  resident: "Resident",
}

const ROLE_COLOR: Record<string, string> = {
  super_admin: "bg-destructive/10 text-destructive",
  network_admin: "bg-amber-100 text-amber-800",
  facility_admin: "bg-violet-100 text-violet-700",
  facility_staff: "bg-indigo-100 text-indigo-700",
  referral_partner: "bg-blue-100 text-blue-800",
  hospital_partner: "bg-cyan-100 text-cyan-800",
  family_member: "bg-emerald-100 text-emerald-800",
  resident: "bg-stone-200 text-stone-700",
}

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime()
  const hours = Math.floor(ms / 3_600_000)
  if (hours < 1) return "just now"
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

export function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [summary, setSummary] = useState<UsersPayload["summary"] | null>(null)
  const [assignable, setAssignable] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState("")
  const [roleFilter, setRoleFilter] = useState("")
  const [inviteOpen, setInviteOpen] = useState(false)
  const [editing, setEditing] = useState<UserRow | null>(null)

  const load = () => {
    setLoading(true)
    api
      .get<UsersPayload>("/superadmin/users", { params: { q, role: roleFilter } })
      .then((r) => {
        setUsers(r.data?.data ?? [])
        setSummary(r.data?.summary ?? null)
        setAssignable(r.data?.assignable_roles ?? [])
      })
      .catch((e: unknown) => {
        const err = e as { response?: { data?: { message?: string } } }
        setError(err.response?.data?.message ?? "Failed to load users")
      })
      .finally(() => setLoading(false))
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [])

  const roleOptions = useMemo(
    () => [...new Set([...assignable, "super_admin"])].sort(),
    [assignable],
  )

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Everyone on the platform. {summary?.total ?? 0} total ·{" "}
            {summary?.verified ?? 0} email-verified.
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Invite user
        </Button>
      </div>

      {/* Role breakdown chips */}
      {summary && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(summary.by_role)
            .filter(([, n]) => n > 0)
            .sort((a, b) => b[1] - a[1])
            .map(([role, count]) => (
              <button
                key={role}
                onClick={() => setRoleFilter(roleFilter === role ? "" : role)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  roleFilter === role
                    ? "ring-2 ring-violet-400 " + (ROLE_COLOR[role] ?? "bg-stone-200")
                    : ROLE_COLOR[role] ?? "bg-stone-200 text-stone-700"
                }`}
              >
                {ROLE_LABEL[role] ?? role}: {count}
              </button>
            ))}
        </div>
      )}

      {/* Filter bar */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search name or email…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
              className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-9 rounded-md border bg-background px-2 text-sm"
          >
            <option value="">All roles</option>
            {roleOptions.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r] ?? r}
              </option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Apply"}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">User</th>
                  <th className="px-4 py-2 text-left font-medium">Roles</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                  <th className="px-4 py-2 text-left font-medium">Joined</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {loading && users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                )}
                {!loading && users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No users match this filter.
                    </td>
                  </tr>
                )}
                {users.map((u) => (
                  <tr key={u.id} className="border-b last:border-b-0 hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div className="font-medium">{u.name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {u.roles.length === 0 && (
                          <span className="text-xs text-muted-foreground">no role</span>
                        )}
                        {u.roles.map((r) => (
                          <span
                            key={r}
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              ROLE_COLOR[r] ?? "bg-stone-200 text-stone-700"
                            }`}
                          >
                            {ROLE_LABEL[r] ?? r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      <div className="flex flex-col gap-0.5">
                        <span className={u.email_verified ? "text-emerald-700" : ""}>
                          {u.email_verified ? "✓ Email verified" : "Email unverified"}
                        </span>
                        {u.two_factor_enabled && (
                          <span className="text-violet-700">✓ 2FA on</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{timeAgo(u.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditing(u)}
                          className="gap-1 text-xs"
                        >
                          <Shield className="h-3 w-3" /> Roles
                        </Button>
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-xs"
                        >
                          <Link to={`/superadmin/users/${u.id}`}>
                            Open <ChevronRight className="h-3 w-3" />
                          </Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {inviteOpen && (
        <InviteModal
          onClose={() => setInviteOpen(false)}
          onInvited={() => {
            setInviteOpen(false)
            load()
          }}
          assignable={assignable}
        />
      )}

      {editing && (
        <EditRolesModal
          user={editing}
          assignable={assignable}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            load()
          }}
        />
      )}
    </div>
  )
}

interface RoleMeta {
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  needsFacility?: boolean
  multiFacility?: boolean
  needsAgency?: boolean
  needsOrg?: boolean
}

const ROLE_META: Record<string, RoleMeta> = {
  facility_admin: {
    label: "Facility administrator",
    description: "Manages a single facility — census, beds, compliance, billing, staff.",
    icon: Building2,
    needsFacility: true,
  },
  facility_staff: {
    label: "Facility staff",
    description: "Care team — residents, care plans, MDS, handoffs.",
    icon: Heart,
    needsFacility: true,
  },
  network_admin: {
    label: "Network / corporate admin",
    description: "Cross-facility analytics + master data for a multi-site operator.",
    icon: Building2,
    needsFacility: true,
    multiFacility: true,
  },
  referral_partner: {
    label: "Placement advisor",
    description: "Independent advisor or agency that sources family placements.",
    icon: UsersIcon,
    needsAgency: true,
  },
  hospital_partner: {
    label: "Hospital case manager",
    description: "Discharge planner that embeds the CarePath widget and routes referrals.",
    icon: Hospital,
    needsOrg: true,
  },
  family_member: {
    label: "Family member",
    description: "Adult child, spouse, or POA looking for care.",
    icon: Heart,
  },
  resident: {
    label: "Resident",
    description: "Resident themselves (or POA acting on their behalf).",
    icon: UsersIcon,
  },
}

/**
 * Visual grouping for the invite picker. Every role we serve falls
 * into exactly one of these. Renders the three sections so a
 * SuperAdmin doesn't think the invite flow only supports facility
 * staff at a glance.
 */
const ROLE_GROUPS: Array<{ title: string; blurb: string; roles: string[] }> = [
  {
    title: "Facility team",
    blurb: "People who work at or oversee one or more facilities on the platform.",
    roles: ["facility_admin", "facility_staff", "network_admin"],
  },
  {
    title: "Referral partners",
    blurb: "Independent professionals who send placements and earn commissions.",
    roles: ["referral_partner", "hospital_partner"],
  },
  {
    title: "Consumers",
    blurb: "Families researching care and residents using the platform directly.",
    roles: ["family_member", "resident"],
  },
]

function InviteModal({
  onClose,
  onInvited,
  assignable,
}: {
  onClose: () => void
  onInvited: () => void
  assignable: string[]
}) {
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [role, setRole] = useState<string>("")  // no preselection
  const [facilityIds, setFacilityIds] = useState<string[]>([])
  const [agencyName, setAgencyName] = useState("")
  const [orgName, setOrgName] = useState("")
  const [partnerType, setPartnerType] = useState("hospital")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const meta = role ? (ROLE_META[role] ?? null) : null

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!role) {
      setErr("Pick a user type first.")
      return
    }
    setBusy(true)
    setErr(null)
    try {
      const body: Record<string, unknown> = { email, name, role }
      if (meta?.needsFacility) body.facility_ids = facilityIds
      if (meta?.needsAgency) body.agency_name = agencyName
      if (meta?.needsOrg) {
        body.org_name = orgName
        body.partner_type = partnerType
      }
      await api.post("/superadmin/users/invite", body)
      onInvited()
    } catch (e) {
      const error = e as { response?: { data?: { message?: string } } }
      setErr(error.response?.data?.message ?? "Invite failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal onClose={onClose} title="Invite user" wide>
      <form onSubmit={submit} className="space-y-5">
        {/* Role picker grouped into the three audiences we actually
            serve, so it's clear the invite supports more than just
            facility staff. Nothing is preselected — the SuperAdmin
            picks deliberately. */}
        <div>
          <div className="mb-1 text-sm font-medium">Who are you inviting?</div>
          <p className="mb-3 text-xs text-muted-foreground">
            CarePath supports every audience listed below — pick the type that
            matches the person you're adding.
          </p>
          <div className="space-y-4">
            {ROLE_GROUPS.map((group) => {
              const visibleRoles = group.roles.filter((r) => assignable.includes(r))
              if (visibleRoles.length === 0) return null
              return (
                <div key={group.title}>
                  <div className="mb-1.5 flex items-baseline gap-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {group.title}
                    </h3>
                    <span className="text-[11px] text-muted-foreground">
                      {group.blurb}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {visibleRoles.map((r) => {
                      const m = ROLE_META[r] ?? { label: r, description: "", icon: UsersIcon }
                      const Icon = m.icon
                      const selected = role === r
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRole(r)}
                          className={`flex items-start gap-2 rounded-md border p-2 text-left transition-colors ${
                            selected
                              ? "border-violet-400 bg-violet-50 ring-1 ring-violet-300"
                              : "hover:border-violet-200 hover:bg-muted/30"
                          }`}
                        >
                          <Icon
                            className={`mt-0.5 h-4 w-4 shrink-0 ${
                              selected ? "text-violet-700" : "text-muted-foreground"
                            }`}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium">{m.label}</div>
                            <div className="text-[11px] text-muted-foreground leading-snug">
                              {m.description}
                            </div>
                          </div>
                          {selected && (
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-violet-700" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Identity */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Full name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={120}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            />
          </Field>
        </div>

        {/* Per-role context */}
        {meta?.needsFacility && (
          <Field
            label={
              meta.multiFacility
                ? "Facilities (select all they cover)"
                : "Facility"
            }
          >
            <FacilityMultiPicker
              value={facilityIds}
              onChange={setFacilityIds}
              multi={meta.multiFacility ?? false}
            />
          </Field>
        )}

        {meta?.needsAgency && (
          <Field label="Agency name (optional)">
            <input
              value={agencyName}
              onChange={(e) => setAgencyName(e.target.value)}
              maxLength={191}
              placeholder="Demo Senior Placement"
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Creates an AdvisorProfile shell. Advisor lands in the Verifications
              queue and isn't payout-ready until ops verifies + they complete
              Stripe Connect onboarding.
            </p>
          </Field>
        )}

        {meta?.needsOrg && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Organization name">
              <input
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                maxLength={191}
                placeholder="Demo Regional Medical Center"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              />
            </Field>
            <Field label="Partner type">
              <select
                value={partnerType}
                onChange={(e) => setPartnerType(e.target.value)}
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              >
                <option value="hospital">Hospital</option>
                <option value="health_system">Health system</option>
                <option value="rehab">Rehab / IRF</option>
                <option value="snf_discharge">SNF discharge</option>
                <option value="accountable_care">ACO</option>
              </select>
            </Field>
          </div>
        )}

        {err && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
            {err}
          </div>
        )}
        <div className="flex justify-end gap-2 border-t pt-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy} className="gap-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            Send invite
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function FacilityMultiPicker({
  value,
  onChange,
  multi,
}: {
  value: string[]
  onChange: (ids: string[]) => void
  multi: boolean
}) {
  const [q, setQ] = useState("")
  const [opts, setOpts] = useState<FacilityPick[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true)
      api
        .get<{ data: FacilityPick[] }>("/superadmin/users/facility-picker", { params: { q } })
        .then((r) => setOpts(r.data?.data ?? []))
        .finally(() => setLoading(false))
    }, 200)
    return () => clearTimeout(t)
  }, [q])

  const toggle = (id: string) => {
    if (multi) {
      onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id])
    } else {
      onChange(value.includes(id) ? [] : [id])
    }
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name or city…"
          className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm"
        />
      </div>
      <div className="max-h-48 overflow-y-auto rounded-md border bg-background">
        {loading && (
          <div className="p-2 text-xs text-muted-foreground">Loading…</div>
        )}
        {!loading && opts.length === 0 && (
          <div className="p-2 text-xs text-muted-foreground">No facilities match.</div>
        )}
        {opts.map((f) => {
          const on = value.includes(f.id)
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => toggle(f.id)}
              className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted/40 ${
                on ? "bg-violet-50" : ""
              }`}
            >
              <div>
                <div className="font-medium">{f.name}</div>
                <div className="text-[11px] text-muted-foreground">
                  {f.city}, {f.state}
                </div>
              </div>
              {on && <Check className="h-4 w-4 text-violet-700" />}
            </button>
          )
        })}
      </div>
      {value.length > 0 && (
        <div className="text-[11px] text-muted-foreground">
          {value.length} selected
        </div>
      )}
    </div>
  )
}

function EditRolesModal({
  user,
  assignable,
  onClose,
  onSaved,
}: {
  user: UserRow
  assignable: string[]
  onClose: () => void
  onSaved: () => void
}) {
  const initial = user.roles.filter((r) => assignable.includes(r))
  const [selected, setSelected] = useState<string[]>(initial)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const hasSuperAdmin = user.roles.includes("super_admin")

  const toggle = (role: string) => {
    setSelected((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    )
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    try {
      await api.put(`/superadmin/users/${user.id}/roles`, { roles: selected })
      onSaved()
    } catch (e) {
      const error = e as { response?: { data?: { message?: string } } }
      setErr(error.response?.data?.message ?? "Save failed")
    } finally {
      setBusy(false)
    }
  }

  const resendInvite = async () => {
    setBusy(true)
    try {
      await api.post(`/superadmin/users/${user.id}/resend-invite`)
      setErr(null)
      onSaved()
    } catch (e) {
      const error = e as { response?: { data?: { message?: string } } }
      setErr(error.response?.data?.message ?? "Failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal onClose={onClose} title={`Edit roles · ${user.name || user.email}`}>
      <form onSubmit={submit} className="space-y-4">
        {hasSuperAdmin && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
            This user is a <strong>super_admin</strong>. That role isn't editable
            from here — it's preserved regardless of the toggles below.
          </div>
        )}
        <div className="space-y-1">
          {assignable.map((role) => {
            const on = selected.includes(role)
            return (
              <button
                key={role}
                type="button"
                onClick={() => toggle(role)}
                className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                  on
                    ? "border-violet-300 bg-violet-50 text-violet-900"
                    : "hover:bg-muted/40"
                }`}
              >
                <span>{ROLE_LABEL[role] ?? role}</span>
                {on && <Check className="h-4 w-4 text-violet-700" />}
              </button>
            )
          })}
        </div>
        {err && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
            {err}
          </div>
        )}
        <div className="flex items-center justify-between gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resendInvite}
            disabled={busy}
            className="gap-1 text-xs"
          >
            <Mail className="h-3 w-3" />
            Resend invite email
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

function Modal({
  title,
  children,
  onClose,
  wide,
}: {
  title: string
  children: React.ReactNode
  onClose: () => void
  wide?: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className={`max-h-[90vh] w-full overflow-y-auto rounded-lg border bg-card shadow-xl ${
          wide ? "max-w-2xl" : "max-w-md"
        }`}
      >
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <UsersIcon className="h-4 w-4" />
            {title}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-medium text-muted-foreground">{label}</div>
      {children}
    </label>
  )
}
