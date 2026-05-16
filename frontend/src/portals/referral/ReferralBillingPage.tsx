import { useEffect, useState } from "react"
import {
  CheckCircle2,
  CreditCard,
  Info,
  Loader2,
  ShieldCheck,
  XCircle,
} from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

type Cycle = "monthly" | "annual"

interface Plan {
  slug: string
  name: string
  tier: string
  audience: string
  monthly_cents: number
  annual_cents: number | null
  included_seats: number
  placement_cap_per_year: number | null
  features: string[]
}

interface Subscription {
  id?: string
  status: string
  billing_cycle?: Cycle
  current_period_ends_at?: string | null
  canceled_at?: string | null
  trial_ends_at?: string | null
  plan: Plan | null
}

interface SubResponse {
  user: { id: string; email: string }
  subscription: Subscription
}

// Feature labels — same vocabulary as the seeder.
const FEATURE_LABELS: Record<string, string> = {
  crm_pipeline: "Family pipeline / CRM",
  e_signature_basic: "Basic e-signature on placement contracts",
  payout_dashboard: "Payout dashboard + 1099 export",
  calendar_sync: "Calendar sync (Google / Outlook)",
  public_advisor_page: "Public advisor profile page",
  team_seats: "Multi-seat support (5 seats)",
  custom_branded_family_pages: "Custom-branded family landing pages",
  advanced_pipeline_analytics: "Advanced pipeline + conversion analytics",
  agency_dashboard: "Agency-level rollup dashboard",
  unlimited_seats: "Unlimited seats",
  white_label: "Full white-labeling (your domain + brand)",
  api_access: "REST API access",
  training_mode_admin: "Training-mode admin (sandbox)",
  volume_commission_rebate: "Volume commission rebate (≥50 placements/yr)",
}

export function ReferralBillingPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [sub, setSub] = useState<SubResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [cycle, setCycle] = useState<Cycle>("annual")
  const [submittingSlug, setSubmittingSlug] = useState<string | null>(null)
  const [canceling, setCanceling] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [p, s] = await Promise.all([
        api.get<{ data: Plan[] }>("/referral/billing/plans"),
        api.get<{ data: SubResponse }>("/referral/billing/subscription"),
      ])
      setPlans(Array.isArray(p.data?.data) ? p.data.data : [])
      setSub(s.data?.data ?? null)
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } }
      setError(err.response?.data?.message ?? "Failed to load billing")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const onChoose = async (plan: Plan) => {
    setError(null)
    setInfo(null)
    setSubmittingSlug(plan.slug)
    try {
      const res = await api.post<{ checkout_url?: string }>(
        "/referral/billing/checkout",
        { plan_slug: plan.slug, billing_cycle: cycle }
      )
      if (res.data.checkout_url) {
        window.location.href = res.data.checkout_url
        return
      }
      await load()
    } catch (e) {
      const err = e as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }
      const first = err.response?.data?.errors ? Object.values(err.response.data.errors)[0]?.[0] : undefined
      setError(first ?? err.response?.data?.message ?? "Checkout failed")
    } finally {
      setSubmittingSlug(null)
    }
  }

  const onCancel = async () => {
    if (!confirm("Cancel at the end of the current billing cycle? You'll keep your tier until then.")) return
    setCanceling(true)
    setError(null)
    setInfo(null)
    try {
      const res = await api.post<{ cancels_at?: string }>("/referral/billing/cancel", {})
      setInfo(
        res.data.cancels_at
          ? `Subscription will cancel on ${new Date(res.data.cancels_at).toLocaleDateString()}.`
          : "Cancellation scheduled."
      )
      await load()
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } }
      setError(err.response?.data?.message ?? "Cancel failed")
    } finally {
      setCanceling(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading subscription…
      </div>
    )
  }

  const currentSlug = sub?.subscription.plan?.slug
  const isCancelable = sub?.subscription.status &&
    ["active", "trialing"].includes(sub.subscription.status) &&
    !sub.subscription.canceled_at

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Subscription &amp; tier</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          You're charged separately for the SaaS subscription (CRM, payouts,
          dashboards) and on placement commissions (per move-in). Both are
          shown here.
        </p>
      </div>

      {sub?.subscription.plan && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <CreditCard className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <div className="text-sm font-semibold">
                  {sub.subscription.plan.name} —{" "}
                  <StatusPill status={sub.subscription.status} />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {sub.subscription.billing_cycle === "annual" ? "Annual" : "Monthly"} billing
                  {sub.subscription.current_period_ends_at && (
                    <> · Renews {new Date(sub.subscription.current_period_ends_at).toLocaleDateString()}</>
                  )}
                </div>
              </div>
            </div>
            {isCancelable && (
              <Button variant="outline" size="sm" onClick={onCancel} disabled={canceling}>
                {canceling && <Loader2 className="h-4 w-4 animate-spin" />}
                Cancel at period end
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {!sub?.subscription.plan && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex items-start gap-3 p-6">
            <Info className="mt-0.5 h-5 w-5 text-amber-700" />
            <div className="text-sm">
              <div className="font-semibold">No SaaS subscription yet</div>
              <div className="mt-1 text-muted-foreground">
                You can still receive placement commissions through Stripe Connect
                without a SaaS plan — but you won't get the CRM, payout
                dashboard, calendar sync, or branded family pages.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cycle toggle */}
      <div className="flex items-center justify-end gap-2">
        <span className="text-xs text-muted-foreground">Billing cycle:</span>
        <div className="inline-flex rounded-md border bg-card p-0.5 text-xs">
          <button
            onClick={() => setCycle("monthly")}
            className={cn(
              "rounded px-3 py-1 transition-colors",
              cycle === "monthly" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setCycle("annual")}
            className={cn(
              "rounded px-3 py-1 transition-colors",
              cycle === "annual" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            )}
          >
            Annual <span className="text-[10px] opacity-80">— save ~20%</span>
          </button>
        </div>
      </div>

      {/* Plan grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <PlanCard
            key={plan.slug}
            plan={plan}
            cycle={cycle}
            isCurrent={currentSlug === plan.slug}
            onChoose={() => onChoose(plan)}
            submitting={submittingSlug === plan.slug}
          />
        ))}
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      {info && (
        <div className="rounded-md border border-primary/30 bg-accent/40 px-3 py-2 text-sm">
          {info}
        </div>
      )}

      <div className="rounded-lg border bg-muted/30 p-4 text-xs text-muted-foreground">
        <strong className="text-foreground">Two charges, separate:</strong> SaaS
        subscription (this page) is billed monthly/annually for the CRM and
        ops platform. Placement commission (your{" "}
        <a className="underline hover:text-foreground" href="/referral/payouts">
          payouts page
        </a>
        ) is a per-placement split CarePath takes when a family you sourced
        gets admitted. Both are independent — you can have one without the
        other, but Agency tier gets you a volume rebate on the commission
        split.
      </div>
    </div>
  )
}

function PlanCard({
  plan,
  cycle,
  isCurrent,
  onChoose,
  submitting,
}: {
  plan: Plan
  cycle: Cycle
  isCurrent: boolean
  onChoose: () => void
  submitting: boolean
}) {
  const price = cycle === "annual" && plan.annual_cents ? plan.annual_cents : plan.monthly_cents
  const perMonth = cycle === "annual" && plan.annual_cents
    ? Math.round(plan.annual_cents / 12)
    : plan.monthly_cents
  const isHighlighted = plan.tier === "team" && !isCurrent
  const seatsLabel = plan.included_seats >= 999 ? "Unlimited" : `${plan.included_seats}`

  return (
    <Card
      className={cn(
        "relative flex h-full flex-col",
        isHighlighted && "border-primary shadow-md",
        isCurrent && "border-primary/40 bg-primary/5"
      )}
    >
      {isHighlighted && (
        <span className="absolute -top-2 left-4 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
          Most popular
        </span>
      )}
      <CardContent className="flex flex-1 flex-col p-6">
        <div className="text-lg font-semibold">{plan.name}</div>
        <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
          {plan.tier} · {seatsLabel} seat{plan.included_seats === 1 ? "" : "s"}
        </div>

        <div className="mt-4 flex items-baseline gap-1">
          <span className="text-3xl font-bold tabular-nums">
            ${Math.round(perMonth / 100).toLocaleString()}
          </span>
          <span className="text-sm text-muted-foreground">/mo</span>
        </div>
        {cycle === "annual" && plan.annual_cents && (
          <div className="text-xs text-muted-foreground">
            Billed annually at ${Math.round(price / 100).toLocaleString()}
          </div>
        )}
        {plan.placement_cap_per_year !== null && (
          <div className="mt-1 text-xs text-muted-foreground">
            Up to {plan.placement_cap_per_year.toLocaleString()} placements/yr
          </div>
        )}

        <ul className="mt-5 flex-1 space-y-2 text-sm">
          {plan.features.map((key) => (
            <li key={key} className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{FEATURE_LABELS[key] ?? key}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6">
          {isCurrent ? (
            <Button disabled className="w-full" variant="outline">
              <CheckCircle2 className="h-4 w-4" />
              Current plan
            </Button>
          ) : (
            <Button onClick={onChoose} disabled={submitting} className="w-full">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Choose {plan.name.split("·")[1]?.trim() ?? plan.name}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function StatusPill({ status }: { status: string }) {
  const isGood = ["active", "trialing"].includes(status)
  const isBad = ["canceled", "past_due", "unpaid", "incomplete"].includes(status)
  const Icon = isBad ? XCircle : isGood ? ShieldCheck : CreditCard
  return (
    <span
      className={cn(
        "ml-1 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-medium",
        isBad
          ? "bg-destructive/10 text-destructive"
          : isGood
          ? "bg-primary/10 text-primary"
          : "bg-muted text-muted-foreground"
      )}
    >
      <Icon className="h-3 w-3" />
      {status}
    </span>
  )
}
