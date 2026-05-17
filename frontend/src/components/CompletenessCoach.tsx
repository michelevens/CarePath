import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowRight, CheckCircle2, Circle, Loader2 } from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"

interface CompletenessItem {
  key: string
  label: string
  status: "met" | "missing"
  impact: "high" | "medium" | "low"
  hint: string
  action_href: string
}

interface CompletenessData {
  percent: number
  met_count: number
  total: number
  items: CompletenessItem[]
}

/**
 * Listing completeness coach for facility admins. Surfaces the
 * percent-complete score plus the actionable list of what's missing
 * — each item is a deep link to the right edit surface. Drives the
 * Pro-tier-stickiness loop: admins see "5 minutes to 95%" and act
 * on it.
 *
 * Mounted on the AdminDashboard (visibility) AND the
 * ListingAnalyticsPage (in-context with the listing-impact metrics).
 */
export function CompletenessCoach({
  variant = "full",
}: {
  /** "full" shows checklist + hints; "compact" shows progress bar
   * + remaining-items count, useful on dashboards. */
  variant?: "full" | "compact"
}) {
  const [data, setData] = useState<CompletenessData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get<{ data: CompletenessData }>("/facility/listing-completeness")
      .then((r) => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        <Loader2 className="inline h-3 w-3 animate-spin" /> Checking your listing…
      </div>
    )
  }
  if (!data) return null

  const missing = data.items.filter((i) => i.status === "missing")
  const highImpactMissing = missing.filter((i) => i.impact === "high")

  if (variant === "compact") {
    return (
      <Link
        to="/admin/analytics"
        className="block rounded-lg border bg-card p-4 transition-colors hover:border-violet-300"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Listing completeness
            </div>
            <div className="mt-1 text-2xl font-bold">
              {data.percent}%
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                {data.met_count}/{data.total}
              </span>
            </div>
            {missing.length > 0 && (
              <div className="mt-1 text-xs text-muted-foreground">
                {missing.length} item{missing.length === 1 ? "" : "s"} to fix
                {highImpactMissing.length > 0 && (
                  <span className="ml-1 font-semibold text-amber-700">
                    ({highImpactMissing.length} high-impact)
                  </span>
                )}
              </div>
            )}
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </div>
        <ProgressBar percent={data.percent} />
      </Link>
    )
  }

  return (
    <section className="rounded-lg border bg-card p-5">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Listing completeness
          </h2>
          <p className="mt-1 text-2xl font-bold">
            {data.percent}%{" "}
            <span className="text-sm font-normal text-muted-foreground">
              ({data.met_count}/{data.total} complete)
            </span>
          </p>
        </div>
        {data.percent >= 100 ? (
          <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
            Fully optimized
          </span>
        ) : highImpactMissing.length > 0 ? (
          <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
            {highImpactMissing.length} high-impact remaining
          </span>
        ) : null}
      </div>
      <ProgressBar percent={data.percent} />

      {missing.length > 0 && (
        <>
          <h3 className="mt-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Next steps
          </h3>
          <ul className="mt-2 space-y-1.5">
            {missing
              .sort((a, b) => impactWeight(b.impact) - impactWeight(a.impact))
              .map((item) => (
                <li key={item.key}>
                  <Link
                    to={item.action_href}
                    className="flex items-start gap-3 rounded-md border bg-background p-3 transition-colors hover:border-violet-300 hover:bg-violet-50/30"
                  >
                    <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{item.label}</span>
                        <ImpactChip impact={item.impact} />
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{item.hint}</p>
                    </div>
                    <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
          </ul>
        </>
      )}

      {data.items.some((i) => i.status === "met") && (
        <>
          <h3 className="mt-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Already done
          </h3>
          <ul className="mt-2 grid grid-cols-2 gap-1.5">
            {data.items
              .filter((i) => i.status === "met")
              .map((item) => (
                <li key={item.key} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  {item.label}
                </li>
              ))}
          </ul>
        </>
      )}
    </section>
  )
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn(
          "h-full rounded-full transition-all",
          percent >= 90 ? "bg-emerald-500" : percent >= 60 ? "bg-violet-500" : "bg-amber-500"
        )}
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}

function ImpactChip({ impact }: { impact: "high" | "medium" | "low" }) {
  const styles =
    impact === "high"
      ? "bg-amber-500/15 text-amber-800"
      : impact === "medium"
      ? "bg-sky-500/15 text-sky-800"
      : "bg-muted text-muted-foreground"
  return (
    <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider", styles)}>
      {impact}
    </span>
  )
}

function impactWeight(impact: "high" | "medium" | "low"): number {
  return impact === "high" ? 3 : impact === "medium" ? 2 : 1
}
