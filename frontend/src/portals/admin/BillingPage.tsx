import { useEffect, useState } from "react"
import {
  CheckCircle2,
  CreditCard,
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
  facility: {
    id: string
    name: string
    subscription_tier: string
    subscription_status: string
  }
  subscription: Subscription
}

// Feature-key → human label. Add new keys as plans grow.
const FEATURE_LABELS: Record<string, string> = {
  claim_listing: "Claim listing",
  respond_to_inquiries: "Respond to family inquiries",
  cms_data_visible: "Live CMS data on listing",
  bed_board_sync: "Real-time bed-board sync",
  admissions_kanban: "Admissions kanban pipeline",
  tour_calendar: "Tour calendar + scheduling",
  mds_tools: "MDS 3.0 assessment tools",
  brochure_customization: "Branded brochure customization",
  lead_routing: "Lead routing rules",
  basic_analytics: "Basic facility analytics",
  facility_data_editor: "Edit facility profile & photos",
  multi_facility_dashboard: "Multi-facility network dashboard",
  saml_sso: "SAML / SSO single sign-on",
  white_label_family_portal: "White-labeled family portal",
  api_access: "Full REST API access",
  dedicated_csm: "Dedicated customer success manager",
  custom_billing: "Custom invoicing / Net-30 terms",
}

export function BillingPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [sub, setSub] = useState<SubResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cycle, setCycle] = useState<Cycle>("monthly")
  const [submittingSlug, setSubmittingSlug] = useState<string | null>(null)
  const [canceling, setCanceling] = useState(false)
  const [info, setInfo] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [p, s] = await Promise.all([
        api.get<{ data: Plan[] }>("/facility/billing/plans"),
        api.get<{ data: SubResponse }>("/facility/billing/subscription"),
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
    setInfo(null)
    setError(null)
    setSubmittingSlug(plan.slug)
    try {
      const res = await api.post<{ checkout_url?: string; ok?: boolean; message?: string }>(
        "/facility/billing/checkout",
        { plan_slug: plan.slug, billing_cycle: cycle }
      )
      if (res.data.checkout_url) {
        // Stripe Checkout (or stub URL in dev).
        window.location.href = res.data.checkout_url
        return
      }
      setInfo(res.data.message ?? "Plan updated.")
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
    if (!confirm("Cancel at the end of the current billing period? You'll keep Pro features until then.")) return
    setCanceling(true)
    setError(null)
    setInfo(null)
    try {
      const res = await api.post<{ cancels_at?: string }>("/facility/billing/cancel", {})
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
        Loading billing…
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
        <h1 className="text-2xl font-semibold tracking-tight">Billing &amp; plan</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {sub?.facility.name} is currently on the{" "}
          <span className="font-medium text-foreground">
            {sub?.subscription.plan?.name ?? "Free"}
          </span>{" "}
          plan.
        </p>
      </div>

      {/* Current subscription card */}
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
                  {sub.subscription.canceled_at && (
                    <> · Cancels {new Date(sub.subscription.current_period_ends_at ?? "").toLocaleDateString()}</>
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
        <strong className="text-foreground">Billing is handled by Stripe.</strong> Card data
        never touches our servers. Cancel anytime — you keep paid features through
        the end of your current period. Questions about custom Enterprise pricing
        or invoicing on Net-30? Talk to your CSM or email billing@carepath.io.
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
  const isFree = plan.tier === "free"
  const price = cycle === "annual" && plan.annual_cents
    ? plan.annual_cents
    : plan.monthly_cents
  const perMonth = cycle === "annual" && plan.annual_cents
    ? Math.round(plan.annual_cents / 12)
    : plan.monthly_cents
  const isHighlighted = plan.tier === "pro" && !isCurrent

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
          {plan.tier} · per facility
        </div>

        <div className="mt-4 flex items-baseline gap-1">
          {isFree ? (
            <span className="text-3xl font-bold">Free</span>
          ) : (
            <>
              <span className="text-3xl font-bold tabular-nums">
                ${Math.round(perMonth / 100).toLocaleString()}
              </span>
              <span className="text-sm text-muted-foreground">/mo</span>
            </>
          )}
        </div>
        {!isFree && cycle === "annual" && plan.annual_cents && (
          <div className="text-xs text-muted-foreground">
            Billed annually at ${Math.round(price / 100).toLocaleString()}
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
              {isFree ? "Downgrade to Free" : `Choose ${plan.name.split("·")[1]?.trim() ?? plan.name}`}
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
