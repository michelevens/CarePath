import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building2,
  ClipboardList,
  ClipboardCheck,
  DollarSign,
  HeartHandshake,
  Home,
  MapPin,
  ScrollText,
  Shield,
  ShieldCheck,
  Sparkles,
  Sliders,
  Star,
  TrendingUp,
  Users,
} from "lucide-react"
import { api } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/card"

interface PlatformStats {
  total_facilities: number
  active_facilities: number
  paid_facilities: number
  total_users: number
  verified_users: number
  pending_advisors: number
  pending_hospitals: number
  mrr_cents: number
  active_subscriptions: number
}

interface ActivityStats {
  placements_ytd: number
  tours_this_month: number
  inquiries_this_month: number
  active_sponsored_campaigns: number
  states_covered: number
}

interface HealthStats {
  cms_synced_at: string | null
}

interface RecentFacility {
  id: string
  name: string
  slug: string
  type: string
  city: string
  state: string
  subscription_tier: string | null
  cms_five_star_overall: number | null
  is_active: boolean
  created_at: string
}

const TYPE_LABEL: Record<string, string> = {
  snf: "Skilled Nursing",
  assisted_living: "Assisted Living",
  memory_care: "Memory Care",
  ccrc: "Continuing Care",
}

const TIER_COLOR: Record<string, string> = {
  free: "bg-stone-100 text-stone-700",
  pro: "bg-violet-100 text-violet-700",
  network: "bg-amber-100 text-amber-800",
  enterprise: "bg-emerald-100 text-emerald-700",
}

function formatMoney(cents: number, opts: { compact?: boolean } = {}) {
  const dollars = cents / 100
  if (opts.compact && dollars >= 1000) {
    return `$${(dollars / 1000).toFixed(dollars >= 10000 ? 0 : 1)}k`
  }
  return dollars.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  })
}

function timeAgo(iso: string | null) {
  if (!iso) return "never"
  const ms = Date.now() - new Date(iso).getTime()
  const hours = Math.floor(ms / 3_600_000)
  if (hours < 1) return "just now"
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

export function SuperAdminDashboard() {
  const [platform, setPlatform] = useState<PlatformStats | null>(null)
  const [activity, setActivity] = useState<ActivityStats | null>(null)
  const [health, setHealth] = useState<HealthStats | null>(null)
  const [recent, setRecent] = useState<RecentFacility[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    Promise.all([
      api.get<{ data: { platform: PlatformStats; activity: ActivityStats; health: HealthStats } }>("/superadmin/stats"),
      api.get<{ data: RecentFacility[] }>("/superadmin/recent-facilities"),
    ])
      .then(([s, r]) => {
        if (!alive) return
        setPlatform(s.data?.data?.platform ?? null)
        setActivity(s.data?.data?.activity ?? null)
        setHealth(s.data?.data?.health ?? null)
        setRecent(r.data?.data ?? [])
      })
      .catch((e: unknown) => {
        const err = e as { response?: { data?: { message?: string } } }
        if (alive) setError(err.response?.data?.message ?? "Failed to load dashboard")
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  if (loading) {
    return <div className="p-8 text-sm text-muted-foreground">Loading platform overview…</div>
  }

  if (error || !platform || !activity) {
    return (
      <div className="p-8">
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error ?? "Unable to load dashboard data"}
        </div>
      </div>
    )
  }

  const totalPending = platform.pending_advisors + platform.pending_hospitals

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Platform overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cross-tenant view. Facilities, advisors, hospital partners, subscriptions,
          and marketplace activity in one place.
        </p>
      </div>

      {/* Row 1 — Platform KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Facilities"
          value={platform.total_facilities.toLocaleString()}
          subtitle={`${platform.active_facilities.toLocaleString()} active · ${platform.paid_facilities.toLocaleString()} paid`}
          icon={Building2}
        />
        <Stat
          label="Users"
          value={platform.total_users.toLocaleString()}
          subtitle={`${platform.verified_users.toLocaleString()} email-verified`}
          icon={Users}
        />
        <Stat
          label="Pending verifications"
          value={totalPending.toString()}
          subtitle={`${platform.pending_advisors} advisor · ${platform.pending_hospitals} hospital`}
          icon={ShieldCheck}
          tone={totalPending > 0 ? "warn" : undefined}
        />
        <Stat
          label="MRR"
          value={formatMoney(platform.mrr_cents, { compact: true })}
          subtitle={`${platform.active_subscriptions} active subscriptions`}
          icon={DollarSign}
        />
      </div>

      {/* Row 2 — Marketplace activity */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat
          label="Placements YTD"
          value={activity.placements_ytd.toLocaleString()}
          icon={HeartHandshake}
        />
        <Stat
          label="Tours this month"
          value={activity.tours_this_month.toLocaleString()}
          icon={ClipboardCheck}
        />
        <Stat
          label="Inquiries this month"
          value={activity.inquiries_this_month.toLocaleString()}
          icon={TrendingUp}
        />
        <Stat
          label="Sponsored campaigns"
          value={activity.active_sponsored_campaigns.toLocaleString()}
          subtitle="active"
          icon={Sparkles}
        />
        <Stat
          label="States covered"
          value={activity.states_covered.toString()}
          subtitle="of 50"
          icon={MapPin}
        />
      </div>

      {/* Quick actions + alerts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="space-y-3 p-5">
            <h2 className="text-sm font-semibold">Quick actions</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <QuickAction to="/superadmin/tenants" icon={Building2} label="Facilities" />
              <QuickAction to="/superadmin/verifications" icon={ShieldCheck} label="Verifications" badge={totalPending} />
              <QuickAction to="/superadmin/placements" icon={HeartHandshake} label="Placements" />
              <QuickAction to="/superadmin/subscriptions" icon={BarChart3} label="Subscriptions" />
              <QuickAction to="/superadmin/sponsored" icon={Sparkles} label="Sponsored ads" />
              <QuickAction to="/superadmin/master-data/states" icon={Sliders} label="States" />
              <QuickAction to="/superadmin/master-data/payers" icon={ClipboardList} label="Payers" />
              <QuickAction to="/superadmin/master-data/f-tags" icon={Shield} label="F-tags" />
              <QuickAction to="/superadmin/audit" icon={ScrollText} label="Audit log" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-5">
            <h2 className="text-sm font-semibold">Needs attention</h2>
            {totalPending === 0 && !isStale(health?.cms_synced_at) && (
              <p className="text-xs text-muted-foreground">Nothing on fire. Nice.</p>
            )}
            {platform.pending_advisors > 0 && (
              <AlertRow
                tone="warn"
                icon={ShieldCheck}
                title={`${platform.pending_advisors} advisor verification${platform.pending_advisors !== 1 ? "s" : ""}`}
                description="Awaiting platform review"
                to="/superadmin/verifications"
              />
            )}
            {platform.pending_hospitals > 0 && (
              <AlertRow
                tone="warn"
                icon={ShieldCheck}
                title={`${platform.pending_hospitals} hospital partner${platform.pending_hospitals !== 1 ? "s" : ""}`}
                description="Awaiting platform review"
                to="/superadmin/verifications"
              />
            )}
            {isStale(health?.cms_synced_at) && (
              <AlertRow
                tone="danger"
                icon={AlertTriangle}
                title="CMS data is stale"
                description={`Last synced ${timeAgo(health?.cms_synced_at ?? null)}`}
              />
            )}
            <AlertRow
              tone="info"
              icon={Activity}
              title={`${platform.total_facilities.toLocaleString()} facilities on platform`}
              description={`${platform.active_facilities} active · ${activity.states_covered} states`}
            />
          </CardContent>
        </Card>
      </div>

      {/* Recent facilities */}
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recently added facilities</h2>
            <Link to="/superadmin/tenants" className="text-xs text-violet-700 hover:underline">
              View all →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 text-left font-medium">Name</th>
                  <th className="py-2 text-left font-medium">Type</th>
                  <th className="py-2 text-left font-medium">Location</th>
                  <th className="py-2 text-left font-medium">Tier</th>
                  <th className="py-2 text-left font-medium">CMS</th>
                  <th className="py-2 text-left font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {recent.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-muted-foreground">
                      No facilities yet.
                    </td>
                  </tr>
                )}
                {recent.map((f) => (
                  <tr key={f.id} className="border-b last:border-b-0">
                    <td className="py-3">
                      <Link
                        to={`/facility/${f.slug}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {f.name}
                      </Link>
                    </td>
                    <td className="py-3 text-muted-foreground">{TYPE_LABEL[f.type] ?? f.type}</td>
                    <td className="py-3 text-muted-foreground">
                      {f.city}, {f.state}
                    </td>
                    <td className="py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                          TIER_COLOR[f.subscription_tier ?? "free"] ?? TIER_COLOR.free
                        }`}
                      >
                        {f.subscription_tier ?? "free"}
                      </span>
                    </td>
                    <td className="py-3 text-muted-foreground">
                      {f.cms_five_star_overall ? (
                        <span className="inline-flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                          {f.cms_five_star_overall}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 text-muted-foreground">{timeAgo(f.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Reusable bits ───────────────────────────────────────────────────────────

function Stat({
  label,
  value,
  subtitle,
  icon: Icon,
  tone,
}: {
  label: string
  value: string
  subtitle?: string
  icon: React.ComponentType<{ className?: string }>
  tone?: "warn" | "danger"
}) {
  const toneClass =
    tone === "danger"
      ? "border-destructive/40 bg-destructive/5"
      : tone === "warn"
      ? "border-amber-200 bg-amber-50/60"
      : ""
  return (
    <Card className={toneClass}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{label}</span>
          <Icon className="h-4 w-4 opacity-60" />
        </div>
        <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
        {subtitle && <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div>}
      </CardContent>
    </Card>
  )
}

function QuickAction({
  to,
  icon: Icon,
  label,
  badge,
}: {
  to: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  badge?: number
}) {
  return (
    <Link
      to={to}
      className="group relative flex items-center gap-2 rounded-md border bg-card px-3 py-2.5 text-sm transition-colors hover:border-violet-300 hover:bg-violet-50/40"
    >
      <Icon className="h-4 w-4 text-muted-foreground group-hover:text-violet-700" />
      <span className="flex-1">{label}</span>
      {!!badge && badge > 0 && (
        <span className="rounded-full bg-violet-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
          {badge}
        </span>
      )}
    </Link>
  )
}

function AlertRow({
  tone,
  icon: Icon,
  title,
  description,
  to,
}: {
  tone: "info" | "warn" | "danger"
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  to?: string
}) {
  const palette =
    tone === "danger"
      ? "bg-destructive/10 text-destructive border-destructive/20"
      : tone === "warn"
      ? "bg-amber-50 text-amber-900 border-amber-200"
      : "bg-emerald-50 text-emerald-800 border-emerald-200"
  const body = (
    <div className={`flex items-start gap-3 rounded-md border p-3 ${palette}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0 opacity-80" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs opacity-80">{description}</div>
      </div>
    </div>
  )
  return to ? (
    <Link to={to} className="block hover:opacity-90">
      {body}
    </Link>
  ) : (
    body
  )
}

function isStale(iso: string | null | undefined): boolean {
  if (!iso) return true
  return Date.now() - new Date(iso).getTime() > 7 * 24 * 60 * 60 * 1000
}

// keep Home importable for nav even if we don't render it here directly
void Home
