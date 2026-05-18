import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import {
  ArrowLeft,
  ArrowUp,
  BarChart3,
  Calendar,
  Eye,
  Lightbulb,
  Loader2,
  MousePointerClick,
  Pause,
  Play,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

/* ─────────────────────────── Types ─────────────────────────── */

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
}

interface Totals {
  impressions: number
  clicks: number
  spend_cents: number
  ctr_pct: number
  conversions: number
  admissions: number
  attributed_value_cents: number
  cost_per_click_cents: number
  cost_per_conversion_cents: number
  roas: number | null
}

interface DailyRow {
  date: string
  impressions: number
  clicks: number
  spend_cents: number
  conversions: number
}

interface Variant {
  id: string
  label: string | null
  headline: string
  body: string | null
  is_active: boolean
  impressions: number
  clicks: number
  ctr_pct: number
}

interface InsightHint {
  key: string
  severity: "high" | "medium" | "low"
  label: string
  detail: string
  suggested_action: {
    type: "raise_bid" | "raise_budget" | "lower_bid" | "pause"
    to_cents?: number
    predicted_lift?: string
  } | null
}

interface DetailPayload {
  campaign: Campaign
  totals_30d: Totals
  daily: DailyRow[]
  variants: Variant[]
}

/* ─────────────────────────── Page ─────────────────────────── */

export function SponsoredCampaignDetailPage() {
  const { id = "" } = useParams<{ id: string }>()
  const [data, setData] = useState<DetailPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const r = await api.get<{ data: DetailPayload }>(`/facility/sponsored/campaigns/${id}`)
      setData(r.data.data)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setError(err.response?.data?.message ?? "Failed to load")
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [id])

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading campaign…
      </div>
    )
  }
  if (error || !data) {
    return (
      <div className="p-8">
        <p className="text-sm text-muted-foreground">{error ?? "Campaign not found."}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/admin/sponsored">
            <ArrowLeft className="h-4 w-4" /> Back to campaigns
          </Link>
        </Button>
      </div>
    )
  }

  const { campaign, totals_30d: t, daily, variants } = data

  const toggleStatus = async () => {
    const nextStatus = campaign.status === "active" ? "paused" : "active"
    await api.put(`/facility/sponsored/campaigns/${campaign.id}`, { status: nextStatus })
    load()
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div>
        <Link
          to="/admin/sponsored"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> All campaigns
        </Link>
        <div className="mt-2 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">
              {campaign.name ?? "Untitled campaign"}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <StatusPill status={campaign.status} />
              <span>
                <Calendar className="mr-1 inline h-3 w-3" />
                {new Date(campaign.starts_on).toLocaleDateString()}
                {campaign.ends_on && <> → {new Date(campaign.ends_on).toLocaleDateString()}</>}
              </span>
              {(campaign.target_states.length > 0 || campaign.target_cities.length > 0) && (
                <span>
                  Targeting: {[...campaign.target_states, ...campaign.target_cities].join(" · ")}
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            {(campaign.status === "active" || campaign.status === "paused") && (
              <Button variant="outline" onClick={toggleStatus}>
                {campaign.status === "active" ? (
                  <><Pause className="h-4 w-4" /> Pause</>
                ) : (
                  <><Play className="h-4 w-4" /> Resume</>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Headline KPIs — last 30d */}
      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Last 30 days
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Kpi icon={Eye} label="Impressions" value={t.impressions.toLocaleString()} />
          <Kpi icon={MousePointerClick} label="Clicks" value={t.clicks.toLocaleString()} sub={`${t.ctr_pct}% CTR`} />
          <Kpi icon={Wallet} label="Spend" value={`$${(t.spend_cents / 100).toFixed(2)}`} sub={`avg $${(t.cost_per_click_cents / 100).toFixed(2)}/click`} highlight />
          <Kpi icon={TrendingUp} label="Tour requests" value={t.conversions.toLocaleString()} sub={`${t.admissions} admitted`} />
          <Kpi
            icon={ArrowUp}
            label="ROAS"
            value={t.roas === null ? "—" : `${t.roas}×`}
            sub={`$${(t.attributed_value_cents / 100).toLocaleString()} value`}
            highlight
          />
        </div>
      </section>

      {/* Trend chart */}
      <section className="rounded-lg border bg-card p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <BarChart3 className="mr-1 inline h-3.5 w-3.5" />
            Daily activity
          </h2>
          <span className="text-xs text-muted-foreground">impressions vs clicks per day</span>
        </div>
        <TrendChart data={daily} />
        <div className="mt-3 flex items-center gap-4 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-3 rounded-sm bg-violet-200" /> Impressions
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-3 rounded-sm bg-violet-600" /> Clicks
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-3 rounded-sm bg-emerald-500" /> Conversions
          </span>
        </div>
      </section>

      {/* Bid recommendations */}
      <BidInsightsSection campaignId={campaign.id} onApplied={load} />

      {/* Two-column on lg: Variants + Advanced targeting */}
      <div className="grid gap-6 lg:grid-cols-2">
        <VariantsSection campaignId={campaign.id} initial={variants} onChanged={load} />
        <AdvancedTargetingSection campaign={campaign} onSaved={load} />
      </div>

      {/* Budget + bid summary */}
      <section className="rounded-lg border bg-card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <Target className="mr-1 inline h-3.5 w-3.5" />
          Budget & bid
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryTile label="Base CPC" value={`$${(campaign.cpc_bid_cents / 100).toFixed(2)}`} />
          <SummaryTile label="Daily budget" value={`$${(campaign.daily_budget_cents / 100).toFixed(2)}`} />
          {campaign.total_budget_cents !== null && (
            <SummaryTile label="Lifetime budget" value={`$${(campaign.total_budget_cents / 100).toFixed(0)}`} />
          )}
          <SummaryTile label="Today's spend" value={`$${(campaign.spent_today_cents / 100).toFixed(2)}`} />
        </div>
      </section>

      <div className="rounded-lg border bg-muted/30 p-4 text-xs text-muted-foreground">
        Click-fraud defense, frequency caps (3 impressions/session/day), quality-blend ranking, and
        FTC-marked "Sponsored" badges are always on. Changes save instantly — no separate apply step.
      </div>
    </div>
  )
}

/* ─────────────────────────── Sub-components ─────────────────────────── */

function StatusPill({ status }: { status: Campaign["status"] }) {
  const meta = {
    draft: { label: "Draft", tone: "bg-muted text-muted-foreground" },
    active: { label: "Active", tone: "bg-emerald-100 text-emerald-800" },
    paused: { label: "Paused", tone: "bg-amber-100 text-amber-800" },
    depleted: { label: "Depleted", tone: "bg-stone-100 text-stone-700" },
    ended: { label: "Ended", tone: "bg-stone-200 text-stone-700" },
  }[status]
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", meta.tone)}>
      {meta.label}
    </span>
  )
}

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: typeof Eye
  label: string
  value: string
  sub?: string
  highlight?: boolean
}) {
  return (
    <div className={cn("rounded-lg border bg-card p-4", highlight && "border-violet-300 bg-violet-50/40")}>
      <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="mt-1.5 text-2xl font-bold tabular-nums">{value}</div>
      {sub && <div className="mt-0.5 text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  )
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-lg font-bold tabular-nums">{value}</div>
    </div>
  )
}

function TrendChart({ data }: { data: DailyRow[] }) {
  const maxImp = Math.max(1, ...data.map((d) => d.impressions))
  const maxClk = Math.max(1, ...data.map((d) => d.clicks + d.conversions))
  return (
    <div className="mt-3 flex h-40 items-end gap-1">
      {data.map((d) => {
        const impH = (d.impressions / maxImp) * 100
        const clkH = (d.clicks / maxClk) * 100
        const convH = (d.conversions / maxClk) * 100
        return (
          <div
            key={d.date}
            className="group relative flex flex-1 flex-col items-center justify-end gap-px"
            title={`${d.date} — ${d.impressions} impressions, ${d.clicks} clicks, ${d.conversions} conversions, $${(d.spend_cents / 100).toFixed(2)}`}
          >
            <div
              className="w-full rounded-sm bg-violet-200"
              style={{ height: `${impH}%`, minHeight: d.impressions > 0 ? 2 : 0 }}
            />
            <div
              className="absolute inset-x-0 bottom-0 rounded-sm bg-violet-600"
              style={{ height: `${clkH * 0.55}%`, minHeight: d.clicks > 0 ? 2 : 0 }}
            />
            {d.conversions > 0 && (
              <div
                className="absolute inset-x-0 bottom-0 rounded-sm bg-emerald-500"
                style={{ height: `${convH * 0.3}%`, minHeight: 2 }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ─────────────────────────── Bid insights ─────────────────────────── */

function BidInsightsSection({
  campaignId,
  onApplied,
}: {
  campaignId: string
  onApplied: () => Promise<void>
}) {
  const [hints, setHints] = useState<InsightHint[] | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const r = await api.get<{ data: { hints: InsightHint[] } }>(
        `/facility/sponsored/campaigns/${campaignId}/insights`,
      )
      setHints(r.data.data.hints)
    } catch {
      setHints([])
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [campaignId])

  const apply = async (hint: InsightHint) => {
    const a = hint.suggested_action
    if (!a || a.to_cents == null) return
    const patch: Record<string, number> = {}
    if (a.type === "raise_bid" || a.type === "lower_bid") patch.cpc_bid_cents = a.to_cents
    if (a.type === "raise_budget") patch.daily_budget_cents = a.to_cents
    await api.put(`/facility/sponsored/campaigns/${campaignId}`, patch)
    await onApplied()
    await load()
  }

  return (
    <section className="rounded-lg border bg-card p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        <Lightbulb className="mr-1 inline h-3.5 w-3.5" />
        Bid recommendations
      </h2>
      {loading ? (
        <div className="mt-2 text-xs text-muted-foreground">Analyzing campaign…</div>
      ) : hints && hints.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {hints.map((h) => (
            <li key={h.key}>
              <HintCard hint={h} onApply={() => apply(h)} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">No recommendations yet.</p>
      )}
    </section>
  )
}

function HintCard({ hint, onApply }: { hint: InsightHint; onApply: () => void }) {
  const tone =
    hint.severity === "high"
      ? "border-amber-300 bg-amber-50/60"
      : hint.severity === "medium"
      ? "border-violet-200 bg-white"
      : "border-emerald-200 bg-emerald-50/40"
  const a = hint.suggested_action
  const ctaLabel =
    a?.type === "raise_bid" ? `Raise bid to $${((a.to_cents ?? 0) / 100).toFixed(2)}`
    : a?.type === "lower_bid" ? `Lower bid to $${((a.to_cents ?? 0) / 100).toFixed(2)}`
    : a?.type === "raise_budget" ? `Raise budget to $${((a.to_cents ?? 0) / 100).toFixed(2)}`
    : null
  return (
    <div className={cn("rounded-md border p-3", tone)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">{hint.label}</div>
          <p className="mt-1 text-xs text-muted-foreground">{hint.detail}</p>
        </div>
        {ctaLabel && (
          <div className="flex shrink-0 flex-col items-end gap-1">
            <Button size="sm" onClick={onApply}>{ctaLabel}</Button>
            {a?.predicted_lift && (
              <span className="text-[10px] text-muted-foreground">{a.predicted_lift}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────── Variants section ─────────────────────────── */

function VariantsSection({
  campaignId,
  initial,
  onChanged,
}: {
  campaignId: string
  initial: Variant[]
  onChanged: () => Promise<void>
}) {
  const [variants, setVariants] = useState<Variant[]>(initial)
  const [adding, setAdding] = useState(false)
  const [headline, setHeadline] = useState("")
  const [body, setBody] = useState("")
  const [label, setLabel] = useState("")
  const [busy, setBusy] = useState(false)

  const reload = async () => {
    const r = await api.get<{ data: Variant[] }>(`/facility/sponsored/campaigns/${campaignId}/creatives`)
    setVariants(r.data.data)
    onChanged()
  }

  const add = async () => {
    if (busy || headline.trim().length < 5) return
    setBusy(true)
    try {
      await api.post(`/facility/sponsored/campaigns/${campaignId}/creatives`, {
        label: label || null,
        headline,
        body: body || null,
        is_active: true,
      })
      setHeadline(""); setBody(""); setLabel(""); setAdding(false)
      reload()
    } finally {
      setBusy(false)
    }
  }

  const toggleActive = async (v: Variant) => {
    await api.put(`/facility/sponsored/creatives/${v.id}`, { is_active: !v.is_active })
    reload()
  }
  const remove = async (v: Variant) => {
    if (!confirm(`Delete variant "${v.label ?? v.headline}"?`)) return
    await api.delete(`/facility/sponsored/creatives/${v.id}`)
    reload()
  }

  return (
    <section className="rounded-lg border bg-card p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <Sparkles className="mr-1 inline h-3.5 w-3.5" />
          A/B creatives
        </h2>
        {!adding && (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            Add variant
          </Button>
        )}
      </div>

      {variants.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {variants.map((v) => (
            <li key={v.id} className="rounded-md border bg-background p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {v.label && (
                      <span className="inline-flex items-center rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-800">
                        {v.label}
                      </span>
                    )}
                    {!v.is_active && (
                      <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        Paused
                      </span>
                    )}
                    <span className="text-sm font-semibold">{v.headline}</span>
                  </div>
                  {v.body && (
                    <p className="mt-1 text-xs text-muted-foreground">{v.body}</p>
                  )}
                </div>
                <div className="shrink-0 text-right text-xs">
                  <div className="font-semibold tabular-nums">{v.ctr_pct}% CTR</div>
                  <div className="text-muted-foreground">
                    {v.clicks} / {v.impressions.toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="mt-2 flex justify-end gap-1.5">
                <Button size="sm" variant="ghost" onClick={() => toggleActive(v)}>
                  {v.is_active ? "Pause" : "Activate"}
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => remove(v)}>
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">
          No variants yet — ads use the default facility name. Add 2+ to A/B test wording.
        </p>
      )}

      {adding && (
        <div className="mt-3 rounded-md border bg-background p-3">
          <div className="grid gap-2">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Label (e.g. A or 'Pricing-led')"
              maxLength={60}
              className="rounded-md border bg-background px-2 py-1.5 text-sm"
            />
            <input
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="Headline (e.g. 'Memory Care, Tour This Week')"
              maxLength={160}
              className="rounded-md border bg-background px-2 py-1.5 text-sm"
            />
            <input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Optional supporting line"
              maxLength={400}
              className="rounded-md border bg-background px-2 py-1.5 text-sm"
            />
            <div className="flex justify-end gap-1.5">
              <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
              <Button size="sm" onClick={add} disabled={busy || headline.trim().length < 5}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

/* ─────────────────────────── Advanced targeting ─────────────────────────── */

function AdvancedTargetingSection({
  campaign,
  onSaved,
}: {
  campaign: Campaign
  onSaved: () => Promise<void>
}) {
  const [excludeStates, setExcludeStates] = useState(campaign.exclude_states.join(", "))
  const [excludeTypes, setExcludeTypes] = useState<string[]>(campaign.exclude_types)
  const [searchMult, setSearchMult] = useState(campaign.surface_bid_multipliers?.search ?? 1)
  const [embedMult, setEmbedMult] = useState(campaign.surface_bid_multipliers?.embed ?? 1)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const careTypes = [
    { value: "assisted_living", label: "Assisted Living" },
    { value: "memory_care", label: "Memory Care" },
    { value: "snf", label: "Skilled Nursing" },
    { value: "ccrc", label: "CCRC" },
    { value: "independent_living", label: "Independent" },
    { value: "group_home", label: "Group Home" },
  ]

  const toggleType = (t: string) =>
    setExcludeTypes((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]))

  const save = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const states = excludeStates
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter((s) => /^[A-Z]{2}$/.test(s))
      await api.put(`/facility/sponsored/campaigns/${campaign.id}`, {
        exclude_states: states,
        exclude_types: excludeTypes,
        surface_bid_multipliers: { search: searchMult, embed: embedMult },
      })
      setSaved(true)
      await onSaved()
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const effSearch = Math.round(campaign.cpc_bid_cents * searchMult)
  const effEmbed = Math.round(campaign.cpc_bid_cents * embedMult)

  return (
    <section className="rounded-lg border bg-card p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        <Target className="mr-1 inline h-3.5 w-3.5" />
        Targeting & surface bids
      </h2>

      <div className="mt-3 space-y-4">
        <div>
          <label className="text-xs font-medium">Exclude states</label>
          <input
            type="text"
            value={excludeStates}
            onChange={(e) => setExcludeStates(e.target.value)}
            placeholder="e.g. TX, NY"
            className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm uppercase"
          />
        </div>
        <div>
          <label className="text-xs font-medium">Exclude care types</label>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {careTypes.map((t) => (
              <button
                type="button"
                key={t.value}
                onClick={() => toggleType(t.value)}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-xs",
                  excludeTypes.includes(t.value)
                    ? "border-red-500 bg-red-50 text-red-800"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium">Search bid multiplier</label>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="range" min={0.1} max={3} step={0.1}
              value={searchMult}
              onChange={(e) => setSearchMult(Number(e.target.value))}
              className="flex-1"
            />
            <span className="w-12 text-right text-sm tabular-nums">{searchMult.toFixed(1)}×</span>
            <span className="w-16 text-right text-xs text-muted-foreground">
              ${(effSearch / 100).toFixed(2)}
            </span>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium">Hospital embed bid multiplier</label>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="range" min={0.1} max={3} step={0.1}
              value={embedMult}
              onChange={(e) => setEmbedMult(Number(e.target.value))}
              className="flex-1"
            />
            <span className="w-12 text-right text-sm tabular-nums">{embedMult.toFixed(1)}×</span>
            <span className="w-16 text-right text-xs text-muted-foreground">
              ${(effEmbed / 100).toFixed(2)}
            </span>
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Discharge-planner traffic is highest-intent — most facilities bid 1.2–1.5× there.
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        {saved && <span className="text-xs text-emerald-700">✓ Saved</span>}
        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
        </Button>
      </div>
    </section>
  )
}
