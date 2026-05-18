import { useEffect, useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  Activity,
  ArrowRight,
  BookOpen,
  Brain,
  Building,
  Building2,
  Calculator,
  CheckCircle2,
  ClipboardList,
  Clock,
  HeartHandshake,
  Heart,
  Home,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  Stethoscope,
  Users,
} from "lucide-react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Meta } from "@/components/Meta"
import { FacilitySuggest, type Suggestion } from "@/components/FacilitySuggest"
import { TrustStrip } from "@/components/TrustStrip"
import { AiSearchBar } from "@/components/AiSearchBar"
import { NearMeButton } from "@/components/NearMeButton"

const CARE_TYPES = [
  {
    type: "assisted_living",
    label: "Assisted Living",
    description: "Help with daily activities + community",
    icon: Heart,
  },
  {
    type: "memory_care",
    label: "Memory Care",
    description: "Specialized dementia + Alzheimer's care",
    icon: Brain,
  },
  {
    type: "snf",
    label: "Skilled Nursing",
    description: "RN-staffed, rehab, post-hospital",
    icon: Stethoscope,
  },
  {
    type: "ccrc",
    label: "Continuing Care",
    description: "Independent → assisted → skilled in one place",
    icon: Activity,
  },
  {
    type: "independent_living",
    label: "Independent Living",
    description: "55+ housing, no daily care needed",
    icon: Home,
  },
  {
    type: "group_home",
    label: "Group Home",
    description: "Small residential setting for adults with IDD",
    icon: Users,
  },
]

interface TopCity {
  city: string
  state: string
  facility_count: number
  score: number | null
}

interface PreviewArticle {
  id: string
  slug: string
  title: string
  subtitle: string | null
  hero_image_url: string | null
  category: string
  reading_time_minutes: number
}

const ARTICLE_CATEGORY_LABEL: Record<string, string> = {
  care_basics: "Care basics",
  medicare: "Medicare",
  medicaid: "Medicaid",
  va: "VA benefits",
  dementia: "Memory care",
  transition: "Tours & transitions",
  financial: "Financial planning",
  legal: "Legal",
}

export function LandingPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState("")
  const [careType, setCareType] = useState("")
  const [previewArticles, setPreviewArticles] = useState<PreviewArticle[]>([])
  const [topCities, setTopCities] = useState<TopCity[]>([])

  useEffect(() => {
    let alive = true
    api
      .get<{ data: PreviewArticle[] }>("/content/articles", { params: { limit: 3 } })
      .then((r) => {
        if (!alive) return
        const arr = Array.isArray(r.data?.data) ? r.data.data : []
        setPreviewArticles(arr.slice(0, 3))
      })
      .catch(() => {})
    api
      .get<{ data: TopCity[] }>("/marketplace/top-cities", { params: { limit: 32 } })
      .then((r) => {
        if (!alive) return
        // Guard against malformed responses (e.g., a poisoned cache returning
        // {data: {...}} instead of {data: [...]}) — otherwise SiteFooter
        // calls .slice on a non-array and crashes the whole page.
        const arr = Array.isArray(r.data?.data) ? r.data.data : []
        setTopCities(arr)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const navigateForSuggestion = (s: Suggestion) => {
    if (s.kind === "facility") {
      navigate(`/facility/${s.slug}`)
      return
    }
    if (s.kind === "city") {
      // City landing page — has its own care-type nav and SEO content.
      const typeSlug =
        careType === "assisted_living" ? "/assisted-living" :
        careType === "memory_care" ? "/memory-care" :
        careType === "snf" ? "/skilled-nursing" :
        careType === "ccrc" ? "/continuing-care" : ""
      navigate(`/senior-living/${s.state}/${encodeURIComponent(s.city)}${typeSlug}`)
      return
    }
    // ZIP — keep going to search since we don't have ZIP landing pages
    const params = new URLSearchParams()
    params.set("zip", s.zip)
    if (careType) params.set("type", careType)
    navigate(`/search?${params.toString()}`)
  }

  const navigateFreeText = (text: string) => {
    const params = new URLSearchParams()
    // 5-digit numeric → ZIP; otherwise free-text name search.
    if (/^\d{5}$/.test(text)) params.set("zip", text)
    else if (text.length > 0) params.set("q", text)
    if (careType) params.set("type", careType)
    navigate(`/search?${params.toString()}`)
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    navigateFreeText(query.trim())
  }

  return (
    <div className="min-h-screen bg-background">
      <Meta
        title="Long-term care, modernized"
        description="Find skilled nursing, assisted living, and memory care with real availability, real reviews, and transparent pricing. No lead-selling, ever."
        canonical="/"
      />
      <header
        className="sticky top-0 z-30 border-b bg-card/85 backdrop-blur-md supports-[backdrop-filter]:bg-card/70"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-6">
          <Link to="/" className="text-lg font-semibold tracking-tight sm:text-xl">
            CarePath
          </Link>
          <nav className="flex items-center gap-2 sm:gap-4">
            <Link to="/search" className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline">
              Find care
            </Link>
            <Link to="/tools" className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline">
              Tools
            </Link>
            <Link to="/guides" className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline">
              Guides
            </Link>
            <Link to="/articles" className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline">
              Articles
            </Link>
            <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/signup">List your facility</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="relative isolate overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-x-0 -top-24 -z-10 mx-auto h-[600px] max-w-5xl rounded-full opacity-60 blur-3xl"
          style={{
            background:
              "radial-gradient(closest-side, color-mix(in oklch, var(--color-primary) 18%, transparent), transparent)",
          }}
        />
        <div className="mx-auto max-w-7xl px-4 py-10 text-center sm:px-6 sm:py-20 md:py-28">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border bg-accent/60 px-3 py-1 text-xs font-medium text-accent-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Live CMS data · No lead-selling
          </div>
          <h1 className="mt-4 text-balance text-[28px] font-semibold leading-[1.1] tracking-tight sm:mt-5 sm:text-4xl md:text-5xl lg:text-6xl">
            Find the right long-term care.
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-balance text-[15px] text-muted-foreground sm:mt-6 sm:text-lg">
            8,400+ real facilities. Live availability. CMS Five-Star ratings.
            Transparent pricing.{" "}
            <span className="font-medium text-foreground">No lead-selling, ever.</span>
          </p>

        <form
          onSubmit={onSubmit}
          className="mx-auto mt-8 flex max-w-2xl flex-col gap-2 rounded-2xl border bg-card p-2 shadow-sm md:flex-row md:rounded-full"
        >
          <FacilitySuggest
            value={query}
            onChange={setQuery}
            onSelect={navigateForSuggestion}
            onSubmitFreeText={navigateFreeText}
            placeholder="City, ZIP, or facility name"
            size="lg"
            leadingIcon="map"
            className="rounded-lg md:rounded-full"
          />
          <div className="hidden h-8 w-px bg-border self-center md:block" />
          <div className="flex flex-1 items-center gap-2 rounded-lg px-3 py-2 md:rounded-full">
            <Building className="h-5 w-5 shrink-0 text-muted-foreground" />
            <select
              value={careType}
              onChange={(e) => setCareType(e.target.value)}
              className="flex-1 bg-transparent text-base outline-hidden text-muted-foreground"
            >
              <option value="">Any care type</option>
              <option value="assisted_living">Assisted Living</option>
              <option value="memory_care">Memory Care</option>
              <option value="snf">Skilled Nursing</option>
              <option value="ccrc">Continuing Care</option>
              <option value="independent_living">Independent Living</option>
              <option value="group_home">Group Home</option>
            </select>
          </div>
          <Button type="submit" size="lg" className="rounded-lg md:rounded-full">
            <Search className="h-4 w-4" />
            Search
          </Button>
        </form>

        <div className="mx-auto mt-3 flex max-w-2xl items-center justify-center gap-3">
          <NearMeButton
            onZip={(zip, coords) => {
              // Pass lat/lon alongside the ZIP so the backend filters
              // by the exact browser location — skips the often-empty
              // zip → centroid lookup that left "near me" returning all
              // facilities nationwide.
              const p = new URLSearchParams()
              p.set("zip", zip)
              p.set("lat", coords.lat.toFixed(6))
              p.set("lon", coords.lon.toFixed(6))
              p.set("radius", "25")
              navigate(`/search?${p.toString()}`)
            }}
            onCoords={({ lat, lon }) => {
              // ~25mi bbox half-side at this latitude — 1° lat ≈ 69mi,
              // longitude shrinks by cos(lat).
              const dLat = 25 / 69
              const dLon = 25 / (69 * Math.max(0.01, Math.cos((lat * Math.PI) / 180)))
              const bbox = `${(lat - dLat).toFixed(4)},${(lon - dLon).toFixed(4)},${(lat + dLat).toFixed(4)},${(lon + dLon).toFixed(4)}`
              const p = new URLSearchParams()
              p.set("bbox", bbox)
              navigate(`/search?${p.toString()}`)
            }}
          />
        </div>

        <div className="mx-auto mt-5 flex max-w-2xl items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          <span>Or describe what you need</span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <div className="mx-auto mt-3 max-w-2xl">
          <AiSearchBar hero />
        </div>

          <TrustStrip className="mt-10" />
        </div>
      </section>

      {/* CARE-TYPE QUICK LINKS */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        <h2 className="text-center text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Browse by care type
        </h2>
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {CARE_TYPES.map((c) => (
            <Link
              key={c.type}
              to={`/search?type=${c.type}`}
              className="hover-lift group block rounded-xl border bg-card p-4 sm:p-5"
            >
              <c.icon className="h-6 w-6 text-primary sm:h-7 sm:w-7" />
              <div className="mt-2 text-sm font-semibold sm:mt-3 sm:text-base">{c.label}</div>
              <div className="mt-1 text-xs text-muted-foreground sm:text-sm">{c.description}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* TOOLS STRIP */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Decision tools — free, no signup
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Get real answers in minutes. We don't sell your info.
            </p>
          </div>
          <Link
            to="/tools"
            className="hidden text-sm font-medium text-primary hover:underline sm:inline-flex sm:items-center sm:gap-1"
          >
            All tools <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Link
            to="/tools/care-level-quiz"
            className="hover-lift group block rounded-xl border bg-card p-6"
          >
            <div className="inline-flex rounded-xl bg-primary p-3 text-primary-foreground">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div className="mt-4 font-semibold">Care-level quiz</div>
            <div className="mt-1 text-sm text-muted-foreground">
              10 questions to identify the right level of care — assisted
              living, memory care, or skilled nursing.
            </div>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
              Take the quiz <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
          <Link
            to="/search"
            className="hover-lift group block rounded-xl border bg-card p-6"
          >
            <div className="inline-flex rounded-xl bg-primary p-3 text-primary-foreground">
              <Calculator className="h-5 w-5" />
            </div>
            <div className="mt-4 font-semibold">Cost projection</div>
            <div className="mt-1 text-sm text-muted-foreground">
              5-year cost estimate blending Medicare, Medicaid spend-down, LTC
              insurance, VA benefits, and private pay.
            </div>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
              Open calculator <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
          <Link
            to="/search"
            className="hover-lift group block rounded-xl border bg-card p-6"
          >
            <div className="inline-flex rounded-xl bg-primary p-3 text-primary-foreground">
              <Search className="h-5 w-5" />
            </div>
            <div className="mt-4 font-semibold">Facility search</div>
            <div className="mt-1 text-sm text-muted-foreground">
              8,400+ real facilities. Filter by ZIP, care type, Medicaid
              acceptance, CMS Five-Star rating.
            </div>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
              Start searching <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        </div>

        {/* Guides callout — branded PDF library */}
        <Link
          to="/guides"
          className="hover-lift group mt-6 flex items-center justify-between gap-4 rounded-xl border bg-card p-5"
        >
          <div className="flex items-start gap-4">
            <div className="inline-flex rounded-xl bg-primary p-3 text-primary-foreground">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold">Free, branded guides</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Tour question sheet · Medicare LTC cheat sheet · Medicaid look-back checklist · VA Aid &amp; Attendance kit · and more. Email only — no phone calls.
              </div>
            </div>
          </div>
          <span className="hidden shrink-0 items-center gap-1 text-sm font-medium text-primary sm:inline-flex">
            Browse <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
      </section>

      {/* WHY CAREPATH */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="text-center">
          <h2 className="text-3xl font-semibold tracking-tight">
            What makes CarePath different
          </h2>
          <p className="mt-3 text-muted-foreground">
            Built to give you what other senior-living sites won't.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="space-y-3 p-6">
              <Building2 className="h-6 w-6" />
              <h3 className="font-semibold">Live bed availability</h3>
              <p className="text-sm text-muted-foreground">
                See real-time bed counts from the facility's own system —
                not "call to ask" and not 3-week-stale data.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-3 p-6">
              <ShieldCheck className="h-6 w-6" />
              <h3 className="font-semibold">No lead-selling</h3>
              <p className="text-sm text-muted-foreground">
                When you ask for a tour, only that one facility sees your
                info. You won't get 30 cold calls — that's a promise.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-3 p-6">
              <Star className="h-6 w-6" />
              <h3 className="font-semibold">Real CMS ratings</h3>
              <p className="text-sm text-muted-foreground">
                Overall + health inspection + staffing + quality measures.
                Pulled daily from the federal Nursing Home Compare dataset.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-3 p-6">
              <Sparkles className="h-6 w-6" />
              <h3 className="font-semibold">Transparent pricing</h3>
              <p className="text-sm text-muted-foreground">
                Base rate + level-of-care adders + ancillary fees laid out.
                No "call for pricing."
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-3 p-6">
              <HeartHandshake className="h-6 w-6" />
              <h3 className="font-semibold">Cost projection</h3>
              <p className="text-sm text-muted-foreground">
                5-year estimate blending Medicare, Medicaid spend-down, LTC
                insurance, VA Aid & Attendance, and private pay.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-3 p-6">
              <Shield className="h-6 w-6" />
              <h3 className="font-semibold">Verified reviews</h3>
              <p className="text-sm text-muted-foreground">
                "Verified stay" badge appears only on reviews tied to a
                confirmed admission. No astroturf.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* COMPARISON STRIP */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <h2 className="text-center text-2xl font-semibold tracking-tight">
            CarePath vs. the alternatives
          </h2>
          <div className="mt-8 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground"></th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-foreground">
                    CarePath
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Lead-gen sites
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Calling facilities directly
                  </th>
                </tr>
              </thead>
              <tbody>
                <CompareRow
                  label="See real-time bed availability"
                  carepath="yes"
                  competitor="no"
                  direct="maybe"
                />
                <CompareRow
                  label="Transparent monthly pricing"
                  carepath="yes"
                  competitor="no"
                  direct="no"
                />
                <CompareRow
                  label="Your info stays with one facility"
                  carepath="yes"
                  competitor="no"
                  direct="yes"
                />
                <CompareRow
                  label="Federal CMS quality ratings"
                  carepath="yes"
                  competitor="partial"
                  direct="no"
                />
                <CompareRow
                  label="5-year cost projection tool"
                  carepath="yes"
                  competitor="no"
                  direct="no"
                />
                <CompareRow
                  label="Book a tour online (no phone tag)"
                  carepath="yes"
                  competitor="no"
                  direct="no"
                />
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CITY BROWSE (SEO) */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="flex flex-col items-center text-center">
          <Link
            to="/search"
            className="inline-flex items-center gap-1.5 rounded-full border border-primary px-4 py-1.5 text-sm font-medium text-primary hover:bg-primary/5"
          >
            <Search className="h-4 w-4" />
            Find senior living near you
          </Link>
          <h2 className="mt-6 text-2xl font-semibold tracking-tight md:text-3xl">
            Top cities by inventory & quality
          </h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Each score is the average CMS Five-Star rating of facilities in that city, on a 0–10 scale. Updated daily.
          </p>
        </div>
        {topCities.length > 0 && (
          <div className="mt-8 grid gap-x-6 gap-y-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {topCities.map((c) => (
              <Link
                key={`${c.city}-${c.state}`}
                to={`/senior-living/${c.state}/${encodeURIComponent(c.city)}`}
                className="group flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent/40"
              >
                <ScoreBadge score={c.score} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-primary group-hover:underline">
                    {c.city}, {c.state}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {c.facility_count.toLocaleString()} facilit{c.facility_count === 1 ? "y" : "ies"}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
        {topCities.length > 0 && (() => {
          // Distinct states present in top cities — short browse-by-state nav.
          const seen = new Set<string>()
          const states = topCities.filter((c) => {
            if (seen.has(c.state)) return false
            seen.add(c.state)
            return true
          })
          return (
            <div className="mt-8 border-t pt-6">
              <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Or browse a state
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {states.map((s) => (
                  <Link
                    key={s.state}
                    to={`/senior-living/${s.state}`}
                    className="rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                  >
                    {s.state}
                  </Link>
                ))}
              </div>
            </div>
          )
        })()}
      </section>

      {/* ARTICLES PREVIEW */}
      {previewArticles.length > 0 && (
        <section className="border-t bg-muted/20">
          <div className="mx-auto max-w-7xl px-6 py-16">
            <div className="flex items-end justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border bg-accent/60 px-3 py-1 text-xs font-medium text-accent-foreground">
                  <BookOpen className="h-3.5 w-3.5" />
                  Resource library
                </div>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
                  Long-term care, demystified
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Plain-English guides on Medicare, Medicaid, VA benefits, and
                  how to pick a facility.
                </p>
              </div>
              <Link
                to="/articles"
                className="hidden text-sm font-medium text-primary hover:underline sm:inline-flex sm:items-center sm:gap-1"
              >
                All articles <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {previewArticles.map((a) => (
                <Link key={a.id} to={`/articles/${a.slug}`} className="block">
                  <Card className="hover-lift overflow-hidden h-full">
                    <div className="aspect-video bg-muted">
                      {a.hero_image_url ? (
                        <img
                          src={a.hero_image_url}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
                          <Building2 className="h-10 w-10" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-5">
                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {ARTICLE_CATEGORY_LABEL[a.category] ?? a.category}
                      </span>
                      <h3 className="mt-2 font-semibold leading-tight">{a.title}</h3>
                      {a.subtitle && (
                        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                          {a.subtitle}
                        </p>
                      )}
                      <div className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {a.reading_time_minutes} min read
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FINAL CTA */}
      <section className="border-t bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 px-6 py-16 text-center">
          <h2 className="text-3xl font-semibold tracking-tight">
            Ready to find care?
          </h2>
          <p className="text-primary-foreground/80">
            8,400+ facilities. Zero spam calls. Start your search now.
          </p>
          <Button asChild size="lg" variant="secondary" className="mt-2">
            <Link to="/search">
              <Search className="h-4 w-4" />
              Search facilities
            </Link>
          </Button>
        </div>
      </section>

    </div>
  )
}

function ScoreBadge({ score }: { score: number | null }) {
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
      title={score === null ? "Not enough CMS data yet" : `Avg quality ${score}/10`}
    >
      {score === null ? "—" : score.toFixed(1)}
    </span>
  )
}

function CompareRow({
  label,
  carepath,
  competitor,
  direct,
}: {
  label: string
  carepath: "yes" | "no" | "partial" | "maybe"
  competitor: "yes" | "no" | "partial" | "maybe"
  direct: "yes" | "no" | "partial" | "maybe"
}) {
  return (
    <tr className="border-t">
      <td className="px-3 py-3">{label}</td>
      <td className="px-3 py-3">
        <Cell state={carepath} highlight />
      </td>
      <td className="px-3 py-3">
        <Cell state={competitor} />
      </td>
      <td className="px-3 py-3">
        <Cell state={direct} />
      </td>
    </tr>
  )
}

function Cell({ state, highlight }: { state: "yes" | "no" | "partial" | "maybe"; highlight?: boolean }) {
  if (state === "yes") {
    return (
      <span className={highlight ? "inline-flex items-center gap-1 font-medium text-foreground" : "text-muted-foreground"}>
        <CheckCircle2 className="h-4 w-4" />
        Yes
      </span>
    )
  }
  if (state === "partial") {
    return <span className="text-muted-foreground">Sometimes</span>
  }
  if (state === "maybe") {
    return <span className="text-muted-foreground">Maybe</span>
  }
  return <span className="text-muted-foreground/60">—</span>
}
