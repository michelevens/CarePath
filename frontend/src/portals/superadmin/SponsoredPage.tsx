import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { AlertTriangle, DollarSign, ExternalLink, MousePointerClick, Sparkles } from "lucide-react"
import { api } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/card"

interface CampaignRow {
  id: string
  name: string | null
  status: string
  facility: { name: string; slug: string; city: string; state: string } | null
  daily_budget_cents: number
  total_budget_cents: number | null
  cpc_bid_cents: number
  spent_today_cents: number
  spent_total_cents: number
  impressions: number
  clicks: number
  ctr_pct: number | null
  starts_on: string
  ends_on: string | null
  target_states: string[] | null
  target_cities: string[] | null
}

interface Summary {
  total_active: number
  spend_today_cents: number
  impressions_today: number
  clicks_today: number
}

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-stone-200 text-stone-700",
  active: "bg-emerald-100 text-emerald-800",
  paused: "bg-amber-100 text-amber-800",
  depleted: "bg-destructive/10 text-destructive",
  ended: "bg-stone-200 text-stone-700",
}

function formatMoney(cents: number) {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  })
}

// Heuristic click-fraud signal: >5% CTR with at least 20 clicks is
// unusually high for facility search (typical industry is 1-3%). Flag
// it for ops review.
function isCtrSuspicious(c: CampaignRow): boolean {
  return c.clicks >= 20 && (c.ctr_pct ?? 0) > 5
}

export function SponsoredPage() {
  const [rows, setRows] = useState<CampaignRow[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    api
      .get<{ data: CampaignRow[]; summary: Summary }>("/superadmin/sponsored")
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

  const flagged = rows.filter(isCtrSuspicious)

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sponsored ads</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform-wide campaign oversight. Daily spend, CTR, and click-fraud signals.
        </p>
      </div>

      {summary && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Active campaigns" value={summary.total_active.toString()} icon={Sparkles} />
          <Stat label="Spend today" value={formatMoney(summary.spend_today_cents)} icon={DollarSign} />
          <Stat label="Impressions today" value={summary.impressions_today.toLocaleString()} icon={Sparkles} />
          <Stat
            label="Clicks today"
            value={summary.clicks_today.toLocaleString()}
            icon={MousePointerClick}
          />
        </div>
      )}

      {flagged.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/60">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-700" />
            <div>
              <div className="text-sm font-medium text-amber-900">
                {flagged.length} campaign{flagged.length !== 1 ? "s" : ""} with unusually high CTR
              </div>
              <div className="text-xs text-amber-800">
                Worth a manual review — anything &gt;5% CTR on facility search is well above industry norms.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Campaign</th>
                  <th className="px-4 py-2 text-left font-medium">Facility</th>
                  <th className="px-4 py-2 text-right font-medium">Spent today</th>
                  <th className="px-4 py-2 text-right font-medium">Budget</th>
                  <th className="px-4 py-2 text-right font-medium">CPC</th>
                  <th className="px-4 py-2 text-right font-medium">Imp / Clicks</th>
                  <th className="px-4 py-2 text-right font-medium">CTR</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                )}
                {!loading && error && (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-destructive">
                      {error}
                    </td>
                  </tr>
                )}
                {!loading && !error && rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">
                      No sponsored campaigns on the platform yet.
                    </td>
                  </tr>
                )}
                {!loading &&
                  rows.map((c) => {
                    const suspicious = isCtrSuspicious(c)
                    const pacingPct = c.daily_budget_cents
                      ? Math.min(100, Math.round((c.spent_today_cents / c.daily_budget_cents) * 100))
                      : 0
                    return (
                      <tr
                        key={c.id}
                        className={`border-b last:border-b-0 hover:bg-muted/20 ${
                          suspicious ? "bg-amber-50/40" : ""
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium">{c.name ?? "(untitled)"}</div>
                          {(c.target_states?.length || c.target_cities?.length) && (
                            <div className="text-xs text-muted-foreground">
                              Targets: {[...(c.target_states ?? []), ...(c.target_cities ?? [])].join(", ")}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {c.facility ? (
                            <Link
                              to={`/facility/${c.facility.slug}`}
                              className="inline-flex items-center gap-1 hover:underline"
                            >
                              {c.facility.name}
                              <ExternalLink className="h-3 w-3 opacity-60" />
                            </Link>
                          ) : (
                            "—"
                          )}
                          {c.facility && (
                            <div className="text-xs text-muted-foreground">
                              {c.facility.city}, {c.facility.state}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          <div>{formatMoney(c.spent_today_cents)}</div>
                          <div className="mt-1 h-1 w-16 overflow-hidden rounded-full bg-stone-200 ml-auto">
                            <div
                              className={`h-full ${pacingPct >= 90 ? "bg-amber-500" : "bg-violet-500"}`}
                              style={{ width: `${pacingPct}%` }}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          <div>{formatMoney(c.daily_budget_cents)}/day</div>
                          {c.total_budget_cents && (
                            <div className="text-xs text-muted-foreground">
                              {formatMoney(c.total_budget_cents)} total
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatMoney(c.cpc_bid_cents)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                          {c.impressions.toLocaleString()} / {c.clicks.toLocaleString()}
                        </td>
                        <td className={`px-4 py-3 text-right tabular-nums ${suspicious ? "font-medium text-amber-700" : "text-muted-foreground"}`}>
                          {c.ctr_pct != null ? `${c.ctr_pct}%` : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                              STATUS_COLOR[c.status] ?? STATUS_COLOR.draft
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{label}</span>
          <Icon className="h-4 w-4 opacity-60" />
        </div>
        <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  )
}
