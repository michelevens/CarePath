import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import {
  ArrowLeft,
  Building2,
  Check,
  ChevronRight,
  Hospital,
  Loader2,
  Mail,
  Shield,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface FacilityMembership {
  id: string
  name: string
  slug: string
  city: string
  state: string
  pivot_role: string | null
}

interface AdvisorProfile {
  id: string
  agency_name: string | null
  agency_slug: string | null
  licensed_states: string[] | null
  stripe_account_status: string
  commission_split_advisor_pct: number
  is_active: boolean
  is_accepting_referrals: boolean
  verified_at: string | null
}

interface HospitalPartner {
  id: string
  name: string
  slug: string
  partner_type: string
  service_area_states: string[] | null
  stripe_account_status: string
  is_active: boolean
  verified_at: string | null
}

interface AuditEntry {
  id: string
  event: string
  auditable_type: string | null
  auditable_id: string | null
  created_at: string
}

interface FamilyTour {
  id: string
  facility: { name: string; slug: string; city: string; state: string } | null
  starts_at: string
  status: string
  tour_type: string
  prospect: string
}

interface PartnerAdmission {
  id: string
  facility: { name: string; slug: string; city: string; state: string } | null
  stage: string
  attribution_source: string | null
  prospect: string
  created_at: string
}

type FlowActivity =
  | { type: "family"; tours: FamilyTour[]; tours_count: number }
  | { type: "partner"; admissions: PartnerAdmission[]; admissions_count: number }
  | { type: "none" }

interface UserDetail {
  id: number
  name: string
  email: string
  email_verified: boolean
  two_factor_enabled: boolean
  active_facility_id: string | null
  stripe_customer_id: string | null
  stripe_account_id: string | null
  stripe_account_status: string | null
  created_at: string
  roles: string[]
  permissions: string[]
  facility_memberships: FacilityMembership[]
  advisor_profile: AdvisorProfile | null
  hospital_partner: HospitalPartner | null
  recent_activity: AuditEntry[]
  flow_activity: FlowActivity
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

const CONNECT_LABEL: Record<string, string> = {
  not_connected: "Not connected",
  pending: "Onboarding pending",
  verifying: "Verifying with Stripe",
  active: "Active — payout ready",
  restricted: "Restricted",
  rejected: "Rejected",
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

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [user, setUser] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)

  const load = () => {
    setLoading(true)
    api
      .get<{ data: UserDetail }>(`/superadmin/users/${id}`)
      .then((r) => {
        setUser(r.data?.data ?? null)
      })
      .catch((e: unknown) => {
        const err = e as { response?: { data?: { message?: string }; status?: number } }
        if (err.response?.status === 404) setError("User not found")
        else setError(err.response?.data?.message ?? "Failed to load user")
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [id])

  const resendInvite = async () => {
    setResending(true)
    try {
      await api.post(`/superadmin/users/${id}/resend-invite`)
      setResent(true)
      setTimeout(() => setResent(false), 3000)
    } finally {
      setResending(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-sm text-muted-foreground">Loading user…</div>
  }
  if (error || !user) {
    return (
      <div className="space-y-4 p-6">
        <Button asChild variant="outline" size="sm" className="gap-1">
          <Link to="/superadmin/users">
            <ArrowLeft className="h-3 w-3" />
            Back to users
          </Link>
        </Button>
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error ?? "User unavailable"}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header + breadcrumb */}
      <div>
        <Link
          to="/superadmin/users"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          All users
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {user.name || "(no name)"}
            </h1>
            <div className="mt-1 text-sm text-muted-foreground">{user.email}</div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={resendInvite}
              disabled={resending}
              className="gap-1"
            >
              {resending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : resent ? (
                <Check className="h-3 w-3 text-emerald-600" />
              ) : (
                <Mail className="h-3 w-3" />
              )}
              {resent ? "Sent" : "Resend invite"}
            </Button>
            <Button
              size="sm"
              onClick={() => navigate(`/superadmin/users`)}
              className="gap-1"
            >
              Edit roles
            </Button>
          </div>
        </div>
      </div>

      {/* Status strip */}
      <div className="flex flex-wrap items-center gap-3">
        {user.roles.length === 0 && (
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
            no role assigned
          </span>
        )}
        {user.roles.map((r) => (
          <span
            key={r}
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              ROLE_COLOR[r] ?? "bg-stone-200 text-stone-700"
            }`}
          >
            {ROLE_LABEL[r] ?? r}
          </span>
        ))}
        <StatusPill
          ok={user.email_verified}
          okLabel="Email verified"
          warnLabel="Email unverified"
        />
        {user.two_factor_enabled && (
          <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700">
            ✓ 2FA on
          </span>
        )}
        <span className="text-xs text-muted-foreground">
          Joined {timeAgo(user.created_at)}
        </span>
      </div>

      {/* Per-role sections */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Facility memberships — for staff/admin/network */}
        {(user.roles.includes("facility_admin") ||
          user.roles.includes("facility_staff") ||
          user.roles.includes("network_admin")) && (
          <Card>
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">
                  Facility memberships ({user.facility_memberships.length})
                </h2>
              </div>
              {user.facility_memberships.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No facility pivot rows yet. Without one, the user will see an
                  empty portal. Re-invite or assign via the facility's admin tab.
                </p>
              )}
              <ul className="space-y-1">
                {user.facility_memberships.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/facility/${m.slug}`}
                        className="font-medium hover:underline"
                      >
                        {m.name}
                      </Link>
                      <div className="text-[11px] text-muted-foreground">
                        {m.city}, {m.state} ·{" "}
                        <span className="font-mono">{m.pivot_role ?? "—"}</span>
                        {m.id === user.active_facility_id && (
                          <span className="ml-1 rounded-full bg-violet-100 px-1.5 text-violet-700">
                            active
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Advisor profile — for referral_partner */}
        {user.advisor_profile && (
          <Card>
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold">Advisor profile</h2>
                </div>
                <VerifiedPill verifiedAt={user.advisor_profile.verified_at} />
              </div>
              <Detail label="Agency" value={user.advisor_profile.agency_name ?? "—"} />
              <Detail
                label="Slug"
                value={user.advisor_profile.agency_slug ?? "—"}
                mono
              />
              <Detail
                label="Licensed in"
                value={user.advisor_profile.licensed_states?.join(", ") || "—"}
              />
              <Detail
                label="Connect status"
                value={
                  CONNECT_LABEL[user.advisor_profile.stripe_account_status] ??
                  user.advisor_profile.stripe_account_status
                }
              />
              <Detail
                label="Commission split"
                value={`${user.advisor_profile.commission_split_advisor_pct}% advisor`}
              />
              {!user.advisor_profile.verified_at && (
                <Link
                  to="/superadmin/verifications"
                  className="inline-flex items-center gap-1 text-xs text-violet-700 hover:underline"
                >
                  Go to verifications queue
                  <ChevronRight className="h-3 w-3" />
                </Link>
              )}
            </CardContent>
          </Card>
        )}

        {/* Hospital partner — for hospital_partner */}
        {user.hospital_partner && (
          <Card>
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Hospital className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold">Hospital partner</h2>
                </div>
                <VerifiedPill verifiedAt={user.hospital_partner.verified_at} />
              </div>
              <Detail label="Organization" value={user.hospital_partner.name || "—"} />
              <Detail
                label="Type"
                value={user.hospital_partner.partner_type.replace(/_/g, " ")}
                capitalize
              />
              <Detail
                label="Service area"
                value={user.hospital_partner.service_area_states?.join(", ") || "—"}
              />
              <Detail
                label="Connect status"
                value={
                  CONNECT_LABEL[user.hospital_partner.stripe_account_status] ??
                  user.hospital_partner.stripe_account_status
                }
              />
              {!user.hospital_partner.verified_at && (
                <Link
                  to="/superadmin/verifications"
                  className="inline-flex items-center gap-1 text-xs text-violet-700 hover:underline"
                >
                  Go to verifications queue
                  <ChevronRight className="h-3 w-3" />
                </Link>
              )}
            </CardContent>
          </Card>
        )}

        {/* Permissions snapshot */}
        <Card>
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">
                Permissions ({user.permissions.length})
              </h2>
            </div>
            {user.permissions.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No explicit permissions. Access is gated by role.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {user.permissions.slice(0, 30).map((p) => (
                  <span
                    key={p}
                    className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-mono text-stone-700"
                  >
                    {p}
                  </span>
                ))}
                {user.permissions.length > 30 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{user.permissions.length - 30} more
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Billing wiring */}
        {(user.stripe_customer_id || user.stripe_account_id) && (
          <Card>
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Stripe</h2>
              </div>
              {user.stripe_customer_id && (
                <Detail label="Customer" value={user.stripe_customer_id} mono />
              )}
              {user.stripe_account_id && (
                <Detail label="Connect account" value={user.stripe_account_id} mono />
              )}
              {user.stripe_account_status && (
                <Detail
                  label="Connect status"
                  value={CONNECT_LABEL[user.stripe_account_status] ?? user.stripe_account_status}
                />
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Per-flow activity — what this user has actually done */}
      {user.flow_activity.type === "family" && (
        <Card>
          <CardContent className="space-y-3 p-5">
            <h2 className="text-sm font-semibold">
              Tour requests ({user.flow_activity.tours_count})
            </h2>
            {user.flow_activity.tours.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No tour requests yet from this email.
              </p>
            ) : (
              <ul className="space-y-1">
                {user.flow_activity.tours.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-2 rounded border bg-background p-2 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div>
                        <strong className="text-sm">{t.facility?.name ?? "—"}</strong>
                        <span className="ml-2 text-muted-foreground">
                          {t.facility?.city}, {t.facility?.state}
                        </span>
                      </div>
                      <div className="text-muted-foreground">
                        {t.prospect || "—"} ·{" "}
                        <span className="capitalize">{t.tour_type.replace(/_/g, " ")}</span> ·{" "}
                        <span className="capitalize">{t.status}</span>
                      </div>
                    </div>
                    <span className="text-muted-foreground">
                      {new Date(t.starts_at).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {user.flow_activity.type === "partner" && (
        <Card>
          <CardContent className="space-y-3 p-5">
            <h2 className="text-sm font-semibold">
              Admissions sourced ({user.flow_activity.admissions_count})
            </h2>
            {user.flow_activity.admissions.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                This partner hasn't sourced any admissions yet.
              </p>
            ) : (
              <ul className="space-y-1">
                {user.flow_activity.admissions.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-2 rounded border bg-background p-2 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div>
                        <strong className="text-sm">{a.facility?.name ?? "—"}</strong>
                        <span className="ml-2 text-muted-foreground">
                          {a.facility?.city}, {a.facility?.state}
                        </span>
                      </div>
                      <div className="text-muted-foreground">
                        {a.prospect || "—"} ·{" "}
                        <span className="rounded-full bg-stone-100 px-1.5 capitalize">
                          {a.stage.replace(/_/g, " ")}
                        </span>
                        {a.attribution_source && (
                          <span className="ml-1 text-[10px]">
                            via {a.attribution_source.replace(/_/g, " ")}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-muted-foreground">
                      {timeAgo(a.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent activity */}
      <Card>
        <CardContent className="space-y-3 p-5">
          <h2 className="text-sm font-semibold">Recent activity</h2>
          {user.recent_activity.length === 0 ? (
            <p className="text-xs text-muted-foreground">No audit events yet.</p>
          ) : (
            <ul className="space-y-1">
              {user.recent_activity.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between rounded border bg-background p-2 text-xs"
                >
                  <div>
                    <span className="font-mono">{a.event}</span>
                    {a.auditable_type && (
                      <span className="ml-2 text-muted-foreground">
                        on {a.auditable_type.split("\\").pop()}
                      </span>
                    )}
                  </div>
                  <span className="text-muted-foreground">{timeAgo(a.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Detail({
  label,
  value,
  mono,
  capitalize,
}: {
  label: string
  value: string | number
  mono?: boolean
  capitalize?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={`text-right ${mono ? "font-mono text-xs" : ""} ${
          capitalize ? "capitalize" : ""
        }`}
      >
        {value}
      </span>
    </div>
  )
}

function StatusPill({
  ok,
  okLabel,
  warnLabel,
}: {
  ok: boolean
  okLabel: string
  warnLabel: string
}) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
        ok ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
      }`}
    >
      {ok ? `✓ ${okLabel}` : warnLabel}
    </span>
  )
}

function VerifiedPill({ verifiedAt }: { verifiedAt: string | null }) {
  if (verifiedAt) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
        <ShieldCheck className="h-3 w-3" />
        Verified
      </span>
    )
  }
  return (
    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
      Pending verification
    </span>
  )
}
