import { useEffect, useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { CheckCircle2, Heart, Home } from "lucide-react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"

/*
 * Brand social icons inline so we don't depend on lucide-react's
 * (since-removed) brand-icon set. Each is the official simple
 * monogram, sized to 16px and color:currentColor so the surrounding
 * link's hover-state still works.
 */
const SocialSvg = {
  X: (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
  Facebook: (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
      <path d="M12 2.04c-5.5 0-9.96 4.46-9.96 9.96 0 4.97 3.64 9.09 8.4 9.84v-6.96H7.9v-2.88h2.54V9.84c0-2.5 1.5-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.77l-.44 2.88h-2.33v6.96A9.97 9.97 0 0 0 21.96 12c0-5.5-4.46-9.96-9.96-9.96z" />
    </svg>
  ),
  LinkedIn: (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8.34 18.34V10.5H5.67v7.84zM7 9.36a1.55 1.55 0 1 0 0-3.1 1.55 1.55 0 0 0 0 3.1zm11.34 8.98v-4.3c0-2.3-1.23-3.36-2.87-3.36-1.32 0-1.92.73-2.25 1.24V10.5h-2.67v7.84h2.67v-4.38c0-.24.02-.48.09-.65.19-.47.62-.96 1.34-.96.94 0 1.32.71 1.32 1.76v4.23z" />
    </svg>
  ),
  Instagram: (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  ),
  YouTube: (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
      <path d="M23 7.2s-.22-1.55-.9-2.23c-.85-.9-1.81-.9-2.25-.95C16.7 3.8 12 3.8 12 3.8s-4.7 0-7.85.22c-.44.05-1.4.05-2.25.95C1.22 5.65 1 7.2 1 7.2S.77 9.02.77 10.84v1.7c0 1.83.23 3.65.23 3.65s.22 1.54.9 2.22c.85.9 1.97.87 2.47.97 1.79.17 7.6.22 7.6.22s4.7 0 7.85-.22c.44-.05 1.4-.05 2.25-.95.68-.68.9-2.22.9-2.22s.23-1.82.23-3.65v-1.7C23.22 9.02 23 7.2 23 7.2zM9.74 14.41V8.13l6.06 3.16z" />
    </svg>
  ),
}

interface TopCity {
  city: string
  state: string
  facility_count: number
}

interface Props {
  /**
   * Optional pre-loaded top cities (LandingPage already fetches this
   * for hero use). Pass it through to avoid a duplicate request. If
   * omitted, the footer fetches its own copy.
   */
  topCities?: TopCity[]
}

const CARE_TYPE_COLUMNS: Array<{ slug: string; label: string }> = [
  { slug: "assisted-living", label: "Assisted Living" },
  { slug: "memory-care", label: "Memory Care" },
  { slug: "skilled-nursing", label: "Skilled Nursing" },
  { slug: "continuing-care", label: "Continuing Care" },
]

/**
 * Site-wide footer, mounted on every public marketplace page.
 *
 * Pulls patterns from four senior-care / marketplace references the
 * user shared: a Caring.com-style "Most Popular Searches" SEO grid
 * (care-type columns × top cities — each cell is an internal hop to
 * a /senior-living/{state}/{city}/{type-slug} landing page), a
 * Software-Advice-style "Are you a [supplier]?" CTA strip above the
 * footer, a Care.com-style three-column link grid plus mobile-only
 * collapsible accordions for the long city list, and the
 * SeniorLivingGuide.com Equal Housing Opportunity trust badge that
 * families actively look for in this category.
 */
export function SiteFooter({ topCities: passed }: Props = {}) {
  const [topCities, setTopCities] = useState<TopCity[]>(passed ?? [])

  useEffect(() => {
    if (passed) return
    let alive = true
    api
      .get<{ data: TopCity[] }>("/marketplace/top-cities", { params: { limit: 24 } })
      .then((r) => {
        const arr = Array.isArray(r.data?.data) ? r.data.data : []
        if (alive) setTopCities(arr)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [passed])

  // The top 5 cities per care-type column. We use the same city list
  // across columns until we have per-type city counts — it still
  // exercises four distinct landing-page URL patterns per row, which
  // is what we want for SEO and for visitors browsing by need.
  const citiesForGrid = topCities.slice(0, 5)

  return (
    <>
      {/* Supply-side recruit strip — modeled on Software Advice's
          "Are you a software provider? Get Started" pattern. */}
      <section className="border-t bg-card">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-4 px-6 py-8 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <div>
            <h3 className="text-lg font-semibold tracking-tight sm:text-xl">
              Run a senior-living community?
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Claim your free listing, edit your amenities and photos, and route
              tour requests straight to your admissions team. No lead auction.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/why-carepath">Why CarePath</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/signup">List your facility →</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t bg-muted/20">
        {/* Most Popular Searches — care-type × city SEO matrix. */}
        <section className="border-b">
          <div className="mx-auto max-w-7xl px-6 py-10">
            <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Most popular searches
            </h2>
            <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-6 text-sm md:grid-cols-4">
              {CARE_TYPE_COLUMNS.map((col) => (
                <div key={col.slug}>
                  <h3 className="text-sm font-semibold text-foreground">{col.label}</h3>
                  <ul className="mt-2 space-y-1.5">
                    {citiesForGrid.length === 0 ? (
                      <li className="text-muted-foreground">—</li>
                    ) : (
                      citiesForGrid.map((c) => (
                        <li key={`${col.slug}-${c.state}-${c.city}`}>
                          <span className="font-medium text-foreground">{c.state}</span>{" "}
                          <span className="text-muted-foreground">»</span>{" "}
                          <Link
                            to={`/senior-living/${c.state}/${encodeURIComponent(c.city)}/${col.slug}`}
                            className="text-primary hover:underline"
                          >
                            {c.city}
                          </Link>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-6 text-center">
              <Link
                to="/search"
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-95"
              >
                View all search cities
              </Link>
            </div>
          </div>
        </section>

        {/* Three-column link grid + newsletter + brand. */}
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="grid gap-10 md:grid-cols-12">
            <div className="md:col-span-4">
              <Link to="/" className="text-lg font-semibold tracking-tight">
                CarePath
              </Link>
              <p className="mt-3 text-sm text-muted-foreground">
                Long-term care, modernized. Real availability. Real reviews.
                Transparent pricing.{" "}
                <span className="font-medium text-foreground">No lead-selling, ever.</span>
              </p>
              <FooterNewsletter />
              <div className="mt-5 flex items-center gap-3 text-muted-foreground">
                <SocialIcon to="https://twitter.com" label="Twitter / X">{SocialSvg.X}</SocialIcon>
                <SocialIcon to="https://facebook.com" label="Facebook">{SocialSvg.Facebook}</SocialIcon>
                <SocialIcon to="https://linkedin.com" label="LinkedIn">{SocialSvg.LinkedIn}</SocialIcon>
                <SocialIcon to="https://instagram.com" label="Instagram">{SocialSvg.Instagram}</SocialIcon>
                <SocialIcon to="https://youtube.com" label="YouTube">{SocialSvg.YouTube}</SocialIcon>
              </div>
            </div>

            <FooterLinkColumn title="Find care" className="md:col-span-2">
              <FooterLink to="/search">Facility search</FooterLink>
              <FooterLink to="/compare">Compare facilities</FooterLink>
              <FooterLink to="/tools/care-level-quiz">Care-level quiz</FooterLink>
              <FooterLink to="/tools/medicaid-eligibility">Medicaid eligibility</FooterLink>
              <FooterLink to="/tools/va-eligibility">VA Aid &amp; Attendance</FooterLink>
            </FooterLinkColumn>

            <FooterLinkColumn title="Resources" className="md:col-span-3">
              <FooterLink to="/articles">Articles &amp; how-tos</FooterLink>
              <FooterLink to="/guides">Free PDF guides</FooterLink>
              <FooterLink to="/why-carepath">Why CarePath</FooterLink>
              <FooterLink to="/tools">All tools</FooterLink>
            </FooterLinkColumn>

            <FooterLinkColumn title="For providers" className="md:col-span-3">
              <FooterLink to="/signup">List your facility</FooterLink>
              <FooterLink to="/login">Manager sign in</FooterLink>
              <FooterLink to="/why-carepath">For network operators</FooterLink>
              <FooterLink to="/signup">For placement advisors</FooterLink>
              <FooterLink to="/signup">For hospital partners</FooterLink>
            </FooterLinkColumn>
          </div>

          {/* Mobile-only accordions for long evergreen content rows so
              the footer stays scannable on phones — Care.com pattern. */}
          <div className="mt-8 space-y-2 md:hidden">
            <MobileAccordion title="Browse by state">
              {topCities.length === 0 ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : (
                <ul className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                  {topCities.map((c) => (
                    <li key={`m-${c.state}-${c.city}`}>
                      <Link
                        to={`/senior-living/${c.state}/${encodeURIComponent(c.city)}`}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {c.city}, {c.state}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </MobileAccordion>
          </div>
        </div>

        {/* Bottom trust + legal band. EHO badge + CMS attribution. */}
        <div className="border-t bg-card">
          <div className="mx-auto max-w-7xl px-6 py-6">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Heart className="h-3.5 w-3.5 text-primary" />
                  © 2026 CarePath
                </span>
                <span
                  className="inline-flex items-center gap-1.5 rounded border bg-background px-2 py-1 font-medium text-foreground"
                  title="CarePath supports equal housing opportunity"
                >
                  <Home className="h-3.5 w-3.5" />
                  Equal Housing Opportunity
                </span>
                <span className="hidden sm:inline">
                  Quality data from CMS Nursing Home Compare (public domain).
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <Link to="/legal/privacy" className="hover:text-foreground">
                  Privacy
                </Link>
                <Link to="/legal/terms" className="hover:text-foreground">
                  Terms
                </Link>
                <Link to="/legal/cookies" className="hover:text-foreground">
                  Cookies
                </Link>
                <Link to="/legal/accessibility" className="hover:text-foreground">
                  Accessibility
                </Link>
                <Link to="/legal/data" className="hover:text-foreground">
                  Data sources
                </Link>
                <a href="mailto:support@carepath.io" className="hover:text-foreground">
                  Contact
                </a>
              </div>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              CarePath is a directory and matchmaking service. We are not a
              referral service paid by facilities for placements — listings are
              free and editorial integrity comes from a fixed sponsored-ad
              auction, never from pay-for-placement deals.
            </p>
          </div>
        </div>
      </footer>
    </>
  )
}

function FooterLinkColumn({
  title,
  className = "",
  children,
}: {
  title: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={className}>
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm">{children}</ul>
    </div>
  )
}

function FooterLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <li>
      <Link to={to} className="text-muted-foreground hover:text-foreground">
        {children}
      </Link>
    </li>
  )
}

function SocialIcon({
  to,
  label,
  children,
}: {
  to: string
  label: string
  children: React.ReactNode
}) {
  return (
    <a
      href={to}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className="rounded-full border bg-background p-2 transition-colors hover:text-foreground"
    >
      {children}
    </a>
  )
}

function MobileAccordion({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <details className="rounded-lg border bg-card">
      <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-semibold marker:hidden [&::-webkit-details-marker]:hidden">
        {title}
        <span className="text-muted-foreground transition-transform" aria-hidden>
          +
        </span>
      </summary>
      <div className="border-t px-4 py-3">{children}</div>
    </details>
  )
}

function FooterNewsletter() {
  const [email, setEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await api.post("/marketplace/leads", { source: "newsletter", email })
      setDone(true)
    } catch (err) {
      const e = err as {
        response?: { data?: { message?: string; errors?: Record<string, string[]> } }
      }
      const first = e.response?.data?.errors
        ? Object.values(e.response.data.errors)[0]?.[0]
        : undefined
      setError(first ?? e.response?.data?.message ?? "Couldn't subscribe — try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="mt-5 inline-flex items-center gap-2 rounded-md border border-primary/30 bg-accent/40 px-3 py-2 text-xs">
        <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
        Subscribed — first issue lands soon.
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="mt-5">
      <label htmlFor="footer-newsletter" className="text-xs font-medium text-foreground">
        Plain-English guides, in your inbox
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="footer-newsletter"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-ring"
        />
        <Button type="submit" size="sm" disabled={submitting || !email}>
          Subscribe
        </Button>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        Medicare, Medicaid, VA tips. Unsubscribe any time.
      </p>
      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
    </form>
  )
}
