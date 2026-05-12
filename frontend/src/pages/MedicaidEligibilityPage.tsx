import { useMemo, useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Info,
  Loader2,
  ShieldCheck,
  XCircle,
} from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

type AssetBand = "under_2k" | "2k_30k" | "30k_150k" | "over_150k"
type IncomeBand = "under_900" | "900_1800" | "1800_2829" | "over_2829"
type Marital = "single" | "married_spouse_at_home" | "married_both_in_facility"
type Setting = "nursing_home" | "hcbs_waiver" | "assisted_living"

interface StateRules {
  code: string
  name: string
  /** Income-cap state: hard income limit, must use Miller/QIT trust if over */
  incomeCap: boolean
  /** Has a medically-needy program (spend-down) */
  mediallyNeedy: boolean
  /** Standard 2026 asset limit for a single applicant */
  singleAssetLimit: number
  /** Notes specific to this state */
  notes: string[]
}

const STATE_RULES: StateRules[] = [
  { code: "AL", name: "Alabama", incomeCap: true, mediallyNeedy: false, singleAssetLimit: 2000, notes: ["Income-cap state — over $2,829/mo single requires a Qualified Income Trust (Miller Trust)."] },
  { code: "AK", name: "Alaska", incomeCap: true, mediallyNeedy: false, singleAssetLimit: 2000, notes: ["Income-cap state — over $2,829/mo requires a Miller Trust."] },
  { code: "AZ", name: "Arizona (ALTCS)", incomeCap: true, mediallyNeedy: false, singleAssetLimit: 2000, notes: ["Arizona Long Term Care System (ALTCS) covers nursing facility + HCBS.", "Income-cap state — Miller Trust required if over the limit."] },
  { code: "AR", name: "Arkansas", incomeCap: true, mediallyNeedy: false, singleAssetLimit: 2000, notes: ["Income-cap state."] },
  { code: "CA", name: "California (Medi-Cal)", incomeCap: false, mediallyNeedy: true, singleAssetLimit: 0, notes: ["Medi-Cal eliminated the asset test in 2024 — there is effectively no asset limit for LTC.", "Income above the maintenance need rolls over as share-of-cost."] },
  { code: "CO", name: "Colorado", incomeCap: false, mediallyNeedy: false, singleAssetLimit: 2000, notes: ["Functional spend-down: income over the limit is applied to facility cost."] },
  { code: "CT", name: "Connecticut", incomeCap: false, mediallyNeedy: true, singleAssetLimit: 1600, notes: ["Lower asset limit ($1,600).", "Medically-needy state — spend-down available."] },
  { code: "DE", name: "Delaware", incomeCap: true, mediallyNeedy: false, singleAssetLimit: 2000, notes: ["Income-cap state."] },
  { code: "FL", name: "Florida", incomeCap: true, mediallyNeedy: false, singleAssetLimit: 2000, notes: ["Income-cap state — Qualified Income Trust required if income exceeds limit.", "Florida is strict on the 5-year look-back. Plan transfers carefully."] },
  { code: "GA", name: "Georgia", incomeCap: true, mediallyNeedy: false, singleAssetLimit: 2000, notes: ["Income-cap state — Miller Trust required if over."] },
  { code: "HI", name: "Hawaii", incomeCap: false, mediallyNeedy: true, singleAssetLimit: 2000, notes: ["Medically-needy state — spend-down available."] },
  { code: "ID", name: "Idaho", incomeCap: true, mediallyNeedy: false, singleAssetLimit: 2000, notes: ["Income-cap state."] },
  { code: "IL", name: "Illinois", incomeCap: false, mediallyNeedy: true, singleAssetLimit: 17500, notes: ["Higher asset limit ($17,500).", "Medically-needy spend-down available."] },
  { code: "IN", name: "Indiana", incomeCap: false, mediallyNeedy: false, singleAssetLimit: 2000, notes: ["Functional spend-down through medical expenses."] },
  { code: "IA", name: "Iowa", incomeCap: true, mediallyNeedy: false, singleAssetLimit: 2000, notes: ["Income-cap state."] },
  { code: "LA", name: "Louisiana", incomeCap: true, mediallyNeedy: false, singleAssetLimit: 2000, notes: ["Income-cap state."] },
  { code: "MA", name: "Massachusetts (MassHealth)", incomeCap: false, mediallyNeedy: true, singleAssetLimit: 2000, notes: ["Medically-needy state — spend-down available."] },
  { code: "MD", name: "Maryland", incomeCap: false, mediallyNeedy: true, singleAssetLimit: 2500, notes: ["Medically-needy state."] },
  { code: "MI", name: "Michigan", incomeCap: false, mediallyNeedy: true, singleAssetLimit: 2000, notes: ["Medically-needy state."] },
  { code: "MN", name: "Minnesota", incomeCap: false, mediallyNeedy: true, singleAssetLimit: 3000, notes: ["Higher asset limit ($3,000).", "Medically-needy spend-down available."] },
  { code: "MS", name: "Mississippi", incomeCap: true, mediallyNeedy: false, singleAssetLimit: 4000, notes: ["Income-cap state with higher asset limit ($4,000)."] },
  { code: "MO", name: "Missouri", incomeCap: false, mediallyNeedy: false, singleAssetLimit: 5726, notes: ["Higher asset limit (~$5,700)."] },
  { code: "NV", name: "Nevada", incomeCap: true, mediallyNeedy: false, singleAssetLimit: 2000, notes: ["Income-cap state."] },
  { code: "NH", name: "New Hampshire", incomeCap: false, mediallyNeedy: true, singleAssetLimit: 2500, notes: ["Medically-needy state."] },
  { code: "NJ", name: "New Jersey", incomeCap: true, mediallyNeedy: false, singleAssetLimit: 2000, notes: ["Income-cap with QIT requirement."] },
  { code: "NM", name: "New Mexico", incomeCap: true, mediallyNeedy: false, singleAssetLimit: 2000, notes: ["Income-cap state."] },
  { code: "NY", name: "New York", incomeCap: false, mediallyNeedy: true, singleAssetLimit: 31175, notes: ["New York has the highest asset limit in the country ($31,175 for 2025).", "Medically-needy spend-down available.", "Generous community spouse protections."] },
  { code: "NC", name: "North Carolina", incomeCap: false, mediallyNeedy: true, singleAssetLimit: 2000, notes: ["Medically-needy state."] },
  { code: "OH", name: "Ohio", incomeCap: true, mediallyNeedy: false, singleAssetLimit: 2000, notes: ["Income-cap state — QIT required if over."] },
  { code: "OK", name: "Oklahoma", incomeCap: true, mediallyNeedy: false, singleAssetLimit: 2000, notes: ["Income-cap state."] },
  { code: "OR", name: "Oregon", incomeCap: true, mediallyNeedy: false, singleAssetLimit: 2000, notes: ["Income-cap state."] },
  { code: "PA", name: "Pennsylvania", incomeCap: false, mediallyNeedy: false, singleAssetLimit: 2400, notes: ["Functional spend-down through medical expenses."] },
  { code: "RI", name: "Rhode Island", incomeCap: false, mediallyNeedy: true, singleAssetLimit: 4000, notes: ["Medically-needy state, higher asset limit."] },
  { code: "SC", name: "South Carolina", incomeCap: true, mediallyNeedy: false, singleAssetLimit: 2000, notes: ["Income-cap state."] },
  { code: "SD", name: "South Dakota", incomeCap: true, mediallyNeedy: false, singleAssetLimit: 2000, notes: ["Income-cap state."] },
  { code: "TN", name: "Tennessee (TennCare CHOICES)", incomeCap: true, mediallyNeedy: false, singleAssetLimit: 2000, notes: ["TennCare CHOICES program. Income-cap with QIT requirement."] },
  { code: "TX", name: "Texas", incomeCap: true, mediallyNeedy: false, singleAssetLimit: 2000, notes: ["Income-cap state — Qualified Income Trust required.", "5-year look-back is strictly enforced."] },
  { code: "UT", name: "Utah", incomeCap: false, mediallyNeedy: true, singleAssetLimit: 2000, notes: ["Medically-needy state."] },
  { code: "VA", name: "Virginia", incomeCap: false, mediallyNeedy: true, singleAssetLimit: 2000, notes: ["Medically-needy state."] },
  { code: "WA", name: "Washington", incomeCap: false, mediallyNeedy: true, singleAssetLimit: 2000, notes: ["Medically-needy state."] },
  { code: "WV", name: "West Virginia", incomeCap: true, mediallyNeedy: false, singleAssetLimit: 2000, notes: ["Income-cap state."] },
  { code: "WI", name: "Wisconsin", incomeCap: false, mediallyNeedy: true, singleAssetLimit: 2000, notes: ["Medically-needy state."] },
  { code: "WY", name: "Wyoming", incomeCap: true, mediallyNeedy: false, singleAssetLimit: 2000, notes: ["Income-cap state."] },
]

const ASSET_LABELS: Record<AssetBand, string> = {
  under_2k: "Less than $2,000",
  "2k_30k": "$2,000 – $30,000",
  "30k_150k": "$30,000 – $150,000",
  over_150k: "More than $150,000",
}

const INCOME_LABELS: Record<IncomeBand, string> = {
  under_900: "Less than $900 / month",
  "900_1800": "$900 – $1,800 / month",
  "1800_2829": "$1,800 – $2,829 / month",
  over_2829: "More than $2,829 / month",
}

const SETTING_LABELS: Record<Setting, string> = {
  nursing_home: "Skilled nursing facility (long-term, not rehab)",
  hcbs_waiver: "At home with Medicaid waiver services (HCBS)",
  assisted_living: "Assisted living facility",
}

const MARITAL_LABELS: Record<Marital, string> = {
  single: "Single, widowed, or divorced",
  married_spouse_at_home: "Married — spouse will remain at home",
  married_both_in_facility: "Married — both spouses need facility care",
}

interface FormState {
  state: string
  setting: Setting | ""
  marital: Marital | ""
  assets: AssetBand | ""
  income: IncomeBand | ""
}

type Verdict = "likely" | "spend_down" | "qit_required" | "over_limit" | "consult"

function evaluate(form: FormState): { verdict: Verdict; reasons: string[]; rules?: StateRules } {
  const rules = STATE_RULES.find((s) => s.code === form.state)
  if (!rules || !form.setting || !form.marital || !form.assets || !form.income) {
    return { verdict: "consult", reasons: ["More information needed."] }
  }

  const reasons: string[] = []

  // Asset check
  const assetsOverLimit =
    form.assets === "over_150k" ||
    (form.assets === "30k_150k" && rules.singleAssetLimit < 30000 && form.marital === "single") ||
    (form.assets === "2k_30k" && rules.singleAssetLimit < 2000 && form.marital === "single")

  // California has no asset test — auto-pass on assets
  const assetsLikelyOk =
    rules.singleAssetLimit === 0 ||
    form.assets === "under_2k" ||
    (form.marital !== "single" && form.assets !== "over_150k") // community spouse allowance up to $157,920 in 2026

  if (assetsOverLimit && !assetsLikelyOk) {
    reasons.push(
      form.marital === "single"
        ? `Countable assets exceed the ~$${rules.singleAssetLimit.toLocaleString()} single-applicant limit in ${rules.name}.`
        : "Even with spousal protections, $150K+ in assets typically requires planning to qualify."
    )
  }

  // Income check
  const incomeOverCap = form.income === "over_2829"

  if (rules.incomeCap && incomeOverCap) {
    reasons.push(
      `${rules.name} is an income-cap state. Over $2,829/month requires a Qualified Income Trust (Miller Trust) — easy to set up but legally required.`
    )
    if (assetsLikelyOk && !assetsOverLimit) {
      return { verdict: "qit_required", reasons, rules }
    }
  } else if (!rules.incomeCap && incomeOverCap && !rules.mediallyNeedy) {
    reasons.push(
      `${rules.name} doesn't have a formal medically-needy program. Excess income is typically applied directly to facility cost (functional spend-down).`
    )
  } else if (!rules.incomeCap && incomeOverCap && rules.mediallyNeedy) {
    reasons.push(
      `${rules.name} is a medically-needy state. Income above the limit can be spent down on medical expenses to qualify.`
    )
  }

  // Setting-specific
  if (form.setting === "assisted_living") {
    reasons.push(
      `Assisted living Medicaid coverage varies by state. Most states cover it through an HCBS waiver, but waitlists are common. ${rules.name}'s waiver may have a queue.`
    )
  }
  if (form.setting === "hcbs_waiver") {
    reasons.push(
      "HCBS waivers have functional eligibility requirements (typically need help with 2+ ADLs) on top of financial eligibility."
    )
  }

  // Final verdict
  if (assetsOverLimit && !assetsLikelyOk) {
    if (rules.mediallyNeedy || rules.singleAssetLimit > 0) {
      return { verdict: "spend_down", reasons, rules }
    }
    return { verdict: "over_limit", reasons, rules }
  }

  if (rules.incomeCap && incomeOverCap) {
    return { verdict: "qit_required", reasons, rules }
  }

  reasons.unshift(
    `Based on your inputs, you appear to be within the standard financial limits for ${rules.name} Medicaid long-term care coverage.`
  )
  return { verdict: "likely", reasons, rules }
}

const VERDICT_META: Record<Verdict, { title: string; icon: typeof CheckCircle2; tone: "pos" | "neutral" | "warn" | "neg" }> = {
  likely: { title: "Likely eligible", icon: CheckCircle2, tone: "pos" },
  spend_down: { title: "Eligible after spend-down", icon: Info, tone: "neutral" },
  qit_required: { title: "Eligible with a Miller Trust", icon: Info, tone: "neutral" },
  over_limit: { title: "Over the limit — planning required", icon: AlertTriangle, tone: "warn" },
  consult: { title: "Talk to an elder-law attorney", icon: AlertTriangle, tone: "neutral" },
}

export function MedicaidEligibilityPage() {
  const [form, setForm] = useState<FormState>({
    state: "",
    setting: "",
    marital: "",
    assets: "",
    income: "",
  })
  const [step, setStep] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [email, setEmail] = useState("")
  const [zip, setZip] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const result = useMemo(() => evaluate(form), [form])

  const steps: Array<{ key: keyof FormState; title: string }> = [
    { key: "state", title: "Which state will the applicant live in?" },
    { key: "setting", title: "What kind of care setting?" },
    { key: "marital", title: "Marital status?" },
    { key: "assets", title: "Approximate countable assets?" },
    { key: "income", title: "Monthly income?" },
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
    setForm({ state: "", setting: "", marital: "", assets: "", income: "" })
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
          tool: "medicaid_eligibility",
          verdict: result.verdict,
          state: form.state,
          setting: form.setting,
          marital: form.marital,
          assets_band: form.assets,
          income_band: form.income,
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
                <ShieldCheck className="h-3.5 w-3.5" />
                Medicaid eligibility · {step + 1} of {steps.length}
              </div>
              <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
                Will Medicaid pay for long-term care?
              </h1>
              <p className="mt-3 max-w-2xl text-muted-foreground">
                Quick 5-question check. State-aware. No email required to see
                the result. Educational — not legal advice.
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
            form={form}
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
  if (stepKey === "state") {
    return (
      <div className="grid max-h-[420px] grid-cols-2 gap-2 overflow-y-auto pr-1 md:grid-cols-3">
        {STATE_RULES.map((s) => (
          <button
            key={s.code}
            onClick={() => onChoose(s.code)}
            className={cn(
              "rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:border-primary hover:bg-accent/50",
              value === s.code && "border-primary bg-accent"
            )}
          >
            <span className="font-medium">{s.code}</span>{" "}
            <span className="text-muted-foreground">{s.name.split(" (")[0]}</span>
          </button>
        ))}
      </div>
    )
  }

  const labels: Record<string, string> =
    stepKey === "setting"
      ? SETTING_LABELS
      : stepKey === "marital"
      ? MARITAL_LABELS
      : stepKey === "assets"
      ? ASSET_LABELS
      : INCOME_LABELS

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
  form,
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
  form: FormState
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
    neg: "bg-rose-50 text-rose-700 border-rose-200",
  }[meta.tone]

  return (
    <div>
      <div className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full border bg-accent/60 px-3 py-1 text-xs font-medium text-accent-foreground">
          <ShieldCheck className="h-3.5 w-3.5" />
          Your eligibility result
        </div>
        <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
          {meta.title}
        </h1>
        {result.rules && (
          <p className="mt-3 text-sm text-muted-foreground">
            For {result.rules.name}, applying for{" "}
            {SETTING_LABELS[form.setting as Setting]?.toLowerCase()}.
          </p>
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

      {result.rules && result.rules.notes.length > 0 && (
        <Card className="mt-4">
          <CardContent className="p-5">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              State-specific notes
            </div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {result.rules.notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card className="mt-4">
        <CardContent className="p-5 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              <span className="font-semibold text-foreground">Not legal advice.</span>{" "}
              Medicaid rules change every year and vary by state. For a real
              filing — especially anything involving asset transfers, trusts,
              or the 5-year look-back — talk to a licensed elder-law attorney
              in your state.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg" className="flex-1">
          <Link to="/search?medicaid=true">
            Find Medicaid-accepting facilities
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
                  We'll send a short Medicaid planning guide for {form.state}{" "}
                  and a shortlist of Medicaid-accepting facilities. No spam
                  calls — promise.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit}>
              <div className="text-sm font-semibold">
                Get the full {form.state} Medicaid guide
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                We'll email you the state-specific spend-down rules, a
                checklist of documents you'll need, and 3–5 facility matches.
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
                  Send guide
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
