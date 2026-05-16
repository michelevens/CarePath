import { useEffect, useState } from "react"
import { Building2, MapPin, RefreshCw, ShieldCheck, Tag } from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"

interface Stats {
  total_facilities: number
  facilities_with_pricing: number
  pricing_transparency_pct: number
  states_covered: number
  cities_covered: number
}

interface Props {
  /** "row" = wide horizontal pills, "grid" = 4-up card grid for hero. */
  variant?: "row" | "grid"
  className?: string
}

const FALLBACK: Stats = {
  total_facilities: 8400,
  facilities_with_pricing: 0,
  pricing_transparency_pct: 0,
  states_covered: 50,
  cities_covered: 0,
}

export function TrustStrip({ variant = "row", className }: Props) {
  const [stats, setStats] = useState<Stats>(FALLBACK)

  useEffect(() => {
    let alive = true
    api
      .get<{ data: Stats }>("/marketplace/stats")
      .then((r) => {
        if (!alive) return
        // Defensive against the same shape-bug we already paid for once.
        const d = r.data?.data
        if (d && typeof d.total_facilities === "number") setStats(d)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const items = [
    {
      icon: Building2,
      value: stats.total_facilities.toLocaleString(),
      label: "real facilities",
    },
    {
      icon: MapPin,
      value: `${stats.states_covered}`,
      label: stats.states_covered === 1 ? "state covered" : "states covered",
    },
    {
      icon: RefreshCw,
      value: "Daily",
      label: "CMS data refresh",
    },
    {
      icon: Tag,
      value:
        stats.pricing_transparency_pct > 0
          ? `${stats.pricing_transparency_pct}%`
          : "Listed",
      label:
        stats.pricing_transparency_pct > 0
          ? "show pricing"
          : "transparent pricing",
    },
    {
      icon: ShieldCheck,
      value: "Free",
      label: "for families — no lead-selling",
    },
  ]

  if (variant === "grid") {
    return (
      <div
        className={cn(
          "grid grid-cols-2 gap-3 md:grid-cols-5",
          className
        )}
      >
        {items.map((it) => (
          <div
            key={it.label}
            className="rounded-xl border bg-card p-4"
          >
            <it.icon className="h-4 w-4 text-primary" />
            <div className="mt-2 text-lg font-semibold tabular-nums">
              {it.value}
            </div>
            <div className="text-xs text-muted-foreground">{it.label}</div>
          </div>
        ))}
      </div>
    )
  }

  // row variant — compact pill row
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground",
        className
      )}
    >
      {items.map((it, i) => (
        <span key={it.label} className="flex items-center gap-1.5">
          {i > 0 && <span aria-hidden className="text-muted-foreground/40">·</span>}
          <it.icon className="h-3.5 w-3.5 text-primary" />
          <span className="font-semibold text-foreground tabular-nums">{it.value}</span>
          <span>{it.label}</span>
        </span>
      ))}
    </div>
  )
}
