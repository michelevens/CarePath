import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import {
  ArrowRight,
  BookmarkPlus,
  Building2,
  Check,
  GitCompareArrows,
  Heart,
  Loader2,
  MapPin,
  SlidersHorizontal,
  Star,
  X,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useCompare } from "@/lib/useCompare"
import { useSaved } from "@/lib/useSaved"
import { useSavedSearches } from "@/lib/useSavedSearches"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Meta } from "@/components/Meta"
import { FacilityMap } from "@/components/FacilityMap"
import { FacilitySuggest, type Suggestion } from "@/components/FacilitySuggest"
import { QualityScoreBadge, type QualityScore } from "@/components/QualityScoreBadge"
import { FamilyProModal } from "@/components/FamilyProModal"
import { Sparkles, Users } from "lucide-react"

interface FacilityResult {
  id: string
  name: string
  slug: string
  type: string
  city: string
  state: string
  zip: string
  latitude: number | null
  longitude: number | null
  medicaid_certified: boolean
  medicare_certified: boolean
  cms_five_star_overall: number | null
  total_beds: number
  price_from_cents: number | null
  available_beds: number
  distance_miles?: number
  quality_score: QualityScore | null
}

interface SearchResponse {
  data: FacilityResult[]
  origin: { lat: number; lon: number; zip: string; city: string | null; state: string | null } | null
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

  // Free-text `q` lives in the header search box, not the filter row — so it
  // isn't counted in the "(N)" badge on the mobile filters button.
  const activeFilterCount = [
    state, city, zip.length === 5 ? zip : "", type, medicaidOnly,
    minFiveStar, maxPriceMonthly,
  ].filter(Boolean).length

  return (
    <div className="min-h-screen bg-background">
      <Meta
        title={
          city && state
            ? `Long-term care in ${city}, ${state}`
            : state
            ? `Long-term care facilities in ${state}`
            : "Search 8,400+ long-term care facilities"
        }
        description="Find skilled nursing, assisted living, and memory care facilities with real availability, CMS Five-Star ratings, and transparent pricing. No lead-selling."
        canonical="/search"
      />
      <header className="sticky top-0 z-10 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-6">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            CarePath
          </Link>
          <div className="ml-2 flex flex-1 items-center gap-2 rounded-full border bg-card py-1.5">
            <SearchHeaderSuggest
              q={q} setQ={setQ}
              setZip={setZip} setCity={setCity} setState={setState}
            />
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/login">Sign in</Link>
          </Button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[1fr_400px]">
        <div className="space-y-4">
          <SavedSearchesStrip />
          <SavedFacilitiesStrip />
          {(() => {
            const filterFields = (
              <>
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
              </>
            )

            return (
              <>
                {/* Desktop: inline filter row */}
                <div className="hidden flex-wrap items-end gap-3 lg:flex">
                  {filterFields}
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

                {/* Mobile: button → dialog */}
                <div className="lg:hidden">
                  <MobileFiltersTrigger
                    count={activeFilterCount}
                    onClear={hasAnyFilter ? clearAll : undefined}
                  >
                    {filterFields}
                  </MobileFiltersTrigger>
                </div>
              </>
            )
          })()}

          <div className="flex items-center justify-between gap-3">
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
            <div className="flex items-center gap-2">
              {hasAnyFilter && (
                <SaveSearchButton
                  query={urlParams.toString()}
                  describe={() =>
                    describeSearch({
                      q, state, city, zip, type, medicaidOnly, minFiveStar, maxPriceMonthly, radiusMiles,
                    })
                  }
                />
              )}
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

        <div className="sticky top-24 hidden h-[calc(100vh-8rem)] lg:block">
          <FacilityMap
            facilities={results}
            origin={origin}
            radiusMiles={origin ? Number(radiusMiles) : null}
          />
        </div>
      </div>
      <CompareBar />
    </div>
  )
}

function CompareBar() {
  const compare = useCompare()
  if (compare.list.length === 0) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
      <div className="pointer-events-auto flex max-w-3xl flex-1 items-center gap-3 rounded-full border bg-card/95 px-4 py-2.5 shadow-lg backdrop-blur">
        <div className="flex flex-1 items-center gap-2 overflow-hidden">
          <GitCompareArrows className="h-4 w-4 shrink-0 text-primary" />
          <span className="text-sm font-medium">
            {compare.list.length} of {compare.max} to compare
          </span>
          <div className="hidden flex-1 items-center gap-1.5 overflow-x-auto text-xs text-muted-foreground sm:flex">
            {compare.list.map((e) => (
              <span
                key={e.id}
                className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5"
              >
                <span className="max-w-[140px] truncate">{e.name}</span>
                <button
                  onClick={() => compare.remove(e.id)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Remove"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={compare.clear}>
          Clear
        </Button>
        <Button asChild size="sm" disabled={compare.list.length < 2}>
          <Link to={`/compare?ids=${compare.list.map((e) => e.id).join(",")}`}>
            Compare
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  )
}

function ResultCard({ r }: { r: FacilityResult }) {
  const monthly = r.price_from_cents ? Math.round(r.price_from_cents / 100).toLocaleString() : null
  const hasBeds = r.available_beds > 0
  const compare = useCompare()
  const saved = useSaved()
  const inCompare = compare.has(r.id)
  const isSaved = saved.has(r.id)
  const compareFull = compare.list.length >= compare.max && !inCompare

  const onToggleCompare = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (compareFull) return
    compare.toggle({ id: r.id, slug: r.slug, name: r.name })
  }

  const onToggleSave = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    saved.toggle({ id: r.id, slug: r.slug, name: r.name, city: r.city, state: r.state })
  }

  return (
    <Link to={`/facility/${r.slug}`} className="relative block">
      <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5">
        <button
          type="button"
          onClick={onToggleSave}
          aria-pressed={isSaved}
          className={cn(
            "inline-flex h-7 w-7 items-center justify-center rounded-full border transition-colors",
            isSaved
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card/95 text-muted-foreground backdrop-blur hover:border-primary hover:text-foreground"
          )}
          title={isSaved ? "Remove from saved" : "Save facility"}
        >
          <Heart className={cn("h-3.5 w-3.5", isSaved && "fill-current")} />
        </button>
        <button
          type="button"
          onClick={onToggleCompare}
          disabled={compareFull}
          aria-pressed={inCompare}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
            inCompare
              ? "border-primary bg-primary text-primary-foreground"
              : compareFull
              ? "cursor-not-allowed border-border bg-muted text-muted-foreground opacity-60"
              : "border-border bg-card/95 text-muted-foreground backdrop-blur hover:border-primary hover:text-foreground"
          )}
          title={compareFull ? `Maximum ${compare.max} facilities — clear one first` : inCompare ? "Remove from comparison" : "Add to comparison"}
        >
          {inCompare ? <Check className="h-3.5 w-3.5" /> : <GitCompareArrows className="h-3.5 w-3.5" />}
          {inCompare ? "Comparing" : "Compare"}
        </button>
      </div>
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
              <div className="flex shrink-0 flex-col items-end gap-1">
                <QualityScoreBadge data={r.quality_score} variant="compact" />
                {r.cms_five_star_overall && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                    {r.cms_five_star_overall} CMS
                  </span>
                )}
              </div>
            </div>
            <div className="mt-4 flex items-end justify-between">
              <div>
                {monthly ? (
                  <>
                    <span className="text-lg font-semibold">${monthly}</span>
                    <span className="text-sm text-muted-foreground"> /mo</span>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">Pricing shared on tour</span>
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

function describeSearch(filters: {
  q: string; state: string; city: string; zip: string; type: string;
  medicaidOnly: boolean; minFiveStar: string; maxPriceMonthly: string; radiusMiles: string;
}): string {
  const bits: string[] = []
  if (filters.minFiveStar) bits.push(`${filters.minFiveStar}★+`)
  bits.push(TYPE_LABEL[filters.type] ?? "Care")
  if (filters.medicaidOnly) bits.push("(Medicaid)")
  if (filters.zip) bits.push(`within ${filters.radiusMiles}mi of ${filters.zip}`)
  else if (filters.city && filters.state) bits.push(`in ${filters.city}, ${filters.state}`)
  else if (filters.state) bits.push(`in ${filters.state}`)
  else if (filters.city) bits.push(`in ${filters.city}`)
  if (filters.maxPriceMonthly) bits.push(`≤ $${Number(filters.maxPriceMonthly).toLocaleString()}/mo`)
  if (filters.q) bits.push(`"${filters.q}"`)
  return bits.join(" ").trim() || "Search"
}

function SaveSearchButton({
  query,
  describe,
}: {
  query: string
  describe: () => string
}) {
  const saved = useSavedSearches()
  const alreadySaved = saved.hasQuery(query)
  const [justSaved, setJustSaved] = useState(false)

  const onClick = () => {
    if (alreadySaved) return
    saved.save(describe(), query)
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 1500)
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={alreadySaved || justSaved}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
        alreadySaved || justSaved
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:border-primary hover:text-foreground"
      )}
    >
      {alreadySaved || justSaved ? <Check className="h-3.5 w-3.5" /> : <BookmarkPlus className="h-3.5 w-3.5" />}
      {justSaved ? "Saved" : alreadySaved ? "Search saved" : "Save search"}
    </button>
  )
}

function SavedSearchesStrip() {
  const [, setUrlParams] = useSearchParams()
  const saved = useSavedSearches()

  if (saved.list.length === 0) return null

  const apply = (query: string) => {
    setUrlParams(new URLSearchParams(query))
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-accent/30 px-3 py-2 text-xs">
      <span className="font-medium text-accent-foreground">Saved searches</span>
      {saved.list.map((s) => (
        <span
          key={s.id}
          className="group inline-flex items-center gap-1 rounded-full border bg-card pl-2.5 pr-1 py-0.5"
        >
          <button
            type="button"
            onClick={() => apply(s.query)}
            className="text-foreground hover:text-primary"
          >
            {s.name}
          </button>
          <button
            type="button"
            onClick={() => saved.remove(s.id)}
            aria-label="Remove saved search"
            className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
    </div>
  )
}

function MobileFiltersTrigger({
  count,
  onClear,
  children,
}: {
  count: number
  onClear?: () => void
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full justify-between"
        onClick={() => setOpen(true)}
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </span>
        {count > 0 && (
          <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
            {count}
          </span>
        )}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Filters</DialogTitle>
          </DialogHeader>
          <div className="grid max-h-[60vh] grid-cols-2 gap-3 overflow-y-auto pr-1">
            {children}
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            {onClear ? (
              <Button type="button" variant="ghost" onClick={onClear}>
                <X className="h-4 w-4" />
                Clear all
              </Button>
            ) : (
              <span />
            )}
            <Button type="button" onClick={() => setOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function SearchHeaderSuggest({
  q, setQ, setZip, setCity, setState,
}: {
  q: string
  setQ: (v: string) => void
  setZip: (v: string) => void
  setCity: (v: string) => void
  setState: (v: string) => void
}) {
  const navigate = useNavigate()
  const onSelect = (s: Suggestion) => {
    if (s.kind === "facility") {
      navigate(`/facility/${s.slug}`)
      return
    }
    if (s.kind === "zip") {
      setZip(s.zip)
      setQ("")
      return
    }
    // city
    setState(s.state)
    setCity(s.city)
    setQ("")
  }
  return (
    <FacilitySuggest
      value={q}
      onChange={setQ}
      onSelect={onSelect}
      placeholder="City, ZIP, or facility name"
      size="md"
      leadingIcon="search"
    />
  )
}

function SavedFacilitiesStrip() {
  const saved = useSaved()
  const [proOpen, setProOpen] = useState(false)

  if (saved.list.length === 0) return null

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card px-3 py-2 text-xs">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <Heart className="h-3.5 w-3.5 fill-primary text-primary" />
          Saved facilities ({saved.list.length})
        </span>
        {saved.list.map((f) => (
          <span
            key={f.id}
            className="group inline-flex items-center gap-1 rounded-full border bg-background pl-2.5 pr-1 py-0.5"
          >
            <Link to={`/facility/${f.slug}`} className="text-foreground hover:text-primary">
              {f.name}
              <span className="ml-1 text-muted-foreground">· {f.city}, {f.state}</span>
            </Link>
            <button
              type="button"
              onClick={() => saved.remove(f.id)}
              aria-label="Remove saved facility"
              className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {saved.list.length >= 3 && (
          <button
            type="button"
            onClick={() => setProOpen(true)}
            className="ml-auto inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/5 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/10"
          >
            <Users className="h-3 w-3" />
            Share with family
            <Sparkles className="h-3 w-3" />
          </button>
        )}
      </div>
      <FamilyProModal open={proOpen} onClose={() => setProOpen(false)} trigger="saved-facilities" />
    </>
  )
}
