import { useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  Activity,
  Brain,
  Building,
  Building2,
  CheckCircle2,
  HeartHandshake,
  Heart,
  MapPin,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  Stethoscope,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

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
]

const TOP_METROS = [
  { state: "AZ", city: "Phoenix" },
  { state: "CA", city: "Los Angeles" },
  { state: "CA", city: "San Diego" },
  { state: "CA", city: "San Francisco" },
  { state: "TX", city: "Houston" },
  { state: "TX", city: "Dallas" },
  { state: "TX", city: "Austin" },
  { state: "FL", city: "Miami" },
  { state: "FL", city: "Tampa" },
  { state: "FL", city: "Orlando" },
  { state: "NY", city: "New York" },
  { state: "IL", city: "Chicago" },
  { state: "PA", city: "Philadelphia" },
  { state: "OH", city: "Columbus" },
  { state: "GA", city: "Atlanta" },
  { state: "NC", city: "Charlotte" },
]

export function LandingPage() {
  const navigate = useNavigate()
  const [zip, setZip] = useState("")
  const [careType, setCareType] = useState("")

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (zip.length === 5) params.set("zip", zip)
    if (careType) params.set("type", careType)
    navigate(`/search?${params.toString()}`)
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="text-xl font-semibold tracking-tight">
            CarePath
          </Link>
          <nav className="flex items-center gap-4">
            <Link to="/search" className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline">
              Find care
            </Link>
            <Button variant="ghost" asChild>
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link to="/signup">List your facility</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="mx-auto max-w-7xl px-6 py-20 text-center md:py-28">
        <h1 className="text-balance text-5xl font-semibold tracking-tight md:text-6xl">
          Find the right long-term care.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground">
          8,400+ real facilities. Live availability. CMS Five-Star ratings.
          Transparent pricing. <span className="font-medium text-foreground">No lead-selling, ever.</span>
        </p>

        <form
          onSubmit={onSubmit}
          className="mx-auto mt-10 flex max-w-2xl flex-col gap-2 rounded-2xl border bg-card p-2 shadow-sm sm:flex-row sm:rounded-full"
        >
          <div className="flex flex-1 items-center gap-2 rounded-lg px-3 py-2 sm:rounded-full">
            <MapPin className="h-5 w-5 shrink-0 text-muted-foreground" />
            <input
              value={zip}
              onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
              placeholder="ZIP code"
              maxLength={5}
              className="flex-1 bg-transparent text-base outline-hidden placeholder:text-muted-foreground"
            />
          </div>
          <div className="hidden h-8 w-px bg-border sm:block self-center" />
          <div className="flex flex-1 items-center gap-2 rounded-lg px-3 py-2 sm:rounded-full">
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
            </select>
          </div>
          <Button type="submit" size="lg" className="rounded-lg sm:rounded-full">
            <Search className="h-4 w-4" />
            Search
          </Button>
        </form>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
          <Stat label="real facilities" value="8,400+" />
          <span>·</span>
          <Stat label="states covered" value="15" />
          <span>·</span>
          <Stat label="CMS data sync" value="Daily" />
        </div>
      </section>

      {/* CARE-TYPE QUICK LINKS */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        <h2 className="text-center text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Browse by care type
        </h2>
        <div className="mt-6 grid gap-3 md:grid-cols-4">
          {CARE_TYPES.map((c) => (
            <Link
              key={c.type}
              to={`/search?type=${c.type}`}
              className="group block rounded-xl border bg-card p-5 transition-all hover:border-foreground hover:shadow-md"
            >
              <c.icon className="h-7 w-7 text-muted-foreground transition-colors group-hover:text-foreground" />
              <div className="mt-3 font-semibold">{c.label}</div>
              <div className="mt-1 text-sm text-muted-foreground">{c.description}</div>
            </Link>
          ))}
        </div>
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
        <h2 className="text-center text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Find care in these cities
        </h2>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {TOP_METROS.map((m) => (
            <Link
              key={m.city}
              to={`/search?state=${m.state}&city=${encodeURIComponent(m.city)}`}
              className="rounded-full border bg-card px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
            >
              {m.city}, {m.state}
            </Link>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="border-t bg-foreground text-background">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 px-6 py-16 text-center">
          <h2 className="text-3xl font-semibold tracking-tight">
            Ready to find care?
          </h2>
          <p className="text-background/80">
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

      <footer className="border-t bg-background">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground md:flex-row">
          <div>© 2026 CarePath. Data from CMS Nursing Home Compare (public domain).</div>
          <div className="flex gap-4">
            <Link to="/search" className="hover:text-foreground">Search</Link>
            <Link to="/login" className="hover:text-foreground">Sign in</Link>
            <Link to="/signup" className="hover:text-foreground">List your facility</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-base font-semibold text-foreground">{value}</span>
      <span>{label}</span>
    </div>
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
