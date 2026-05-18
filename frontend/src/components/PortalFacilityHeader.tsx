import { Link } from "react-router-dom"
import { ExternalLink, MapPin, Star } from "lucide-react"

interface Props {
  name: string
  type: string | null
  city: string | null
  state: string | null
  zip: string | null
  cmsFiveStarOverall?: number | null
  publicSlug: string
  /** Right-side action chips (subscription tier, claim status, etc.) */
  chips?: React.ReactNode
}

const TYPE_LABEL: Record<string, string> = {
  snf: "Skilled Nursing",
  assisted_living: "Assisted Living",
  memory_care: "Memory Care",
  ccrc: "Continuing Care",
  independent_living: "Independent Living",
  group_home: "Group Home",
  adult_family_home: "Adult Family Home",
  icf_iid: "ICF/IID",
}

/**
 * Visual header shared by every per-portal facility detail page so
 * the same facility looks visually consistent whether a SuperAdmin,
 * Network operator, Referral advisor, or facility staffer is
 * looking at it. The role-specific cards render below this header
 * inside <PortalSectionCard>s.
 */
export function PortalFacilityHeader({
  name,
  type,
  city,
  state,
  zip,
  cmsFiveStarOverall,
  publicSlug,
  chips,
}: Props) {
  return (
    <header className="rounded-xl border bg-card p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border bg-accent/50 px-2 py-0.5 font-medium text-accent-foreground">
              {type ? (TYPE_LABEL[type] ?? type) : "—"}
            </span>
            {cmsFiveStarOverall != null && (
              <span className="inline-flex items-center gap-1 rounded-full border bg-amber-50 px-2 py-0.5 font-medium text-amber-900">
                <Star className="h-3 w-3 fill-current" />
                {cmsFiveStarOverall} / 5 CMS
              </span>
            )}
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{name}</h1>
          <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {[city, state, zip].filter(Boolean).join(", ") || "—"}
          </div>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          {chips}
          <Link
            to={`/facility/${publicSlug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Public listing <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </header>
  )
}

interface SectionProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
}

/**
 * Standard card layout for each role-specific section on a portal
 * facility detail page. Keep cards as the smallest atomic unit so
 * different portals can mix-and-match without copying chrome.
 */
export function PortalSectionCard({ title, subtitle, action, children }: SectionProps) {
  return (
    <section className="rounded-xl border bg-card">
      <header className="flex items-start justify-between gap-3 border-b px-5 py-3">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  )
}

export function PortalStatTile({
  label,
  value,
  hint,
}: {
  label: string
  value: string | number
  hint?: string
}) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-2xl font-semibold tracking-tight">{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  )
}
