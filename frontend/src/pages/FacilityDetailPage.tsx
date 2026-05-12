import { useEffect, useMemo, useState, type FormEvent } from "react"
import { Link, useParams } from "react-router-dom"
import {
  ArrowLeft,
  Building2,
  Calendar,
  Calculator,
  CheckCircle2,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Shield,
  ShieldCheck,
  Star,
  X,
} from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

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
  is_verified: boolean
  stay_started_at: string | null
  created_at: string
}

interface ReviewStats {
  count: number
  average: number
  verified_count: number
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
}

const TYPE_LABEL: Record<string, string> = {
  snf: "Skilled Nursing",
  assisted_living: "Assisted Living",
  memory_care: "Memory Care",
  ccrc: "Continuing Care",
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

  useEffect(() => {
    if (!slug) return
    let alive = true
    setLoading(true)
    setError(null)
    api
      .get<{ data: Facility }>(`/marketplace/facilities/${slug}`)
      .then((r) => alive && setFacility(r.data.data))
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

  return (
    <div className="min-h-screen bg-background">
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
        <PhotoGallery photos={facility.photos} facilityName={facility.name} />

        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">{facility.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {facility.city}, {facility.state} {facility.zip}
                </span>
                <span>·</span>
                <span>{TYPE_LABEL[facility.type] ?? facility.type}</span>
                {facility.cms_five_star_overall && (
                  <>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-current text-foreground" />
                      <span className="font-medium text-foreground">
                        {facility.cms_five_star_overall}
                      </span>
                      CMS Five-Star
                    </span>
                  </>
                )}
              </div>
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

            <section>
              <h2 className="text-lg font-semibold">Compliance & quality</h2>
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

            <CostProjectionCalculator
              facilitySlug={facility.slug}
              defaultLevel={facility.pricing_tiers[0]?.level_of_care ?? "assisted"}
            />

            <ReviewsSection reviews={facility.reviews} stats={facility.review_stats} />
          </div>

          <aside>
            <Card className="sticky top-6">
              <CardContent className="p-6">
                <div className="flex items-baseline justify-between">
                  <div>
                    {monthly ? (
                      <>
                        <span className="text-2xl font-semibold">${monthly}</span>
                        <span className="text-sm text-muted-foreground"> /mo from</span>
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">Pricing on request</span>
                    )}
                  </div>
                  <span className="text-sm font-medium">
                    {facility.available_beds} bed{facility.available_beds === 1 ? "" : "s"} available
                  </span>
                </div>

                <Button className="mt-4 w-full" size="lg" onClick={() => setTourOpen(true)}>
                  <Calendar className="h-4 w-4" />
                  Request a tour
                </Button>
                <Button variant="outline" className="mt-2 w-full" asChild>
                  <Link to="/login">Save facility</Link>
                </Button>

                <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
                  <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  We don't sell your contact info. Only this facility sees it.
                </p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>

      <TourRequestDialog
        open={tourOpen}
        onClose={() => setTourOpen(false)}
        facilitySlug={facility.slug}
        facilityName={facility.name}
      />
    </div>
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
    return (
      <div className="mb-6 grid h-72 grid-cols-4 gap-2 overflow-hidden rounded-xl">
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

function PricingBreakdown({ tiers }: { tiers: PricingTier[] }) {
  if (tiers.length === 0) {
    return null
  }

  const fmtMoney = (cents: number) =>
    `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`

  const cadenceLabel = (c: string) =>
    c === "monthly" ? "/mo" : c === "one_time" ? " one-time" : "/visit"

  const baseRates = tiers.filter((t) => t.tier_type === "base")
  const adders = tiers.filter((t) => t.tier_type === "level_adder")
  const ancillaries = tiers.filter((t) => t.tier_type === "ancillary")
  const fees = tiers.filter((t) => t.tier_type === "community_fee")

  const Section = ({ title, items }: { title: string; items: PricingTier[] }) => {
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

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Transparent pricing</h2>
        <span className="text-xs text-muted-foreground">No hidden fees, no surprises.</span>
      </div>
      <div className="mt-3 space-y-4">
        <Section title="Base rates" items={baseRates} />
        <Section title="Level-of-care adders" items={adders} />
        <Section title="Ancillary services" items={ancillaries} />
        <Section title="Community fees" items={fees} />
      </div>
    </section>
  )
}

function ReviewsSection({ reviews, stats }: { reviews: Review[]; stats: ReviewStats }) {
  if (reviews.length === 0) {
    return (
      <section>
        <h2 className="text-lg font-semibold">Reviews</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          No reviews yet for this facility.
        </p>
      </section>
    )
  }

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Reviews</h2>
        <span className="text-xs text-muted-foreground">
          {stats.verified_count} of {stats.count} verified ·{" "}
          <Shield className="inline h-3 w-3" /> tied to confirmed stays
        </span>
      </div>

      <div className="mt-3 flex items-center gap-4 rounded-md border bg-card px-4 py-3">
        <div className="text-3xl font-semibold tabular-nums">{stats.average.toFixed(1)}</div>
        <div className="flex-1">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                className={cn(
                  "h-4 w-4",
                  n <= Math.round(stats.average)
                    ? "fill-current text-foreground"
                    : "text-muted-foreground/30"
                )}
              />
            ))}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            Based on {stats.count} review{stats.count === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {reviews.map((r) => (
          <Card key={r.id}>
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
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
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
}: {
  open: boolean
  onClose: () => void
  facilitySlug: string
  facilityName: string
}) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [tourType, setTourType] = useState<TourType | null>(null)
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
            <Button onClick={onClose}>Done</Button>
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
            </div>
          )}
        </CardContent>
      </Card>
    </section>
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
