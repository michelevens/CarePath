import { useEffect, useState } from "react"
import { AlertTriangle, Building2, DollarSign, User as UserIcon, XCircle } from "lucide-react"
import { api } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/card"

interface SubRow {
  id: string
  subscriber_type: "facility" | "user"
  subscriber_id: string
  subscriber_name: string
  subscriber_slug: string | null
  subscriber_email: string | null
  plan_slug: string | null
  plan_name: string | null
  tier: string | null
  audience: string | null
  status: string
  billing_cycle: string
  monthly_cents: number
  current_period_ends_at: string | null
  canceled_at: string | null
  stripe_subscription_id: string | null
}

interface Summary {
  mrr_cents: number
  active_count: number
  past_due_count: number
  canceled_last_30d: number
}

type StatusFilter = "active" | "past_due" | "canceled" | "all"

const TIER_COLOR: Record<string, string> = {
  free: "bg-stone-100 text-stone-700",
  pro: "bg-violet-100 text-violet-700",
  team: "bg-indigo-100 text-indigo-800",
  agency: "bg-amber-100 text-amber-800",
  network: "bg-amber-100 text-amber-800",
  enterprise: "bg-emerald-100 text-emerald-700",
}

const STATUS_COLOR: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800",
  trialing: "bg-blue-100 text-blue-800",
  past_due: "bg-amber-100 text-amber-800",
  canceled: "bg-stone-200 text-stone-700",
  incomplete: "bg-amber-100 text-amber-800",
  unpaid: "bg-destructive/10 text-destructive",
}

function formatMoney(cents: number) {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  })
}

export function SubscriptionsPage() {
  const [rows, setRows] = useState<SubRow[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [status, setStatus] = useState<StatusFilter>("active")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    api
      .get<{ data: SubRow[]; summary: Summary }>(`/superadmin/subscriptions?status=${status}`)
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

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Subscriptions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Active subscriptions across facilities, advisors, and family Pro users.
        </p>
      </div>

      {summary && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="MRR" value={formatMoney(summary.mrr_cents)} icon={DollarSign} />
          <Stat label="Active" value={summary.active_count.toString()} icon={Building2} />
          <Stat
            label="Past due"
            value={summary.past_due_count.toString()}
            icon={AlertTriangle}
            tone={summary.past_due_count > 0 ? "warn" : undefined}
          />
          <Stat
            label="Canceled (30d)"
            value={summary.canceled_last_30d.toString()}
            icon={XCircle}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {(["active", "past_due", "canceled", "all"] as StatusFilter[]).map((s) => (
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
                  <th className="px-4 py-2 text-left font-medium">Subscriber</th>
                  <th className="px-4 py-2 text-left font-medium">Plan</th>
                  <th className="px-4 py-2 text-left font-medium">Tier</th>
                  <th className="px-4 py-2 text-left font-medium">Cycle</th>
                  <th className="px-4 py-2 text-right font-medium">MRR</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                  <th className="px-4 py-2 text-left font-medium">Renews</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                )}
                {!loading && error && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-destructive">
                      {error}
                    </td>
                  </tr>
                )}
                {!loading && !error && rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                      No subscriptions for this filter.
                    </td>
                  </tr>
                )}
                {!loading &&
                  rows.map((r) => {
                    const Icon = r.subscriber_type === "facility" ? Building2 : UserIcon
                    return (
                      <tr key={r.id} className="border-b last:border-b-0 hover:bg-muted/20">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{r.subscriber_name}</div>
                              <div className="text-xs text-muted-foreground">
                                {r.subscriber_email ?? r.subscriber_slug ?? r.subscriber_id}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">{r.plan_name ?? r.plan_slug ?? "—"}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                              TIER_COLOR[r.tier ?? "free"] ?? TIER_COLOR.free
                            }`}
                          >
                            {r.tier ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground capitalize">{r.billing_cycle}</td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatMoney(r.monthly_cents)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                              STATUS_COLOR[r.status] ?? STATUS_COLOR.canceled
                            }`}
                          >
                            {r.status.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {r.current_period_ends_at
                            ? new Date(r.current_period_ends_at).toLocaleDateString()
                            : "—"}
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
  tone,
}: {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  tone?: "warn"
}) {
  return (
    <Card className={tone === "warn" ? "border-amber-200 bg-amber-50/60" : ""}>
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
