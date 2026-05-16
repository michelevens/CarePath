import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  FileText,
  Heart,
  Loader2,
  Shield,
  Sparkles,
  Users,
} from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type Cycle = "monthly" | "annual"

interface Plan {
  slug: string
  name: string
  tier: string
  monthly_cents: number
  annual_cents: number | null
  features: string[]
}

interface Props {
  open: boolean
  onClose: () => void
  /**
   * The friction event that triggered the modal — drives the headline
   * and which feature gets visually emphasized.
   */
  trigger?:
    | "saved-facilities"
    | "saved-searches"
    | "cost-projection"
    | "compare"
    | "guides"
    | "generic"
}

const TRIGGER_HEADLINES: Record<string, { headline: string; sub: string; emphasizeFeature?: string }> = {
  "saved-facilities": {
    headline: "Share your shortlist with the whole family",
    sub: "Pro lets you invite family members to your saved list, export it as a PDF, and get alerts when prices or availability change.",
    emphasizeFeature: "multi_member_sharing",
  },
  "saved-searches": {
    headline: "Get email alerts when new matches appear",
    sub: "Pro turns your saved searches into ongoing matchmaking — we email you when a new facility matches your criteria, before they show up at the top.",
    emphasizeFeature: "comparison_reports_pdf",
  },
  "cost-projection": {
    headline: "Save and share this cost projection",
    sub: "Pro generates a branded PDF of any cost projection you build — for family meetings, elder-law attorneys, or financial planners.",
    emphasizeFeature: "custom_cost_projection_report",
  },
  "compare": {
    headline: "Export this comparison as a PDF",
    sub: "Pro turns your side-by-side comparison into a clean, printable PDF — the version you take to family meetings or send to siblings.",
    emphasizeFeature: "comparison_reports_pdf",
  },
  "guides": {
    headline: "Unlock the full guide library + personalized reports",
    sub: "Pro gives you the full library plus a personal document vault to keep your loved one's records in one place.",
    emphasizeFeature: "document_vault",
  },
  "generic": {
    headline: "CarePath Pro — for families navigating this together",
    sub: "Everything you get free, plus document vault, PDF exports, multi-family sharing, and premium support.",
  },
}

const FEATURE_DETAILS: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string; description: string }> = {
  document_vault: {
    icon: FileText,
    label: "Document vault",
    description: "POA, medical records, insurance, contracts — all in one secure place.",
  },
  custom_cost_projection_report: {
    icon: FileText,
    label: "PDF cost projections",
    description: "Branded, shareable, with year-by-year breakdown.",
  },
  comparison_reports_pdf: {
    icon: FileText,
    label: "Facility comparison PDFs",
    description: "Export side-by-side comparisons for family meetings.",
  },
  multi_member_sharing: {
    icon: Users,
    label: "Multi-family sharing",
    description: "Invite siblings, POA, advisors to your saved list (up to 5 seats).",
  },
  premium_support: {
    icon: Heart,
    label: "Premium support",
    description: "Email response in under 4h. Real humans, not a chat bot.",
  },
  saved_search: {
    icon: Bell,
    label: "Email alerts on saved searches",
    description: "We email when a new facility matches your criteria.",
  },
}

export function FamilyProModal({ open, onClose, trigger = "generic" }: Props) {
  const navigate = useNavigate()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [cycle, setCycle] = useState<Cycle>("annual")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let alive = true
    setLoading(true)
    api
      .get<{ data: Plan[] }>("/family/billing/plans")
      .then((r) => alive && setPlans(Array.isArray(r.data?.data) ? r.data.data : []))
      .catch(() => alive && setPlans([]))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [open])

  const proPlan = plans.find((p) => p.tier === "pro")
  const headline = TRIGGER_HEADLINES[trigger] ?? TRIGGER_HEADLINES.generic

  const onSubscribe = async () => {
    if (!proPlan) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await api.post<{ checkout_url?: string }>("/family/billing/checkout", {
        plan_slug: proPlan.slug,
        billing_cycle: cycle,
      })
      if (res.data.checkout_url) {
        window.location.href = res.data.checkout_url
        return
      }
    } catch (e) {
      const err = e as { response?: { status?: number; data?: { message?: string } } }
      if (err.response?.status === 401) {
        // Not signed in — send them to signup with intent, then back here.
        onClose()
        navigate(`/signup?intent=family-pro&cycle=${cycle}`)
        return
      }
      setError(err.response?.data?.message ?? "Subscription failed")
    } finally {
      setSubmitting(false)
    }
  }

  // Build the feature list — emphasized feature pinned first.
  const featureKeys = proPlan?.features.filter((f) => FEATURE_DETAILS[f]) ?? []
  const emphasized = headline.emphasizeFeature
  const orderedFeatures = emphasized && featureKeys.includes(emphasized)
    ? [emphasized, ...featureKeys.filter((f) => f !== emphasized)]
    : featureKeys

  const priceMonthly = proPlan?.monthly_cents ?? 2900
  const priceAnnual = proPlan?.annual_cents ?? 29000
  const annualPerMonth = Math.round(priceAnnual / 12)
  const annualSavings = priceMonthly * 12 - priceAnnual
  const annualSavingsPct = Math.round((annualSavings / (priceMonthly * 12)) * 100)

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="inline-flex items-center gap-1.5 rounded-full border bg-accent/60 px-3 py-1 text-xs font-medium text-accent-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            CarePath Pro
          </div>
          <DialogTitle className="mt-3 text-2xl">{headline.headline}</DialogTitle>
          <DialogDescription className="mt-2 text-base">
            {headline.sub}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading plan…
          </div>
        ) : (
          <>
            {/* Feature list */}
            <ul className="mt-2 grid gap-2.5 sm:grid-cols-2">
              {orderedFeatures.map((key) => {
                const f = FEATURE_DETAILS[key]
                const isEmphasized = key === emphasized
                return (
                  <li
                    key={key}
                    className={cn(
                      "flex items-start gap-2.5 rounded-lg border p-3 text-sm",
                      isEmphasized && "border-primary/40 bg-primary/5"
                    )}
                  >
                    <f.icon className={cn("mt-0.5 h-4 w-4 shrink-0", isEmphasized ? "text-primary" : "text-muted-foreground")} />
                    <div>
                      <div className="font-medium">{f.label}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{f.description}</div>
                    </div>
                  </li>
                )
              })}
            </ul>

            {/* Cycle toggle + price */}
            <div className="mt-5 rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">CarePath Pro · per household</div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-3xl font-bold tabular-nums">
                      ${Math.round((cycle === "annual" ? annualPerMonth : priceMonthly) / 100)}
                    </span>
                    <span className="text-sm text-muted-foreground">/mo</span>
                  </div>
                  {cycle === "annual" && annualSavings > 0 && (
                    <div className="mt-1 text-xs text-primary">
                      Billed annually · save {annualSavingsPct}% vs monthly
                    </div>
                  )}
                </div>
                <div className="inline-flex rounded-md border bg-card p-0.5 text-xs">
                  <button
                    onClick={() => setCycle("monthly")}
                    className={cn(
                      "rounded px-3 py-1.5 transition-colors",
                      cycle === "monthly" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                    )}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setCycle("annual")}
                    className={cn(
                      "rounded px-3 py-1.5 transition-colors",
                      cycle === "annual" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                    )}
                  >
                    Annual
                  </button>
                </div>
              </div>
            </div>

            <p className="mt-3 inline-flex items-start gap-2 text-xs text-muted-foreground">
              <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Cancel anytime. No phone calls. Your data is never shared with
              facilities or advisor networks.
            </p>

            {error && (
              <div className="mt-3 inline-flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {error}
              </div>
            )}

            <DialogFooter className="mt-4">
              <Button variant="ghost" onClick={onClose}>
                Maybe later
              </Button>
              <Button onClick={onSubscribe} disabled={submitting} size="lg">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                <CheckCircle2 className="h-4 w-4" />
                Get CarePath Pro
              </Button>
            </DialogFooter>

            <p className="mt-3 text-center text-xs text-muted-foreground">
              Not ready? Free search, save, compare, tour, and guide download
              are always free.{" "}
              <Link to="/why-carepath" className="underline hover:text-foreground" onClick={onClose}>
                See what's free vs Pro
              </Link>
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
