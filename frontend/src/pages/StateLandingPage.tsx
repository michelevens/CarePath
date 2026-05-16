import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import {
  ArrowLeft,
  ArrowRight,
  Building2,
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

interface TopCity {
  city: string
  facility_count: number
  score: number | null
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
  quality_score: QualityScore | null
}

interface StateData {
  state: string
  total_facilities: number
  medicaid_count: number
  avg_score: number | null
  by_type: Record<string, number>
  top_cities: TopCity[]
  top_facilities: TopFacility[]
}

export function StateLandingPage() {
  const { state: stateParam } = useParams<{ state: string }>()
  const stateCode = (stateParam ?? "").toUpperCase().slice(0, 2)
  const stateName = STATE_NAMES[stateCode]
  const [data, setData] = useState<StateData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!stateName) {
      setLoading(false)
      return
    }
    let alive = true
    setLoading(true)
    api
      .get<{ data: StateData }>(`/marketplace/states/${stateCode}`)
      .then((r) => {
        if (!alive) return
        setData(r.data?.data ?? null)
      })
      .catch(() => alive && setData(null))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [stateCode, stateName])

  if (!stateName) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-8 text-center">
        <p className="text-lg font-semibold">Unknown state</p>
        <p className="mt-1 text-sm text-muted-foreground">
          We don't recognize "{stateParam}" as a US state code.
        </p>
        <Button asChild className="mt-6">
          <Link to="/search">Search nationally</Link>
        </Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading {stateName}…
      </div>
    )
  }

  const metaTitle = `Long-term care in ${stateName} — ${data?.total_facilities ?? 0} facilities, live CMS data`
  const metaDescription = `Find assisted living, memory care, skilled nursing, and CCRC facilities in ${stateName}. ${data?.total_facilities ?? 0} verified facilities, transparent pricing, CMS Five-Star ratings refreshed daily. No lead-selling.`

  return (
    <div className="min-h-screen bg-background">
      <Meta title={metaTitle} description={metaDescription} canonical={`/senior-living/${stateCode}`} />

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

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-1.5 rounded-full border bg-accent/60 px-3 py-1 text-xs font-medium text-accent-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {stateCode}
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
            Long-term care in {stateName}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            {data && data.total_facilities > 0 ? (
              <>
                {data.total_facilities.toLocaleString()} verified facilities — assisted
                living, memory care, skilled nursing, and CCRC. Live CMS Five-Star
                ratings, real-time bed availability, and transparent pricing where the
                facility shares it.
              </>
            ) : (
              <>We're still building inventory for {stateName}. Try the national search.</>
            )}
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button asChild>
              <Link to={`/search?state=${stateCode}`}>
                Browse all {stateName} facilities
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/guides">Free planning guides</Link>
            </Button>
          </div>
        </div>

        {data && data.total_facilities > 0 && (
          <>
            <StateStats data={data} />

            <h2 className="mt-14 text-2xl font-semibold tracking-tight">
              Care types in {stateName}
            </h2>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              {(Object.keys(TYPE_LABEL) as Array<keyof typeof TYPE_LABEL>).map((t) => (
                <Link
                  key={t}
                  to={`/search?state=${stateCode}&type=${t}`}
                  className="hover-lift rounded-xl border bg-card p-5"
                >
                  <div className="text-sm font-medium text-muted-foreground">
                    {TYPE_LABEL[t]}
                  </div>
                  <div className="mt-1 text-2xl font-semibold tabular-nums">
                    {(data.by_type[t] ?? 0).toLocaleString()}
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                    Browse <ArrowRight className="h-4 w-4" />
                  </div>
                </Link>
              ))}
            </div>

            {data.top_cities.length > 0 && (
              <>
                <h2 className="mt-14 text-2xl font-semibold tracking-tight">
                  Top cities in {stateName}
                </h2>
                <div className="mt-4 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                  {data.top_cities.map((c) => (
                    <Link
                      key={c.city}
                      to={`/search?state=${stateCode}&city=${encodeURIComponent(c.city)}`}
                      className="group flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent/40"
                    >
                      <CityScoreBadge score={c.score} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-primary group-hover:underline">
                          {c.city}, {stateCode}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {c.facility_count} facilit{c.facility_count === 1 ? "y" : "ies"}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}

            {data.top_facilities.length > 0 && (
              <>
                <h2 className="mt-14 text-2xl font-semibold tracking-tight">
                  Top-rated facilities in {stateName}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  By CMS Five-Star overall rating.
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {data.top_facilities.map((f) => (
                    <Link
                      key={f.slug}
                      to={`/facility/${f.slug}`}
                      className="block"
                    >
                      <Card className="hover-lift">
                        <CardContent className="p-5">
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
                                <span className="rounded bg-accent px-1.5 py-0.5 font-medium text-accent-foreground">
                                  Medicaid
                                </span>
                              )}
                              {f.medicare_certified && (
                                <span className="rounded bg-accent px-1.5 py-0.5 font-medium text-accent-foreground">
                                  Medicare
                                </span>
                              )}
                            </div>
                            <div className="text-sm">
                              {f.price_from_cents ? (
                                <>
                                  <span className="font-semibold">
                                    ${Math.round(f.price_from_cents / 100).toLocaleString()}
                                  </span>
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
                  ))}
                </div>
              </>
            )}

            <div className="mt-14 rounded-2xl border bg-muted/30 p-6 sm:p-8">
              <h2 className="text-lg font-semibold">Paying for care in {stateName}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Free guides on Medicare, Medicaid look-back, VA Aid &amp; Attendance,
                and the 5-year cost projection — all email-gated, none sold.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link to="/guides">Browse guides</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link to="/tools/medicaid-eligibility">Medicaid eligibility</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link to="/tools/va-eligibility">VA eligibility</Link>
                </Button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  )
}

function StateStats({ data }: { data: StateData }) {
  const items = [
    {
      icon: Building2,
      value: data.total_facilities.toLocaleString(),
      label: "total facilities",
    },
    {
      icon: Star,
      value: data.avg_score === null ? "—" : data.avg_score.toFixed(1),
      label: "avg quality (0–10)",
    },
    {
      icon: MapPin,
      value: data.top_cities.length.toLocaleString(),
      label: "cities covered",
    },
    {
      icon: Building2,
      value: data.medicaid_count.toLocaleString(),
      label: "Medicaid-certified",
    },
  ]
  return (
    <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map((it) => (
        <div key={it.label} className="rounded-xl border bg-card p-4">
          <it.icon className="h-4 w-4 text-primary" />
          <div className="mt-2 text-2xl font-semibold tabular-nums">{it.value}</div>
          <div className="text-xs text-muted-foreground">{it.label}</div>
        </div>
      ))}
    </div>
  )
}

function CityScoreBadge({ score }: { score: number | null }) {
  const tier =
    score === null
      ? "neutral"
      : score >= 8.0
      ? "high"
      : score >= 6.5
      ? "mid"
      : "low"
  const classes = {
    high: "bg-primary text-primary-foreground",
    mid: "bg-accent text-accent-foreground",
    low: "bg-muted text-muted-foreground border",
    neutral: "bg-muted text-muted-foreground border",
  }[tier]
  return (
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-sm font-semibold tabular-nums ${classes}`}
    >
      {score === null ? "—" : score.toFixed(1)}
    </span>
  )
}
