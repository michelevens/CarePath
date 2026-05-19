import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import {
  ArrowLeft,
  Building2,
  Calendar,
  CalendarPlus,
  Calculator,
  Check,
  CheckCircle2,
  Download,
  GitCompareArrows,
  Heart,
  Loader2,
  Mail,
  MapPin,
  Phone,
  BadgeCheck,
  ExternalLink,
  Flag,
  Shield,
  ShieldCheck,
  Star,
  X,
} from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth"
import { WriteReviewModal } from "@/components/WriteReviewModal"
import { useCompare } from "@/lib/useCompare"
import { useSaved } from "@/lib/useSaved"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Meta } from "@/components/Meta"
import { QualityScoreBadge, type QualityScore } from "@/components/QualityScoreBadge"
import { FamilyProModal } from "@/components/FamilyProModal"
import { Sparkles } from "lucide-react"
import { amenityIcon } from "@/lib/amenityIcons"

interface Photo {
  id: string
  url: string
  caption: string | null
  category: string | null
}

interface PricingTier {
  id: string
  tier_type: "base" | "level_adder" | "ancillary" | "community_fee"
  name: string
  level_of_care: string | null
  amount_cents: number
  billing_cadence: "monthly" | "one_time" | "per_visit"
  notes: string | null
}

interface Review {
  id: string
  author_name: string
  author_relationship: string | null
  rating: number
  title: string | null
  body: string
  photos: Array<{ url: string; caption?: string }> | null
  is_verified: boolean
  stay_started_at: string | null
  created_at: string
  helpful_count: number
  facility_response: string | null
  facility_responded_at: string | null
}

interface ReviewStats {
  count: number
  average: number
  verified_count: number
  sub_scores: {
    cleanliness: number | null
    friendliness: number | null
    care: number | null
    staff: number | null
    meals: number | null
    activities: number | null
    value: number | null
  }
}

interface Amenity {
  id: string
  category: "healthcare" | "dining" | "room" | "community" | "activities" | "services"
  name: string
  detail: string | null
  is_featured: boolean
}

interface ComparableFacility {
  id: string
  name: string
  slug: string
  type: string
  city: string
  state: string
  cms_five_star_overall: number | null
  medicaid_certified: boolean
  price_from_cents: number | null
  total_beds: number
  available_beds: number
  distance_miles?: number
  quality_score: QualityScore | null
}

interface Facility {
  id: string
  name: string
  slug: string
  type: string
  ownership_type: string | null
  address_line_1: string
  address_line_2: string | null
  city: string
  state: string
  zip: string
  phone: string | null
  email: string | null
  website: string | null
  tagline: string | null
  description: string | null
  medicaid_certified: boolean
  medicare_certified: boolean
  cms_five_star_overall: number | null
  cms_five_star_health_inspection: number | null
  cms_five_star_staffing: number | null
  cms_five_star_quality: number | null
  total_beds: number
  price_from_cents: number | null
  available_beds: number
  available_by_level: Record<string, number>
  photos: Photo[]
  pricing_tiers: PricingTier[]
  reviews: Review[]
  review_stats: ReviewStats
  amenities: Amenity[]
  comparables: ComparableFacility[]
  quality_score: QualityScore | null
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

const LEVEL_LABEL: Record<string, string> = {
  independent: "Independent",
  assisted: "Assisted",
  memory: "Memory",
  skilled: "Skilled",
  hospice: "Hospice",
}

export function FacilityDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const [facility, setFacility] = useState<Facility | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tourOpen, setTourOpen] = useState(false)
  const [tourPreset, setTourPreset] = useState<TourType | undefined>(undefined)
  const [askOpen, setAskOpen] = useState(false)
  const openTour = (preset?: TourType) => {
    setTourPreset(preset)
    setTourOpen(true)
  }

  // Sticky tour bar: shown when the sidebar CTA card scrolls out of view.
  // Mirrors APFM's most-clicked CTA placement, minus the lead-gen pressure.
  const sidebarCardRef = useRef<HTMLDivElement | null>(null)
  const [sidebarVisible, setSidebarVisible] = useState(true)
  useEffect(() => {
    if (!sidebarCardRef.current || typeof IntersectionObserver === "undefined") return
    const observer = new IntersectionObserver(
      ([entry]) => setSidebarVisible(entry.isIntersecting),
      { threshold: 0.1 }
    )
    observer.observe(sidebarCardRef.current)
    return () => observer.disconnect()
  }, [facility])

  const loadFacility = () => {
    if (!slug) return
    api
      .get<{ data: Facility }>(`/marketplace/facilities/${slug}`)
      .then((r) => setFacility(r.data.data))
      .catch(() => {})
  }

  useEffect(() => {
    if (!slug) return
    let alive = true
    setLoading(true)
    setError(null)
    api
      .get<{ data: Facility }>(`/marketplace/facilities/${slug}`)
      .then((r) => {
        if (!alive) return
        setFacility(r.data.data)
        // Log a detail_view event (fire-and-forget). Drives the
        // facility-admin analytics page (#11).
        api
          .post("/marketplace/track-events", {
            events: [{
              facility_id: r.data.data.id,
              kind: "detail_view",
              source: document.referrer.includes("/senior-living/") ? "city_page" : "search",
            }],
          })
          .catch(() => {})
      })
      .catch((err) => {
        if (!alive) return
        if (err.response?.status === 404) setError("Facility not found.")
        else setError(err.response?.data?.message ?? "Failed to load")
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [slug])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading facility…
      </div>
    )
  }

  if (error || !facility) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
        <p className="text-muted-foreground">{error ?? "Not found"}</p>
        <Button asChild className="mt-6">
          <Link to="/search">Back to search</Link>
        </Button>
      </div>
    )
  }

  const monthly = facility.price_from_cents
    ? Math.round(facility.price_from_cents / 100).toLocaleString()
    : null

  const typeLabel = TYPE_LABEL[facility.type] ?? facility.type
  const metaTitle = `${facility.name} — ${typeLabel} in ${facility.city}, ${facility.state}`
  const metaDescription = `${facility.name} in ${facility.city}, ${facility.state}. ${typeLabel}${facility.cms_five_star_overall ? ` · CMS ${facility.cms_five_star_overall}/5 stars` : ""}${monthly ? ` · from $${monthly}/mo` : ""}. View pricing, availability, photos, and reviews.`
  const facilityJsonLd = {
    "@context": "https://schema.org",
    "@type": facility.type === "snf" ? "MedicalBusiness" : "LodgingBusiness",
    name: facility.name,
    address: {
      "@type": "PostalAddress",
      addressLocality: facility.city,
      addressRegion: facility.state,
      postalCode: facility.zip,
      addressCountry: "US",
    },
    image: facility.photos?.[0]?.url,
    aggregateRating:
      facility.review_stats?.count && facility.review_stats.average
        ? {
            "@type": "AggregateRating",
            ratingValue: facility.review_stats.average,
            reviewCount: facility.review_stats.count,
            bestRating: 5,
          }
        : undefined,
    priceRange: monthly ? `from $${monthly}/mo` : undefined,
  }

  return (
    <div className="min-h-screen bg-background">
      <Meta
        title={metaTitle}
        description={metaDescription}
        image={facility.photos?.[0]?.url}
        canonical={`/facility/${facility.slug}`}
        type="website"
        jsonLd={facilityJsonLd}
      />
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            CarePath
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link to="/search">
              <ArrowLeft className="h-4 w-4" />
              Back to search
            </Link>
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <Breadcrumbs facility={facility} />
        <PhotoGallery photos={facility.photos} facilityName={facility.name} />

        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h1 className="text-3xl font-semibold tracking-tight">{facility.name}</h1>
                <CompareToggle id={facility.id} slug={facility.slug} name={facility.name} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {facility.city}, {facility.state} {facility.zip}
                </span>
                <span>·</span>
                <span>{TYPE_LABEL[facility.type] ?? facility.type}</span>
                <VerifiedBadge />
              </div>

              {/* Big-number review score + CMS one-liner — the at-a-glance
                  gestalt families look at first, alongside the QualityScore tile. */}
              {facility.review_stats.count > 0 && (
                <div className="mt-4 inline-flex items-center gap-3 rounded-lg border bg-card px-4 py-2.5">
                  <span className="text-3xl font-bold tabular-nums">
                    {facility.review_stats.average.toFixed(1)}
                  </span>
                  <div className="text-xs text-muted-foreground">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          className={cn(
                            "h-3.5 w-3.5",
                            n <= Math.round(facility.review_stats.average)
                              ? "fill-amber-400 text-amber-500"
                              : "text-muted-foreground/30"
                          )}
                        />
                      ))}
                    </div>
                    <div className="mt-0.5">
                      {facility.review_stats.count} review{facility.review_stats.count === 1 ? "" : "s"}
                      {facility.review_stats.verified_count > 0 && (
                        <> · {facility.review_stats.verified_count} verified</>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {facility.medicaid_certified && (
                <Badge>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Medicaid certified
                </Badge>
              )}
              {facility.medicare_certified && (
                <Badge>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Medicare certified
                </Badge>
              )}
            </div>

            <QualityScoreBadge data={facility.quality_score} variant="hero" />

            <ActionBar
              slug={facility.slug}
              onSiteTour={() => openTour("in_person")}
              virtualTour={() => openTour("virtual")}
              ask={() => setAskOpen(true)}
            />

            <section>
              <h2 className="text-lg font-semibold">Detailed CMS ratings</h2>
              <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                <StarTile label="Overall" value={facility.cms_five_star_overall} />
                <StarTile label="Health inspection" value={facility.cms_five_star_health_inspection} />
                <StarTile label="Staffing" value={facility.cms_five_star_staffing} />
                <StarTile label="Quality measures" value={facility.cms_five_star_quality} />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Ratings sourced from CMS Nursing Home Compare (master data).
              </p>
            </section>

            <PricingBreakdown tiers={facility.pricing_tiers} />

            <section>
              <h2 className="text-lg font-semibold">Availability</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Live bed availability — refreshed in real time from the facility.
              </p>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {Object.entries(facility.available_by_level).map(([level, count]) => (
                  <Card key={level}>
                    <CardContent className="p-4">
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">
                        {LEVEL_LABEL[level] ?? level}
                      </div>
                      <div className="mt-1 text-2xl font-semibold">{count}</div>
                    </CardContent>
                  </Card>
                ))}
                {Object.keys(facility.available_by_level).length === 0 && (
                  <p className="col-span-3 text-sm text-muted-foreground">
                    No beds currently available — waitlist only.
                  </p>
                )}
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold">Contact</h2>
              <div className="mt-3 space-y-2 text-sm">
                <div>
                  {facility.address_line_1}
                  {facility.address_line_2 && <>, {facility.address_line_2}</>}, {facility.city}, {facility.state} {facility.zip}
                </div>
                {facility.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    {facility.phone}
                  </div>
                )}
                {facility.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    {facility.email}
                  </div>
                )}
              </div>
            </section>

            {(facility.tagline || facility.description) && (
              <section className="space-y-2">
                <h2 className="text-xl font-semibold">About this community</h2>
                {facility.tagline && (
                  <p className="text-base text-muted-foreground">{facility.tagline}</p>
                )}
                {facility.description && (
                  <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                    {facility.description}
                  </p>
                )}
              </section>
            )}

            <AmenitiesSection amenities={facility.amenities} />

            <CostProjectionCalculator
              facilitySlug={facility.slug}
              defaultLevel={facility.pricing_tiers[0]?.level_of_care ?? "assisted"}
            />

            <ReviewsSection
              reviews={facility.reviews}
              stats={facility.review_stats}
              facilitySlug={facility.slug}
              facilityName={facility.name}
              onReviewSubmitted={() => loadFacility()}
            />

            <LocationSection facility={facility} />

            <ComparableFacilitiesSection
              facilities={facility.comparables}
              currentName={facility.name}
            />

            <ConnectWithFacility facility={facility} onAsk={() => setAskOpen(true)} />

            <ClaimFacilitySection facility={facility} />
          </div>

          <aside>
            <Card className="sticky top-6" ref={sidebarCardRef as React.RefObject<HTMLDivElement>}>
              <CardContent className="p-6">
                <div className="flex items-baseline justify-between">
                  <div>
                    {monthly ? (
                      <>
                        <span className="text-2xl font-semibold">${monthly}</span>
                        <span className="text-sm text-muted-foreground"> /mo from</span>
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">Pricing shared on tour</span>
                    )}
                  </div>
                  <span className="text-sm font-medium">
                    {facility.available_beds} bed{facility.available_beds === 1 ? "" : "s"} available
                  </span>
                </div>

                <Button className="mt-4 w-full" size="lg" onClick={() => openTour()}>
                  <Calendar className="h-4 w-4" />
                  Request a tour
                </Button>
                <SaveFacilityButton
                  id={facility.id}
                  slug={facility.slug}
                  name={facility.name}
                  city={facility.city}
                  state={facility.state}
                />
                <BrochureDownloadButton slug={facility.slug} />

                <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
                  <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  We don't sell your contact info. Only this facility sees it.
                </p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>

      {!sidebarVisible && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 px-4 py-3 shadow-lg backdrop-blur pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{facility.name}</div>
              <div className="truncate text-xs text-muted-foreground">
                {monthly ? (
                  <>
                    From <span className="font-medium text-foreground">${monthly}/mo</span>
                    {" · "}
                  </>
                ) : null}
                {facility.available_beds} bed{facility.available_beds === 1 ? "" : "s"} available
              </div>
            </div>
            <Button onClick={() => openTour()} size="lg" className="shrink-0">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Request a tour</span>
              <span className="sm:hidden">Tour</span>
            </Button>
          </div>
        </div>
      )}

      <TourRequestDialog
        open={tourOpen}
        onClose={() => setTourOpen(false)}
        facilitySlug={facility.slug}
        facilityName={facility.name}
        initialTourType={tourPreset}
      />

      <AskFacilityDialog
        open={askOpen}
        onClose={() => setAskOpen(false)}
        facilitySlug={facility.slug}
        facilityName={facility.name}
      />
    </div>
  )
}

function VerifiedBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-xs font-medium text-primary"
      title="Listing data is refreshed daily from CMS Nursing Home Compare and the facility's own systems. Pricing is the facility's published rate, not a commissioned-advisor quote."
    >
      <ShieldCheck className="h-3 w-3" />
      Verified data
    </span>
  )
}

function Breadcrumbs({ facility }: { facility: Facility }) {
  const typeLabel = TYPE_LABEL[facility.type] ?? facility.type
  const items = [
    { label: "Home", to: "/" },
    { label: "Long-term care", to: "/search" },
    { label: typeLabel, to: `/search?type=${facility.type}` },
    { label: facility.state, to: `/senior-living/${facility.state}` },
    {
      label: facility.city,
      to: `/senior-living/${facility.state}/${encodeURIComponent(facility.city)}`,
    },
    { label: facility.name, to: null as string | null },
  ]
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.label,
      ...(it.to ? { item: typeof window !== "undefined" ? window.location.origin + it.to : it.to } : {}),
    })),
  }
  return (
    <>
      <nav
        aria-label="Breadcrumb"
        className="mb-4 flex flex-wrap items-center gap-x-1 gap-y-1 text-xs text-muted-foreground"
      >
        {items.map((it, i) => (
          <span key={`${it.label}-${i}`} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/60" />}
            {it.to ? (
              <Link to={it.to} className="hover:text-foreground hover:underline">
                {it.label}
              </Link>
            ) : (
              <span className="text-foreground" aria-current="page">
                {it.label}
              </span>
            )}
          </span>
        ))}
      </nav>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  )
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      {children}
    </span>
  )
}

function PhotoGallery({ photos, facilityName }: { photos: Photo[]; facilityName: string }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  if (photos.length === 0) {
    /*
     * Empty-state acquisition hook. ~80% of our directory is OSM-
     * ingested facilities that haven't been claimed yet, so this is
     * the first thing a family sees. Instead of a row of generic
     * Building2 icons, overlay a quiet "are you the manager?" CTA on
     * top of the same skeleton grid — same visual weight, but pulls
     * a manager into the claim flow when they Google their own
     * facility and find the page bare.
     */
    return (
      <div className="relative mb-6 h-72 overflow-hidden rounded-xl">
        <div className="grid h-full grid-cols-4 gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={cn(
                "flex items-center justify-center bg-muted text-muted-foreground/40",
                i === 0 && "col-span-2 row-span-2"
              )}
            >
              <Building2 className="h-10 w-10" />
            </div>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/50 via-transparent to-transparent p-5">
          <div className="pointer-events-auto flex max-w-md flex-col items-center gap-2 text-center">
            <p className="text-sm font-medium text-white">
              {facilityName} hasn't shared photos yet.
            </p>
            <a
              href="#claim-facility"
              onClick={(e) => {
                e.preventDefault()
                document
                  .getElementById("claim-facility")
                  ?.scrollIntoView({ behavior: "smooth", block: "center" })
              }}
              className="rounded-full bg-white/95 px-4 py-1.5 text-xs font-semibold text-foreground shadow-sm hover:bg-white"
            >
              Are you the manager? Claim this listing →
            </a>
          </div>
        </div>
      </div>
    )
  }

  const featured = photos[0]
  const sidePhotos = photos.slice(1, 5)

  return (
    <>
      <div className="mb-6 grid h-72 grid-cols-4 gap-2 overflow-hidden rounded-xl md:h-96">
        <button
          onClick={() => setLightboxIndex(0)}
          className={cn(
            "col-span-2 row-span-2 overflow-hidden bg-muted",
            sidePhotos.length === 0 && "col-span-4"
          )}
        >
          <img
            src={featured.url}
            alt={featured.caption ?? facilityName}
            className="h-full w-full object-cover transition-transform hover:scale-105"
            loading="lazy"
          />
        </button>
        {sidePhotos.map((p, i) => (
          <button
            key={p.id}
            onClick={() => setLightboxIndex(i + 1)}
            className="overflow-hidden bg-muted"
          >
            <img
              src={p.url}
              alt={p.caption ?? facilityName}
              className="h-full w-full object-cover transition-transform hover:scale-105"
              loading="lazy"
            />
          </button>
        ))}
      </div>

      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute right-4 top-4 rounded-full bg-background/20 p-2 text-white hover:bg-background/30"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={photos[lightboxIndex].url}
            alt={photos[lightboxIndex].caption ?? ""}
            className="max-h-[85vh] max-w-[85vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}

function fmtMoney(cents: number) {
  return `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

function cadenceLabel(c: string) {
  return c === "monthly" ? "/mo" : c === "one_time" ? " one-time" : "/visit"
}

function PricingSection({ title, items }: { title: string; items: PricingTier[] }) {
  if (items.length === 0) return null
  return (
    <div>
      <div className="px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      <ul className="mt-1 divide-y rounded-md border bg-card">
        {items.map((t) => (
          <li key={t.id} className="flex items-baseline justify-between gap-4 px-3 py-2.5">
            <div className="min-w-0">
              <div className="text-sm font-medium">{t.name}</div>
              {t.notes && <div className="text-xs text-muted-foreground">{t.notes}</div>}
            </div>
            <div className="shrink-0 text-sm font-semibold tabular-nums">
              {fmtMoney(t.amount_cents)}
              <span className="font-normal text-muted-foreground">
                {cadenceLabel(t.billing_cadence)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function PricingBreakdown({ tiers }: { tiers: PricingTier[] }) {
  if (tiers.length === 0) {
    return null
  }

  const baseRates = tiers.filter((t) => t.tier_type === "base")
  const adders = tiers.filter((t) => t.tier_type === "level_adder")
  const ancillaries = tiers.filter((t) => t.tier_type === "ancillary")
  const fees = tiers.filter((t) => t.tier_type === "community_fee")

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Transparent pricing</h2>
        <span className="text-xs text-muted-foreground">No hidden fees, no surprises.</span>
      </div>
      <div className="mt-3 space-y-4">
        <PricingSection title="Base rates" items={baseRates} />
        <PricingSection title="Level-of-care adders" items={adders} />
        <PricingSection title="Ancillary services" items={ancillaries} />
        <PricingSection title="Community fees" items={fees} />
      </div>
    </section>
  )
}

function ReviewsSection({
  reviews,
  stats,
  facilitySlug,
  facilityName,
  onReviewSubmitted,
}: {
  reviews: Review[]
  stats: ReviewStats
  facilitySlug: string
  facilityName: string
  onReviewSubmitted: () => void
}) {
  const { user } = useAuth()
  const [writeOpen, setWriteOpen] = useState(false)

  const writeCta = user ? (
    <Button size="sm" variant="outline" onClick={() => setWriteOpen(true)}>
      Write a review
    </Button>
  ) : (
    <Button size="sm" variant="outline" asChild>
      <Link to={`/login?next=/facility/${facilitySlug}`}>Sign in to review</Link>
    </Button>
  )

  if (reviews.length === 0) {
    return (
      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Reviews</h2>
          {writeCta}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          No reviews yet for this facility. Be the first.
        </p>
        <WriteReviewModal
          open={writeOpen}
          onClose={() => setWriteOpen(false)}
          facilitySlug={facilitySlug}
          facilityName={facilityName}
          onSubmitted={onReviewSubmitted}
        />
      </section>
    )
  }

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Reviews</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {stats.verified_count} of {stats.count} verified ·{" "}
            <Shield className="inline h-3 w-3" /> tied to confirmed stays
          </span>
          {writeCta}
        </div>
      </div>
      <WriteReviewModal
        open={writeOpen}
        onClose={() => setWriteOpen(false)}
        facilitySlug={facilitySlug}
        facilityName={facilityName}
        onSubmitted={onReviewSubmitted}
      />

      <div className="mt-3 grid gap-3 md:grid-cols-[200px_1fr]">
        <div className="flex flex-col items-center justify-center rounded-md border bg-accent/40 px-4 py-5 text-center">
          <div className="text-4xl font-bold tabular-nums text-foreground">
            {stats.average.toFixed(1)}
          </div>
          <div className="mt-1 flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                className={cn(
                  "h-4 w-4",
                  n <= Math.round(stats.average)
                    ? "fill-amber-400 text-amber-500"
                    : "text-muted-foreground/30"
                )}
              />
            ))}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {stats.count} review{stats.count === 1 ? "" : "s"}
          </div>
        </div>

        {/* Multi-metric sub-scores */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-md border bg-card px-4 py-4 text-sm">
          <SubScore label="Cleanliness" value={stats.sub_scores.cleanliness} />
          <SubScore label="Friendliness" value={stats.sub_scores.friendliness} />
          <SubScore label="Care services" value={stats.sub_scores.care} />
          <SubScore label="Staff" value={stats.sub_scores.staff} />
          <SubScore label="Meals" value={stats.sub_scores.meals} />
          <SubScore label="Activities" value={stats.sub_scores.activities} />
          <SubScore label="Value for cost" value={stats.sub_scores.value} />
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {reviews.map((r) => (
          <ReviewCard key={r.id} review={r} />
        ))}
      </div>
    </section>
  )
}

function ReviewCard({ review: r }: { review: Review }) {
  const [helpfulCount, setHelpfulCount] = useState(r.helpful_count ?? 0)
  const [voted, setVoted] = useState(false)
  const [busy, setBusy] = useState(false)

  const toggleHelpful = async () => {
    if (busy) return
    setBusy(true)
    try {
      const res = await api.post<{ data: { helpful_count: number; voted: boolean } }>(
        `/reviews/${r.id}/helpful`
      )
      setHelpfulCount(res.data.data.helpful_count)
      setVoted(res.data.data.voted)
    } catch {
      // Silent — non-critical; commonly 401 for logged-out users.
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{r.author_name}</span>
              {r.is_verified && (
                <span className="inline-flex items-center gap-1 rounded bg-foreground px-1.5 py-0.5 text-[10px] font-medium text-background">
                  <ShieldCheck className="h-3 w-3" />
                  Verified stay
                </span>
              )}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground capitalize">
              {r.author_relationship}
              {r.stay_started_at && (
                <> · stayed since {new Date(r.stay_started_at).toLocaleDateString()}</>
              )}
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                className={cn(
                  "h-3.5 w-3.5",
                  n <= r.rating ? "fill-current" : "text-muted-foreground/30"
                )}
              />
            ))}
          </div>
        </div>
        {r.title && <h3 className="mt-2 font-medium">{r.title}</h3>}
        <p className="mt-1 text-sm text-muted-foreground">{r.body}</p>

        {r.photos && r.photos.length > 0 && (
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {r.photos.map((p, i) => (
              <a
                key={i}
                href={p.url}
                target="_blank"
                rel="noreferrer"
                className="block shrink-0"
                title={p.caption ?? ""}
              >
                <img
                  src={p.url}
                  alt={p.caption ?? "Review photo"}
                  className="h-24 w-24 rounded-md object-cover ring-1 ring-border hover:opacity-90"
                  loading="lazy"
                />
              </a>
            ))}
          </div>
        )}

        {r.facility_response && (
          <div className="mt-3 rounded-md border-l-4 border-violet-500 bg-violet-50/40 p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-violet-700">
              Response from the facility
              {r.facility_responded_at && (
                <span className="ml-1 font-normal text-muted-foreground">
                  · {new Date(r.facility_responded_at).toLocaleDateString()}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-foreground">{r.facility_response}</p>
          </div>
        )}

        <div className="mt-3 flex items-center justify-end">
          <button
            type="button"
            onClick={toggleHelpful}
            disabled={busy}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs transition-colors",
              voted
                ? "border-violet-500 bg-violet-50 text-violet-800"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            👍 Helpful{helpfulCount > 0 && <span className="ml-1 tabular-nums">({helpfulCount})</span>}
          </button>
        </div>
      </CardContent>
    </Card>
  )
}

function StarTile({ label, value }: { label: string; value: number | null }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="text-2xl font-semibold">{value ?? "—"}</span>
          {value && <span className="text-sm text-muted-foreground">/ 5</span>}
        </div>
      </CardContent>
    </Card>
  )
}

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type TourType = "in_person" | "virtual" | "self_guided"
interface Slot { starts_at: string; label: string }

function TourRequestDialog({
  open,
  onClose,
  facilitySlug,
  facilityName,
  initialTourType,
}: {
  open: boolean
  onClose: () => void
  facilitySlug: string
  facilityName: string
  initialTourType?: TourType
}) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(initialTourType ? 2 : 1)
  const [tourType, setTourType] = useState<TourType | null>(initialTourType ?? null)

  // When the consumer reopens with a different preset, jump straight to
  // slot selection for that type.
  useEffect(() => {
    if (open && initialTourType) {
      setTourType(initialTourType)
      setStep(2)
    }
  }, [open, initialTourType])
  const [date, setDate] = useState<string>(() => {
    // Default to first Tue-Sat in next 7 days.
    const d = new Date()
    while (d.getDay() === 0 || d.getDay() === 1) d.setDate(d.getDate() + 1)
    return d.toISOString().slice(0, 10)
  })
  const [slot, setSlot] = useState<Slot | null>(null)
  const [slots, setSlots] = useState<Slot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  const [details, setDetails] = useState({
    attendee_name: "",
    attendee_email: "",
    attendee_phone: "",
    relationship_to_prospect: "adult_child",
    prospect_first_name: "",
    prospect_last_name: "",
    prospect_level_of_care: "assisted",
    notes: "",
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bookedSummary, setBookedSummary] = useState<{ starts_at: string; tour_type: TourType } | null>(null)

  const reset = () => {
    setStep(1)
    setTourType(null)
    setSlot(null)
    setSlots([])
    setError(null)
    setBookedSummary(null)
    setDetails({
      attendee_name: "",
      attendee_email: "",
      attendee_phone: "",
      relationship_to_prospect: "adult_child",
      prospect_first_name: "",
      prospect_last_name: "",
      prospect_level_of_care: "assisted",
      notes: "",
    })
  }

  // Fetch slots when (date, tourType) changes and we're on step 2.
  useEffect(() => {
    if (step !== 2 || !tourType) return
    let alive = true
    setLoadingSlots(true)
    setSlot(null)
    api
      .get<{ slots: Slot[] }>(`/marketplace/facilities/${facilitySlug}/tour-slots`, {
        params: { date, tour_type: tourType },
      })
      .then((r) => alive && setSlots(r.data.slots))
      .catch(() => alive && setSlots([]))
      .finally(() => alive && setLoadingSlots(false))
    return () => {
      alive = false
    }
  }, [step, tourType, date, facilitySlug])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!slot || !tourType) return
    setError(null)
    setSubmitting(true)
    try {
      await api.post("/marketplace/tours", {
        facility_slug: facilitySlug,
        starts_at: slot.starts_at,
        tour_type: tourType,
        ...details,
        attendee_phone: details.attendee_phone || undefined,
        notes: details.notes || undefined,
      })
      setBookedSummary({ starts_at: slot.starts_at, tour_type: tourType })
      setStep(4)
    } catch (err) {
      const e = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }
      const first = e.response?.data?.errors ? Object.values(e.response.data.errors)[0]?.[0] : undefined
      setError(first ?? e.response?.data?.message ?? "Booking failed")
    } finally {
      setSubmitting(false)
    }
  }

  const nextDays = useMemo(() => {
    const out: Array<{ value: string; label: string }> = []
    const d = new Date()
    for (let i = 0; i < 21; i++) {
      const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i)
      out.push({
        value: dt.toISOString().slice(0, 10),
        label: dt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }),
      })
    }
    return out
  }, [])

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          onClose()
          setTimeout(reset, 300)
        }
      }}
    >
      <DialogContent>
        {step === 4 && bookedSummary ? (
          <div className="space-y-4 py-2 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-foreground" />
            <DialogHeader>
              <DialogTitle>Tour booked</DialogTitle>
              <DialogDescription>
                {facilityName} on{" "}
                <span className="font-medium text-foreground">
                  {new Date(bookedSummary.starts_at).toLocaleString(undefined, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
                <br />
                {bookedSummary.tour_type === "in_person" && "In-person tour"}
                {bookedSummary.tour_type === "virtual" && "Virtual tour — link will be emailed"}
                {bookedSummary.tour_type === "self_guided" && "Self-guided tour"}
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  downloadTourIcs({
                    facilityName,
                    startsAt: bookedSummary.starts_at,
                    tourType: bookedSummary.tour_type,
                  })
                }
              >
                <CalendarPlus className="h-4 w-4" />
                Add to calendar
              </Button>
              <Button onClick={onClose}>Done</Button>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>
                {step === 1 && "Choose tour type"}
                {step === 2 && "Pick a date and time"}
                {step === 3 && "Confirm your details"}
              </DialogTitle>
              <DialogDescription>
                {facilityName} · step {step} of 3
              </DialogDescription>
            </DialogHeader>

            {step === 1 && (
              <div className="mt-4 grid grid-cols-1 gap-2">
                <TourTypeCard
                  type="in_person"
                  label="In-person tour"
                  description="Visit on-site. Meet staff. See suites + common spaces."
                  active={tourType === "in_person"}
                  onClick={() => {
                    setTourType("in_person")
                    setStep(2)
                  }}
                />
                <TourTypeCard
                  type="virtual"
                  label="Virtual tour"
                  description="Video walkthrough with a staff member. 30–45 min on Zoom."
                  active={tourType === "virtual"}
                  onClick={() => {
                    setTourType("virtual")
                    setStep(2)
                  }}
                />
                <TourTypeCard
                  type="self_guided"
                  label="Self-guided"
                  description="Stop by during open hours. Front desk will hand you a map."
                  active={tourType === "self_guided"}
                  onClick={() => {
                    setTourType("self_guided")
                    setStep(2)
                  }}
                />
                <div className="mt-2 rounded-md border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
                  <div className="font-medium text-foreground">What happens after you book</div>
                  <ol className="mt-1.5 list-decimal space-y-0.5 pl-4">
                    <li>Your details go to {facilityName} <span className="font-medium">only</span> — no advisors, no other facilities.</li>
                    <li>You get a confirmation email immediately + a reminder before the tour.</li>
                    <li>The facility reaches out within one business day to confirm.</li>
                  </ol>
                </div>
              </div>
            )}

            {step === 2 && tourType && (
              <div className="mt-4 space-y-4">
                <div className="flex gap-1 overflow-x-auto pb-1">
                  {nextDays.map((d) => (
                    <button
                      key={d.value}
                      onClick={() => setDate(d.value)}
                      className={cn(
                        "shrink-0 rounded-md border px-3 py-2 text-xs transition-colors",
                        date === d.value
                          ? "border-foreground bg-foreground text-background"
                          : "border-border bg-background hover:bg-accent"
                      )}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>

                {loadingSlots ? (
                  <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking availability…
                  </div>
                ) : slots.length === 0 ? (
                  <div className="rounded-md border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
                    No openings on this date — try another day.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {slots.map((s) => (
                      <button
                        key={s.starts_at}
                        onClick={() => {
                          setSlot(s)
                          setStep(3)
                        }}
                        className={cn(
                          "rounded-md border px-3 py-2 text-sm transition-colors",
                          slot?.starts_at === s.starts_at
                            ? "border-foreground bg-foreground text-background"
                            : "border-border bg-background hover:bg-accent"
                        )}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setStep(1)}>
                    Back
                  </Button>
                </DialogFooter>
              </div>
            )}

            {step === 3 && slot && tourType && (
              <form onSubmit={submit}>
                <div className="mt-4 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                  <div className="font-medium">
                    {new Date(slot.starts_at).toLocaleString(undefined, {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {tourType.replace("_", " ")} tour ·{" "}
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="underline hover:text-foreground"
                    >
                      change
                    </button>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Field label="Your name" required colspan
                    value={details.attendee_name}
                    onChange={(v) => setDetails((d) => ({ ...d, attendee_name: v }))}
                  />
                  <Field label="Email" type="email" required
                    value={details.attendee_email}
                    onChange={(v) => setDetails((d) => ({ ...d, attendee_email: v }))}
                  />
                  <Field label="Phone"
                    value={details.attendee_phone}
                    onChange={(v) => setDetails((d) => ({ ...d, attendee_phone: v }))}
                  />
                  <Select label="Relationship"
                    value={details.relationship_to_prospect}
                    onChange={(v) => setDetails((d) => ({ ...d, relationship_to_prospect: v }))}
                    options={[
                      { value: "self", label: "Self" },
                      { value: "spouse", label: "Spouse" },
                      { value: "adult_child", label: "Adult child" },
                      { value: "poa", label: "POA" },
                      { value: "hospital", label: "Hospital / planner" },
                      { value: "other", label: "Other" },
                    ]}
                  />
                  <Select label="Level of care"
                    value={details.prospect_level_of_care}
                    onChange={(v) => setDetails((d) => ({ ...d, prospect_level_of_care: v }))}
                    options={[
                      { value: "independent", label: "Independent" },
                      { value: "assisted", label: "Assisted" },
                      { value: "memory", label: "Memory care" },
                      { value: "skilled", label: "Skilled nursing" },
                      { value: "hospice", label: "Hospice" },
                    ]}
                  />
                  <Field label="Resident — first name" required
                    value={details.prospect_first_name}
                    onChange={(v) => setDetails((d) => ({ ...d, prospect_first_name: v }))}
                  />
                  <Field label="Last name" required
                    value={details.prospect_last_name}
                    onChange={(v) => setDetails((d) => ({ ...d, prospect_last_name: v }))}
                  />
                  <div className="col-span-2">
                    <label className="text-sm font-medium">Anything else?</label>
                    <textarea
                      value={details.notes}
                      onChange={(e) => setDetails((d) => ({ ...d, notes: e.target.value }))}
                      rows={2}
                      placeholder="Specific concerns or questions for the tour."
                      className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
                {error && (
                  <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </div>
                )}
                <DialogFooter className="mt-4">
                  <Button type="button" variant="ghost" onClick={() => setStep(2)}>
                    Back
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Confirm booking
                  </Button>
                </DialogFooter>
              </form>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function TourTypeCard({
  label,
  description,
  active,
  onClick,
}: {
  type: TourType
  label: string
  description: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-start rounded-lg border p-4 text-left transition-colors",
        active
          ? "border-foreground bg-accent"
          : "border-border bg-background hover:bg-accent"
      )}
    >
      <span className="font-medium">{label}</span>
      <span className="mt-1 text-sm text-muted-foreground">{description}</span>
    </button>
  )
}

function Field({
  label,
  type = "text",
  required,
  value,
  onChange,
  colspan,
}: {
  label: string
  type?: string
  required?: boolean
  value: string
  onChange: (v: string) => void
  colspan?: boolean
}) {
  return (
    <div className={colspan ? "col-span-2" : undefined}>
      <label className="text-sm font-medium">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-ring"
      />
    </div>
  )
}

function Select({
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
      <label className="text-sm font-medium">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-ring"
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

interface ProjectionYearRow {
  year: number
  facility_cost_cents: number
  medicare_cents: number
  medicaid_cents: number
  ltc_cents: number
  va_cents: number
  out_of_pocket_cents: number
}

interface ProjectionResponse {
  monthly_rate_cents: number
  months: number
  totals: {
    facility_cost_cents: number
    medicare_covered_cents: number
    medicaid_covered_cents: number
    ltc_covered_cents: number
    va_covered_cents: number
    out_of_pocket_cents: number
    months_until_medicaid: number | null
  }
  by_year: ProjectionYearRow[]
}

function CostProjectionCalculator({
  facilitySlug,
  defaultLevel,
}: {
  facilitySlug: string
  defaultLevel: string | null
}) {
  const [inputs, setInputs] = useState({
    level_of_care: defaultLevel ?? "assisted",
    months: 36,
    starting_assets_dollars: 150000,
    monthly_income_dollars: 2800,
    medicare_part_a_eligible: false,
    medicaid_eligible_state: true,
    ltc_insurance_daily_benefit_dollars: 0,
    ltc_insurance_total_pool_dollars: 0,
    va_aa_status: "none" as "none" | "single_veteran" | "veteran_and_spouse" | "surviving_spouse",
  })
  const [result, setResult] = useState<ProjectionResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const project = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.post<{ data: ProjectionResponse }>("/marketplace/cost-projection", {
        facility_slug: facilitySlug,
        level_of_care: inputs.level_of_care,
        months: inputs.months,
        starting_assets_cents: Math.round(inputs.starting_assets_dollars * 100),
        monthly_income_cents: Math.round(inputs.monthly_income_dollars * 100),
        medicare_part_a_eligible: inputs.medicare_part_a_eligible,
        medicaid_eligible_state: inputs.medicaid_eligible_state,
        ltc_insurance_daily_benefit_cents: Math.round(inputs.ltc_insurance_daily_benefit_dollars * 100),
        ltc_insurance_total_pool_cents: Math.round(inputs.ltc_insurance_total_pool_dollars * 100),
        va_aa_status: inputs.va_aa_status,
      })
      setResult(res.data.data)
    } catch (err) {
      const e = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }
      const first = e.response?.data?.errors ? Object.values(e.response.data.errors)[0]?.[0] : undefined
      setError(first ?? e.response?.data?.message ?? "Calculation failed")
    } finally {
      setLoading(false)
    }
  }

  // Auto-compute on first mount.
  useEffect(() => {
    void project()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fmt = (c: number) => `$${Math.round(c / 100).toLocaleString()}`

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Calculator className="h-5 w-5" />
          Cost projection
        </h2>
        <span className="text-xs text-muted-foreground">
          Blended Medicare A + Medicaid + LTC ins + VA + private pay
        </span>
      </div>

      <Card className="mt-3">
        <CardContent className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Level of care</label>
              <select
                value={inputs.level_of_care}
                onChange={(e) => setInputs({ ...inputs, level_of_care: e.target.value })}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-ring"
              >
                <option value="independent">Independent</option>
                <option value="assisted">Assisted</option>
                <option value="memory">Memory</option>
                <option value="skilled">Skilled</option>
                <option value="hospice">Hospice</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Months of care</label>
              <input
                type="number"
                value={inputs.months}
                min={1}
                max={60}
                onChange={(e) => setInputs({ ...inputs, months: Number(e.target.value) })}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Starting assets ($)</label>
              <input
                type="number"
                value={inputs.starting_assets_dollars}
                min={0}
                step={1000}
                onChange={(e) => setInputs({ ...inputs, starting_assets_dollars: Number(e.target.value) })}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Monthly income ($)</label>
              <input
                type="number"
                value={inputs.monthly_income_dollars}
                min={0}
                step={100}
                onChange={(e) => setInputs({ ...inputs, monthly_income_dollars: Number(e.target.value) })}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                LTC ins daily benefit ($)
              </label>
              <input
                type="number"
                value={inputs.ltc_insurance_daily_benefit_dollars}
                min={0}
                step={10}
                onChange={(e) =>
                  setInputs({ ...inputs, ltc_insurance_daily_benefit_dollars: Number(e.target.value) })
                }
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">LTC ins total pool ($)</label>
              <input
                type="number"
                value={inputs.ltc_insurance_total_pool_dollars}
                min={0}
                step={1000}
                onChange={(e) =>
                  setInputs({ ...inputs, ltc_insurance_total_pool_dollars: Number(e.target.value) })
                }
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground">VA Aid & Attendance</label>
              <select
                value={inputs.va_aa_status}
                onChange={(e) =>
                  setInputs({ ...inputs, va_aa_status: e.target.value as typeof inputs.va_aa_status })
                }
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-ring"
              >
                <option value="none">Not eligible</option>
                <option value="single_veteran">Single veteran ($2,727/mo)</option>
                <option value="veteran_and_spouse">Veteran + spouse ($3,232/mo)</option>
                <option value="surviving_spouse">Surviving spouse ($1,754/mo)</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={inputs.medicare_part_a_eligible}
                onChange={(e) =>
                  setInputs({ ...inputs, medicare_part_a_eligible: e.target.checked })
                }
              />
              Eligible for Medicare Part A SNF benefit
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={inputs.medicaid_eligible_state}
                onChange={(e) =>
                  setInputs({ ...inputs, medicaid_eligible_state: e.target.checked })
                }
              />
              State has Medicaid LTC waiver
            </label>
          </div>

          <Button onClick={project} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Recalculate
          </Button>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {result && (
            <div className="space-y-4 border-t pt-4">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <Stat
                  label="Total facility cost"
                  value={fmt(result.totals.facility_cost_cents)}
                />
                <Stat
                  label="Total covered by payers"
                  value={fmt(
                    result.totals.facility_cost_cents - result.totals.out_of_pocket_cents
                  )}
                />
                <Stat
                  label="Your out-of-pocket"
                  value={fmt(result.totals.out_of_pocket_cents)}
                  emphasize
                />
              </div>

              {result.totals.months_until_medicaid !== null && (
                <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                  Estimated Medicaid eligibility:{" "}
                  <span className="font-medium">
                    month {result.totals.months_until_medicaid}
                  </span>{" "}
                  (when assets drop below $2,000).
                </div>
              )}

              <div>
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Year-by-year breakdown
                </div>
                <div className="mt-2 overflow-x-auto rounded-md border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Year</th>
                        <th className="px-3 py-2 text-right font-medium">Facility cost</th>
                        <th className="px-3 py-2 text-right font-medium">Medicare</th>
                        <th className="px-3 py-2 text-right font-medium">Medicaid</th>
                        <th className="px-3 py-2 text-right font-medium">LTC ins</th>
                        <th className="px-3 py-2 text-right font-medium">VA</th>
                        <th className="px-3 py-2 text-right font-medium">Out of pocket</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.by_year.map((r) => (
                        <tr key={r.year} className="border-t">
                          <td className="px-3 py-2">Year {r.year}</td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {fmt(r.facility_cost_cents)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                            {r.medicare_cents > 0 ? fmt(r.medicare_cents) : "—"}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                            {r.medicaid_cents > 0 ? fmt(r.medicaid_cents) : "—"}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                            {r.ltc_cents > 0 ? fmt(r.ltc_cents) : "—"}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                            {r.va_cents > 0 ? fmt(r.va_cents) : "—"}
                          </td>
                          <td className="px-3 py-2 text-right font-medium tabular-nums">
                            {fmt(r.out_of_pocket_cents)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Estimates use 2024 federal benchmarks. State-specific
                Medicaid rules and asset exemptions vary. Talk to an
                elder-law attorney before relying on these numbers for
                planning.
              </p>

              <SaveProjectionForm
                facilitySlug={facilitySlug}
                projectionInputs={inputs}
                projectionTotals={result.totals}
              />

              <CostProjectionProUpsell />
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  )
}

function CostProjectionProUpsell() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between gap-3 rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-left text-sm transition-colors hover:bg-primary/10"
      >
        <div>
          <div className="flex items-center gap-2 font-medium text-primary">
            <Sparkles className="h-4 w-4" />
            Export this projection as a PDF
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            CarePath Pro · branded PDF for family meetings or your elder-law attorney
          </div>
        </div>
        <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
          See Pro
        </span>
      </button>
      <FamilyProModal open={open} onClose={() => setOpen(false)} trigger="cost-projection" />
    </>
  )
}

function SaveProjectionForm({
  facilitySlug,
  projectionInputs,
  projectionTotals,
}: {
  facilitySlug: string
  projectionInputs: unknown
  projectionTotals: unknown
}) {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await api.post("/marketplace/leads", {
        source: "cost_projection",
        email,
        facility_slug: facilitySlug,
        context: { inputs: projectionInputs, totals: projectionTotals },
      })
      setSubmitted(true)
    } catch (err) {
      const e = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }
      const first = e.response?.data?.errors ? Object.values(e.response.data.errors)[0]?.[0] : undefined
      setError(first ?? e.response?.data?.message ?? "Save failed")
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="rounded-md border border-foreground/30 bg-accent px-3 py-2 text-sm">
        <CheckCircle2 className="mr-1 inline h-4 w-4" />
        Estimate saved. We'll email you a PDF copy.
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="rounded-md border bg-muted/30 px-4 py-3">
      <div className="text-sm font-medium">Save this estimate</div>
      <p className="mt-1 text-xs text-muted-foreground">
        Get a PDF copy + free updates if pricing or availability changes
        at this facility. We don't share your email with anyone else.
      </p>
      <div className="mt-2 flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-ring"
        />
        <Button type="submit" disabled={submitting || !email}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Save
        </Button>
      </div>
      {error && (
        <div className="mt-2 text-xs text-destructive">{error}</div>
      )}
    </form>
  )
}

function Stat({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-md border bg-card p-3",
        emphasize && "border-foreground bg-accent"
      )}
    >
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
    </div>
  )
}

function SubScore({ label, value }: { label: string; value: number | null }) {
  const pct = value ? (value / 5) * 100 : 0
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-xs text-muted-foreground">{label}</span>
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 shrink-0 text-right text-xs font-semibold tabular-nums">
        {value ? value.toFixed(1) : "—"}
      </span>
    </div>
  )
}

/* ──────────────── Amenities ──────────────── */

import {
  Stethoscope,
  Utensils,
  BedDouble,
  Users,
  Music,
  Truck,
  ChevronDown,
  ChevronRight,
  Navigation,
} from "lucide-react"

const AMENITY_CATEGORY_LABEL: Record<Amenity["category"], string> = {
  healthcare: "Healthcare services",
  dining: "Dining",
  room: "Room features",
  community: "Community",
  activities: "Activities",
  services: "Services",
}

const AMENITY_CATEGORY_ICON: Record<Amenity["category"], React.ComponentType<{ className?: string }>> = {
  healthcare: Stethoscope,
  dining: Utensils,
  room: BedDouble,
  community: Users,
  activities: Music,
  services: Truck,
}

function AmenitiesSection({ amenities }: { amenities: Amenity[] }) {
  const grouped = useMemo(() => {
    const map: Record<Amenity["category"], Amenity[]> = {
      healthcare: [], dining: [], room: [], community: [], activities: [], services: [],
    }
    amenities.forEach((a) => map[a.category]?.push(a))
    return map
  }, [amenities])

  const orderedCategories = (Object.keys(AMENITY_CATEGORY_LABEL) as Amenity["category"][]).filter(
    (c) => grouped[c].length > 0
  )

  // Empty state still renders the heading so families know amenities
  // are tracked here — previously the whole section vanished, which
  // made it look like the feature didn't exist.
  if (orderedCategories.length === 0) {
    return (
      <section>
        <h2 className="text-lg font-semibold">Amenities &amp; services</h2>
        <div className="mt-3 rounded-lg border border-dashed bg-muted/30 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            This facility hasn't listed amenities yet.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Tour notes typically capture dining, activities, healthcare services, room
            features, and transportation — ask about them when you visit.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Amenities &amp; services</h2>
        <span className="text-xs text-muted-foreground">
          {amenities.length} listed
        </span>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {orderedCategories.map((cat) => (
          <AmenityCategoryCard
            key={cat}
            category={cat}
            label={AMENITY_CATEGORY_LABEL[cat]}
            items={grouped[cat]}
          />
        ))}
      </div>
    </section>
  )
}

function AmenityCategoryCard({
  category,
  label,
  items,
}: {
  category: Amenity["category"]
  label: string
  items: Amenity[]
}) {
  const [expanded, setExpanded] = useState(false)
  const Icon = AMENITY_CATEGORY_ICON[category]
  const visible = expanded ? items : items.slice(0, 5)
  const hasMore = items.length > 5

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-accent p-2 text-accent-foreground">
            <Icon className="h-4 w-4" />
          </div>
          <div className="font-semibold">{label}</div>
          <span className="ml-auto text-xs text-muted-foreground">{items.length}</span>
        </div>
        <ul className="mt-3 space-y-1.5 text-sm">
          {visible.map((a) => {
            const AIcon = amenityIcon(a.name)
            return (
              <li key={a.id} className="flex items-start gap-2">
                <AIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span>
                  {a.name}
                  {a.detail && (
                    <span className="ml-1 text-muted-foreground">— {a.detail}</span>
                  )}
                </span>
              </li>
            )
          })}
        </ul>
        {hasMore && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            {expanded ? "Show fewer" : `Show all ${items.length}`}
          </button>
        )}
      </CardContent>
    </Card>
  )
}

/* ──────────────── Location + map ──────────────── */

function LocationSection({ facility }: { facility: Facility }) {
  const addressQuery = encodeURIComponent(
    `${facility.address_line_1}, ${facility.city}, ${facility.state} ${facility.zip}`
  )

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Location</h2>
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${addressQuery}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          <Navigation className="h-3.5 w-3.5" />
          Get directions
        </a>
      </div>
      <Card className="mt-3 overflow-hidden">
        <iframe
          title={`Map of ${facility.name}`}
          src={`https://www.google.com/maps?q=${addressQuery}&output=embed`}
          className="block h-[320px] w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        <div className="border-t bg-muted/30 px-4 py-3 text-sm">
          <div className="font-medium">
            {facility.address_line_1}
            {facility.address_line_2 && <>, {facility.address_line_2}</>}
          </div>
          <div className="text-muted-foreground">
            {facility.city}, {facility.state} {facility.zip}
          </div>
        </div>
      </Card>
    </section>
  )
}

/* ──────────────── Comparable nearby facilities ──────────────── */

function ComparableFacilitiesSection({
  facilities,
  currentName,
}: {
  facilities: ComparableFacility[]
  currentName: string
}) {
  if (facilities.length === 0) return null

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Nearby alternatives</h2>
        <span className="text-xs text-muted-foreground">
          Side-by-side with {currentName}. Sortable, all real listings, no paid placement.
        </span>
      </div>
      <div className="mt-3 overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2.5 text-left font-medium">Facility</th>
              <th className="px-3 py-2.5 text-left font-medium">Quality</th>
              <th className="hidden px-3 py-2.5 text-left font-medium md:table-cell">CMS</th>
              <th className="px-3 py-2.5 text-left font-medium">Price</th>
              <th className="hidden px-3 py-2.5 text-left font-medium md:table-cell">Distance</th>
              <th className="px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {facilities.map((c) => {
              const monthly = c.price_from_cents
                ? Math.round(c.price_from_cents / 100).toLocaleString()
                : null
              return (
                <tr key={c.id} className="border-t hover:bg-muted/20">
                  <td className="px-3 py-3 align-top">
                    <Link to={`/facility/${c.slug}`} className="font-semibold text-primary hover:underline">
                      {c.name}
                    </Link>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {c.city}, {c.state}
                    </div>
                    {c.medicaid_certified && (
                      <span className="mt-1 inline-block rounded bg-accent px-1.5 py-0.5 text-xs font-medium text-accent-foreground">
                        Medicaid
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 align-top">
                    {c.quality_score ? (
                      <QualityScoreBadge data={c.quality_score} variant="inline" />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="hidden px-3 py-3 align-top text-sm md:table-cell">
                    {c.cms_five_star_overall ? (
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                        {c.cms_five_star_overall}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 align-top text-sm">
                    {monthly ? (
                      <>
                        <span className="font-semibold">${monthly}</span>
                        <span className="text-xs text-muted-foreground"> /mo</span>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">On tour</span>
                    )}
                  </td>
                  <td className="hidden px-3 py-3 align-top text-sm text-muted-foreground md:table-cell">
                    {c.distance_miles !== undefined ? `${c.distance_miles} mi` : "—"}
                  </td>
                  <td className="px-3 py-3 align-top text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/facility/${c.slug}`}>View</Link>
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function CompareToggle({ id, slug, name }: { id: string; slug: string; name: string }) {
  const compare = useCompare()
  const inCompare = compare.has(id)
  const compareFull = compare.list.length >= compare.max && !inCompare

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={inCompare ? "default" : "outline"}
        size="sm"
        disabled={compareFull}
        onClick={() => compare.toggle({ id, slug, name })}
        title={compareFull ? `Maximum ${compare.max} facilities — clear one first` : undefined}
      >
        {inCompare ? <Check className="h-4 w-4" /> : <GitCompareArrows className="h-4 w-4" />}
        {inCompare ? "In comparison" : "Compare"}
      </Button>
      {compare.list.length >= 2 && (
        <Button asChild variant="ghost" size="sm">
          <Link to={`/compare?ids=${compare.list.map((e) => e.id).join(",")}`}>
            See {compare.list.length}
          </Link>
        </Button>
      )}
    </div>
  )
}

function BrochureDownloadButton({ slug }: { slug: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onClick = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/marketplace/facilities/${slug}/brochure`, {
        responseType: "blob",
      })
      // Server may return an error payload even with a blob responseType
      // (we asked for blob, but a 500 still comes back as text/json wrapped
      // in a Blob). Detect by content-type.
      const contentType = (res.headers as Record<string, string>)["content-type"] ?? ""
      const data = res.data as Blob
      if (!contentType.includes("pdf")) {
        const text = await data.text()
        let message = "Brochure download failed."
        try {
          const json = JSON.parse(text)
          message = json.message ?? message
        } catch {
          /* not JSON */
        }
        setError(message)
        return
      }
      const blob = new Blob([data], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `carepath-${slug}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 0)
    } catch (err) {
      const e = err as { response?: { data?: Blob }; message?: string }
      let message = e.message ?? "Brochure download failed."
      if (e.response?.data instanceof Blob) {
        try {
          const text = await e.response.data.text()
          const json = JSON.parse(text)
          message = json.message ?? message
        } catch {
          /* leave default */
        }
      }
      setError(message)
    } finally {
      setLoading(false)
    }
  }
  return (
    <>
      <Button
        variant="ghost"
        className="mt-2 w-full text-muted-foreground hover:text-foreground"
        onClick={onClick}
        disabled={loading}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        Download brochure (PDF)
      </Button>
      {error && (
        <div className="mt-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}
    </>
  )
}

function SaveFacilityButton({
  id,
  slug,
  name,
  city,
  state,
}: {
  id: string
  slug: string
  name: string
  city: string
  state: string
}) {
  const saved = useSaved()
  const isSaved = saved.has(id)

  return (
    <Button
      variant={isSaved ? "default" : "outline"}
      className="mt-2 w-full"
      onClick={() => saved.toggle({ id, slug, name, city, state })}
    >
      <Heart className={cn("h-4 w-4", isSaved && "fill-current")} />
      {isSaved ? "Saved" : "Save facility"}
    </Button>
  )
}

function downloadTourIcs({
  facilityName,
  startsAt,
  tourType,
}: {
  facilityName: string
  startsAt: string
  tourType: TourType
}) {
  // Build an iCalendar VEVENT. End time defaults to +1h since the booking
  // backend uses a 60-minute duration.
  const start = new Date(startsAt)
  const end = new Date(start.getTime() + 60 * 60 * 1000)

  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}T${String(d.getUTCHours()).padStart(2, "0")}${String(d.getUTCMinutes()).padStart(2, "0")}00Z`

  const title =
    tourType === "in_person"
      ? `Tour: ${facilityName}`
      : tourType === "virtual"
      ? `Virtual tour: ${facilityName}`
      : `Self-guided tour: ${facilityName}`

  const description =
    tourType === "virtual"
      ? "Video walkthrough — Zoom link will be emailed by the facility."
      : tourType === "self_guided"
      ? "Stop by the front desk during open hours."
      : "In-person tour. The facility will confirm the meeting point."

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CarePath//Tour//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${start.getTime()}-${slugify(facilityName)}@carepath`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${escapeIcs(title)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    `LOCATION:${escapeIcs(facilityName)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n")

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `tour-${slugify(facilityName)}.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
}

function escapeIcs(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n")
}

/* ──────────────── ActionBar — quick CTAs above the fold ──────────────── */

function ActionBar({
  slug,
  onSiteTour,
  virtualTour,
  ask,
}: {
  slug: string
  onSiteTour: () => void
  virtualTour: () => void
  ask: () => void
}) {
  const [downloading, setDownloading] = useState(false)
  const onBrochure = async () => {
    setDownloading(true)
    try {
      const res = await api.get(`/marketplace/facilities/${slug}/brochure`, {
        responseType: "blob",
      })
      const blob = new Blob([res.data as BlobPart], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `carepath-${slug}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 0)
    } catch {
      // Sidebar BrochureDownloadButton surfaces a more detailed error; this
      // quick-action variant fails quietly so the rest of the bar stays usable.
    } finally {
      setDownloading(false)
    }
  }
  return (
    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
      <Button size="lg" onClick={onSiteTour}>
        <Calendar className="h-4 w-4" />
        On-site tour
      </Button>
      <Button size="lg" variant="outline" onClick={virtualTour}>
        <Calendar className="h-4 w-4" />
        Virtual tour
      </Button>
      <Button size="lg" variant="outline" onClick={ask}>
        <Mail className="h-4 w-4" />
        Ask the facility
      </Button>
      <Button size="lg" variant="outline" onClick={onBrochure} disabled={downloading}>
        {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        Brochure (PDF)
      </Button>
    </div>
  )
}

/* ──────────────── ConnectWithFacility — bottom-of-page lead capture ──────────────── */

function ConnectWithFacility({
  facility,
  onAsk,
}: {
  facility: Facility
  onAsk: () => void
}) {
  return (
    <section className="rounded-2xl border bg-accent/20 p-6 sm:p-8">
      <div className="grid gap-6 md:grid-cols-[230px_1fr]">
        <div className="space-y-2">
          <TrustPill icon={ShieldCheck}>100% free for families</TrustPill>
          <TrustPill icon={Shield}>Only this facility sees your message</TrustPill>
          <TrustPill icon={Phone}>You choose if and when to be contacted</TrustPill>
          <TrustPill icon={Building2}>Goes directly to admissions</TrustPill>
        </div>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Talk to {facility.name} directly
          </h2>
          <p className="mt-2 text-muted-foreground">
            Most senior-living lead-gen sites auction your contact info to
            dozens of facilities at once. We don't. When you send a question
            here, it goes to this facility's admissions team — and only this
            facility. No surprise calls from operators you didn't reach out to.
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              Ask about pricing, availability, level-of-care fit, dietary
              accommodations — anything you'd ask on a tour.
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              No phone number required. Email-only by default.
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              Your message stays with this facility. It's never resold or
              syndicated to a lead-broker network.
            </li>
          </ul>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button size="lg" onClick={onAsk}>
              <Mail className="h-4 w-4" />
              Send a message
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#tour">Request a tour instead</a>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Prefer working with a placement advisor? CarePath supports a vetted
            advisor network — every advisor discloses upfront how they're paid.
            Advisor connections coming soon.
          </p>
        </div>
      </div>
    </section>
  )
}

function TrustPill({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border bg-card px-3 py-2 text-sm">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <span>{children}</span>
    </div>
  )
}

/* ──────────────── AskFacilityDialog — direct-to-admissions inquiry ──────────────── */

function AskFacilityDialog({
  open,
  onClose,
  facilitySlug,
  facilityName,
}: {
  open: boolean
  onClose: () => void
  facilitySlug: string
  facilityName: string
}) {
  const [form, setForm] = useState({
    inquirer_name: "",
    inquirer_email: "",
    inquirer_phone: "",
    inquirer_relationship: "adult_child",
    prospect_first_name: "",
    prospect_last_name: "",
    prospect_level_of_care: "assisted",
    notes: "",
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const reset = () => {
    setForm({
      inquirer_name: "",
      inquirer_email: "",
      inquirer_phone: "",
      inquirer_relationship: "adult_child",
      prospect_first_name: "",
      prospect_last_name: "",
      prospect_level_of_care: "assisted",
      notes: "",
    })
    setError(null)
    setDone(false)
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await api.post("/marketplace/inquiries", {
        facility_slug: facilitySlug,
        ...form,
        inquirer_phone: form.inquirer_phone || undefined,
        notes: form.notes || undefined,
      })
      setDone(true)
    } catch (err) {
      const e = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }
      const first = e.response?.data?.errors ? Object.values(e.response.data.errors)[0]?.[0] : undefined
      setError(first ?? e.response?.data?.message ?? "Send failed — try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          onClose()
          setTimeout(reset, 300)
        }
      }}
    >
      <DialogContent>
        {done ? (
          <div className="space-y-4 py-2 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
            <DialogHeader>
              <DialogTitle>Message sent</DialogTitle>
              <DialogDescription>
                We've forwarded your question to {facilityName}'s admissions
                team. They typically respond within one business day. Your
                contact info was shared with this facility only — no one else.
              </DialogDescription>
            </DialogHeader>
            <Button onClick={onClose}>Done</Button>
          </div>
        ) : (
          <form onSubmit={onSubmit}>
            <DialogHeader>
              <DialogTitle>Ask {facilityName}</DialogTitle>
              <DialogDescription>
                Goes directly to {facilityName}'s admissions team. Not
                auctioned to other facilities. No surprise calls.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 grid gap-3">
              <Field
                label="Your name"
                required
                value={form.inquirer_name}
                onChange={(v) => setForm((f) => ({ ...f, inquirer_name: v }))}
              />
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Email"
                  type="email"
                  required
                  value={form.inquirer_email}
                  onChange={(v) => setForm((f) => ({ ...f, inquirer_email: v }))}
                />
                <Field
                  label="Phone (optional)"
                  value={form.inquirer_phone}
                  onChange={(v) => setForm((f) => ({ ...f, inquirer_phone: v }))}
                />
              </div>
              <Select
                label="You are"
                value={form.inquirer_relationship}
                onChange={(v) => setForm((f) => ({ ...f, inquirer_relationship: v }))}
                options={[
                  { value: "self", label: "The person needing care" },
                  { value: "spouse", label: "Spouse / partner" },
                  { value: "adult_child", label: "Adult child" },
                  { value: "poa", label: "Power of attorney" },
                  { value: "hospital", label: "Hospital / discharge planner" },
                  { value: "other", label: "Other" },
                ]}
              />
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Resident — first name"
                  required
                  value={form.prospect_first_name}
                  onChange={(v) => setForm((f) => ({ ...f, prospect_first_name: v }))}
                />
                <Field
                  label="Last name"
                  required
                  value={form.prospect_last_name}
                  onChange={(v) => setForm((f) => ({ ...f, prospect_last_name: v }))}
                />
              </div>
              <Select
                label="Level of care"
                value={form.prospect_level_of_care}
                onChange={(v) => setForm((f) => ({ ...f, prospect_level_of_care: v }))}
                options={[
                  { value: "independent", label: "Independent" },
                  { value: "assisted", label: "Assisted" },
                  { value: "memory", label: "Memory care" },
                  { value: "skilled", label: "Skilled nursing" },
                  { value: "hospice", label: "Hospice" },
                ]}
              />
              <div>
                <label className="text-sm font-medium">Your question</label>
                <textarea
                  required
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={4}
                  placeholder="Pricing for memory care, availability, dietary accommodations, anything you'd ask on a tour."
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <p className="mt-3 inline-flex items-start gap-2 text-xs text-muted-foreground">
              <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              We don't sell, share, or syndicate your information. It goes to
              {" "}{facilityName} only. No texts or calls unless you ask for them.
            </p>

            {error && (
              <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <DialogFooter className="mt-4">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                <Mail className="h-4 w-4" />
                Send to facility
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

/* ──────────────── ClaimFacilitySection — bottom-of-page CTA + modal ──────────────── */

interface ClaimStatus {
  authenticated: boolean
  is_facility_member?: boolean
  claim_status?: "pending" | "approved" | "rejected" | "withdrawn" | null
  claim_submitted_at?: string | null
}

function ClaimFacilitySection({
  facility,
}: {
  facility: { slug: string; name: string }
}) {
  const { user } = useAuth()
  const [status, setStatus] = useState<ClaimStatus | null>(null)
  // Auto-open the modal when the URL carries ?claim=1 — used by
  // the signup deep-link to drop the user straight into the form
  // after creating their account.
  const initialOpen =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("claim") === "1"
  const [open, setOpen] = useState(initialOpen)

  useEffect(() => {
    let alive = true
    const url = user
      ? `/facilities/${facility.slug}/claim-status`
      : null
    if (!url) {
      setStatus({ authenticated: false })
      return
    }
    api
      .get<{ data: ClaimStatus }>(url)
      .then((r) => alive && setStatus(r.data?.data ?? null))
      .catch(() => alive && setStatus({ authenticated: false }))
    return () => {
      alive = false
    }
  }, [facility.slug, user])

  // Already a verified member of this facility: no need for the claim CTA.
  if (status?.is_facility_member) {
    return (
      <Card className="border-emerald-200 bg-emerald-50/40">
        <CardContent className="flex items-center gap-3 p-4 text-sm">
          <BadgeCheck className="h-5 w-5 text-emerald-700" />
          <div className="flex-1">
            <strong>You manage this facility.</strong>
            <p className="text-xs text-muted-foreground">
              Edit listing details, photos, and amenities from your admin portal.
            </p>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to="/admin/listing">
              Manage listing
              <ExternalLink className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (status?.claim_status === "pending") {
    return (
      <Card className="border-amber-200 bg-amber-50/40">
        <CardContent className="flex items-center gap-3 p-4 text-sm">
          <Loader2 className="h-5 w-5 animate-spin text-amber-700" />
          <div>
            <strong>Your claim is under review.</strong>
            <p className="text-xs text-muted-foreground">
              The CarePath team reviews claims within 1-2 business days. We'll
              email you when it's approved.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card id="claim-facility" className="scroll-mt-24">
        <CardContent className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center">
          <Flag className="h-6 w-6 shrink-0 text-violet-700" />
          <div className="flex-1">
            <h3 className="text-base font-semibold">
              Are you the administrator of {facility.name}?
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Claim this listing to edit details, respond to inquiries, manage your
              bed board, and route tour requests — free tier available.
            </p>
          </div>
          <Button onClick={() => setOpen(true)} className="shrink-0">
            Claim this facility
          </Button>
        </CardContent>
      </Card>
      <ClaimFacilityModal
        open={open}
        onClose={() => setOpen(false)}
        facility={facility}
        authenticated={status?.authenticated ?? false}
        onSubmitted={() =>
          setStatus({ authenticated: true, claim_status: "pending" })
        }
      />
    </>
  )
}

function ClaimFacilityModal({
  open,
  onClose,
  facility,
  authenticated,
  onSubmitted,
}: {
  open: boolean
  onClose: () => void
  facility: { slug: string; name: string }
  authenticated: boolean
  onSubmitted: () => void
}) {
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [title, setTitle] = useState("Administrator")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [notes, setNotes] = useState("")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  if (!open) return null

  // Logged-out users get a sign-up prompt instead of the form.
  if (!authenticated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
        <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Sign in to claim</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                We need an account on file to grant admin access to {facility.name}.
                Sign up takes 30 seconds — the claim takes another minute.
              </p>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-5 flex flex-col gap-2">
            <Button asChild>
              <Link to={`/signup?intent=claim_facility&facility_slug=${facility.slug}`}>
                Sign up + claim
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={`/login?next=/facility/${facility.slug}`}>
                I have an account
              </Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    try {
      const r = await api.post<{ redirect_to?: string }>(
        `/facilities/${facility.slug}/claim`,
        {
          claimer_name: name,
          claimer_title: title || null,
          claimer_email: email,
          claimer_phone: phone || null,
          supporting_notes: notes || null,
        }
      )
      // Hand off to the dedicated onboarding page instead of the dead-
      // end success modal. The page polls claim-status so auto- (domain
      // match) and SuperAdmin- approvals both flip the UI live.
      onSubmitted()
      const target = r.data?.redirect_to ?? `/onboarding/facility/${facility.slug}`
      onClose()
      navigate(target)
    } catch (e) {
      const error = e as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } }
      const fieldErrs = Object.values(error.response?.data?.errors ?? {}).flat()
      setErr(fieldErrs[0] ?? error.response?.data?.message ?? "Submission failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border bg-card shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b p-5">
          <div>
            <h2 className="text-lg font-semibold">Claim {facility.name}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              The CarePath team verifies every claim within 1-2 business days.
              Provide enough detail that we can confirm you work at the facility.
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4 p-5">
            <LabeledRow label="Your full name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={120}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              />
            </LabeledRow>
            <LabeledRow label="Your title at the facility">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                placeholder="Administrator, DON, Owner…"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              />
            </LabeledRow>
            <LabeledRow label="Work email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@your-facility.com"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                An email at the facility's own domain speeds up review.
              </p>
            </LabeledRow>
            <LabeledRow label="Work phone (optional)">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={30}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              />
            </LabeledRow>
            <LabeledRow label="Anything else (optional)">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={2000}
                rows={3}
                placeholder="License number, years at the facility, etc."
                className="w-full rounded-md border bg-background p-2 text-sm"
              />
            </LabeledRow>
            {err && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
                {err}
              </div>
            )}
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy} className="gap-2">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
                Submit claim
              </Button>
            </div>
          </form>
      </div>
    </div>
  )
}

function LabeledRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-medium text-muted-foreground">{label}</div>
      {children}
    </label>
  )
}

