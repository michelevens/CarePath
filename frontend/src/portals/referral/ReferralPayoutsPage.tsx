import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Calendar, CheckCircle2, DollarSign, Loader2, MapPin } from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"

interface Placement {
  id: string
  facility: { name: string; slug: string; city: string; state: string } | null
  prospect_name: string | null
  status: string
  gross_fee_cents: number
  advisor_payout_cents: number
  amount_paid_cents: number
  platform_split_pct: number
  admitted_on: string | null
  rescission_window_ends_on: string | null
  retention_30d_milestone_on: string | null
  retention_90d_milestone_on: string | null
  attribution_source: string | null
  paid_at: string | null
}

const STATUS_META: Record<string, { label: string; tone: "neutral" | "good" | "warn" | "bad" }> = {
  pending: { label: "Pending (rescission window)", tone: "warn" },
  confirmed: { label: "Confirmed", tone: "neutral" },
  retained_30d: { label: "30-day retained · 70% paid", tone: "good" },
  retained_90d: { label: "90-day retained", tone: "good" },
  paid_in_full: { label: "Paid in full", tone: "good" },
  rescinded: { label: "Rescinded", tone: "bad" },
  disputed: { label: "Disputed", tone: "bad" },
}

export function ReferralPayoutsPage() {
  const [placements, setPlacements] = useState<Placement[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("all")

  useEffect(() => {
    let alive = true
    api
      .get<{ data: Placement[] }>("/referral/placements")
      .then((r) => alive && setPlacements(Array.isArray(r.data?.data) ? r.data.data : []))
      .catch(() => alive && setPlacements([]))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  const filtered = useMemo(() => {
    if (statusFilter === "all") return placements
    return placements.filter((p) => p.status === statusFilter)
  }, [placements, statusFilter])

  const totals = useMemo(() => {
    return placements.reduce(
      (acc, p) => {
        acc.gross += p.gross_fee_cents
        acc.advisor += p.advisor_payout_cents
        acc.paid += p.amount_paid_cents
        return acc
      },
      { gross: 0, advisor: 0, paid: 0 }
    )
  }, [placements])

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading payouts…
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payouts &amp; placements</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every placement you've sourced, its milestone status, and what you've
          been paid so far.
        </p>
      </div>

      {/* Totals row */}
      <div className="grid gap-3 md:grid-cols-3">
        <SummaryTile
          label="Total advisor earnings"
          value={`$${(totals.advisor / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          icon={DollarSign}
          highlight
        />
        <SummaryTile
          label="Paid out"
          value={`$${(totals.paid / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          icon={CheckCircle2}
        />
        <SummaryTile
          label="Outstanding"
          value={`$${((totals.advisor - totals.paid) / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          icon={Calendar}
        />
      </div>

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: "all", label: `All (${placements.length})` },
          ...Object.entries(STATUS_META).map(([k, v]) => ({
            key: k,
            label: `${v.label.split(" ·")[0]} (${placements.filter((p) => p.status === k).length})`,
          })),
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              statusFilter === f.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary hover:text-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {placements.length === 0
              ? "No placements yet. Once you source a family that gets admitted, their placement appears here."
              : "No placements match this filter."}
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5 text-left font-medium">Facility / Resident</th>
                <th className="px-3 py-2.5 text-left font-medium">Status</th>
                <th className="px-3 py-2.5 text-left font-medium">Admitted</th>
                <th className="px-3 py-2.5 text-right font-medium">Gross fee</th>
                <th className="px-3 py-2.5 text-right font-medium">Your payout</th>
                <th className="px-3 py-2.5 text-right font-medium">Paid so far</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const meta = STATUS_META[p.status] ?? STATUS_META.pending
                return (
                  <tr key={p.id} className="border-t hover:bg-muted/20">
                    <td className="px-3 py-3 align-top">
                      {p.facility ? (
                        <Link to={`/facility/${p.facility.slug}`} className="font-semibold text-primary hover:underline">
                          {p.facility.name}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                      {p.facility && (
                        <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {p.facility.city}, {p.facility.state}
                        </div>
                      )}
                      {p.prospect_name && (
                        <div className="mt-1 text-xs text-muted-foreground">Resident: {p.prospect_name}</div>
                      )}
                    </td>
                    <td className="px-3 py-3 align-top">
                      <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
                      {p.status === "retained_30d" && p.retention_90d_milestone_on && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Final 30% on {new Date(p.retention_90d_milestone_on).toLocaleDateString()}
                        </div>
                      )}
                      {p.status === "pending" && p.rescission_window_ends_on && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Confirms on {new Date(p.rescission_window_ends_on).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 align-top text-sm">
                      {p.admitted_on ? new Date(p.admitted_on).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-3 py-3 text-right align-top text-sm tabular-nums">
                      ${(p.gross_fee_cents / 100).toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-right align-top text-sm tabular-nums">
                      <strong>${(p.advisor_payout_cents / 100).toLocaleString()}</strong>
                      <div className="text-xs font-normal text-muted-foreground">
                        {100 - p.platform_split_pct}% split
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right align-top text-sm tabular-nums">
                      ${(p.amount_paid_cents / 100).toLocaleString()}
                      {p.paid_at && (
                        <div className="text-xs font-normal text-muted-foreground">
                          {new Date(p.paid_at).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-lg border bg-muted/30 p-4 text-xs text-muted-foreground">
        <strong className="text-foreground">How payouts work:</strong> 7-day
        rescission window first, then we release{" "}
        <strong className="text-foreground">70%</strong> of your payout at the
        30-day retention milestone and the remaining{" "}
        <strong className="text-foreground">30%</strong> at 90 days. If a
        resident leaves during the rescission window, any pending payout is
        voided. Stripe handles the transfer + your 1099 — find them in your
        Stripe Express dashboard.
      </div>
    </div>
  )
}

function SummaryTile({
  label,
  value,
  icon: Icon,
  highlight,
}: {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  highlight?: boolean
}) {
  return (
    <Card className={cn(highlight && "border-primary/40 bg-primary/5")}>
      <CardContent className="p-4">
        <Icon className={cn("h-4 w-4", highlight ? "text-primary" : "text-muted-foreground")} />
        <div className="mt-2 text-xl font-semibold tabular-nums">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  )
}

function StatusPill({ tone, children }: { tone: "neutral" | "good" | "warn" | "bad"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        tone === "good" && "bg-primary/10 text-primary",
        tone === "warn" && "bg-amber-500/15 text-amber-700 dark:text-amber-400",
        tone === "bad" && "bg-destructive/10 text-destructive",
        tone === "neutral" && "bg-muted text-muted-foreground"
      )}
    >
      {children}
    </span>
  )
}
