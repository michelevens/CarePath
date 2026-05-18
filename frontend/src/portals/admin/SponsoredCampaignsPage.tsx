import React, { useEffect, useMemo, useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
  MousePointerClick,
  Pause,
  Play,
  Plus,
  Sparkles,
  Trash2,
  Wallet,
} from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Campaign {
  id: string
  name: string | null
  status: "draft" | "active" | "paused" | "depleted" | "ended"
  daily_budget_cents: number
  total_budget_cents: number | null
  cpc_bid_cents: number
  starts_on: string
  ends_on: string | null
  target_states: string[]
  target_cities: string[]
  exclude_states: string[]
  exclude_types: string[]
  surface_bid_multipliers: { search?: number; embed?: number } | null
  spent_today_cents: number
  spent_total_cents: number
  created_at: string
}

interface InvoiceRow {
  id: string
  period_label: string
  period_start: string
  period_end: string
  total_clicks: number
  amount_due_cents: number
  status: "draft" | "sent" | "paid" | "failed" | "void"
  issued_at: string | null
  paid_at: string | null
  stripe_invoice_url: string | null
}

interface PeriodStats {
  impressions: number
  clicks: number
  spend_cents: number
  ctr_pct: number
  tour_requests: number
  admissions: number
  attributed_value_cents: number
  roas: number | null
}

interface Stats {
  today: PeriodStats
  this_month: PeriodStats
}

const STATUS_META: Record<Campaign["status"], { label: string; tone: "good" | "warn" | "neutral" | "bad" }> = {
  draft: { label: "Draft", tone: "neutral" },
  active: { label: "Running", tone: "good" },
  paused: { label: "Paused", tone: "warn" },
  depleted: { label: "Budget hit for today", tone: "warn" },
  ended: { label: "Ended", tone: "neutral" },
}

export function SponsoredCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [c, s] = await Promise.all([
        api.get<{ data: Campaign[] }>("/facility/sponsored/campaigns"),
        api.get<{ data: Stats }>("/facility/sponsored/stats"),
      ])
      setCampaigns(Array.isArray(c.data?.data) ? c.data.data : [])
      setStats(s.data?.data ?? null)
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } }
      setError(err.response?.data?.message ?? "Failed to load campaigns")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const toggleStatus = async (c: Campaign) => {
    const next = c.status === "active" ? "paused" : "active"
    try {
      await api.put(`/facility/sponsored/campaigns/${c.id}`, { status: next })
      await load()
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } }
      setError(err.response?.data?.message ?? "Failed to update")
    }
  }

  const remove = async (c: Campaign) => {
    if (!confirm(`Delete this campaign? This can't be undone.`)) return
    try {
      await api.delete(`/facility/sponsored/campaigns/${c.id}`)
      await load()
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } }
      setError(err.response?.data?.message ?? "Failed to delete")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading campaigns…
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sponsored listings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Promote your facility to the top of matching search results. CPC
            pricing — you only pay when a family clicks your listing.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          New campaign
        </Button>
      </div>

      {/* Stats — activity row */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile icon={Eye} label="Impressions today" value={stats.today.impressions.toLocaleString()} sub={`${stats.this_month.impressions.toLocaleString()} this month`} />
          <StatTile icon={MousePointerClick} label="Clicks today" value={stats.today.clicks.toLocaleString()} sub={`${stats.today.ctr_pct}% CTR today`} />
          <StatTile icon={Wallet} label="Spend today" value={`$${(stats.today.spend_cents / 100).toFixed(2)}`} sub={`$${(stats.this_month.spend_cents / 100).toFixed(2)} this month`} highlight />
          <StatTile icon={BarChart3} label="Month CTR" value={`${stats.this_month.ctr_pct}%`} sub={`${stats.this_month.clicks} clicks / ${stats.this_month.impressions} impressions`} />
        </div>
      )}

      {/* ROAS row — turns clicks into placements turn into a value
          number facilities can defend internally. */}
      {stats && (
        <div className="rounded-lg border border-violet-200 bg-violet-50/30 p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-violet-900">
            Return on ad spend · this month
          </div>
          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <div className="text-xs text-muted-foreground">Tour requests attributed</div>
              <div className="mt-0.5 text-xl font-bold tabular-nums">{stats.this_month.tour_requests}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Admissions attributed</div>
              <div className="mt-0.5 text-xl font-bold tabular-nums">{stats.this_month.admissions}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Attributed value</div>
              <div className="mt-0.5 text-xl font-bold tabular-nums text-emerald-700">
                ${(stats.this_month.attributed_value_cents / 100).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">ROAS</div>
              <div className="mt-0.5 text-xl font-bold tabular-nums">
                {stats.this_month.roas === null ? "—" : `${stats.this_month.roas}×`}
              </div>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            30-day attribution window. Tour requests get an estimated $500 value;
            admissions get $5,000 unless a real placement fee is recorded.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Campaigns table */}
      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-primary" />
            <p className="mt-3 font-semibold">No campaigns yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Boost your listing for families searching in your area.
            </p>
            <Button className="mt-4" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Create your first campaign
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5 text-left font-medium">Campaign</th>
                <th className="px-3 py-2.5 text-left font-medium">Status</th>
                <th className="px-3 py-2.5 text-right font-medium">Daily budget</th>
                <th className="px-3 py-2.5 text-right font-medium">Bid (CPC)</th>
                <th className="px-3 py-2.5 text-right font-medium">Spent today</th>
                <th className="px-3 py-2.5 text-left font-medium">Schedule</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => {
                const meta = STATUS_META[c.status]
                const pacingPct = c.daily_budget_cents > 0
                  ? Math.min(100, Math.round((c.spent_today_cents / c.daily_budget_cents) * 100))
                  : 0
                return (
                  <React.Fragment key={c.id}>
                  <tr className="border-t hover:bg-muted/20">
                    <td className="px-3 py-3 align-top">
                      <div className="font-semibold">{c.name ?? "Untitled campaign"}</div>
                      {(c.target_states.length > 0 || c.target_cities.length > 0) && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Targeting:{" "}
                          {[...c.target_states, ...c.target_cities].join(" · ")}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 align-top">
                      <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
                    </td>
                    <td className="px-3 py-3 text-right align-top text-sm tabular-nums">
                      ${(c.daily_budget_cents / 100).toFixed(2)}
                      {c.total_budget_cents && (
                        <div className="text-xs font-normal text-muted-foreground">
                          ${(c.total_budget_cents / 100).toFixed(0)} lifetime
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right align-top text-sm tabular-nums">
                      ${(c.cpc_bid_cents / 100).toFixed(2)}
                    </td>
                    <td className="px-3 py-3 text-right align-top">
                      <div className="text-sm tabular-nums">
                        ${(c.spent_today_cents / 100).toFixed(2)}
                      </div>
                      <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            pacingPct > 90 ? "bg-amber-500" : "bg-primary"
                          )}
                          style={{ width: `${pacingPct}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-3 py-3 align-top text-xs text-muted-foreground">
                      <Calendar className="mr-1 inline h-3 w-3" />
                      {new Date(c.starts_on).toLocaleDateString()}
                      {c.ends_on && <> → {new Date(c.ends_on).toLocaleDateString()}</>}
                    </td>
                    <td className="px-3 py-3 align-top text-right">
                      <div className="inline-flex flex-wrap gap-1">
                        <Button asChild size="sm" variant="outline" title="Open campaign detail">
                          <Link to={`/admin/sponsored/${c.id}`}>
                            Manage
                          </Link>
                        </Button>
                        {(c.status === "active" || c.status === "paused") && (
                          <Button size="sm" variant="outline" onClick={() => toggleStatus(c)}>
                            {c.status === "active" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => remove(c)} className="text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <SponsoredInvoicesPanel />

      <div className="rounded-lg border bg-muted/30 p-4 text-xs text-muted-foreground">
        <strong className="text-foreground">How sponsored listings work:</strong>{" "}
        Your listing appears at the top of search results that match your
        facility (same state, city, care type). We mark every sponsored slot
        as "Sponsored" per FTC rules. CPC means you only pay when a family
        clicks through to your detail page — impressions are free. When today's
        spend hits your daily budget, the campaign auto-pauses until midnight
        UTC.
      </div>

      <CreateCampaignDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={async () => {
          setCreateOpen(false)
          await load()
        }}
      />
    </div>
  )
}


/**
 * Monthly invoice history for sponsored-ad spend. Replaces the
 * old invisible billed_cents accumulator with a real legible
 * record + downloadable branded invoice PDFs.
 */
function SponsoredInvoicesPanel() {
  const [rows, setRows] = useState<InvoiceRow[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get<{ data: InvoiceRow[] }>("/facility/sponsored/invoices")
      .then((r) => setRows(r.data.data))
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-sm text-muted-foreground">Loading invoices…</div>

  return (
    <section className="rounded-lg border bg-card p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Monthly invoices
        </h2>
        <span className="text-xs text-muted-foreground">
          Auto-issued on the 2nd of each month
        </span>
      </div>

      {rows && rows.length > 0 ? (
        <ul className="mt-3 divide-y rounded-md border">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{r.period_label}</span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                      r.status === "paid" ? "bg-emerald-100 text-emerald-800"
                      : r.status === "sent" ? "bg-violet-100 text-violet-800"
                      : r.status === "failed" ? "bg-red-100 text-red-800"
                      : "bg-muted text-muted-foreground"
                    )}
                  >
                    {r.status}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {r.total_clicks.toLocaleString()} clicks ·{" "}
                  {r.issued_at && <>Issued {new Date(r.issued_at).toLocaleDateString()}</>}
                  {r.paid_at && <> · Paid {new Date(r.paid_at).toLocaleDateString()}</>}
                </div>
              </div>
              <div className="text-right">
                <div className="text-base font-bold tabular-nums">
                  ${(r.amount_due_cents / 100).toFixed(2)}
                </div>
              </div>
              <div className="flex gap-1.5">
                {r.stripe_invoice_url && (
                  <Button asChild size="sm" variant="outline">
                    <a href={r.stripe_invoice_url} target="_blank" rel="noreferrer">Pay online</a>
                  </Button>
                )}
                <Button asChild size="sm" variant="ghost">
                  <a
                    href={`${import.meta.env.VITE_API_URL ?? "/api"}/facility/sponsored/invoices/${r.id}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    PDF
                  </a>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          No invoices yet. Your first invoice will be issued at the end of your first
          active billing month.
        </p>
      )}
    </section>
  )
}



function StatTile({
  icon: Icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  sub: string
  highlight?: boolean
}) {
  return (
    <Card className={cn(highlight && "border-primary/40 bg-primary/5")}>
      <CardContent className="p-4">
        <Icon className={cn("h-4 w-4", highlight ? "text-primary" : "text-muted-foreground")} />
        <div className="mt-2 text-xl font-semibold tabular-nums">{value}</div>
        <div className="text-xs font-medium">{label}</div>
        <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
      </CardContent>
    </Card>
  )
}

function StatusPill({ tone, children }: { tone: "good" | "warn" | "bad" | "neutral"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        tone === "good" && "bg-primary/10 text-primary",
        tone === "warn" && "bg-amber-500/15 text-amber-700 dark:text-amber-400",
        tone === "bad" && "bg-destructive/10 text-destructive",
        tone === "neutral" && "bg-muted text-muted-foreground"
      )}
    >
      {tone === "good" && <CheckCircle2 className="h-3 w-3" />}
      {tone === "warn" && <Clock className="h-3 w-3" />}
      {children}
    </span>
  )
}

function CreateCampaignDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const today = new Date().toISOString().slice(0, 10)
  const [name, setName] = useState("")
  const [dailyBudget, setDailyBudget] = useState(50)
  const [cpcBid, setCpcBid] = useState(2.5)
  const [startsOn, setStartsOn] = useState(today)
  const [endsOn, setEndsOn] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setName("")
    setDailyBudget(50)
    setCpcBid(2.5)
    setStartsOn(today)
    setEndsOn("")
    setError(null)
  }

  const estDailyClicks = useMemo(() => {
    if (cpcBid <= 0) return 0
    return Math.floor(dailyBudget / cpcBid)
  }, [dailyBudget, cpcBid])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await api.post("/facility/sponsored/campaigns", {
        name: name || null,
        status: "active",
        daily_budget_cents: Math.round(dailyBudget * 100),
        cpc_bid_cents: Math.round(cpcBid * 100),
        starts_on: startsOn,
        ends_on: endsOn || null,
      })
      reset()
      onCreated()
    } catch (e) {
      const err = e as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }
      const first = err.response?.data?.errors ? Object.values(err.response.data.errors)[0]?.[0] : undefined
      setError(first ?? err.response?.data?.message ?? "Failed to create campaign")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); setTimeout(reset, 300) } }}>
      <DialogContent>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>New sponsored campaign</DialogTitle>
            <DialogDescription>
              Auto-activates immediately. Pause anytime. You only pay per click.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium">Campaign name (optional)</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Spring memory-care boost"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Daily budget ($)</label>
                <input
                  type="number"
                  min={5}
                  step={5}
                  value={dailyBudget}
                  onChange={(e) => setDailyBudget(Number(e.target.value))}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-ring"
                />
                <p className="mt-1 text-xs text-muted-foreground">Min $5. Resets at midnight UTC.</p>
              </div>
              <div>
                <label className="text-sm font-medium">CPC bid ($)</label>
                <input
                  type="number"
                  min={0.25}
                  step={0.25}
                  value={cpcBid}
                  onChange={(e) => setCpcBid(Number(e.target.value))}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-ring"
                />
                <p className="mt-1 text-xs text-muted-foreground">What you'll pay per click. Min $0.25.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Starts on</label>
                <input
                  type="date"
                  value={startsOn}
                  onChange={(e) => setStartsOn(e.target.value)}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Ends on (optional)</label>
                <input
                  type="date"
                  value={endsOn}
                  onChange={(e) => setEndsOn(e.target.value)}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div className="rounded-md border bg-accent/30 px-3 py-2 text-sm">
              <div className="text-xs text-muted-foreground">Estimated daily reach</div>
              <div className="mt-1 font-semibold">
                Up to <span className="tabular-nums">{estDailyClicks}</span> clicks per day at ${dailyBudget}/day budget
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              <Sparkles className="h-4 w-4" />
              Launch campaign
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
