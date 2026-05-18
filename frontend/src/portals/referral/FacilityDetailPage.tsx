import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { Loader2 } from "lucide-react"
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
    email: string | null
    website: string | null
    tagline: string | null
    description: string | null
    cms_five_star_overall: number | null
    medicaid_certified: boolean
    medicare_certified: boolean
    price_from_cents: number | null
    total_beds: number
  }
  capacity: { available_beds: number; by_level: Record<string, number> }
  my_placements: Array<{
    id: string
    resident: { first_name: string; last_name: string } | null
    status: string
    admitted_on: string | null
    gross_fee_cents: number
    advisor_payout_cents: number
    amount_paid_cents: number
  }>
  commission_summary: {
    count: number
    gross_cents: number
    payout_cents: number
    paid_cents: number
  }
}

const dollars = (cents: number) => `$${Math.round(cents / 100).toLocaleString()}`

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
      .get<{ data: Payload }>(`/referral/facilities/${slug}`)
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
  const c = data.commission_summary

  return (
    <div className="space-y-5 p-5 sm:p-8">
      <Link to="/referral/pipeline" className="text-xs text-muted-foreground hover:underline">
        ← Back to pipeline
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
          <div className="flex flex-wrap gap-1.5">
            {f.medicaid_certified && (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                Medicaid
              </span>
            )}
            {f.medicare_certified && (
              <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-800">
                Medicare
              </span>
            )}
            {f.price_from_cents && (
              <span className="rounded-full border bg-muted/40 px-2 py-0.5 text-[11px] font-medium">
                from {dollars(f.price_from_cents)}/mo
              </span>
            )}
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <PortalStatTile
          label="Open beds"
          value={data.capacity.available_beds}
          hint={`of ${f.total_beds} total`}
        />
        <PortalStatTile label="Your placements" value={c.count} hint="Lifetime here" />
        <PortalStatTile label="Earned payout" value={dollars(c.payout_cents)} />
        <PortalStatTile label="Paid out" value={dollars(c.paid_cents)} />
      </div>

      {(f.tagline || f.description) && (
        <PortalSectionCard title="About" subtitle="Manager-written copy from the public listing.">
          {f.tagline && <p className="font-medium">{f.tagline}</p>}
          {f.description && (
            <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{f.description}</p>
          )}
        </PortalSectionCard>
      )}

      <PortalSectionCard title="Capacity by level of care" subtitle="Live availability — refreshed on every load.">
        {Object.keys(data.capacity.by_level).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {data.capacity.available_beds === 0
              ? "No open beds right now."
              : "Bed-level data not tracked at this facility."}
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {Object.entries(data.capacity.by_level).map(([level, count]) => (
              <li key={level} className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm">
                <span className="capitalize">{level}</span>
                <span className="font-semibold">{count} open</span>
              </li>
            ))}
          </ul>
        )}
      </PortalSectionCard>

      <PortalSectionCard
        title="Your placements at this facility"
        subtitle="Only your placements — other advisors' placements aren't visible."
      >
        {data.my_placements.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No placements yet. New leads attributed to you will appear here once admitted.
          </p>
        ) : (
          <ul className="divide-y">
            {data.my_placements.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <div className="font-medium">
                    {p.resident ? `${p.resident.first_name} ${p.resident.last_name}` : "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {p.status}
                    {p.admitted_on && ` · admitted ${new Date(p.admitted_on).toLocaleDateString()}`}
                  </div>
                </div>
                <div className="text-right text-xs">
                  <div className="font-semibold">{dollars(p.advisor_payout_cents)}</div>
                  {p.amount_paid_cents > 0 && (
                    <div className="text-emerald-700">paid {dollars(p.amount_paid_cents)}</div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </PortalSectionCard>

      <PortalSectionCard title="Contact" subtitle="Use these channels for tour scheduling.">
        <dl className="grid gap-2 text-sm sm:grid-cols-3">
          {f.phone && (
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Phone</dt>
              <dd>
                <a className="text-primary hover:underline" href={`tel:${f.phone}`}>
                  {f.phone}
                </a>
              </dd>
            </div>
          )}
          {f.email && (
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Email</dt>
              <dd>
                <a className="text-primary hover:underline" href={`mailto:${f.email}`}>
                  {f.email}
                </a>
              </dd>
            </div>
          )}
          {f.website && (
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Website</dt>
              <dd>
                <a className="text-primary hover:underline" href={f.website} target="_blank" rel="noreferrer">
                  Visit ↗
                </a>
              </dd>
            </div>
          )}
        </dl>
      </PortalSectionCard>
    </div>
  )
}
