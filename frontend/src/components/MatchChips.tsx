import { useState } from "react"
import { Check, X, HelpCircle, BadgeCheck, Sparkles, ShieldCheck, Calendar, Bed as BedIcon, DollarSign, Image as ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface MatchReason {
  key: string
  label: string
  status: "pass" | "partial" | "fail" | "unknown"
  weight: number
}

interface MatchScore {
  score: number
  reasons: MatchReason[]
}

/**
 * The headline match badge — the wedge against APFM. They hide the
 * score because their lead-auction depends on opacity; we show it
 * because trust is our wedge. Click → reasons popover with each
 * dimension pass/partial/fail and the weight.
 */
export function MatchScoreBadge({ match }: { match: MatchScore }) {
  const [open, setOpen] = useState(false)
  const tone = match.score >= 80 ? "high" : match.score >= 60 ? "mid" : "low"

  // Stop the surrounding Link from navigating when families click the
  // badge — they want to read the reasons, not open the facility yet.
  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
          tone === "high" && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
          tone === "mid" && "bg-amber-500/15 text-amber-700 dark:text-amber-400",
          tone === "low" && "bg-muted text-muted-foreground"
        )}
        title="See why this match score"
      >
        <Sparkles className="h-3 w-3" />
        {match.score}/100 match
      </button>
      {open && (
        <>
          {/* Backdrop swallows the next click so the popover closes
              without the card link firing. */}
          <div
            className="fixed inset-0 z-40"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setOpen(false)
            }}
          />
          <div
            className="absolute right-0 top-7 z-50 w-72 rounded-lg border bg-card p-3 text-left shadow-xl"
            onClick={(e) => e.preventDefault()}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Why {match.score}/100
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setOpen(false)
                }}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <ul className="space-y-1.5">
              {match.reasons.map((r) => (
                <li key={r.key} className="flex items-start gap-2 text-xs">
                  {r.status === "pass" && (
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  )}
                  {r.status === "partial" && (
                    <span className="mt-0.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-[10px] font-bold text-amber-700">
                      ~
                    </span>
                  )}
                  {r.status === "fail" && (
                    <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" />
                  )}
                  {r.status === "unknown" && (
                    <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <span className="text-foreground">{r.label}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[10px] text-muted-foreground">
              Score reflects your saved preferences. Adjust at top of search.
            </p>
          </div>
        </>
      )}
    </div>
  )
}

interface TrustBadge {
  key: string
  label: string
  tone: "verified" | "fresh" | "data" | "cms" | "warning"
}

/**
 * Small inline chip — sits in the badge row beneath name/address. Used
 * for trust signals (verified, freshness, photo count, real prices).
 * Each tone gets a distinct color so families can scan a list of 30
 * cards and pick out which are well-vetted.
 */
export function TrustChip({ badge }: { badge: TrustBadge }) {
  const styles = {
    verified: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
    fresh: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
    cms: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
    data: "bg-stone-500/15 text-stone-700 dark:text-stone-300",
    warning: "bg-amber-500/15 text-amber-800 dark:text-amber-400",
  }[badge.tone]

  const Icon = ICON_FOR_BADGE[badge.key] ?? BadgeCheck

  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium", styles)}>
      <Icon className="h-2.5 w-2.5" />
      {badge.label}
    </span>
  )
}

const ICON_FOR_BADGE: Record<string, typeof BadgeCheck> = {
  verified: ShieldCheck,
  pro: BadgeCheck,
  cms: ShieldCheck,
  fresh: Calendar,
  live_availability: BedIcon,
  real_prices: DollarSign,
  photos: ImageIcon,
}
