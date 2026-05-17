import { useState, type FormEvent } from "react"
import { Sparkles, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface MatchPrefs {
  care_type?: string
  payer_required?: "medicaid" | "medicare" | "va"
  max_budget_cents?: number
  distance_target_miles?: number
  special_needs?: string[]
}

const CARE_TYPES: Array<{ value: string; label: string; help: string }> = [
  { value: "independent_living", label: "Independent Living", help: "Active, mostly independent — meals & social, light help" },
  { value: "assisted_living", label: "Assisted Living", help: "Help with daily tasks — bathing, dressing, meds" },
  { value: "memory_care", label: "Memory Care", help: "Specialized dementia / Alzheimer's care, secured" },
  { value: "ccrc", label: "Continuing Care (CCRC)", help: "Move once — IL through SNF on one campus" },
  { value: "snf", label: "Skilled Nursing (SNF)", help: "24/7 nursing, rehab, complex medical" },
]

const SPECIAL_NEEDS = [
  { value: "wheelchair", label: "Wheelchair accessibility" },
  { value: "diabetes_management", label: "Diabetes management" },
  { value: "oxygen", label: "Oxygen therapy" },
  { value: "behavioral_dementia", label: "Behavioral dementia care" },
  { value: "hospice_friendly", label: "Hospice-friendly" },
  { value: "private_room", label: "Private room available" },
  { value: "pet_friendly", label: "Pet-friendly" },
  { value: "lgbtq_welcoming", label: "LGBTQ+ welcoming" },
]

/**
 * "Tell us what matters" form. Saved to localStorage and re-applied to
 * every subsequent search so the match score follows the family across
 * sessions. Form is intentionally 5 fields — APFM-style intake is 15+
 * fields and families bounce.
 */
export function MatchPrefsModal({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean
  initial: MatchPrefs | null
  onClose: () => void
  onSave: (next: MatchPrefs | null) => void
}) {
  const [careType, setCareType] = useState(initial?.care_type ?? "")
  const [payer, setPayer] = useState<MatchPrefs["payer_required"] | "">(initial?.payer_required ?? "")
  const [budget, setBudget] = useState<string>(
    initial?.max_budget_cents ? String(Math.round(initial.max_budget_cents / 100)) : ""
  )
  const [distance, setDistance] = useState<string>(
    initial?.distance_target_miles ? String(initial.distance_target_miles) : "25"
  )
  const [needs, setNeeds] = useState<string[]>(initial?.special_needs ?? [])

  if (!open) return null

  const toggleNeed = (v: string) =>
    setNeeds((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]))

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const next: MatchPrefs = {}
    if (careType) next.care_type = careType
    if (payer) next.payer_required = payer
    if (budget) next.max_budget_cents = Number(budget) * 100
    if (distance) next.distance_target_miles = Number(distance)
    if (needs.length) next.special_needs = needs
    onSave(Object.keys(next).length === 0 ? null : next)
    onClose()
  }

  const onClear = () => {
    onSave(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form
        onSubmit={onSubmit}
        className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-lg border bg-card shadow-2xl"
      >
        <div className="flex items-start justify-between border-b bg-violet-50 p-4">
          <div>
            <div className="flex items-center gap-2 text-violet-700">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Match preferences</span>
            </div>
            <h2 className="mt-1 text-lg font-semibold">Tell us what matters</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Every search now shows a 0–100 match score and the exact reasons. Skip any field
              you don't have an answer for yet.
            </p>
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

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <div>
            <label className="text-xs font-medium">Level of care needed</label>
            <div className="mt-1 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {CARE_TYPES.map((t) => (
                <button
                  type="button"
                  key={t.value}
                  onClick={() => setCareType(careType === t.value ? "" : t.value)}
                  className={`rounded-md border p-2 text-left text-xs transition-colors ${
                    careType === t.value
                      ? "border-violet-500 bg-violet-50"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  <div className="font-semibold">{t.label}</div>
                  <div className="text-[10px] text-muted-foreground">{t.help}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium">Payer required</label>
              <select
                value={payer}
                onChange={(e) => setPayer(e.target.value as MatchPrefs["payer_required"] | "")}
                className="mt-1 block w-full rounded-md border bg-background px-2 py-1.5 text-sm"
              >
                <option value="">Private pay / no preference</option>
                <option value="medicaid">Medicaid</option>
                <option value="medicare">Medicare</option>
                <option value="va">VA Aid &amp; Attendance</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium">Distance target (mi)</label>
              <input
                type="number"
                min={1}
                max={200}
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                className="mt-1 block w-full rounded-md border bg-background px-2 py-1.5 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium">Monthly budget ($)</label>
            <input
              type="number"
              min={0}
              step={100}
              placeholder="e.g. 5500"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="mt-1 block w-full rounded-md border bg-background px-2 py-1.5 text-sm"
            />
            <p className="mt-1 text-[10px] text-muted-foreground">
              Facilities above budget are downscored, not hidden — sometimes a slightly-over
              option is still the best fit.
            </p>
          </div>

          <div>
            <label className="text-xs font-medium">Special needs</label>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {SPECIAL_NEEDS.map((n) => (
                <button
                  type="button"
                  key={n.value}
                  onClick={() => toggleNeed(n.value)}
                  className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                    needs.includes(n.value)
                      ? "border-violet-500 bg-violet-50 text-violet-800"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {n.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t bg-muted/30 p-3">
          {initial ? (
            <button
              type="button"
              onClick={onClear}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear preferences
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Save &amp; rescore
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
