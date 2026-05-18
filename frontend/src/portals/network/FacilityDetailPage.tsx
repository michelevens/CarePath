import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { Loader2, TrendingDown, TrendingUp } from "lucide-react"
import { api } from "@/lib/api"
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
    phone: string | null
    website: string | null
    cms_five_star_overall: number | null
    total_beds: number
    price_from_cents: number | null
    subscription_tier: string | null
  }
  beds: { total: number; available: number; occupied: number }
  event_funnel_30d: Record<string, number | string>
  placements_30d: number
  portfolio_benchmark: Record<string, { avg: number; this_facility: number }> | null
  admins: Array<{ id: string; name: string; email: string; role: string }>
}

export function FacilityDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const [data, setData] = useState<Payload | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    let alive = true
    setData(null)
    setError(null)
    api
      .get<{ data: Payload }>(`/network/facilities/${slug}`)
      .then((r) => alive && setData(r.data.data))
      .catch((e) => alive && setError(e.response?.data?.message ?? "Failed to load facility."))
    return () => {
      alive = false
    }
  }, [slug])

  if (error) return <div className="p-8 text-sm text-red-700">{error}</div>
  if (!data) {
    return (
      <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading facility…
      </div>
    )
  }

  const f = data.facility
  const occupancyPct = f.total_beds > 0 ? Math.round((data.beds.occupied / f.total_beds) * 100) : 0

  return (
    <div className="space-y-5 p-5 sm:p-8">
      <Link to="/network" className="text-xs text-muted-foreground hover:underline">
        ← Network overview
      </Link>
      <PortalFacilityHeader
        name={f.name}
        type={f.type}
        city={f.city}
        state={f.state}
        zip={f.zip}
        cmsFiveStarOverall={f.cms_five_star_overall}
        publicSlug={f.slug}
        chips={
          <span className="rounded-full border bg-muted/40 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide">
            {f.subscription_tier ?? "free"}
          </span>
        }
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <PortalStatTile label="Occupancy" value={`${occupancyPct}%`} hint={`${data.beds.occupied} / ${f.total_beds}`} />
        <PortalStatTile label="Open beds" value={data.beds.available} />
        <PortalStatTile label="Admissions (30d)" value={data.placements_30d} />
        <PortalStatTile label="Admins on team" value={data.admins.length} />
      </div>

      <PortalSectionCard
        title="Listing funnel (30 days)"
        subtitle="From a family seeing this site in search to submitting a lead."
      >
        <div className="grid gap-3 sm:grid-cols-4">
          {(["impression", "detail_view", "tour_request", "phone_click"] as const).map((k) => (
            <PortalStatTile key={k} label={k.replace("_", " ")} value={Number(data.event_funnel_30d[k] ?? 0)} />
          ))}
        </div>
      </PortalSectionCard>

      {data.portfolio_benchmark && (
        <PortalSectionCard
          title="Portfolio benchmark"
          subtitle="How this site compares to the average across all facilities in your network."
        >
          <ul className="grid gap-2 sm:grid-cols-2">
            {Object.entries(data.portfolio_benchmark).map(([k, v]) => {
              const delta = v.this_facility - v.avg
              const trending = delta >= 0
              return (
                <li
                  key={k}
                  className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm"
                >
                  <div>
                    <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {k.replace("_", " ")}
                    </div>
                    <div className="font-semibold">
                      {v.this_facility} <span className="text-xs text-muted-foreground">vs avg {v.avg}</span>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-medium ${
                      trending ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    {trending ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {trending ? "+" : ""}
                    {Math.round(delta)}
                  </span>
                </li>
              )
            })}
          </ul>
        </PortalSectionCard>
      )}

      <PortalSectionCard title="Team at this site">
        {data.admins.length === 0 ? (
          <p className="text-sm text-muted-foreground">No team members linked yet.</p>
        ) : (
          <ul className="divide-y">
            {data.admins.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <div className="font-medium">{a.name}</div>
                  <div className="text-xs text-muted-foreground">{a.email}</div>
                </div>
                <span className="rounded border bg-accent/40 px-1.5 py-0.5 text-xs font-medium">
                  {a.role ?? "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </PortalSectionCard>
    </div>
  )
}
