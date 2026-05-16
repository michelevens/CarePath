import { useEffect, useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Loader2,
  MapPin,
  Star,
} from "lucide-react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Meta } from "@/components/Meta"
import { QualityScoreBadge, type QualityScore } from "@/components/QualityScoreBadge"

const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi",
  MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire",
  NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina",
  ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
  RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee",
  TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington",
  WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming", DC: "District of Columbia",
}

const TYPE_LABEL: Record<string, string> = {
  assisted_living: "Assisted Living",
  memory_care: "Memory Care",
  snf: "Skilled Nursing",
  ccrc: "Continuing Care",
}

const TYPE_URL_SLUG: Record<string, string> = {
  "assisted-living": "assisted_living",
  "memory-care": "memory_care",
  "skilled-nursing": "snf",
  "continuing-care": "ccrc",
}

const TYPE_URL_FOR: Record<string, string> = {
  assisted_living: "assisted-living",
  memory_care: "memory-care",
  snf: "skilled-nursing",
  ccrc: "continuing-care",
}

interface TopFacility {
  name: string
  slug: string
  type: string
  city: string
  state: string
  cms_five_star_overall: number | null
  price_from_cents: number | null
  medicaid_certified: boolean
  medicare_certified: boolean
  available_beds: number
  quality_score: QualityScore | null
}

interface NearbyCity {
  city: string
  state: string
  facility_count: number
  distance_miles: number
}

interface CityData {
  city: string
  state: string
  county: string | null
  total_facilities: number
  by_type: Record<string, number>
  pricing: {
    facilities_with_pricing: number
    avg_price_cents: number | null
    median_price_cents: number | null
    min_price_cents: number | null
    max_price_cents: number | null
  }
  payers: { medicaid_count: number; medicare_count: number }
  avg_cms: { overall: number | null; inspection: number | null; staffing: number | null; quality: number | null }
  avg_quality_score: number | null
  top_facilities: TopFacility[]
  nearby_cities: NearbyCity[]
}

export function CityLandingPage() {
  const params = useParams<{ state: string; city: string; type?: string }>()
  const stateCode = (params.state ?? "").toUpperCase().slice(0, 2)
  const cityName = decodeURIComponent(params.city ?? "")
  const stateName = STATE_NAMES[stateCode]
  // type segment: "assisted-living" -> "assisted_living" (or undefined for the all-types page)
  const typeFilter = params.type ? TYPE_URL_SLUG[params.type] ?? null : null
  const typeLabel = typeFilter ? TYPE_LABEL[typeFilter] : null

  const [data, setData] = useState<CityData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!stateName || !cityName) {
      setLoading(false)
      setNotFound(true)
      return
    }
    let alive = true
    setLoading(true)
    setNotFound(false)
    api
      .get<{ data: CityData }>(`/marketplace/cities/${stateCode}/${encodeURIComponent(cityName)}`)
      .then((r) => alive && setData(r.data?.data ?? null))
      .catch((err) => {
        if (!alive) return
        if (err.response?.status === 404) setNotFound(true)
        else setData(null)
      })
      .finally(() => alive && setLoading(false))
  }, [stateCode, cityName, stateName])

  const headlineType = typeLabel ?? "Long-term care"
  const facilityCount = typeFilter && data ? (data.by_type[typeFilter] ?? 0) : data?.total_facilities ?? 0
  const context = useMemo(() => (data ? buildCityContext(data, stateName, typeFilter) : null), [data, stateName, typeFilter])

  if (!stateName) {
    return <NotFoundShell label="Unknown state" />
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading {cityName}, {stateCode}…
      </div>
    )
  }

  if (notFound || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-8 text-center">
        <p className="text-lg font-semibold">
          We don't have facility data for {cityName}, {stateCode} yet.
        </p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Our CMS ingest covers all licensed US facilities — if it's not here,
          there likely aren't any active long-term care facilities currently
          listed in this exact city name. Try a nearby city or browse the state.
        </p>
        <div className="mt-6 flex gap-2">
          <Button asChild>
            <Link to={`/senior-living/${stateCode}`}>Browse {STATE_NAMES[stateCode]}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/search">National search</Link>
          </Button>
        </div>
      </div>
    )
  }

  const cityUrl = `/senior-living/${stateCode}/${encodeURIComponent(data.city)}`
  const metaTitle = typeLabel
    ? `${typeLabel} in ${data.city}, ${stateCode} — ${facilityCount} facilities`
    : `Long-term care in ${data.city}, ${stateCode} — ${data.total_facilities} facilities`
  const metaDescription = `${facilityCount} ${headlineType.toLowerCase()} ${facilityCount === 1 ? "facility" : "facilities"} in ${data.city}, ${stateName}. ${context?.lead ?? ""} Live CMS data, transparent pricing, no lead-selling.`

  const breadcrumbItems: Array<{ label: string; to: string | null }> = [
    { label: "Home", to: "/" },
    { label: "Long-term care", to: "/search" },
    { label: stateName, to: `/senior-living/${stateCode}` },
    ...(data.county ? [{ label: `${data.county} County`, to: null }] : []),
    { label: data.city, to: typeFilter ? cityUrl : null },
    ...(typeLabel ? [{ label: typeLabel, to: null }] : []),
  ]

  return (
    <div className="min-h-screen bg-background">
      <Meta title={metaTitle} description={metaDescription} canonical={typeFilter ? `${cityUrl}/${params.type}` : cityUrl} />

      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            CarePath
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
              Back home
            </Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <Breadcrumbs items={breadcrumbItems} />

        <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
          {facilityCount} {headlineType.toLowerCase()} {facilityCount === 1 ? "facility" : "facilities"} in {data.city}, {stateCode}
        </h1>
        {context && (
          <p className="mt-4 max-w-3xl text-lg text-muted-foreground">{context.lead}</p>
        )}

        <CityStats data={data} typeFilter={typeFilter} />

        {/* Other care types in this city */}
        <CareTypeNav data={data} cityUrl={cityUrl} active={typeFilter} />

        {/* Top facilities */}
        {data.top_facilities.length > 0 && (
          <>
            <h2 className="mt-14 text-2xl font-semibold tracking-tight">
              Top-rated facilities in {data.city}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              By CarePath Quality Score — auditable methodology, no paid placement.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {data.top_facilities
                .filter((f) => !typeFilter || f.type === typeFilter)
                .slice(0, 6)
                .map((f) => (
                  <FacilityCard key={f.slug} f={f} />
                ))}
            </div>
            <div className="mt-4">
              <Button asChild variant="outline">
                <Link
                  to={`/search?state=${stateCode}&city=${encodeURIComponent(data.city)}${typeFilter ? `&type=${typeFilter}` : ""}`}
                >
                  See all {facilityCount} listings <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </>
        )}

        {/* SEO context paragraph */}
        {context && (
          <section className="mt-14">
            <h2 className="text-2xl font-semibold tracking-tight">
              About {headlineType.toLowerCase()} in {data.city}, {stateCode}
            </h2>
            <div className="mt-3 space-y-3 text-muted-foreground">
              {context.paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </section>
        )}

        {/* Pricing snapshot */}
        {data.pricing.facilities_with_pricing > 0 && (
          <section className="mt-14">
            <h2 className="text-2xl font-semibold tracking-tight">Pricing in {data.city}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              From {data.pricing.facilities_with_pricing} of {data.total_facilities} facilities that publish a base rate.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <PriceTile label="Median" cents={data.pricing.median_price_cents} highlight />
              <PriceTile label="Average" cents={data.pricing.avg_price_cents} />
              <PriceTile label="Lowest" cents={data.pricing.min_price_cents} />
              <PriceTile label="Highest" cents={data.pricing.max_price_cents} />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Prices shown are facility base rates; level-of-care adders and
              ancillary fees vary. Use the per-facility detail page for the full
              pricing breakdown.
            </p>
          </section>
        )}

        {/* Nearby cities */}
        {data.nearby_cities.length > 0 && (
          <section className="mt-14">
            <h2 className="text-2xl font-semibold tracking-tight">Nearby cities</h2>
            <div className="mt-4 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {data.nearby_cities.map((n) => (
                <Link
                  key={`${n.city}-${n.state}`}
                  to={`/senior-living/${n.state}/${encodeURIComponent(n.city)}`}
                  className="group flex items-center justify-between rounded-lg border bg-card p-3 transition-colors hover:border-primary"
                >
                  <div>
                    <div className="text-sm font-semibold text-primary group-hover:underline">
                      {n.city}, {n.state}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {n.facility_count.toLocaleString()} facilit{n.facility_count === 1 ? "y" : "ies"} · {n.distance_miles} mi
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Related senior services for SEO + family help */}
        <section className="mt-14 rounded-2xl border bg-muted/30 p-6 sm:p-8">
          <h2 className="text-lg font-semibold">Paying for care in {data.city}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Free, branded guides on Medicare, Medicaid, VA Aid &amp; Attendance,
            and the 5-year cost projection — email only.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline"><Link to="/guides">Browse guides</Link></Button>
            <Button asChild size="sm" variant="outline"><Link to="/tools/medicaid-eligibility">Medicaid eligibility</Link></Button>
            <Button asChild size="sm" variant="outline"><Link to="/tools/va-eligibility">VA eligibility</Link></Button>
            <Button asChild size="sm" variant="outline"><Link to="/tools/care-level-quiz">Care-level quiz</Link></Button>
          </div>
        </section>
      </section>
    </div>
  )
}

function Breadcrumbs({ items }: { items: Array<{ label: string; to: string | null }> }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-x-1 gap-y-1 text-xs text-muted-foreground">
      {items.map((it, i) => (
        <span key={`${it.label}-${i}`} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/60" />}
          {it.to ? (
            <Link to={it.to} className="hover:text-foreground hover:underline">{it.label}</Link>
          ) : (
            <span className="text-foreground" aria-current="page">{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}

function CityStats({ data, typeFilter }: { data: CityData; typeFilter: string | null }) {
  const items: Array<{ value: string; label: string; subLabel?: string }> = [
    {
      value: typeFilter ? `${data.by_type[typeFilter] ?? 0}` : `${data.total_facilities}`,
      label: typeFilter ? `${TYPE_LABEL[typeFilter]?.toLowerCase() ?? "facility"} facilities` : "total facilities",
    },
    {
      value: data.avg_quality_score === null ? "—" : data.avg_quality_score.toFixed(1),
      label: "avg quality (0–10)",
    },
    {
      value: data.pricing.median_price_cents
        ? `$${Math.round(data.pricing.median_price_cents / 100).toLocaleString()}`
        : "—",
      label: "median /mo",
    },
    {
      value: `${data.payers.medicaid_count}`,
      label: "Medicaid-certified",
    },
  ]
  return (
    <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map((it) => (
        <div key={it.label} className="rounded-xl border bg-card p-4">
          <div className="text-2xl font-semibold tabular-nums">{it.value}</div>
          <div className="text-xs text-muted-foreground">{it.label}</div>
        </div>
      ))}
    </div>
  )
}

function CareTypeNav({
  data, cityUrl, active,
}: {
  data: CityData
  cityUrl: string
  active: string | null
}) {
  const items: Array<{ key: string; label: string; count: number }> = [
    { key: "assisted_living", label: "Assisted Living", count: data.by_type.assisted_living ?? 0 },
    { key: "memory_care", label: "Memory Care", count: data.by_type.memory_care ?? 0 },
    { key: "snf", label: "Skilled Nursing", count: data.by_type.snf ?? 0 },
    { key: "ccrc", label: "Continuing Care", count: data.by_type.ccrc ?? 0 },
  ].filter((i) => i.count > 0)

  if (items.length === 0) return null

  return (
    <div className="mt-8 flex flex-wrap gap-2">
      <Link
        to={cityUrl}
        className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
          active === null
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-card text-muted-foreground hover:border-primary hover:text-foreground"
        }`}
      >
        All ({data.total_facilities})
      </Link>
      {items.map((it) => (
        <Link
          key={it.key}
          to={`${cityUrl}/${TYPE_URL_FOR[it.key]}`}
          className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
            active === it.key
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-muted-foreground hover:border-primary hover:text-foreground"
          }`}
        >
          {it.label} ({it.count})
        </Link>
      ))}
    </div>
  )
}

function FacilityCard({ f }: { f: TopFacility }) {
  return (
    <Link to={`/facility/${f.slug}`} className="block">
      <Card className="hover-lift h-full">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{f.name}</div>
              <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {f.city}, {f.state} · {TYPE_LABEL[f.type] ?? f.type}
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <QualityScoreBadge data={f.quality_score} variant="compact" />
              {f.cms_five_star_overall && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                  {f.cms_five_star_overall} CMS
                </span>
              )}
            </div>
          </div>
          <div className="mt-3 flex items-end justify-between text-xs">
            <div className="flex gap-1.5">
              {f.medicaid_certified && (
                <span className="rounded bg-accent px-1.5 py-0.5 font-medium text-accent-foreground">Medicaid</span>
              )}
              {f.medicare_certified && (
                <span className="rounded bg-accent px-1.5 py-0.5 font-medium text-accent-foreground">Medicare</span>
              )}
            </div>
            <div className="text-sm">
              {f.price_from_cents ? (
                <>
                  <span className="font-semibold">${Math.round(f.price_from_cents / 100).toLocaleString()}</span>
                  <span className="text-muted-foreground"> /mo</span>
                </>
              ) : (
                <span className="text-muted-foreground">Pricing on tour</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function PriceTile({ label, cents, highlight }: { label: string; cents: number | null; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? "border-primary/40 bg-primary/5" : "bg-card"}`}>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">
        {cents ? `$${Math.round(cents / 100).toLocaleString()}` : "—"}
      </div>
      <div className="text-xs text-muted-foreground">/ mo</div>
    </div>
  )
}

function NotFoundShell({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-8 text-center">
      <p className="text-lg font-semibold">{label}</p>
      <Button asChild className="mt-6">
        <Link to="/search">National search</Link>
      </Button>
    </div>
  )
}

/* ──────────────── Templated city context paragraph ──────────────── */

function buildCityContext(
  data: CityData,
  stateName: string,
  typeFilter: string | null
): { lead: string; paragraphs: string[] } {
  const tCount = typeFilter ? data.by_type[typeFilter] ?? 0 : data.total_facilities
  const tLabel = typeFilter ? TYPE_LABEL[typeFilter].toLowerCase() : "long-term care"
  const median = data.pricing.median_price_cents
    ? `$${Math.round(data.pricing.median_price_cents / 100).toLocaleString()}`
    : null
  const avgQ = data.avg_quality_score

  const lead =
    `${data.city}, ${stateName} has ${tCount} ${tLabel} ${tCount === 1 ? "facility" : "facilities"}` +
    (median ? `, with a median published rate of ${median} per month` : "") +
    (avgQ !== null ? `. The average CarePath Quality Score across local facilities is ${avgQ.toFixed(1)}/10` : "") +
    "."

  const paragraphs: string[] = []

  // Care-type mix
  const types = Object.entries(data.by_type).filter(([, n]) => n > 0)
  if (types.length > 1) {
    const phrase = types
      .map(([k, n]) => `${n} ${TYPE_LABEL[k]?.toLowerCase() ?? k}`)
      .join(" · ")
    paragraphs.push(
      `Inventory in ${data.city} skews ${types[0][0] === "assisted_living" ? "toward assisted living" : `toward ${TYPE_LABEL[types[0][0]]?.toLowerCase()}`}: ${phrase}.`
    )
  }

  // Payer access
  const med = data.payers.medicaid_count
  const total = data.total_facilities
  if (total > 0) {
    const pct = Math.round((med / total) * 100)
    paragraphs.push(
      `Of ${total} facilities, ${med} are Medicaid-certified (${pct}%) and ${data.payers.medicare_count} are Medicare-certified. Medicaid coverage matters most for skilled nursing stays beyond Medicare's 100-day cap and for long-term custodial care once private funds are spent down.`
    )
  }

  // Quality summary
  if (data.avg_cms.overall !== null) {
    paragraphs.push(
      `Average CMS Five-Star Overall rating is ${data.avg_cms.overall.toFixed(1)} of 5. Inspection average: ${data.avg_cms.inspection?.toFixed(1) ?? "—"}/5. Staffing average: ${data.avg_cms.staffing?.toFixed(1) ?? "—"}/5. CMS ratings are federal; we resync them daily.`
    )
  }

  // Pricing context
  if (data.pricing.min_price_cents && data.pricing.max_price_cents) {
    const minP = `$${Math.round(data.pricing.min_price_cents / 100).toLocaleString()}`
    const maxP = `$${Math.round(data.pricing.max_price_cents / 100).toLocaleString()}`
    paragraphs.push(
      `Published monthly rates in ${data.city} range from ${minP} to ${maxP}. These are base rates — level-of-care adders, community fees, and ancillary services (medications, salon, transportation) are typically billed separately. Use the per-facility 5-year cost projector to model your blended Medicare/Medicaid/LTC-insurance/VA/private-pay outlay.`
    )
  }

  // Coverage caveat
  paragraphs.push(
    `Every facility on this page is sourced from federal CMS data or state licensure files. We don't accept paid placements — listing order is by CarePath Quality Score, never by who wrote a check. When you request a tour, your contact info goes to one facility only, not to a network of competing operators.`
  )

  return { lead, paragraphs }
}
