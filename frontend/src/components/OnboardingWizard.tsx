import { useState, type FormEvent } from "react"
import { Check, ChevronLeft, ChevronRight, Loader2, Sparkles } from "lucide-react"
import { api } from "@/lib/api"
import { useAuth, type Role } from "@/lib/auth"
import { Button } from "@/components/ui/button"

/**
 * First-run onboarding wizard. Modeled on ShiftPulse's
 * AgencyOnboardingWizard + OnboardingChecklist split.
 *
 * Shows only when:
 *   - user is authenticated
 *   - user.onboarding_completed is false
 *
 * Persists answers to user.onboarding_data via the existing
 * /me/complete-onboarding endpoint. Wizard is dismissable
 * ("Skip for now") — we don't block the portal — but the
 * checklist progress remains visible on the dashboard until done.
 *
 * Steps are role-conditional so a family member doesn't see the
 * "set licensed states" step etc.
 */

interface WizardStep {
  title: string
  description: string
  render: (props: StepProps) => React.ReactNode
}

interface StepProps {
  answers: Record<string, string | string[]>
  setAnswer: (key: string, val: string | string[]) => void
}

const COMMON_TIMEZONES = [
  "America/New_York", "America/Chicago", "America/Denver",
  "America/Phoenix", "America/Los_Angeles", "America/Anchorage",
  "Pacific/Honolulu",
]

const STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
]

function buildSteps(role: Role | undefined): WizardStep[] {
  const base: WizardStep[] = [
    {
      title: "Welcome to CarePath",
      description: "Two minutes of setup will make the rest of the platform feel personalized.",
      render: () => (
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>You'll set a few things:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Your contact info so we can reach you with updates</li>
            <li>Your time zone so dates appear in your local time</li>
            <li>Notification preferences (you can change these any time)</li>
          </ul>
          <p>You can always skip and come back later from <strong>Settings → Profile</strong>.</p>
        </div>
      ),
    },
    {
      title: "Your name",
      description: "How should we address you in emails and on lists?",
      render: ({ answers, setAnswer }: StepProps) => (
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name">
            <input
              value={String(answers.first_name ?? "")}
              onChange={(e) => setAnswer("first_name", e.target.value)}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            />
          </Field>
          <Field label="Last name">
            <input
              value={String(answers.last_name ?? "")}
              onChange={(e) => setAnswer("last_name", e.target.value)}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            />
          </Field>
        </div>
      ),
    },
    {
      title: "How to reach you",
      description: "Optional — only used for tour confirmations + claim decisions.",
      render: ({ answers, setAnswer }: StepProps) => (
        <Field label="Phone (optional)">
          <input
            type="tel"
            value={String(answers.phone ?? "")}
            onChange={(e) => setAnswer("phone", e.target.value)}
            placeholder="+1-555-123-4567"
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
          />
        </Field>
      ),
    },
    {
      title: "Time zone",
      description: "We'll show dates and tour times in this zone.",
      render: ({ answers, setAnswer }: StepProps) => (
        <Field label="Time zone">
          <select
            value={String(answers.time_zone ?? "")}
            onChange={(e) => setAnswer("time_zone", e.target.value)}
            className="h-9 w-full rounded-md border bg-background px-2 text-sm"
          >
            <option value="">Browser default</option>
            {COMMON_TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </Field>
      ),
    },
  ]

  // Role-specific steps.
  if (role === "referral_partner") {
    base.push({
      title: "Licensed states",
      description: "Which states are you licensed to place in? (Some states don't require a license.)",
      render: ({ answers, setAnswer }: StepProps) => {
        const selected = Array.isArray(answers.licensed_states) ? answers.licensed_states : []
        return (
          <div className="grid max-h-48 grid-cols-5 gap-1 overflow-y-auto rounded border bg-background p-2 sm:grid-cols-8">
            {STATES.map((s) => {
              const on = selected.includes(s)
              return (
                <button
                  type="button"
                  key={s}
                  onClick={() =>
                    setAnswer("licensed_states", on ? selected.filter((x) => x !== s) : [...selected, s])
                  }
                  className={`rounded px-2 py-1 text-[11px] font-mono ${
                    on ? "bg-violet-600 text-white" : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                  }`}
                >
                  {s}
                </button>
              )
            })}
          </div>
        )
      },
    })
  }

  if (role === "facility_admin") {
    base.push({
      title: "Tour-request routing",
      description: "Where should new tour requests be sent first?",
      render: ({ answers, setAnswer }: StepProps) => (
        <Field label="Best email for inquiries (optional — defaults to your account email)">
          <input
            type="email"
            value={String(answers.tour_routing_email ?? "")}
            onChange={(e) => setAnswer("tour_routing_email", e.target.value)}
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
          />
        </Field>
      ),
    })
  }

  base.push({
    title: "You're all set",
    description: "Save and jump in. You can change anything from Settings → Profile.",
    render: () => (
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>
          Save and the wizard goes away. Your details now appear in emails,
          tour confirmations, and (where applicable) public profiles.
        </p>
      </div>
    ),
  })

  return base
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-medium text-muted-foreground">{label}</div>
      {children}
    </label>
  )
}

export function OnboardingWizard() {
  const { user, refreshUser } = useAuth()
  const [open, setOpen] = useState(true)
  const [stepIdx, setStepIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [busy, setBusy] = useState(false)

  if (!user || user.onboarding_completed) return null
  if (!open) return null

  const steps = buildSteps(user.roles[0])
  const step = steps[stepIdx]
  const isLast = stepIdx === steps.length - 1

  const setAnswer = (key: string, val: string | string[]) =>
    setAnswers((a) => ({ ...a, [key]: val }))

  const skip = async () => {
    setBusy(true)
    try {
      // Mark complete WITHOUT saving anything (user chose to skip).
      await api.post("/me/complete-onboarding", { data: { skipped: true } })
      await refreshUser()
    } finally {
      setBusy(false)
      setOpen(false)
    }
  }

  const finish = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      // Persist the structured answers to the user profile (the
      // shape matches what /me/profile already accepts).
      const profileUpdate: Record<string, unknown> = {}
      if (answers.first_name) profileUpdate.first_name = answers.first_name
      if (answers.last_name) profileUpdate.last_name = answers.last_name
      if (answers.phone) profileUpdate.phone = answers.phone
      if (answers.time_zone) profileUpdate.time_zone = answers.time_zone
      if (Object.keys(profileUpdate).length > 0) {
        await api.put("/me/profile", profileUpdate)
      }
      await api.post("/me/complete-onboarding", { data: answers })
      await refreshUser()
    } finally {
      setBusy(false)
      setOpen(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-lg border bg-card shadow-2xl">
        <div className="border-b bg-violet-50 p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-700" />
            <span className="text-xs uppercase tracking-wider text-violet-700">
              Welcome · step {stepIdx + 1} of {steps.length}
            </span>
          </div>
          <h2 className="mt-1 text-xl font-semibold">{step.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
          {/* Progress strip */}
          <div className="mt-3 flex gap-1">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full ${
                  i <= stepIdx ? "bg-violet-600" : "bg-violet-200"
                }`}
              />
            ))}
          </div>
        </div>
        <form onSubmit={isLast ? finish : (e) => { e.preventDefault(); setStepIdx(stepIdx + 1) }} className="space-y-5 p-5">
          {step.render({ answers, setAnswer })}
          <div className="flex items-center justify-between gap-2 border-t pt-4">
            <button
              type="button"
              onClick={skip}
              className="text-xs text-muted-foreground hover:text-foreground"
              disabled={busy}
            >
              Skip for now
            </button>
            <div className="flex gap-2">
              {stepIdx > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStepIdx(stepIdx - 1)}
                  disabled={busy}
                  className="gap-1"
                >
                  <ChevronLeft className="h-3 w-3" />
                  Back
                </Button>
              )}
              <Button type="submit" disabled={busy} className="gap-1">
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isLast ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                {isLast ? "Finish" : "Next"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
