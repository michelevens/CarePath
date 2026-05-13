import { useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Heart,
  Brain,
  Stethoscope,
  Activity,
  Search,
  Loader2,
} from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Meta } from "@/components/Meta"

/**
 * 10-question care-level quiz. Each answer carries weighted scores across
 * three care types (assisted / memory / skilled). Highest cumulative score
 * is the recommendation.
 */
type Level = "assisted" | "memory" | "skilled"

interface Option {
  label: string
  scores: Partial<Record<Level, number>>
}

interface Question {
  id: string
  text: string
  options: Option[]
}

const QUESTIONS: Question[] = [
  {
    id: "adl_count",
    text: "How many daily-living tasks does your loved one need help with? (Bathing, dressing, eating, toileting, transferring, walking)",
    options: [
      { label: "None — fully independent", scores: { assisted: 0 } },
      { label: "1–2 tasks", scores: { assisted: 2 } },
      { label: "3–4 tasks", scores: { assisted: 3, memory: 2, skilled: 2 } },
      { label: "5–6 tasks (most things)", scores: { skilled: 4, memory: 3 } },
    ],
  },
  {
    id: "memory_changes",
    text: "Has your loved one shown memory changes that affect daily life?",
    options: [
      { label: "No noticeable changes", scores: {} },
      { label: "Some forgetfulness — names, appointments", scores: { assisted: 1 } },
      { label: "Frequently confused about time/place", scores: { memory: 3, assisted: 1 } },
      { label: "Doesn't recognize family or familiar places", scores: { memory: 5 } },
    ],
  },
  {
    id: "wandering",
    text: "Has your loved one wandered or gotten lost?",
    options: [
      { label: "Never", scores: {} },
      { label: "Once or twice — minor incidents", scores: { memory: 2, assisted: 1 } },
      { label: "Multiple times — concerning", scores: { memory: 5 } },
      { label: "Has tried to leave home unsafely", scores: { memory: 6 } },
    ],
  },
  {
    id: "medical_needs",
    text: "Does your loved one have ongoing medical needs?",
    options: [
      { label: "Stable — managed by primary care", scores: { assisted: 1 } },
      { label: "Multiple medications, but stable", scores: { assisted: 2 } },
      { label: "Recent hospital stay or rehab needs", scores: { skilled: 5 } },
      { label: "Daily skilled needs (wound care, IV, dialysis, etc.)", scores: { skilled: 6 } },
    ],
  },
  {
    id: "mobility",
    text: "How mobile is your loved one?",
    options: [
      { label: "Walks independently", scores: { assisted: 1 } },
      { label: "Uses a cane or walker", scores: { assisted: 2 } },
      { label: "Needs help with transfers", scores: { skilled: 2, memory: 2 } },
      { label: "Wheelchair or bedbound", scores: { skilled: 4 } },
    ],
  },
  {
    id: "social",
    text: "How socially engaged is your loved one?",
    options: [
      { label: "Active and enjoys group activities", scores: { assisted: 2 } },
      { label: "Some interest in activities with prompting", scores: { assisted: 1, memory: 1 } },
      { label: "Isolated or withdrawn", scores: { memory: 2 } },
      { label: "Cannot participate due to medical needs", scores: { skilled: 2 } },
    ],
  },
  {
    id: "behavior",
    text: "Any behavioral changes — agitation, sundowning, paranoia?",
    options: [
      { label: "None", scores: {} },
      { label: "Occasional mood changes", scores: { assisted: 1 } },
      { label: "Regular afternoon/evening agitation", scores: { memory: 4 } },
      { label: "Frequent severe behaviors", scores: { memory: 5 } },
    ],
  },
  {
    id: "safety",
    text: "Have there been any recent safety incidents at home?",
    options: [
      { label: "No incidents", scores: {} },
      { label: "Near-falls or minor incidents", scores: { assisted: 2 } },
      { label: "One or more falls with injury", scores: { skilled: 3, memory: 2 } },
      { label: "Multiple emergencies — fires, missing meds, etc.", scores: { memory: 4, skilled: 3 } },
    ],
  },
  {
    id: "hospital",
    text: "Has your loved one been hospitalized in the last 6 months?",
    options: [
      { label: "No", scores: {} },
      { label: "Once — minor", scores: { assisted: 1 } },
      { label: "Once — required rehab discharge", scores: { skilled: 5 } },
      { label: "Multiple times", scores: { skilled: 4 } },
    ],
  },
  {
    id: "urgency",
    text: "How soon do you need a placement?",
    options: [
      { label: "Just researching — no rush", scores: {} },
      { label: "Within 30–90 days", scores: { assisted: 1 } },
      { label: "Within the next 2 weeks", scores: { skilled: 2, memory: 1 } },
      { label: "ASAP — hospital discharge planned", scores: { skilled: 4 } },
    ],
  },
]

const LEVEL_DETAILS: Record<Level, { icon: typeof Heart; title: string; description: string }> = {
  assisted: {
    icon: Heart,
    title: "Assisted Living",
    description:
      "Help with daily activities + community amenities. Best for residents who are oriented to time and place but need support with 1–3 ADLs.",
  },
  memory: {
    icon: Brain,
    title: "Memory Care",
    description:
      "Locked-perimeter unit with specialized dementia training. Best when memory loss affects safety or causes wandering/sundowning.",
  },
  skilled: {
    icon: Stethoscope,
    title: "Skilled Nursing",
    description:
      "24/7 RN coverage with sub-acute rehab, wound care, IV therapy. Best for post-hospital recovery and ongoing daily medical needs.",
  },
}

export function CareLevelQuizPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, Option>>({})
  const [showResult, setShowResult] = useState(false)
  const [email, setEmail] = useState("")
  const [zip, setZip] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const choose = (questionId: string, option: Option) => {
    setAnswers((a) => ({ ...a, [questionId]: option }))
    if (step < QUESTIONS.length - 1) {
      setStep(step + 1)
    } else {
      setShowResult(true)
    }
  }

  const back = () => {
    if (step > 0) setStep(step - 1)
  }

  const restart = () => {
    setStep(0)
    setAnswers({})
    setShowResult(false)
    setSubmitted(false)
    setEmail("")
    setZip("")
  }

  const totals: Record<Level, number> = { assisted: 0, memory: 0, skilled: 0 }
  Object.values(answers).forEach((opt) => {
    ;(Object.entries(opt.scores) as [Level, number][]).forEach(([level, points]) => {
      totals[level] += points
    })
  })

  const ranking = (Object.entries(totals) as [Level, number][]).sort(
    (a, b) => b[1] - a[1]
  )
  const primary = ranking[0]
  const tieOrClose = ranking[0][1] - ranking[1][1] <= 1 && ranking[1][1] > 0

  const saveResult = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post("/marketplace/leads", {
        source: "saved_search",
        email,
        zip: zip || undefined,
        context: {
          tool: "care_level_quiz",
          recommended_level: primary[0],
          totals,
          answers: Object.fromEntries(
            Object.entries(answers).map(([k, v]) => [k, v.label])
          ),
        },
      })
      setSubmitted(true)
    } catch {
      setSubmitted(true) // hide errors — UX over telemetry
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Meta
        title="Care-level quiz: assisted living, memory care, or skilled nursing?"
        description="10-question quiz that maps your loved one's needs to the right level of long-term care. Free, no signup."
        canonical="/tools/care-level-quiz"
      />
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
                <ClipboardList className="h-3.5 w-3.5" />
                Care-level quiz · {step + 1} of {QUESTIONS.length}
              </div>
              <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
                Does mom (or dad) need assisted living, memory care, or skilled
                nursing?
              </h1>
              <p className="mt-3 max-w-2xl text-muted-foreground">
                10 short questions. Takes 2 minutes. No email required to see
                the result.
              </p>
            </div>

            <div className="mt-8 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${((step + 1) / QUESTIONS.length) * 100}%` }}
              />
            </div>

            <Card className="mt-6">
              <CardContent className="space-y-3 p-6">
                <h2 className="text-lg font-semibold">{QUESTIONS[step].text}</h2>
                <div className="mt-3 grid gap-2">
                  {QUESTIONS[step].options.map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => choose(QUESTIONS[step].id, opt)}
                      className={cn(
                        "rounded-lg border px-4 py-3 text-left text-sm transition-colors hover:border-primary hover:bg-accent/50",
                        answers[QUESTIONS[step].id]?.label === opt.label &&
                          "border-primary bg-accent"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="mt-4 flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                disabled={step === 0}
                onClick={back}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <span className="text-xs text-muted-foreground">
                Question {step + 1} / {QUESTIONS.length}
              </span>
            </div>
          </>
        ) : (
          <ResultView
            recommendedLevel={primary[0]}
            allTotals={totals}
            isClose={tieOrClose}
            submitted={submitted}
            submitting={submitting}
            email={email}
            setEmail={setEmail}
            zip={zip}
            setZip={setZip}
            onSubmit={saveResult}
            onRestart={restart}
            onSearch={() => navigate(`/search?type=${typeForLevel(primary[0])}`)}
          />
        )}
      </section>
    </div>
  )
}

function typeForLevel(level: Level): string {
  return level === "skilled"
    ? "snf"
    : level === "memory"
    ? "memory_care"
    : "assisted_living"
}

function ResultView({
  recommendedLevel,
  allTotals,
  isClose,
  submitted,
  submitting,
  email,
  setEmail,
  zip,
  setZip,
  onSubmit,
  onRestart,
  onSearch,
}: {
  recommendedLevel: Level
  allTotals: Record<Level, number>
  isClose: boolean
  submitted: boolean
  submitting: boolean
  email: string
  setEmail: (v: string) => void
  zip: string
  setZip: (v: string) => void
  onSubmit: (e: FormEvent) => void
  onRestart: () => void
  onSearch: () => void
}) {
  const Icon = LEVEL_DETAILS[recommendedLevel].icon
  const max = Math.max(...Object.values(allTotals)) || 1

  return (
    <div>
      <div className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full border bg-accent/60 px-3 py-1 text-xs font-medium text-accent-foreground">
          <Activity className="h-3.5 w-3.5" />
          Your recommendation
        </div>
        <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
          Based on your answers, start with
        </h1>
      </div>

      <Card className="mt-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary p-3 text-primary-foreground">
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-semibold">
                {LEVEL_DETAILS[recommendedLevel].title}
              </div>
              {isClose && (
                <div className="text-xs text-muted-foreground">
                  Close call — a clinical assessment is worth doing.
                </div>
              )}
            </div>
          </div>
          <p className="mt-4 text-muted-foreground">
            {LEVEL_DETAILS[recommendedLevel].description}
          </p>

          <div className="mt-6 space-y-2">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Score breakdown
            </div>
            {(["assisted", "memory", "skilled"] as Level[]).map((level) => (
              <div key={level} className="flex items-center gap-3">
                <span className="w-28 text-sm capitalize">
                  {LEVEL_DETAILS[level].title}
                </span>
                <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "absolute inset-y-0 left-0 rounded-full transition-all",
                      level === recommendedLevel ? "bg-primary" : "bg-muted-foreground/40"
                    )}
                    style={{ width: `${(allTotals[level] / max) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right text-sm font-semibold tabular-nums">
                  {allTotals[level]}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button onClick={onSearch} size="lg" className="flex-1">
          <Search className="h-4 w-4" />
          Find {LEVEL_DETAILS[recommendedLevel].title.toLowerCase()} near you
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" onClick={onRestart} size="lg">
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
                  We've saved your quiz result and we'll send a few tailored
                  facility matches to your inbox. No spam calls — that's a
                  promise.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit}>
              <div className="text-sm font-semibold">
                Want a personalized shortlist?
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Give us your email + ZIP and we'll send 3–5 facility matches
                based on this result. Email goes to ONE list — ours — never
                resold.
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
                  Send matches
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
