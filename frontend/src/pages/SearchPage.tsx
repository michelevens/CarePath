import { useEffect, useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { Building2, Loader2, MapPin, Search, Star, X } from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface FacilityResult {
  id: string
  name: string
  slug: string
  type: string
  city: string
  state: string
  zip: string
  medicaid_certified: boolean
  medicare_certified: boolean
  cms_five_star_overall: number | null
  total_beds: number
  price_from_cents: number | null
  available_beds: number
  distance_miles?: number
}

interface SearchResponse {
  data: FacilityResult[]
  origin: { zip: string; city: string | null; state: string | null } | null
  radius_miles: number | null
}

type Sort = "recommended" | "rating" | "price_asc" | "price_desc" | "distance"

const TYPE_LABEL: Record<string, string> = {
  snf: "Skilled Nursing",
  assisted_living: "Assisted Living",
  memory_care: "Memory Care",
  ccrc: "Continuing Care",
}

export function SearchPage() {
  const [urlParams, setUrlParams] = useSearchParams()

  const [results, setResults] = useState<FacilityResult[]>([])
  const [origin, setOrigin] = useState<SearchResponse["origin"]>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Initial state pulls from URL params so landing-page handoffs and
  // shared/refreshed URLs work.
  const [q, setQ] = useState(() => urlParams.get("q") ?? "")
  const [state, setState] = useState(() => urlParams.get("state") ?? "")
  const [city, setCity] = useState(() => urlParams.get("city") ?? "")
  const [zip, setZip] = useState(() => urlParams.get("zip") ?? "")
  const [radiusMiles, setRadiusMiles] = useState(() => urlParams.get("radius") ?? "25")
  const [type, setType] = useState(() => urlParams.get("type") ?? "")
  const [medicaidOnly, setMedicaidOnly] = useState(() => urlParams.get("medicaid") === "1")
  const [minFiveStar, setMinFiveStar] = useState<string>(
    () => urlParams.get("min_star") ?? ""
  )
  const [maxPriceMonthly, setMaxPriceMonthly] = useState<string>(
    () => urlParams.get("max_price") ?? ""
  )
  const [sort, setSort] = useState<Sort>(
    () => (urlParams.get("sort") as Sort | null) ?? "recommended"
  )

  const queryParams = useMemo(() => {
    const p: Record<string, string | number | boolean> = { sort }
    if (q) p.q = q
    if (state) p.state = state
    if (city) p.city = city
    if (zip.length === 5) {
      p.zip = zip
      p.radius_miles = Number(radiusMiles || "25")
    }
    if (type) p.type = type
    if (medicaidOnly) p.medicaid_only = true
    if (minFiveStar) p.min_five_star = Number(minFiveStar)
    if (maxPriceMonthly) p.max_price_cents = Number(maxPriceMonthly) * 100
    return p
  }, [q, state, city, zip, radiusMiles, type, medicaidOnly, minFiveStar, maxPriceMonthly, sort])

  // Sync state → URL (replace, not push, so back button doesn't trap)
  useEffect(() => {
    const next = new URLSearchParams()
    if (q) next.set("q", q)
    if (state) next.set("state", state)
    if (city) next.set("city", city)
    if (zip.length === 5) {
      next.set("zip", zip)
      next.set("radius", radiusMiles)
    }
    if (type) next.set("type", type)
    if (medicaidOnly) next.set("medicaid", "1")
    if (minFiveStar) next.set("min_star", minFiveStar)
    if (maxPriceMonthly) next.set("max_price", maxPriceMonthly)
    if (sort !== "recommended") next.set("sort", sort)
    setUrlParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, state, city, zip, radiusMiles, type, medicaidOnly, minFiveStar, maxPriceMonthly, sort])

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    const t = setTimeout(() => {
      api
        .get<SearchResponse>("/marketplace/facilities", { params: queryParams })
        .then((r) => {
          if (!alive) return
          setResults(r.data.data)
          setOrigin(r.data.origin)
        })
        .catch((err) => alive && setError(err.response?.data?.message ?? "Search failed"))
        .finally(() => alive && setLoading(false))
    }, 250) // debounce
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [queryParams])

  const clearAll = () => {
    setQ("")
    setState("")
    setCity("")
    setZip("")
    setRadiusMiles("25")
    setType("")
    setMedicaidOnly(false)
    setMinFiveStar("")
    setMaxPriceMonthly("")
    setSort("recommended")
  }

  const hasAnyFilter =
    q || state || city || zip.length === 5 || type || medicaidOnly || minFiveStar || maxPriceMonthly

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-6">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            CarePath
          </Link>
          <div className="ml-2 flex flex-1 items-center gap-2 rounded-full border bg-card px-3 py-1.5">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              placeholder="City, ZIP, or facility name"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-hidden"
            />
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/login">Sign in</Link>
          </Button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[1fr_400px]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <FilterInput
              label="ZIP"
              value={zip}
              onChange={(v) => setZip(v.replace(/\D/g, "").slice(0, 5))}
              placeholder="85016"
              maxLength={5}
              className="w-24"
            />
            <FilterSelect
              label="Radius"
              value={radiusMiles}
              onChange={setRadiusMiles}
              options={[
                { value: "10", label: "10 mi" },
                { value: "25", label: "25 mi" },
                { value: "50", label: "50 mi" },
                { value: "100", label: "100 mi" },
              ]}
            />
            <FilterSelect
              label="Care type"
              value={type}
              onChange={setType}
              options={[
                { value: "", label: "All types" },
                ...Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label })),
              ]}
            />
            <FilterInput
              label="State"
              value={state}
              onChange={(v) => setState(v.toUpperCase())}
              placeholder="AZ"
              maxLength={2}
              className="w-20"
            />
            <FilterInput
              label="City"
              value={city}
              onChange={setCity}
              placeholder="Phoenix"
              className="w-36"
            />
            <FilterSelect
              label="Min ★"
              value={minFiveStar}
              onChange={setMinFiveStar}
              options={[
                { value: "", label: "Any" },
                { value: "3", label: "≥ 3" },
                { value: "4", label: "≥ 4" },
                { value: "5", label: "5 only" },
              ]}
            />
            <FilterInput
              label="Max $/mo"
              value={maxPriceMonthly}
              onChange={(v) => setMaxPriceMonthly(v.replace(/[^0-9]/g, ""))}
              placeholder="8000"
              className="w-24"
            />
            <label className="flex items-center gap-2 self-center pt-5 text-sm">
              <input
                type="checkbox"
                checked={medicaidOnly}
                onChange={(e) => setMedicaidOnly(e.target.checked)}
                className="h-4 w-4"
              />
              Medicaid only
            </label>
            {hasAnyFilter && (
              <button
                onClick={clearAll}
                className="ml-auto flex items-center gap-1 self-center pt-5 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
                Clear all
              </button>
            )}
          </div>

          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">
              {loading ? "Searching…" : `${results.length} facilities`}
              {origin ? (
                <span className="ml-2 text-base font-normal text-muted-foreground">
                  within {radiusMiles}mi of {origin.zip}{origin.city ? ` (${origin.city}, ${origin.state})` : ""}
                </span>
              ) : state ? (
                <span className="ml-2 text-base font-normal text-muted-foreground">
                  near {city ? `${city}, ` : ""}{state}
                </span>
              ) : null}
            </h1>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="rounded-md border bg-card px-3 py-1.5 text-sm"
            >
              {origin && <option value="distance">Distance: nearest</option>}
              <option value="recommended">Recommended</option>
              <option value="rating">Rating: high to low</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
            </select>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading facilities…
            </div>
          ) : results.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                No facilities match these filters.
              </CardContent>
            </Card>
          ) : (
            results.map((r) => <ResultCard key={r.id} r={r} />)
          )}
        </div>

        <div className="sticky top-24 hidden h-[calc(100vh-8rem)] rounded-lg border bg-muted lg:block">
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Map view (coming soon)
          </div>
        </div>
      </div>
    </div>
  )
}

function ResultCard({ r }: { r: FacilityResult }) {
  const monthly = r.price_from_cents ? Math.round(r.price_from_cents / 100).toLocaleString() : null
  const hasBeds = r.available_beds > 0
  return (
    <Link to={`/facility/${r.slug}`} className="block">
      <Card className="hover-lift overflow-hidden">
        <div className="flex">
          {/* Photo placeholder with a soft violet gradient instead of pure gray */}
          <div
            className="flex h-40 w-56 shrink-0 items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, color-mix(in oklch, var(--color-primary) 12%, var(--color-card)), color-mix(in oklch, var(--color-primary) 28%, var(--color-card)))",
            }}
          >
            <Building2 className="h-12 w-12 text-primary/60" />
          </div>
          <CardContent className="flex-1 p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{r.name}</h3>
                <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {r.city}, {r.state} · {TYPE_LABEL[r.type] ?? r.type}
                  {r.distance_miles !== undefined && (
                    <span className="ml-1 font-medium text-foreground">
                      · {r.distance_miles} mi
                    </span>
                  )}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                  {r.medicaid_certified && (
                    <span className="rounded bg-accent px-1.5 py-0.5 font-medium text-accent-foreground">
                      Medicaid
                    </span>
                  )}
                  {r.medicare_certified && (
                    <span className="rounded bg-accent px-1.5 py-0.5 font-medium text-accent-foreground">
                      Medicare
                    </span>
                  )}
                </div>
              </div>
              {r.cms_five_star_overall && (
                <div className="flex shrink-0 items-center gap-1 rounded-md border bg-card px-2 py-1 text-sm">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
                  <span className="font-semibold">{r.cms_five_star_overall}</span>
                  <span className="text-xs text-muted-foreground">CMS</span>
                </div>
              )}
            </div>
            <div className="mt-4 flex items-end justify-between">
              <div>
                {monthly ? (
                  <>
                    <span className="text-lg font-semibold">${monthly}</span>
                    <span className="text-sm text-muted-foreground"> /mo</span>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">Pricing on request</span>
                )}
              </div>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
                  hasBeds
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    hasBeds ? "bg-emerald-500" : "bg-muted-foreground/50"
                  )}
                />
                {hasBeds
                  ? `${r.available_beds} bed${r.available_beds === 1 ? "" : "s"} available`
                  : "Waitlist only"}
              </span>
            </div>
          </CardContent>
        </div>
      </Card>
    </Link>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block rounded-md border bg-background px-3 py-1.5 text-sm outline-hidden focus:ring-2 focus:ring-ring"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function FilterInput({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  className,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  maxLength?: number
  className?: string
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className={cn(
          "mt-1 block rounded-md border bg-background px-3 py-1.5 text-sm outline-hidden focus:ring-2 focus:ring-ring",
          className
        )}
      />
    </div>
  )
}
