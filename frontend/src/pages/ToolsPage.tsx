import { Link } from "react-router-dom"
import {
  ArrowRight,
  Calculator,
  ClipboardList,
  Search,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Meta } from "@/components/Meta"

const TOOLS: Array<{
  slug: string
  to: string
  title: string
  description: string
  icon: LucideIcon
  status: "live" | "coming"
}> = [
  {
    slug: "care-level-quiz",
    to: "/tools/care-level-quiz",
    title: "Care-level quiz",
    description:
      "10 short questions to identify whether your loved one needs assisted living, memory care, or skilled nursing.",
    icon: ClipboardList,
    status: "live",
  },
  {
    slug: "cost-projection",
    to: "/search",
    title: "Cost projection calculator",
    description:
      "Available on every facility page. Models 5-year cost blending Medicare A, Medicaid spend-down, LTC insurance, VA Aid & Attendance.",
    icon: Calculator,
    status: "live",
  },
  {
    slug: "search",
    to: "/search",
    title: "Facility search",
    description:
      "8,400+ real facilities. Filter by ZIP, care type, Medicaid acceptance, CMS Five-Star rating. No lead-selling.",
    icon: Search,
    status: "live",
  },
  {
    slug: "medicaid-eligibility",
    to: "/tools/medicaid-eligibility",
    title: "Medicaid eligibility check",
    description:
      "State-specific quick check — countable assets, income trust requirements, spousal protection.",
    icon: ShieldCheck,
    status: "live",
  },
  {
    slug: "va-eligibility",
    to: "/tools/va-eligibility",
    title: "VA Aid & Attendance eligibility",
    description:
      "Wartime service, care needs, net worth — see if you qualify for up to $3,740/month.",
    icon: Sparkles,
    status: "live",
  },
]

export function ToolsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Meta
        title="Free decision tools for long-term care"
        description="Care-level quiz, cost projection, Medicaid eligibility, VA Aid & Attendance check, facility search. No signup, no lead-selling."
        canonical="/tools"
      />
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            CarePath
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link to="/search" className="text-muted-foreground hover:text-foreground">
              Find care
            </Link>
            <Link to="/articles" className="text-muted-foreground hover:text-foreground">
              Articles
            </Link>
            <Link to="/tools" className="font-medium text-foreground">
              Tools
            </Link>
            <Button asChild variant="ghost" size="sm">
              <Link to="/login">Sign in</Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-12 md:py-16">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border bg-accent/60 px-3 py-1 text-xs font-medium text-accent-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Free decision tools
          </div>
          <h1 className="mt-4 text-balance text-4xl font-semibold tracking-tight md:text-5xl">
            Tools that actually help you decide.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-balance text-muted-foreground">
            No lead-gen funnels. No "give us your phone first." These tools
            return real answers in real time, with no obligation.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((tool) => (
            <Card
              key={tool.slug}
              className={tool.status === "live" ? "hover-lift" : "opacity-60"}
            >
              <CardContent className="flex h-full flex-col p-6">
                <div className="flex items-start justify-between gap-2">
                  <div className="rounded-xl bg-primary p-3 text-primary-foreground">
                    <tool.icon className="h-5 w-5" />
                  </div>
                  {tool.status === "coming" && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      Coming soon
                    </span>
                  )}
                </div>
                <h3 className="mt-4 text-lg font-semibold">{tool.title}</h3>
                <p className="mt-2 flex-1 text-sm text-muted-foreground">
                  {tool.description}
                </p>
                {tool.status === "live" ? (
                  <Button asChild variant="outline" className="mt-4 self-start">
                    <Link to={tool.to}>
                      Open
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                ) : (
                  <span className="mt-4 text-xs text-muted-foreground">
                    Notify me on launch
                  </span>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 px-6 py-14 text-center">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Or skip the tools and just start searching.
          </h2>
          <Button asChild size="lg" variant="secondary">
            <Link to="/search">
              <Search className="h-4 w-4" />
              Find facilities near you
            </Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
