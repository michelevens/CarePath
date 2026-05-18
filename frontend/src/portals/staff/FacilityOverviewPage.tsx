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
  }
  beds: { total: number; available: number; occupied: number; maintenance: number }
  residents: { total: number; unassigned: number }
  care_plans: { total: number; unsigned: number }
  admissions_by_stage: Record<string, number>
  meds_active: number
}

/**
 * Facility Staff overview — same backend payload as the admin
 * variant, but staff don't care about listing health, sponsored, or
 * leads. Cards here focus on the day-to-day care workload:
 * residents, beds, admissions in flight, care plans needing sign-off,
 * active medications.
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
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <PortalStatTile label="Occupancy" value={`${occupancyPct}%`} hint={`${data.beds.occupied} / ${data.beds.total}`} />
        <PortalStatTile label="Active residents" value={data.residents.total} />
        <PortalStatTile label="Open beds" value={data.beds.available} hint={`${data.beds.maintenance} maintenance`} />
        <PortalStatTile label="Active medications" value={data.meds_active} />
      </div>

      {data.residents.unassigned > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <strong>{data.residents.unassigned}</strong> resident
          {data.residents.unassigned === 1 ? " has" : "s have"} no bed assignment.
        </div>
      )}

      {data.care_plans.unsigned > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <strong>{data.care_plans.unsigned}</strong> active care plan
          {data.care_plans.unsigned === 1 ? "" : "s"} unsigned — sign-off is required for billing.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <PortalSectionCard
          title="Admissions in flight"
          action={
            <Link to="/admin/admissions" className="text-xs text-primary hover:underline">
              Kanban →
            </Link>
          }
        >
          {Object.keys(data.admissions_by_stage).length === 0 ? (
            <p className="text-sm text-muted-foreground">No active admissions.</p>
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

        <PortalSectionCard
          title="Care plans"
          action={
            <Link to="/staff/care-plans" className="text-xs text-primary hover:underline">
              Open →
            </Link>
          }
        >
          <div className="grid gap-2 sm:grid-cols-2">
            <PortalStatTile label="Total" value={data.care_plans.total} />
            <PortalStatTile label="Unsigned" value={data.care_plans.unsigned} hint="need provider sign-off" />
          </div>
        </PortalSectionCard>
      </div>
    </div>
  )
}
