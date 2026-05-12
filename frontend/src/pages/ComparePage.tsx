import { useEffect, useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import {
  ArrowLeft,
  Building2,
  Check,
  ChevronRight,
  Loader2,
  Minus,
  Search,
  ShieldCheck,
  Star,
  X,
} from "lucide-react"
import { api } from "@/lib/api"
import { useCompare } from "@/lib/useCompare"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface CompareFacility {
  id: string
  name: string
  slug: string
  type: string
  city: string
  state: string
  zip: string
  hero_photo_url: string | null
  cms_five_star_overall: number | null
  cms_five_star_health_inspection: number | null
  cms_five_star_staffing: number | null
  cms_five_star_quality: number | null
  medicaid_certified: boolean
  medicare_certified: boolean
  total_beds: number | null
  available_beds: number
  price_from_cents: number | null
  pricing_tiers: Array<{ label: string; monthly_cents: number }>
  review_count: number
  review_average: number | null
  amenities: string[]
}

interface AmenityRow {
  slug: string
  label: string
}

const TYPE_LABEL: Record<string, string> = {
  snf: "Skilled Nursing",
  assisted_living: "Assisted Living",
  memory_care: "Memory Care",
  ccrc: "Continuing Care",
}

function dollars(cents: number | null | undefined): string {
  if (!cents) return "—"
  return `$${Math.round(cents / 100).toLocaleString()}/mo`
}

function stars(n: number | null): string {
  if (!n) return "—"
  return `${n.toFixed(1)} ★`
}

export function ComparePage() {
  const [params, setParams] = useSearchParams()
  const compare = useCompare()
  const [facilities, setFacilities] = useState<CompareFacility[]>([])
  const [amenityRows, setAmenityRows] = useState<AmenityRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Resolve IDs from URL params first, then from localStorage compare list.
  const ids = useMemo(() => {
    const fromUrl = params.get("ids")
    if (fromUrl) {
      return fromUrl
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 4)
    }
    return compare.list.map((e) => e.id)
  }, [params, compare.list])

  // Keep URL in sync with the active list (so the URL is shareable)
  useEffect(() => {
    if (ids.length === 0) return
    const current = params.get("ids")
    const next = ids.join(",")
    if (current !== next) {
      setParams({ ids: next }, { replace: true })
    }
  }, [ids, params, setParams])

  useEffect(() => {
    if (ids.length < 2) {
      setFacilities([])
      setAmenityRows([])
      return
    }
    let alive = true
    setLoading(true)
    setError(null)
    api
      .get<{ data: CompareFacility[]; amenity_rows: AmenityRow[] }>(
        "/marketplace/compare",
        { params: new URLSearchParams(ids.map((id) => ["ids[]", id])) }
      )
      .then((r) => {
        if (!alive) return
        // Preserve the order the user added them
        const byId = new Map(r.data.data.map((f) => [f.id, f]))
        setFacilities(ids.map((id) => byId.get(id)).filter(Boolean) as CompareFacility[])
        setAmenityRows(r.data.amenity_rows)
      })
      .catch((err) =>
        alive && setError(err.response?.data?.message ?? "Failed to load comparison")
      )
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [ids])

  const removeFacility = (id: string) => {
    compare.remove(id)
    const remaining = ids.filter((i) => i !== id)
    if (remaining.length === 0) {
      setParams({}, { replace: true })
    } else {
      setParams({ ids: remaining.join(",") }, { replace: true })
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            CarePath
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Button asChild variant="ghost" size="sm">
              <Link to="/search">
                <ArrowLeft className="h-4 w-4" />
                Back to search
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col items-start gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Compare facilities
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Side-by-side CMS ratings, pricing, amenities, and availability.
              Up to {compare.max} facilities.
            </p>
          </div>
          {facilities.length > 0 && (
            <Button variant="outline" onClick={() => { compare.clear(); setParams({}, { replace: true }) }}>
              Clear all
            </Button>
          )}
        </div>

        {loading && (
          <div className="mt-12 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {!loading && ids.length < 2 && <EmptyState />}

        {!loading && facilities.length >= 2 && (
          <CompareTable
            facilities={facilities}
            amenityRows={amenityRows}
            onRemove={removeFacility}
          />
        )}
      </section>
    </div>
  )
}

function EmptyState() {
  return (
    <Card className="mt-10">
      <CardContent className="flex flex-col items-center gap-4 p-12 text-center">
        <div className="rounded-full bg-accent/60 p-4">
          <Building2 className="h-8 w-8 text-accent-foreground" />
        </div>
        <h2 className="text-lg font-semibold">Pick 2–4 facilities to compare</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          From the search results page, tap the "Compare" checkbox on any
          facility card. We'll line them up side-by-side here.
        </p>
        <Button asChild className="mt-2">
          <Link to="/search">
            <Search className="h-4 w-4" />
            Browse facilities
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function CompareTable({
  facilities,
  amenityRows,
  onRemove,
}: {
  facilities: CompareFacility[]
  amenityRows: AmenityRow[]
  onRemove: (id: string) => void
}) {
  const cols = `minmax(180px, 1fr) repeat(${facilities.length}, minmax(180px, 1fr))`

  return (
    <div className="mt-8 overflow-x-auto rounded-xl border bg-card">
      {/* Header row with hero images + name + remove */}
      <div className="grid border-b" style={{ gridTemplateColumns: cols }}>
        <div className="border-r p-4" />
        {facilities.map((f) => (
          <div key={f.id} className="border-r p-4 last:border-r-0">
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted">
              {f.hero_photo_url ? (
                <img src={f.hero_photo_url} alt="" className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
                  <Building2 className="h-8 w-8" />
                </div>
              )}
              <button
                onClick={() => onRemove(f.id)}
                className="absolute right-1.5 top-1.5 rounded-full bg-background/90 p-1 shadow-sm transition-colors hover:bg-background"
                aria-label="Remove from comparison"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <Link to={`/facility/${f.slug}`} className="mt-3 block">
              <div className="line-clamp-2 text-sm font-semibold leading-snug hover:underline">{f.name}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {TYPE_LABEL[f.type] ?? f.type} · {f.city}, {f.state}
              </div>
            </Link>
          </div>
        ))}
      </div>

      <Section cols={cols} label="Overall rating">
        {facilities.map((f) => (
          <Cell key={f.id}>
            <span className="inline-flex items-center gap-1 font-semibold">
              <Star className="h-4 w-4 text-amber-500" />
              {stars(f.cms_five_star_overall)}
            </span>
          </Cell>
        ))}
      </Section>

      <Section cols={cols} label="Health inspection">
        {facilities.map((f) => (
          <Cell key={f.id}>{stars(f.cms_five_star_health_inspection)}</Cell>
        ))}
      </Section>
      <Section cols={cols} label="Staffing rating">
        {facilities.map((f) => (
          <Cell key={f.id}>{stars(f.cms_five_star_staffing)}</Cell>
        ))}
      </Section>
      <Section cols={cols} label="Quality measures">
        {facilities.map((f) => (
          <Cell key={f.id}>{stars(f.cms_five_star_quality)}</Cell>
        ))}
      </Section>

      <Section cols={cols} label="Family reviews">
        {facilities.map((f) => (
          <Cell key={f.id}>
            {f.review_count === 0 ? (
              <span className="text-muted-foreground">No reviews yet</span>
            ) : (
              <span>
                {f.review_average?.toFixed(1)} ★{" "}
                <span className="text-xs text-muted-foreground">({f.review_count})</span>
              </span>
            )}
          </Cell>
        ))}
      </Section>

      <Divider />

      <Section cols={cols} label="Starting price">
        {facilities.map((f) => (
          <Cell key={f.id}>
            <span className="font-semibold">{dollars(f.price_from_cents)}</span>
          </Cell>
        ))}
      </Section>

      {facilities.some((f) => f.pricing_tiers.length > 0) && (
        <Section cols={cols} label="Pricing tiers">
          {facilities.map((f) => (
            <Cell key={f.id}>
              {f.pricing_tiers.length === 0 ? (
                <span className="text-muted-foreground">—</span>
              ) : (
                <ul className="space-y-1">
                  {f.pricing_tiers.map((t, i) => (
                    <li key={i} className="text-xs">
                      <span className="text-muted-foreground">{t.label}:</span>{" "}
                      <span className="font-medium">{dollars(t.monthly_cents)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Cell>
          ))}
        </Section>
      )}

      <Section cols={cols} label="Medicaid certified">
        {facilities.map((f) => (
          <Cell key={f.id}>
            {f.medicaid_certified ? (
              <span className="inline-flex items-center gap-1 text-emerald-700">
                <ShieldCheck className="h-4 w-4" />
                Accepted
              </span>
            ) : (
              <span className="text-muted-foreground">Not accepted</span>
            )}
          </Cell>
        ))}
      </Section>
      <Section cols={cols} label="Medicare certified">
        {facilities.map((f) => (
          <Cell key={f.id}>
            {f.medicare_certified ? (
              <span className="inline-flex items-center gap-1 text-emerald-700">
                <Check className="h-4 w-4" />
                Yes
              </span>
            ) : (
              <span className="text-muted-foreground">No</span>
            )}
          </Cell>
        ))}
      </Section>

      <Divider />

      <Section cols={cols} label="Total beds">
        {facilities.map((f) => (
          <Cell key={f.id}>{f.total_beds ?? "—"}</Cell>
        ))}
      </Section>
      <Section cols={cols} label="Available now">
        {facilities.map((f) => (
          <Cell key={f.id}>
            {f.available_beds > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                {f.available_beds} available
              </span>
            ) : (
              <span className="text-muted-foreground">Waitlist</span>
            )}
          </Cell>
        ))}
      </Section>

      {amenityRows.length > 0 && (
        <>
          <Divider />
          <div className="grid border-b" style={{ gridTemplateColumns: cols }}>
            <div className="border-r bg-muted/30 p-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Amenities
            </div>
            {facilities.map((f) => (
              <div key={f.id} className="border-r bg-muted/30 p-3 last:border-r-0" />
            ))}
          </div>
          {amenityRows.map((row) => (
            <Section key={row.slug} cols={cols} label={row.label}>
              {facilities.map((f) => (
                <Cell key={f.id}>
                  {f.amenities.includes(row.slug) ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Minus className="h-4 w-4 text-muted-foreground/40" />
                  )}
                </Cell>
              ))}
            </Section>
          ))}
        </>
      )}

      {/* CTA row */}
      <div className="grid" style={{ gridTemplateColumns: cols }}>
        <div className="border-r p-4" />
        {facilities.map((f) => (
          <div key={f.id} className="border-r p-4 last:border-r-0">
            <Button asChild size="sm" className="w-full">
              <Link to={`/facility/${f.slug}`}>
                Open
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

function Section({
  label,
  cols,
  children,
}: {
  label: string
  cols: string
  children: React.ReactNode
}) {
  return (
    <div className="grid border-b" style={{ gridTemplateColumns: cols }}>
      <div className="border-r p-3 text-sm font-medium text-muted-foreground">{label}</div>
      {children}
    </div>
  )
}

function Cell({ children }: { children: React.ReactNode }) {
  return <div className="border-r p-3 text-sm last:border-r-0">{children}</div>
}

function Divider() {
  return <div className="h-px bg-border" />
}
