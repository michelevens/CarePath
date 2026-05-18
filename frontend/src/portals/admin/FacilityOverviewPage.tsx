import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Loader2 } from "lucide-react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import {
  PortalFacilityHeader,
  PortalSectionCard,
  PortalStatTile,
} from "@/components/PortalFacilityHeader"

interface Payload {
  facility: {
    name: string
    slug: string
    type: string | null
    city: string | null
    state: string | null
    zip: string | null
    cms_five_star_overall: number | null
    medicaid_certified: boolean
    medicare_certified: boolean
    subscription_tier: string | null
    tagline: string | null
    description: string | null
    price_from_cents: number | null
  }
  beds: { total: number; available: number; occupied: number; maintenance: number }
  residents: { total: number; unassigned: number }
  care_plans: { total: number; unsigned: number }
  admissions_by_stage: Record<string, number>
  event_funnel_30d: Record<string, number | string>
  leads_open: number
  sponsored_active: number
  claims_pending: number
}

const dollars = (cents: number | null) =>
  cents == null ? null : `$${Math.round(cents / 100).toLocaleString()}`

/**
 * Facility Admin "your facility at a glance" — collapses signals from
 * the various admin sub-pages (analytics, sponsored, claims, leads,
 * billing) into one scannable overview. Click-through links jump to
 * the deep tools.
 */
export function FacilityOverviewPage() {
  const { user } = useAuth()
  const facilityId = user?.active_facility?.id
  const [data, setData] = useState<Payload | null>(null)
  const [error, setError] = useState<string | null>(null)

  const headers = useMemo(
    () => (facilityId ? { "X-Facility-Id": facilityId } : undefined),
    [facilityId]
  )

  useEffect(() => {
    if (!facilityId) return
    let alive = true
    setData(null)
    setError(null)
    api
      .get<{ data: Payload }>("/facility/overview", { headers })
      .then((r) => alive && setData(r.data.data))
      .catch((e) => alive && setError(e.response?.data?.message ?? "Failed to load."))
    return () => {
      alive = false
    }
  }, [facilityId, headers])

  if (!facilityId) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        Select a facility from the sidebar switcher to see its overview.
      </div>
    )
  }
  if (error) return <div className="p-8 text-sm text-red-700">{error}</div>
  if (!data) {
    return (
      <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    )
  }

  const f = data.facility
  const occupancyPct =
    data.beds.total > 0 ? Math.round((data.beds.occupied / data.beds.total) * 100) : 0
  const fromPrice = dollars(f.price_from_cents)

  return (
    <div className="space-y-5 p-5 sm:p-8">
      <PortalFacilityHeader
        name={f.name}
        type={f.type}
        city={f.city}
        state={f.state}
        zip={f.zip}
        cmsFiveStarOverall={f.cms_five_star_overall}
        publicSlug={f.slug}
        chips={
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full border bg-muted/40 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide">
              {f.subscription_tier ?? "free"}
            </span>
            {fromPrice && (
              <span className="rounded-full border bg-muted/40 px-2 py-0.5 text-[11px] font-medium">
                from {fromPrice}/mo
              </span>
            )}
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <PortalStatTile label="Occupancy" value={`${occupancyPct}%`} hint={`${data.beds.occupied} / ${data.beds.total}`} />
        <PortalStatTile label="Open beds" value={data.beds.available} />
        <PortalStatTile label="Open leads" value={data.leads_open} />
        <PortalStatTile label="Sponsored active" value={data.sponsored_active} />
      </div>

      {data.claims_pending > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <strong>{data.claims_pending} pending claim{data.claims_pending === 1 ? "" : "s"}</strong>{" "}
          on this facility — they'll be reviewed by the CarePath team.
        </div>
      )}

      <PortalSectionCard
        title="Listing funnel (30 days)"
        subtitle="Families finding and engaging your listing."
        action={
          <Link to="/admin/analytics" className="text-xs text-primary hover:underline">
            Full analytics →
          </Link>
        }
      >
        <div className="grid gap-3 sm:grid-cols-4">
          {(["impression", "detail_view", "tour_request", "phone_click"] as const).map((k) => (
            <PortalStatTile key={k} label={k.replace("_", " ")} value={Number(data.event_funnel_30d[k] ?? 0)} />
          ))}
        </div>
      </PortalSectionCard>

      <PortalSectionCard
        title="Public listing"
        subtitle="What families see on the marketplace."
        action={
          <Link to="/admin/listing" className="text-xs text-primary hover:underline">
            Edit listing →
          </Link>
        }
      >
        {f.tagline || f.description ? (
          <>
            {f.tagline && <p className="font-medium">{f.tagline}</p>}
            {f.description && (
              <p className="mt-2 line-clamp-4 whitespace-pre-line text-sm text-muted-foreground">
                {f.description}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            No tagline or description yet — families convert 2-3× more on listings with a personal
            "about" paragraph.
          </p>
        )}
      </PortalSectionCard>

      <div className="grid gap-3 sm:grid-cols-2">
        <PortalSectionCard
          title="Residents"
          action={
            <Link to="/staff/residents" className="text-xs text-primary hover:underline">
              View →
            </Link>
          }
        >
          <div className="grid gap-2 sm:grid-cols-2">
            <PortalStatTile label="Active" value={data.residents.total} />
            <PortalStatTile label="Unassigned" value={data.residents.unassigned} hint="no bed" />
          </div>
        </PortalSectionCard>

        <PortalSectionCard
          title="Admissions queue"
          action={
            <Link to="/admin/admissions" className="text-xs text-primary hover:underline">
              Kanban →
            </Link>
          }
        >
          {Object.keys(data.admissions_by_stage).length === 0 ? (
            <p className="text-sm text-muted-foreground">No admissions in flight.</p>
          ) : (
            <ul className="divide-y">
              {Object.entries(data.admissions_by_stage).map(([stage, count]) => (
                <li
                  key={stage}
                  className="flex items-center justify-between py-1.5 text-sm capitalize"
                >
                  <span>{stage.replace("_", " ")}</span>
                  <span className="font-semibold">{count}</span>
                </li>
              ))}
            </ul>
          )}
        </PortalSectionCard>
      </div>
    </div>
  )
}
