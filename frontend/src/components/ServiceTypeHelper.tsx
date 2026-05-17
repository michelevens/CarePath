import { useState } from "react"
import { ChevronLeft, HelpCircle, Sparkles, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  SERVICE_TYPES,
  WIZARD_QUESTIONS,
  metaFor,
  type ServiceType,
} from "@/lib/serviceTypes"

/**
 * "Not sure which one you need?" wizard. Tiny 5-question yes/no flow
 * that scores the service types and recommends the top one with the
 * reasons that drove the choice. Closes the discovery gap APFM's site
 * leaves open (they answer this with a phone call to an advisor).
 *
 * The trigger is a small underlined "Not sure?" link that families can
 * ignore — the wizard is opt-in, not in-the-way.
 */
export function ServiceTypeHelper({
  onPick,
}: {
  /** Called with the chosen service type so the parent can drive the
   * search filter / match prefs. */
  onPick: (type: ServiceType) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-[11px] text-violet-700 hover:underline"
      >
        <HelpCircle className="h-3 w-3" />
        Not sure which one?
      </button>
      {open && (
        <WizardModal
          onClose={() => setOpen(false)}
          onPick={(type) => {
            onPick(type)
            setOpen(false)
          }}
        />
      )}
    </>
  )
}

function WizardModal({
  onClose,
  onPick,
}: {
  onClose: () => void
  onPick: (type: ServiceType) => void
}) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, "yes" | "no" | "unsure">>({})

  const isAtResults = step >= WIZARD_QUESTIONS.length
  const current = WIZARD_QUESTIONS[step]

  const setAnswer = (val: "yes" | "no" | "unsure") => {
    setAnswers((a) => ({ ...a, [current.id]: val }))
    setStep((s) => s + 1)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-lg border bg-card shadow-2xl">
        <div className="flex items-start justify-between border-b bg-violet-50 p-4">
          <div>
            <div className="flex items-center gap-1.5 text-violet-700">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                Which service do you need?
              </span>
            </div>
            <h2 className="mt-0.5 text-base font-semibold">
              {isAtResults ? "Here's what fits" : "A few quick questions"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!isAtResults && current && (
          <div className="p-5">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Step {step + 1} of {WIZARD_QUESTIONS.length}
            </div>
            <p className="mt-2 text-sm font-medium">{current.prompt}</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <Button variant="default" size="sm" onClick={() => setAnswer("yes")}>
                Yes
              </Button>
              <Button variant="outline" size="sm" onClick={() => setAnswer("no")}>
                No
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setAnswer("unsure")}>
                Not sure
              </Button>
            </div>
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-3 w-3" /> Back
              </button>
            )}
          </div>
        )}

        {isAtResults && (
          <Results
            answers={answers}
            onPick={onPick}
            onRestart={() => {
              setAnswers({})
              setStep(0)
            }}
          />
        )}
      </div>
    </div>
  )
}

function Results({
  answers,
  onPick,
  onRestart,
}: {
  answers: Record<string, "yes" | "no" | "unsure">
  onPick: (type: ServiceType) => void
  onRestart: () => void
}) {
  // Score every service type based on the answers + the question
  // boost map. "Yes" adds full weight, "Unsure" half weight, "No"
  // applies the negative boost if present.
  const scores = new Map<ServiceType, number>()
  for (const t of SERVICE_TYPES) scores.set(t.value, 0)

  for (const q of WIZARD_QUESTIONS) {
    const a = answers[q.id]
    if (!a || a === "unsure") {
      // Half weight on unsure for the yes boosts only.
      if (a === "unsure") {
        for (const t of q.yes_boosts) {
          scores.set(t, (scores.get(t) ?? 0) + 0.5)
        }
      }
      continue
    }
    if (a === "yes") {
      for (const t of q.yes_boosts) {
        scores.set(t, (scores.get(t) ?? 0) + 1)
      }
    } else if (a === "no" && q.no_boosts) {
      for (const t of q.no_boosts) {
        scores.set(t, (scores.get(t) ?? 0) + 1)
      }
    }
  }

  const ranked = Array.from(scores.entries())
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  if (ranked.length === 0) {
    return (
      <div className="p-5 text-sm">
        <p className="text-muted-foreground">
          Based on your answers, we'd recommend starting with{" "}
          <strong className="text-foreground">Assisted Living</strong> as the most common
          fit. You can refine from there.
        </p>
        <div className="mt-4 flex gap-2">
          <Button size="sm" onClick={() => onPick("assisted_living")}>
            Search Assisted Living
          </Button>
          <Button variant="ghost" size="sm" onClick={onRestart}>
            Start over
          </Button>
        </div>
      </div>
    )
  }

  const top = ranked[0]
  const topMeta = metaFor(top[0])!
  const alternates = ranked.slice(1)

  return (
    <div className="p-5">
      <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-violet-700">
          Best fit
        </div>
        <div className="mt-1 text-base font-semibold">{topMeta.label}</div>
        <p className="mt-1 text-xs text-muted-foreground">{topMeta.short_description}</p>
        <div className="mt-2 flex flex-wrap gap-1 text-[10px] text-muted-foreground">
          <span className="rounded bg-white px-1.5 py-0.5">
            {topMeta.typical_cost_band}
          </span>
          <span className="rounded bg-white px-1.5 py-0.5">{topMeta.typical_payer}</span>
        </div>
        <Button size="sm" className="mt-3" onClick={() => onPick(top[0])}>
          Search {topMeta.label}
        </Button>
      </div>

      {alternates.length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Also consider
          </div>
          <ul className="mt-1 space-y-2">
            {alternates.map(([type]) => {
              const m = metaFor(type)
              if (!m) return null
              return (
                <li key={type}>
                  <button
                    type="button"
                    onClick={() => onPick(type)}
                    className="w-full rounded-md border bg-card p-2 text-left hover:border-violet-300 hover:bg-violet-50/30"
                  >
                    <div className="text-sm font-medium">{m.label}</div>
                    <div className="text-xs text-muted-foreground">{m.short_description}</div>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={onRestart}
        className="mt-3 text-xs text-muted-foreground hover:text-foreground"
      >
        Start over
      </button>
    </div>
  )
}
