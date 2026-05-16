import { useState } from "react"
import { Info, ShieldCheck, X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface QualityComponent {
  value: number
  weight: number
  label: string
}

export interface QualityScore {
  score: number
  components: Record<string, QualityComponent>
}

interface Props {
  data: QualityScore | null
  variant?: "hero" | "compact" | "inline"
  className?: string
}

/**
 * CarePath Quality Score — one 0-10 number per facility, computed from
 * CMS sub-ratings + pricing transparency + bed-availability signal +
 * payer access. Variants:
 *
 *  - "hero"     Big square tile for the facility-detail hero.
 *  - "compact"  Small pill for search cards / comparables / lists.
 *  - "inline"   Number + tiny label, no border — for tight rows.
 *
 * Click anywhere on a non-inline variant to expand a methodology popover.
 */
export function QualityScoreBadge({ data, variant = "compact", className }: Props) {
  const [open, setOpen] = useState(false)

  if (!data || typeof data.score !== "number") {
    if (variant === "hero") {
      return (
        <div className={cn("rounded-xl border border-dashed bg-card p-4 text-center", className)}>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Quality Score
          </div>
          <div className="mt-1 text-3xl font-bold tabular-nums text-muted-foreground">—</div>
          <div className="mt-1 text-xs text-muted-foreground">Not enough data yet</div>
        </div>
      )
    }
    return null
  }

  const tier = scoreTier(data.score)
  const tierClasses = TIER_CLASSES[tier]

  if (variant === "hero") {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "group relative rounded-xl border p-4 text-left transition-shadow hover:shadow-md",
            tierClasses.heroBg,
            className
          )}
        >
          <div className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <ShieldCheck className="h-3 w-3" />
            CarePath Quality Score
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className={cn("text-4xl font-bold tabular-nums", tierClasses.heroNum)}>
              {data.score.toFixed(1)}
            </span>
            <span className="text-base text-muted-foreground">/ 10</span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <span>{TIER_LABEL[tier]}</span>
            <span>·</span>
            <span className="inline-flex items-center gap-0.5 underline decoration-dotted underline-offset-2">
              <Info className="h-3 w-3" />
              How it's calculated
            </span>
          </div>
        </button>
        {open && <MethodologyDialog data={data} onClose={() => setOpen(false)} />}
      </>
    )
  }

  if (variant === "inline") {
    return (
      <span
        className={cn(
          "inline-flex items-baseline gap-1 font-semibold tabular-nums",
          tierClasses.text,
          className
        )}
        title={`CarePath Quality Score ${data.score.toFixed(1)}/10 — ${TIER_LABEL[tier]}`}
      >
        {data.score.toFixed(1)}
        <span className="text-xs font-normal text-muted-foreground">/10</span>
      </span>
    )
  }

  // compact pill
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen(true)
        }}
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
          tierClasses.pill,
          className
        )}
        title={`Click for methodology — ${TIER_LABEL[tier]}`}
      >
        <ShieldCheck className="h-3 w-3" />
        <span className="tabular-nums">{data.score.toFixed(1)}</span>
        <span className="font-normal opacity-80">/10</span>
      </button>
      {open && <MethodologyDialog data={data} onClose={() => setOpen(false)} />}
    </>
  )
}

function MethodologyDialog({ data, onClose }: { data: QualityScore; onClose: () => void }) {
  const components = Object.values(data.components)
  const totalWeight = components.reduce((sum, c) => sum + c.weight, 0)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              How this score is calculated
            </div>
            <div className="mt-1 text-2xl font-semibold">
              CarePath Quality Score · {data.score.toFixed(1)} / 10
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              A single number computed from federal data + pricing + availability
              signals. Unlike review-based ratings, every input is objective and
              publicly auditable.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {components.map((c) => (
            <div key={c.label} className="space-y-1">
              <div className="flex items-baseline justify-between text-sm">
                <span>
                  {c.label}{" "}
                  <span className="text-xs text-muted-foreground">
                    · {Math.round((c.weight / totalWeight) * 100)}% of score
                  </span>
                </span>
                <span className="font-semibold tabular-nums">{c.value.toFixed(1)}/10</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${(c.value / 10) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
          <strong className="text-foreground">Why we built our own score:</strong>{" "}
          Other senior-living sites either show a single proprietary number with no
          methodology, or hide quality data behind a contact form. We publish the
          formula and every input. Components with no data are excluded — their
          weight redistributes across the rest. Updated daily from CMS Nursing
          Home Compare + your facility's pricing and availability data.
        </div>
      </div>
    </div>
  )
}

type Tier = "excellent" | "good" | "fair" | "needs_work"

function scoreTier(score: number): Tier {
  if (score >= 8.5) return "excellent"
  if (score >= 7.0) return "good"
  if (score >= 5.5) return "fair"
  return "needs_work"
}

const TIER_LABEL: Record<Tier, string> = {
  excellent: "Excellent",
  good: "Good",
  fair: "Fair",
  needs_work: "Needs work",
}

const TIER_CLASSES: Record<
  Tier,
  { pill: string; text: string; heroBg: string; heroNum: string }
> = {
  excellent: {
    pill: "border-primary/40 bg-primary/10 text-primary",
    text: "text-primary",
    heroBg: "border-primary/40 bg-primary/5",
    heroNum: "text-primary",
  },
  good: {
    pill: "border-accent-foreground/30 bg-accent text-accent-foreground",
    text: "text-accent-foreground",
    heroBg: "border-accent-foreground/20 bg-accent/40",
    heroNum: "text-foreground",
  },
  fair: {
    pill: "border-border bg-muted text-muted-foreground",
    text: "text-foreground",
    heroBg: "border-border bg-muted/40",
    heroNum: "text-foreground",
  },
  needs_work: {
    pill: "border-destructive/30 bg-destructive/10 text-destructive",
    text: "text-destructive",
    heroBg: "border-destructive/30 bg-destructive/5",
    heroNum: "text-destructive",
  },
}
