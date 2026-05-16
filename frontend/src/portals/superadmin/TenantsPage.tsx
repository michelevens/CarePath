import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Building2, ExternalLink, Search, Star } from "lucide-react"
import { api } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/card"

interface TenantRow {
  id: string
  name: string
  slug: string
  type: string
  city: string
  state: string
  zip: string | null
  subscription_tier: string | null
  subscription_status: string | null
  cms_five_star_overall: number | null
  medicaid_certified: boolean
  is_active: boolean
  members_count: number
  created_at: string
  data_source: string | null
}

interface TenantSummary {
  total: number
  by_tier: Record<string, number>
  by_state: Record<string, number>
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

export function TenantsPage() {
  const [rows, setRows] = useState<TenantRow[]>([])
  const [summary, setSummary] = useState<TenantSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState("")
  const [stateFilter, setStateFilter] = useState<string>("")
  const [tierFilter, setTierFilter] = useState<string>("")

  useEffect(() => {
    let alive = true
    api
      .get<{ data: TenantRow[]; summary: TenantSummary }>("/superadmin/tenants")
      .then((r) => {
        if (!alive) return
        setRows(r.data?.data ?? [])
        setSummary(r.data?.summary ?? null)
      })
      .catch((e: unknown) => {
        const err = e as { response?: { data?: { message?: string } } }
        if (alive) setError(err.response?.data?.message ?? "Failed to load")
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (q && !`${r.name} ${r.city} ${r.state}`.toLowerCase().includes(q.toLowerCase())) return false
      if (stateFilter && r.state !== stateFilter) return false
      if (tierFilter && (r.subscription_tier ?? "free") !== tierFilter) return false
      return true
    })
  }, [rows, q, stateFilter, tierFilter])

  const states = useMemo(
    () => Array.from(new Set(rows.map((r) => r.state).filter(Boolean))).sort(),
    [rows],
  )

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading facilities…</div>
  if (error)
    return (
      <div className="p-8">
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      </div>
    )

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Facilities</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every facility on the platform. {summary?.total ?? 0} total ·{" "}
            {Object.keys(summary?.by_state ?? {}).length} states.
          </p>
        </div>
        <Link
          to="/superadmin/master-data/states"
          className="text-xs text-violet-700 hover:underline"
        >
          State rules →
        </Link>
      </div>

      {/* Summary tier strip */}
      {summary && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(summary.by_tier).map(([tier, count]) => (
            <span
              key={tier}
              className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                TIER_COLOR[tier] ?? TIER_COLOR.free
              }`}
            >
              {tier}: {count}
            </span>
          ))}
        </div>
      )}

      {/* Filter bar */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search name, city, state…"
              value={q}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQ(e.target.value)}
              className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="h-9 rounded-md border bg-background px-2 text-sm"
          >
            <option value="">All states</option>
            {states.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="h-9 rounded-md border bg-background px-2 text-sm"
          >
            <option value="">All tiers</option>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="network">Network</option>
            <option value="enterprise">Enterprise</option>
          </select>
          <span className="text-xs text-muted-foreground">
            {filtered.length} of {rows.length}
          </span>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2 text-left font-medium">Facility</th>
                  <th className="px-4 py-2 text-left font-medium">Type</th>
                  <th className="px-4 py-2 text-left font-medium">Location</th>
                  <th className="px-4 py-2 text-left font-medium">Tier</th>
                  <th className="px-4 py-2 text-left font-medium">CMS</th>
                  <th className="px-4 py-2 text-left font-medium">Members</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                      No facilities match the current filters.
                    </td>
                  </tr>
                )}
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b last:border-b-0 hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{r.name}</div>
                          <div className="text-xs text-muted-foreground">{r.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{TYPE_LABEL[r.type] ?? r.type}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.city}, {r.state}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                          TIER_COLOR[r.subscription_tier ?? "free"] ?? TIER_COLOR.free
                        }`}
                      >
                        {r.subscription_tier ?? "free"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.cms_five_star_overall ? (
                        <span className="inline-flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                          {r.cms_five_star_overall}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.members_count}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          r.is_active
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-stone-200 text-stone-700"
                        }`}
                      >
                        {r.is_active ? "active" : "inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/facility/${r.slug}`}
                        className="inline-flex items-center gap-1 text-xs text-violet-700 hover:underline"
                      >
                        Open <ExternalLink className="h-3 w-3" />
                      </Link>
                    </td>
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
