import { useMemo, useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Info,
  Loader2,
  Sparkles,
  XCircle,
} from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

type Applicant = "veteran" | "veteran_spouse" | "two_vets" | "surviving_spouse"
type WartimeService = "wwii" | "korea" | "vietnam" | "gulf" | "none"
type Discharge = "honorable" | "general" | "other" | "dishonorable"
type ServiceLength = "90_active" | "24_post911" | "less"
type CareNeed = "adl_help" | "housebound" | "facility" | "none"
type NetWorth = "under_50k" | "50k_159k" | "over_159k"

interface FormState {
  applicant: Applicant | ""
  wartime: WartimeService | ""
  discharge: Discharge | ""
  serviceLength: ServiceLength | ""
  careNeed: CareNeed | ""
  netWorth: NetWorth | ""
}

const APPLICANT_LABELS: Record<Applicant, string> = {
  veteran: "Single veteran",
  veteran_spouse: "Veteran with a living spouse",
  two_vets: "Married, both spouses are veterans",
  surviving_spouse: "Surviving spouse of a veteran",
}

const WARTIME_LABELS: Record<WartimeService, string> = {
  wwii: "World War II (1941–1946)",
  korea: "Korean War (1950–1955)",
  vietnam: "Vietnam War (1961/1964–1975)",
  gulf: "Gulf War era (1990–present)",
  none: "None — all peacetime service",
}

const DISCHARGE_LABELS: Record<Discharge, string> = {
  honorable: "Honorable",
  general: "General (under honorable conditions)",
  other: "Other than honorable",
  dishonorable: "Dishonorable / Bad conduct",
}

const SERVICE_LENGTH_LABELS: Record<ServiceLength, string> = {
  "90_active": "At least 90 days active duty (1 during wartime)",
  "24_post911": "24 continuous months (post-9/11 service)",
  less: "Less than 90 days active duty",
}

const CARE_NEED_LABELS: Record<CareNeed, string> = {
  adl_help: "Needs help with 2+ daily-living tasks (bathing, dressing, eating, etc.)",
  housebound: "Permanently housebound due to disability",
  facility: "Lives in a nursing facility or assisted living",
  none: "Doesn't currently need daily care assistance",
}

const NET_WORTH_LABELS: Record<NetWorth, string> = {
  under_50k: "Under $50,000",
  "50k_159k": "$50,000 – $159,240 (the 2026 VA cap)",
  over_159k: "Over $159,240",
}

const MAX_BENEFITS_2026: Record<Applicant, number> = {
  veteran: 2358,
  veteran_spouse: 2795,
  two_vets: 3740,
  surviving_spouse: 1515,
}

type Verdict = "likely" | "service_short" | "no_wartime" | "discharge_issue" | "no_care_need" | "over_net_worth" | "consult"

function evaluate(form: FormState): { verdict: Verdict; reasons: string[]; estimated?: number } {
  if (!form.applicant || !form.wartime || !form.discharge || !form.serviceLength || !form.careNeed || !form.netWorth) {
    return { verdict: "consult", reasons: ["More information needed."] }
  }

  const reasons: string[] = []
  const estimated = MAX_BENEFITS_2026[form.applicant as Applicant]

  // Disqualifiers
  if (form.discharge === "dishonorable") {
    reasons.push("A dishonorable discharge disqualifies the veteran from VA pension benefits, including Aid & Attendance.")
    return { verdict: "discharge_issue", reasons }
  }
  if (form.discharge === "other") {
    reasons.push("An 'other than honorable' discharge may disqualify — but a discharge upgrade through the VA is possible. Consult a VSO.")
    return { verdict: "discharge_issue", reasons }
  }

  if (form.wartime === "none") {
    reasons.push("Aid & Attendance pension requires at least one day of active duty during a recognized wartime period. Peacetime-only service doesn't qualify.")
    return { verdict: "no_wartime", reasons }
  }

  if (form.serviceLength === "less") {
    reasons.push("VA pension requires at least 90 days of active duty with at least 1 day during a wartime period (or 24 continuous months for post-9/11 service).")
    return { verdict: "service_short", reasons }
  }

  if (form.careNeed === "none") {
    reasons.push("Aid & Attendance specifically requires a documented need for assistance — help with 2+ ADLs, being housebound, or residing in a care facility.")
    return { verdict: "no_care_need", reasons }
  }

  if (form.netWorth === "over_159k") {
    reasons.push("The 2026 net worth limit is $159,240 (combined assets + annual income). Above this, you don't qualify — but a primary residence is excluded, and unreimbursed medical expenses reduce countable income.")
    return { verdict: "over_net_worth", reasons }
  }

  // Likely eligible
  reasons.push(
    `Based on your answers, you appear to meet the four core eligibility tests: wartime service, qualifying discharge, ${form.serviceLength === "24_post911" ? "24 months post-9/11" : "90+ days active with wartime overlap"}, and a documented care need.`
  )
  reasons.push(
    `Your estimated maximum monthly benefit (${APPLICANT_LABELS[form.applicant as Applicant].toLowerCase()}): up to $${estimated.toLocaleString()}/month in 2026.`
  )
  reasons.push(
    "Actual benefit depends on your income minus unreimbursed medical expenses (UMEs) — including facility costs, home care, prescriptions, and insurance premiums. Many applicants with high care costs receive the maximum."
  )

  return { verdict: "likely", reasons, estimated }
}

const VERDICT_META: Record<Verdict, { title: string; icon: typeof CheckCircle2; tone: "pos" | "neutral" | "warn" }> = {
  likely: { title: "Likely eligible", icon: CheckCircle2, tone: "pos" },
  service_short: { title: "Service requirement not met", icon: AlertTriangle, tone: "warn" },
  no_wartime: { title: "No wartime service", icon: AlertTriangle, tone: "warn" },
  discharge_issue: { title: "Discharge status issue", icon: AlertTriangle, tone: "warn" },
  no_care_need: { title: "Care need not documented yet", icon: Info, tone: "neutral" },
  over_net_worth: { title: "Over the net-worth limit", icon: AlertTriangle, tone: "warn" },
  consult: { title: "Talk to a VSO", icon: Info, tone: "neutral" },
}

export function VaEligibilityPage() {
  const [form, setForm] = useState<FormState>({
    applicant: "",
    wartime: "",
    discharge: "",
    serviceLength: "",
    careNeed: "",
    netWorth: "",
  })
  const [step, setStep] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [email, setEmail] = useState("")
  const [zip, setZip] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const result = useMemo(() => evaluate(form), [form])

  const steps: Array<{ key: keyof FormState; title: string; subtitle?: string }> = [
    { key: "applicant", title: "Who is applying?" },
    { key: "wartime", title: "Did the veteran serve at least one day during a wartime period?", subtitle: "Service doesn't have to be in combat — just one active-duty day during the window counts." },
    { key: "discharge", title: "What was the discharge status?" },
    { key: "serviceLength", title: "How long was the active duty?" },
    { key: "careNeed", title: "Does the applicant need daily care assistance?" },
    { key: "netWorth", title: "Approximate net worth (assets + annual income, not counting home)?" },
  ]

  const current = steps[step]
  const isLast = step === steps.length - 1

  const choose = (value: string) => {
    setForm((f) => ({ ...f, [current.key]: value }))
    if (isLast) setShowResult(true)
    else setStep(step + 1)
  }

  const back = () => {
    if (showResult) {
      setShowResult(false)
      return
    }
    if (step > 0) setStep(step - 1)
  }

  const restart = () => {
    setForm({ applicant: "", wartime: "", discharge: "", serviceLength: "", careNeed: "", netWorth: "" })
    setStep(0)
    setShowResult(false)
    setSubmitted(false)
    setEmail("")
    setZip("")
  }

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post("/marketplace/leads", {
        source: "saved_search",
        email,
        zip: zip || undefined,
        context: {
          tool: "va_eligibility",
          verdict: result.verdict,
          estimated_monthly: result.estimated,
          applicant: form.applicant,
          wartime: form.wartime,
          discharge: form.discharge,
          service_length: form.serviceLength,
          care_need: form.careNeed,
          net_worth_band: form.netWorth,
        },
      })
      setSubmitted(true)
    } catch {
      setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            CarePath
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link to="/tools">
              <ArrowLeft className="h-4 w-4" />
              All tools
            </Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-12">
        {!showResult ? (
          <>
            <div className="flex flex-col items-center text-center">
              <div className="inline-flex items-center gap-2 rounded-full border bg-accent/60 px-3 py-1 text-xs font-medium text-accent-foreground">
                <Sparkles className="h-3.5 w-3.5" />
                VA Aid & Attendance · {step + 1} of {steps.length}
              </div>
              <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
                Does your veteran qualify for up to $3,740/month?
              </h1>
              <p className="mt-3 max-w-2xl text-muted-foreground">
                A&A is the most under-claimed veteran benefit in the country.
                6-question check. Educational — not an official VA filing.
              </p>
            </div>

            <div className="mt-8 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${((step + 1) / steps.length) * 100}%` }}
              />
            </div>

            <Card className="mt-6">
              <CardContent className="space-y-3 p-6">
                <h2 className="text-lg font-semibold">{current.title}</h2>
                {current.subtitle && (
                  <p className="text-sm text-muted-foreground">{current.subtitle}</p>
                )}
                <StepOptions stepKey={current.key} value={form[current.key]} onChoose={choose} />
              </CardContent>
            </Card>

            <div className="mt-4 flex items-center justify-between">
              <Button variant="ghost" size="sm" disabled={step === 0} onClick={back}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <span className="text-xs text-muted-foreground">
                Step {step + 1} / {steps.length}
              </span>
            </div>
          </>
        ) : (
          <ResultView
            result={result}
            submitted={submitted}
            submitting={submitting}
            email={email}
            setEmail={setEmail}
            zip={zip}
            setZip={setZip}
            onSubmit={save}
            onRestart={restart}
            onBack={back}
          />
        )}
      </section>
    </div>
  )
}

function StepOptions({
  stepKey,
  value,
  onChoose,
}: {
  stepKey: keyof FormState
  value: string
  onChoose: (v: string) => void
}) {
  const labels: Record<string, string> =
    stepKey === "applicant"
      ? APPLICANT_LABELS
      : stepKey === "wartime"
      ? WARTIME_LABELS
      : stepKey === "discharge"
      ? DISCHARGE_LABELS
      : stepKey === "serviceLength"
      ? SERVICE_LENGTH_LABELS
      : stepKey === "careNeed"
      ? CARE_NEED_LABELS
      : NET_WORTH_LABELS

  return (
    <div className="grid gap-2">
      {Object.entries(labels).map(([k, label]) => (
        <button
          key={k}
          onClick={() => onChoose(k)}
          className={cn(
            "rounded-lg border px-4 py-3 text-left text-sm transition-colors hover:border-primary hover:bg-accent/50",
            value === k && "border-primary bg-accent"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function ResultView({
  result,
  submitted,
  submitting,
  email,
  setEmail,
  zip,
  setZip,
  onSubmit,
  onRestart,
  onBack,
}: {
  result: ReturnType<typeof evaluate>
  submitted: boolean
  submitting: boolean
  email: string
  setEmail: (v: string) => void
  zip: string
  setZip: (v: string) => void
  onSubmit: (e: FormEvent) => void
  onRestart: () => void
  onBack: () => void
}) {
  const meta = VERDICT_META[result.verdict]
  const Icon = meta.icon
  const toneClass = {
    pos: "bg-emerald-50 text-emerald-700 border-emerald-200",
    neutral: "bg-violet-50 text-violet-700 border-violet-200",
    warn: "bg-amber-50 text-amber-700 border-amber-200",
  }[meta.tone]

  return (
    <div>
      <div className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full border bg-accent/60 px-3 py-1 text-xs font-medium text-accent-foreground">
          <Sparkles className="h-3.5 w-3.5" />
          Your A&A eligibility result
        </div>
        <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
          {meta.title}
        </h1>
        {result.estimated && result.verdict === "likely" && (
          <div className="mt-4 inline-flex items-baseline gap-2 rounded-lg border bg-card px-4 py-2">
            <span className="text-3xl font-semibold tabular-nums">
              ${result.estimated.toLocaleString()}
            </span>
            <span className="text-sm text-muted-foreground">/month maximum</span>
          </div>
        )}
      </div>

      <Card className={cn("mt-6 border", toneClass)}>
        <CardContent className="flex items-start gap-3 p-5">
          <Icon className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="text-sm">
            <div className="font-semibold">Why we say {meta.title.toLowerCase()}</div>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {result.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent className="p-5 text-sm">
          <div className="font-semibold">How to actually file</div>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-muted-foreground">
            <li>
              Find a <span className="font-medium text-foreground">VA-accredited Veteran Service Officer (VSO)</span> in your state — it's free and they file for you. Avoid paid "VA pension consultants" who charge upfront.
            </li>
            <li>
              Get VA Form 21P-527EZ (Pension) and 21-2680 (Examination for Aid & Attendance) signed by the primary care doctor.
            </li>
            <li>
              Document all unreimbursed medical expenses — facility cost, prescriptions, supplements, hearing aids, transportation. These reduce countable income dollar-for-dollar.
            </li>
            <li>
              File through VA.gov or the VSO. Awards are retroactive to the month of filing — so don't delay.
            </li>
          </ol>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent className="p-5 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              <span className="font-semibold text-foreground">Educational, not an official determination.</span>{" "}
              VA rules are complex and individual cases vary. Use this as a starting point — the VA or a VSO makes the actual decision.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg" className="flex-1">
          <Link to="/search">
            Find facilities that accept VA benefits
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button variant="outline" size="lg" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Change answers
        </Button>
        <Button variant="ghost" size="lg" onClick={onRestart}>
          Start over
        </Button>
      </div>

      <Card className="mt-8 bg-accent/40">
        <CardContent className="p-6">
          {submitted ? (
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-foreground" />
              <div>
                <div className="font-semibold">Saved.</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  We'll send the A&A filing checklist plus a VSO finder for
                  your area. No spam calls — promise.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit}>
              <div className="text-sm font-semibold">Get the A&A filing kit</div>
              <p className="mt-1 text-sm text-muted-foreground">
                We'll email you the forms list, a VSO finder, the UME
                worksheet, and 3–5 facility matches that accept VA benefits.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_120px_auto]">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="rounded-md border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-ring"
                />
                <input
                  type="text"
                  value={zip}
                  onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
                  placeholder="ZIP"
                  maxLength={5}
                  className="rounded-md border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-ring"
                />
                <Button type="submit" disabled={submitting || !email}>
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Send kit
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
