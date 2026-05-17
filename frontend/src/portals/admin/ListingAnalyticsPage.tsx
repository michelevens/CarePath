import { useEffect, useState } from "react"
import { ArrowDown, ArrowUp, Eye, Loader2, MousePointerClick, Send, TrendingUp } from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { CompletenessCoach } from "@/components/CompletenessCoach"

interface Period {
  impressions: number
  detail_views: number
  phone_clicks: number
  tour_requests: number
  ctr_pct: number
  conversion_pct: number
}

interface Spark {
  date: string
  impression: number
  detail_view: number
}

interface Analytics {
  period_label: string
  current: Period
  prior: Period
  change: {
    impressions_pct: number | null
    detail_views_pct: number | null
    tour_requests_pct: number | null
  }
  sparklines: Spark[]
  sources: Array<{ source: string | null; n: number }>
}

/**
 * Facility-admin "ROI on your listing" page. Closes the gap that kills
 * Pro tier renewals: admins paying $X/mo need to see "your listing was
 * shown 1,247 times this week, generated 4 tour requests" or they
 * churn.
 */
export function ListingAnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<{ data: Analytics }>("/facility/listing-analytics")
      .then((r) => setData(r.data.data))
      .catch((err) => setError(err.response?.data?.message ?? "Failed to load"))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading analytics…
      </div>
    )
  }
  if (error || !data) {
    return <div className="p-8 text-sm text-muted-foreground">{error ?? "No data."}</div>
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Listing analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">{data.period_label} · vs. prior 30 days</p>
      </header>

      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard
          label="Impressions"
          value={data.current.impressions}
          changePct={data.change.impressions_pct}
          icon={Eye}
          help="Times your listing appeared in search results"
        />
        <MetricCard
          label="Detail views"
          value={data.current.detail_views}
          changePct={data.change.detail_views_pct}
          icon={MousePointerClick}
          help="Visitors who opened your facility page"
        />
        <MetricCard
          label="Tour requests"
          value={data.current.tour_requests}
          changePct={data.change.tour_requests_pct}
          icon={Send}
          help="Leads sent to your admissions team"
        />
        <MetricCard
          label="CTR"
          value={data.current.ctr_pct}
          suffix="%"
          changePct={null}
          icon={TrendingUp}
          help="Detail views / impressions"
        />
      </div>

      <section className="rounded-lg border bg-card p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Daily activity
          </h2>
          <span className="text-xs text-muted-foreground">last 30 days</span>
        </div>
        <Sparkbars data={data.sparklines} />
      </section>

      <section className="rounded-lg border bg-card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Where visitors came from
        </h2>
        {data.sources.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No source data yet.</p>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {data.sources.map((s) => (
              <li key={s.source ?? "direct"} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm">
                <span className="capitalize">{s.source ?? "Direct / other"}</span>
                <span className="font-semibold tabular-nums">{s.n.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-violet-200 bg-violet-50/30 p-5">
        <h2 className="text-sm font-semibold text-violet-900">Funnel summary</h2>
        <p className="mt-2 text-sm text-violet-900/80">
          For every <strong>100 impressions</strong> on your listing, roughly{" "}
          <strong>{data.current.ctr_pct}</strong> visitors open the detail page, and{" "}
          <strong>{data.current.conversion_pct}%</strong> of those request a tour.
        </p>
      </section>

      <CompletenessCoach variant="full" />
    </div>
  )
}

function MetricCard({
  label,
  value,
  changePct,
  icon: Icon,
  help,
  suffix,
}: {
  label: string
  value: number
  changePct: number | null
  icon: typeof Eye
  help: string
  suffix?: string
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold tabular-nums">
          {value.toLocaleString()}
          {suffix}
        </span>
        {changePct !== null && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-semibold",
              changePct > 0 ? "text-emerald-700" : changePct < 0 ? "text-red-700" : "text-muted-foreground"
            )}
          >
            {changePct > 0 ? <ArrowUp className="h-3 w-3" /> : changePct < 0 ? <ArrowDown className="h-3 w-3" /> : null}
            {Math.abs(changePct)}%
          </span>
        )}
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">{help}</p>
    </div>
  )
}

function Sparkbars({ data }: { data: Spark[] }) {
  const max = Math.max(1, ...data.map((d) => d.impression + d.detail_view))
  return (
    <div className="mt-3 flex h-32 items-end gap-1">
      {data.map((d) => {
        const total = d.impression + d.detail_view
        const h = (total / max) * 100
        const detailFrac = total > 0 ? d.detail_view / total : 0
        return (
          <div key={d.date} className="flex flex-1 flex-col items-stretch" title={`${d.date} — ${d.impression} impressions / ${d.detail_view} views`}>
            <div className="flex-1" />
            <div className="relative w-full overflow-hidden rounded-sm" style={{ height: `${h}%`, minHeight: total > 0 ? 2 : 0 }}>
              <div className="absolute inset-0 bg-violet-200" />
              <div
                className="absolute inset-x-0 bottom-0 bg-violet-600"
                style={{ height: `${detailFrac * 100}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
