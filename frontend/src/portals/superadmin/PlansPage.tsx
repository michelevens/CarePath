import { useEffect, useMemo, useState, type FormEvent } from "react"
import {
  AlertTriangle,
  Check,
  DollarSign,
  Layers,
  Loader2,
  Power,
  PowerOff,
  Settings2,
  X,
  Zap,
} from "lucide-react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface PlanRow {
  id: string
  slug: string
  name: string
  audience: string
  tier: string
  monthly_cents: number
  annual_cents: number | null
  included_seats: number
  placement_cap_per_year: number | null
  stripe_price_id_monthly: string | null
  stripe_price_id_annual: string | null
  features: string[]
  is_active: boolean
  sort_order: number
  active_subscriptions_count: number
}

interface PlansPayload {
  data: PlanRow[]
  known_features: string[]
  audiences: string[]
  tiers: string[]
}

const AUDIENCE_LABEL: Record<string, string> = {
  facility: "Facility",
  advisor: "Advisor",
  family: "Family",
}

const TIER_COLOR: Record<string, string> = {
  free: "bg-stone-100 text-stone-700",
  pro: "bg-violet-100 text-violet-700",
  team: "bg-indigo-100 text-indigo-800",
  agency: "bg-amber-100 text-amber-800",
  network: "bg-amber-100 text-amber-800",
  enterprise: "bg-emerald-100 text-emerald-800",
}

function formatMoney(cents: number | null) {
  if (cents == null) return "—"
  if (cents === 0) return "Free"
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  })
}

export function PlansPage() {
  const [plans, setPlans] = useState<PlanRow[]>([])
  const [knownFeatures, setKnownFeatures] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [audienceFilter, setAudienceFilter] = useState<string>("")
  const [editing, setEditing] = useState<PlanRow | null>(null)

  const load = () => {
    setLoading(true)
    api
      .get<PlansPayload>("/superadmin/plans")
      .then((r) => {
        setPlans(r.data?.data ?? [])
        setKnownFeatures(r.data?.known_features ?? [])
      })
      .catch((e: unknown) => {
        const err = e as { response?: { data?: { message?: string } } }
        setError(err.response?.data?.message ?? "Failed to load")
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const filtered = useMemo(
    () =>
      audienceFilter ? plans.filter((p) => p.audience === audienceFilter) : plans,
    [plans, audienceFilter],
  )

  const totals = useMemo(() => {
    const active = plans.filter((p) => p.is_active).length
    const subs = plans.reduce((acc, p) => acc + p.active_subscriptions_count, 0)
    const missingStripe = plans.filter(
      (p) =>
        p.tier !== "free" &&
        p.is_active &&
        (!p.stripe_price_id_monthly || !p.stripe_price_id_annual),
    )
    return { active, subs, missingStripe }
  }, [plans])

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Subscription plans</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Edit the safe subset live. Prices are deploy-controlled — to change a
          price, create a new plan and deprecate the old one.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Plans" value={plans.length.toString()} icon={Layers} />
        <Stat label="Active" value={totals.active.toString()} icon={Power} />
        <Stat
          label="Active subscriptions"
          value={totals.subs.toString()}
          icon={DollarSign}
        />
        <Stat
          label="Missing Stripe wiring"
          value={totals.missingStripe.length.toString()}
          icon={AlertTriangle}
          tone={totals.missingStripe.length > 0 ? "warn" : undefined}
        />
      </div>

      {totals.missingStripe.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/60">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-700" />
            <div className="text-xs text-amber-900">
              <div className="font-medium">
                {totals.missingStripe.length} active paid plan(s) missing Stripe Price IDs:
              </div>
              <div className="mt-1">
                {totals.missingStripe.map((p) => p.slug).join(" · ")}
              </div>
              <div className="mt-1">
                Checkout will fail until you paste the price IDs (Stripe dashboard
                → Products → your product → copy <code>price_xxx</code>).
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audience filter */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setAudienceFilter("")}
          className={`rounded-full border px-3 py-1 text-xs font-medium ${
            audienceFilter === ""
              ? "border-violet-300 bg-violet-50 text-violet-700"
              : "border-transparent bg-stone-100 text-stone-600 hover:bg-stone-200"
          }`}
        >
          All
        </button>
        {Object.entries(AUDIENCE_LABEL).map(([a, label]) => (
          <button
            key={a}
            onClick={() => setAudienceFilter(a)}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              audienceFilter === a
                ? "border-violet-300 bg-violet-50 text-violet-700"
                : "border-transparent bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Plans grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {loading && plans.length === 0 && (
          <div className="text-sm text-muted-foreground">Loading plans…</div>
        )}
        {filtered.map((p) => (
          <PlanCard key={p.id} plan={p} onEdit={() => setEditing(p)} />
        ))}
      </div>

      {editing && (
        <EditPlanModal
          plan={editing}
          knownFeatures={knownFeatures}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            load()
          }}
        />
      )}
    </div>
  )
}

function PlanCard({ plan, onEdit }: { plan: PlanRow; onEdit: () => void }) {
  return (
    <Card className={!plan.is_active ? "opacity-60" : ""}>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold">{plan.name}</h3>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                  TIER_COLOR[plan.tier] ?? TIER_COLOR.free
                }`}
              >
                {plan.tier}
              </span>
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              <span className="capitalize">{plan.audience}</span> · {plan.slug}
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold tabular-nums">
              {formatMoney(plan.monthly_cents)}
              {plan.monthly_cents > 0 && (
                <span className="text-xs font-normal text-muted-foreground">/mo</span>
              )}
            </div>
            {plan.annual_cents != null && plan.annual_cents > 0 && (
              <div className="text-xs text-muted-foreground tabular-nums">
                {formatMoney(plan.annual_cents)}/yr
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <Stat2 label="Active subs" value={plan.active_subscriptions_count} />
          <Stat2 label="Seats" value={plan.included_seats} />
          <Stat2 label="Placement cap" value={plan.placement_cap_per_year ?? "∞"} />
        </div>

        <div>
          <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
            Features ({plan.features.length})
          </div>
          <div className="flex flex-wrap gap-1">
            {plan.features.slice(0, 6).map((f) => (
              <span
                key={f}
                className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] text-stone-700"
              >
                {f}
              </span>
            ))}
            {plan.features.length > 6 && (
              <span className="text-[10px] text-muted-foreground">
                +{plan.features.length - 6} more
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-md border bg-muted/30 p-2 text-xs">
          <div>
            <div className="text-muted-foreground">Stripe monthly</div>
            <code className="break-all text-[10px]">
              {plan.stripe_price_id_monthly ?? "—"}
            </code>
          </div>
          <div>
            <div className="text-muted-foreground">Stripe annual</div>
            <code className="break-all text-[10px]">
              {plan.stripe_price_id_annual ?? "—"}
            </code>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t pt-3">
          <div className="flex items-center gap-2 text-xs">
            {plan.is_active ? (
              <>
                <Power className="h-3 w-3 text-emerald-600" />
                <span className="text-emerald-700">Active</span>
              </>
            ) : (
              <>
                <PowerOff className="h-3 w-3 text-stone-500" />
                <span className="text-stone-600">Paused</span>
              </>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={onEdit} className="gap-1">
            <Settings2 className="h-3 w-3" />
            Edit
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function EditPlanModal({
  plan,
  knownFeatures,
  onClose,
  onSaved,
}: {
  plan: PlanRow
  knownFeatures: string[]
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(plan.name)
  const [sortOrder, setSortOrder] = useState(plan.sort_order)
  const [seats, setSeats] = useState(plan.included_seats)
  const [cap, setCap] = useState<number | "">(plan.placement_cap_per_year ?? "")
  const [stripeMonth, setStripeMonth] = useState(plan.stripe_price_id_monthly ?? "")
  const [stripeYear, setStripeYear] = useState(plan.stripe_price_id_annual ?? "")
  const [features, setFeatures] = useState<string[]>(plan.features)
  const [active, setActive] = useState(plan.is_active)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{
    cycle: "monthly" | "annual"
    ok: boolean
    message: string
  } | null>(null)

  const toggleFeature = (f: string) => {
    setFeatures((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]))
  }

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    try {
      await api.put(`/superadmin/plans/${plan.id}`, {
        name,
        sort_order: sortOrder,
        included_seats: seats,
        placement_cap_per_year: cap === "" ? null : cap,
        stripe_price_id_monthly: stripeMonth || null,
        stripe_price_id_annual: stripeYear || null,
        features,
        is_active: active,
      })
      onSaved()
    } catch (e) {
      const error = e as { response?: { data?: { message?: string } } }
      setErr(error.response?.data?.message ?? "Save failed")
    } finally {
      setBusy(false)
    }
  }

  const test = async (cycle: "monthly" | "annual") => {
    setTestResult(null)
    try {
      const r = await api.post<{
        ok: boolean
        stripe?: {
          unit_amount_cents: number
          interval: string
          product_name: string
          active: boolean
        }
      }>(`/superadmin/plans/${plan.id}/test-stripe-price`, { cycle })
      const s = r.data.stripe!
      setTestResult({
        cycle,
        ok: true,
        message: `${s.product_name ?? "?"} — $${(s.unit_amount_cents / 100).toFixed(0)} / ${s.interval} ${s.active ? "✓" : "(price inactive!)"}`,
      })
    } catch (e) {
      const error = e as { response?: { data?: { error?: string } } }
      setTestResult({
        cycle,
        ok: false,
        message: error.response?.data?.error ?? "Lookup failed",
      })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-sm font-semibold">Edit · {plan.name}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={save} className="space-y-5 p-5">
          {/* Cosmetic */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Display name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={120}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              />
            </Field>
            <Field label="Sort order">
              <input
                type="number"
                min={0}
                max={9999}
                value={sortOrder}
                onChange={(e) => setSortOrder(parseInt(e.target.value || "0"))}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              />
            </Field>
          </div>

          {/* Gating */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Included seats">
              <input
                type="number"
                min={1}
                max={9999}
                value={seats}
                onChange={(e) => setSeats(parseInt(e.target.value || "1"))}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              />
            </Field>
            <Field label="Placement cap/yr (blank = unlimited)">
              <input
                type="number"
                min={0}
                value={cap}
                onChange={(e) =>
                  setCap(e.target.value === "" ? "" : parseInt(e.target.value))
                }
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              />
            </Field>
          </div>

          {/* Stripe wiring */}
          <div className="rounded-md border bg-muted/30 p-3">
            <div className="mb-2 text-xs font-semibold">Stripe Price IDs</div>
            <div className="space-y-2">
              <PriceIdRow
                label="Monthly"
                value={stripeMonth}
                onChange={setStripeMonth}
                onTest={() => test("monthly")}
              />
              <PriceIdRow
                label="Annual"
                value={stripeYear}
                onChange={setStripeYear}
                onTest={() => test("annual")}
              />
            </div>
            {testResult && (
              <div
                className={`mt-2 flex items-start gap-2 rounded-md border p-2 text-xs ${
                  testResult.ok
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-destructive/30 bg-destructive/10 text-destructive"
                }`}
              >
                {testResult.ok ? (
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                )}
                <span>
                  <strong className="capitalize">{testResult.cycle}:</strong>{" "}
                  {testResult.message}
                </span>
              </div>
            )}
          </div>

          {/* Features */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-semibold">Features ({features.length})</div>
              <span className="text-xs text-muted-foreground">
                Toggle gating flags
              </span>
            </div>
            <div className="grid max-h-64 grid-cols-2 gap-1 overflow-y-auto rounded-md border bg-background p-2">
              {knownFeatures.map((f) => {
                const on = features.includes(f)
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => toggleFeature(f)}
                    className={`flex items-center justify-between rounded px-2 py-1 text-xs text-left transition-colors ${
                      on
                        ? "bg-violet-50 text-violet-900"
                        : "text-muted-foreground hover:bg-muted/40"
                    }`}
                  >
                    <span className="truncate font-mono text-[11px]">{f}</span>
                    {on && <Check className="h-3 w-3 shrink-0 text-violet-700" />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Active toggle */}
          <label className="flex cursor-pointer items-start gap-3 rounded-md border bg-background p-3">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="mt-0.5"
            />
            <div className="flex-1 text-sm">
              <div className="font-medium">Active</div>
              <div className="text-xs text-muted-foreground">
                When off, the plan is hidden from new signups. Existing
                subscribers keep their plan and are billed normally.
              </div>
            </div>
          </label>

          {err && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
              {err}
            </div>
          )}

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy} className="gap-2">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function PriceIdRow({
  label,
  value,
  onChange,
  onTest,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  onTest: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 text-xs text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="price_…"
        className="h-8 flex-1 rounded-md border bg-background px-2 font-mono text-xs"
      />
      <Button type="button" size="sm" variant="outline" onClick={onTest} className="gap-1">
        <Zap className="h-3 w-3" />
        Test
      </Button>
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

function Stat2({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded border bg-background p-2 text-center">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="text-sm font-semibold tabular-nums">{value}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-medium text-muted-foreground">{label}</div>
      {children}
    </label>
  )
}
