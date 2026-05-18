import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { DollarSign, HeartHandshake, TrendingUp, ExternalLink } from "lucide-react"
import { api } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/card"

interface PlacementRow {
  id: string
  facility: { name: string; slug: string; city: string; state: string } | null
  advisor: { name: string; email: string } | null
  gross_fee_cents: number
  platform_fee_cents: number
  advisor_payout_cents: number
  amount_paid_cents: number
  platform_split_pct: number
  status: string
  admitted_on: string | null
  rescission_window_ends_on: string | null
  retention_30d_milestone_on: string | null
  retention_90d_milestone_on: string | null
  attribution_source: string | null
  stripe_transfer_id: string | null
}

interface Summary {
  total_gross_ytd_cents: number
  total_paid_ytd_cents: number
  by_status: Record<string, number>
}

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-stone-200 text-stone-700",
  confirmed: "bg-blue-100 text-blue-800",
  retained_30d: "bg-violet-100 text-violet-700",
  retained_90d: "bg-indigo-100 text-indigo-800",
  paid_in_full: "bg-emerald-100 text-emerald-800",
  rescinded: "bg-destructive/10 text-destructive",
  disputed: "bg-amber-100 text-amber-800",
}

const STATUS_FILTERS = [
  "all",
  "pending",
  "confirmed",
  "retained_30d",
  "retained_90d",
  "paid_in_full",
  "rescinded",
  "disputed",
] as const

function formatMoney(cents: number) {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  })
}

export function PlacementsPage() {
  const [rows, setRows] = useState<PlacementRow[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [status, setStatus] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    const qs = status === "all" ? "" : `?status=${status}`
    api
      .get<{ data: PlacementRow[]; summary: Summary }>(`/superadmin/placements${qs}`)
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
  }, [status])

  const platformCollected = summary
    ? summary.total_gross_ytd_cents - summary.total_paid_ytd_cents
    : 0

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Placements</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cross-tenant placement ledger. Used to audit milestone advancement,
          confirm payouts, and resolve disputes.
        </p>
      </div>

      {summary && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat
            label="Gross YTD"
            value={formatMoney(summary.total_gross_ytd_cents)}
            icon={TrendingUp}
          />
          <Stat
            label="Paid YTD"
            value={formatMoney(summary.total_paid_ytd_cents)}
            icon={DollarSign}
          />
          <Stat
            label="Platform YTD"
            value={formatMoney(platformCollected)}
            icon={HeartHandshake}
          />
          <Stat
            label="Active placements"
            value={(
              (summary.by_status.pending ?? 0) +
              (summary.by_status.confirmed ?? 0) +
              (summary.by_status.retained_30d ?? 0) +
              (summary.by_status.retained_90d ?? 0)
            ).toString()}
            icon={HeartHandshake}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-full border px-3 py-1 text-xs font-medium capitalize ${
              status === s
                ? "border-violet-300 bg-violet-50 text-violet-700"
                : "border-transparent bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            {s.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Facility</th>
                  <th className="px-4 py-2 text-left font-medium">Advisor</th>
                  <th className="px-4 py-2 text-right font-medium">Gross</th>
                  <th className="px-4 py-2 text-right font-medium">Paid</th>
                  <th className="px-4 py-2 text-right font-medium">Split</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                  <th className="px-4 py-2 text-left font-medium">Admitted</th>
                  <th className="px-4 py-2 text-left font-medium">Source</th>
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
                      No placements for this filter.
                    </td>
                  </tr>
                )}
                {!loading &&
                  rows.map((p) => (
                    <tr key={p.id} className="border-b last:border-b-0 hover:bg-muted/20">
                      <td className="px-4 py-3">
                        {p.facility ? (
                          <Link
                            to={`/superadmin/facilities/${p.facility.slug}`}
                            className="inline-flex items-center gap-1 font-medium hover:underline"
                          >
                            {p.facility.name}
                            <ExternalLink className="h-3 w-3 opacity-60" />
                          </Link>
                        ) : (
                          "—"
                        )}
                        {p.facility && (
                          <div className="text-xs text-muted-foreground">
                            {p.facility.city}, {p.facility.state}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {p.advisor ? (
                          <>
                            <div className="font-medium">{p.advisor.name}</div>
                            <div className="text-xs text-muted-foreground">{p.advisor.email}</div>
                          </>
                        ) : (
                          <span className="text-muted-foreground">Direct</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatMoney(p.gross_fee_cents)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatMoney(p.amount_paid_cents)}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                        {p.platform_split_pct}% platform
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            STATUS_COLOR[p.status] ?? STATUS_COLOR.pending
                          }`}
                        >
                          {p.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {p.admitted_on ? new Date(p.admitted_on).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {p.attribution_source ?? "—"}
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
