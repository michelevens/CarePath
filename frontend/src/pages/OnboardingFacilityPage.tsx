import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  ImageIcon,
  Loader2,
  Mail,
  Sparkles,
  Star,
} from "lucide-react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Meta } from "@/components/Meta"

interface Facility {
  slug: string
  name: string
  city: string
  state: string
  type: string
}

interface ClaimStatus {
  authenticated: boolean
  is_facility_member?: boolean
  claim_status?: "pending" | "approved" | "rejected" | "withdrawn" | null
  claim_submitted_at?: string | null
}

/**
 * Post-claim landing page. Replaces the dead-end "Claim submitted, we'll
 * email you" success state that left the operator stranded.
 *
 * Shows three things based on claim status:
 *   - 3-step timeline (submitted → verifying → approved)
 *   - The Operator's Playbook PDF (unlocked the moment the claim is in)
 *   - Preview of what they'll be able to do once approved
 *
 * Auto-polls /claim-status every 10s so the page flips to the "approved"
 * state without a manual refresh — the moment the SuperAdmin clicks
 * approve (or the email-domain auto-approval fires), the page lights up.
 */
export function OnboardingFacilityPage() {
  const { slug } = useParams<{ slug: string }>()
  const { user } = useAuth()
  const [facility, setFacility] = useState<Facility | null>(null)
  const [status, setStatus] = useState<ClaimStatus | null>(null)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)

  // Load facility + claim status, then poll status every 10s so the
  // page reflects approval without a manual refresh.
  useEffect(() => {
    if (!slug) return
    let alive = true

    api
      .get<{ data: Facility }>(`/marketplace/facilities/${slug}`)
      .then((r) => alive && setFacility(r.data.data))
      .catch(() => {})

    const loadStatus = () =>
      api
        .get<{ data: ClaimStatus }>(`/facilities/${slug}/claim-status`)
        .then((r) => alive && setStatus(r.data?.data ?? null))
        .catch(() => {})

    loadStatus()
    const interval = setInterval(loadStatus, 10_000)

    return () => {
      alive = false
      clearInterval(interval)
    }
  }, [slug])

  const downloadPlaybook = async () => {
    setDownloadingPdf(true)
    setPdfError(null)
    try {
      const r = await api.post(
        "/marketplace/guides/why-list-on-carepath/download",
        {},
        { responseType: "blob" }
      )
      const blob = new Blob([r.data as BlobPart], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "carepath-why-list-on-carepath.pdf"
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } }
      setPdfError(err.response?.data?.message ?? "Download failed.")
    } finally {
      setDownloadingPdf(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Meta title="Sign in to continue" canonical={`/onboarding/facility/${slug}`} />
        <div className="mx-auto max-w-md p-10 text-sm">
          <h1 className="text-lg font-semibold">Sign in to view your claim</h1>
          <Button asChild className="mt-4">
            <Link to={`/login?next=/onboarding/facility/${slug}`}>Sign in</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (!facility || !status) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading your claim…
      </div>
    )
  }

  const isApproved = status.is_facility_member || status.claim_status === "approved"
  const isPending = !isApproved && status.claim_status === "pending"
  const isRejected = status.claim_status === "rejected"

  return (
    <div className="min-h-screen bg-background">
      <Meta
        title={`${facility.name} — claim status`}
        description={`Your claim for ${facility.name} on CarePath.`}
        canonical={`/onboarding/facility/${facility.slug}`}
      />

      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            CarePath
          </Link>
          <Link
            to={`/facility/${facility.slug}`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            View public listing <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {/* Hero with status callout */}
        <div className="rounded-2xl border bg-card p-6 sm:p-10">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Your claim
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            {isApproved ? "You're approved." : isPending ? "We received your claim." : isRejected ? "Your claim was declined." : "Submitting…"}
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            {isApproved ? (
              <>You now have admin access to <strong className="text-foreground">{facility.name}</strong>. Edit the listing whenever you're ready — the world sees changes immediately.</>
            ) : isPending ? (
              <>We're verifying your claim for <strong className="text-foreground">{facility.name}</strong>. Typical turnaround is 1-2 business days. While you wait, grab the operator's playbook below.</>
            ) : isRejected ? (
              <>Email <a className="underline" href="mailto:support@carepath.io">support@carepath.io</a> if you'd like to discuss — we're happy to re-review with additional proof.</>
            ) : (
              <>Hang tight — checking status.</>
            )}
          </p>

          {isApproved && (
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Button asChild size="lg">
                <Link to="/admin/listing">
                  Start managing your listing
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/admin/facility">Facility overview</Link>
              </Button>
            </div>
          )}
        </div>

        {/* Status timeline */}
        <Card className="mt-6">
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Where you are
            </h2>
            <ol className="mt-4 grid gap-4 sm:grid-cols-3">
              <TimelineStep
                state="done"
                title="Claim submitted"
                body="Your contact details and supporting notes are on file."
              />
              <TimelineStep
                state={isApproved ? "done" : isPending ? "active" : "skipped"}
                title="Verification"
                body={
                  isApproved
                    ? "Verified — email domain matched the facility website or the team confirmed it."
                    : "We'll match your email domain, look you up online, or call the published facility number."
                }
              />
              <TimelineStep
                state={isApproved ? "done" : "pending"}
                title="Admin access"
                body={
                  isApproved
                    ? "You can edit Profile, Photos, Amenities, and route tour requests."
                    : "Unlocked the moment your claim is approved."
                }
              />
            </ol>
          </CardContent>
        </Card>

        {/* Operator's Playbook */}
        <Card className="mt-6 border-violet-200 bg-violet-50/40">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
              <Sparkles className="h-5 w-5 text-violet-700" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold">
                Your bonus: the 2026 Operator's Playbook
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                4 pages on why claimed listings convert 2-3× better, what the
                free tier covers, when Pro pays for itself, and how the CMS
                Five-Star reality plays on your page.
              </p>
              {pdfError && <p className="mt-2 text-xs text-destructive">{pdfError}</p>}
            </div>
            <Button onClick={downloadPlaybook} disabled={downloadingPdf} className="shrink-0">
              {downloadingPdf ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-1 h-4 w-4" />
              )}
              Download (PDF)
            </Button>
          </CardContent>
        </Card>

        {/* What unlocks */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold tracking-tight">
            {isApproved ? "Pick the first thing to do" : "What you unlock when we approve"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isApproved
              ? "Most operators see the biggest lift from photos first, then pricing."
              : "Plus full access to the admin portal and analytics."}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <UnlockCard
              icon={ImageIcon}
              title="Upload real photos"
              body="The single biggest tour-conversion lift. 3-5 shots: exterior, common room, dining, one suite, outdoor."
              cta={isApproved ? { to: "/admin/listing", label: "Open photo editor" } : undefined}
            />
            <UnlockCard
              icon={Building2}
              title="Edit profile + pricing"
              body="Replace the generic placeholder with your tagline, About paragraph, real starting price, and contact info."
              cta={isApproved ? { to: "/admin/listing", label: "Edit profile" } : undefined}
            />
            <UnlockCard
              icon={Mail}
              title="Tour-request routing"
              body="Inbound inquiries go straight to your admissions inbox — no auction, no resale, no fee per move-in."
              cta={isApproved ? { to: "/admin/listing", label: "Set routing email" } : undefined}
            />
            <UnlockCard
              icon={BarChart3}
              title="30-day analytics"
              body="Impressions, detail views, tour requests, phone clicks. See exactly which days your listing converted."
              cta={isApproved ? { to: "/admin/analytics", label: "Open analytics" } : undefined}
            />
            <UnlockCard
              icon={Star}
              title="Respond to reviews"
              body="Publish a public reply to any review. Families read the response, not just the review."
              cta={isApproved ? { to: `/facility/${facility.slug}`, label: "View reviews" } : undefined}
            />
            <UnlockCard
              icon={Sparkles}
              title="Sponsored placements (Pro)"
              body="When you have an occupancy gap, boost in search. Bid × quality ranking — no editorial dilution."
              cta={isApproved ? { to: "/admin/sponsored", label: "Set up a campaign" } : undefined}
            />
          </div>
        </div>

        {/* Footer help */}
        <Card className="mt-8 bg-muted/30">
          <CardContent className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm">
              <strong>Questions?</strong>{" "}
              <span className="text-muted-foreground">
                Email{" "}
                <a className="text-primary hover:underline" href="mailto:hello@carepath.io">
                  hello@carepath.io
                </a>{" "}
                — same-day responses from a real human.
              </span>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to={`/facility/${facility.slug}`}>
                Back to listing <ExternalLink className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

function TimelineStep({
  state,
  title,
  body,
}: {
  state: "done" | "active" | "pending" | "skipped"
  title: string
  body: string
}) {
  const Icon =
    state === "done" ? CheckCircle2 : state === "active" ? Clock : state === "skipped" ? CheckCircle2 : Clock
  const iconCls =
    state === "done"
      ? "text-emerald-600"
      : state === "active"
      ? "text-amber-600"
      : state === "skipped"
      ? "text-emerald-600"
      : "text-muted-foreground/50"

  return (
    <li className="rounded-lg border bg-background p-4">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${iconCls}`} />
        <div className="text-sm font-semibold">{title}</div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{body}</p>
    </li>
  )
}

function UnlockCard({
  icon: Icon,
  title,
  body,
  cta,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  body: string
  cta?: { to: string; label: string }
}) {
  return (
    <Card>
      <CardContent className="flex h-full flex-col p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-accent p-2 text-accent-foreground">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold">{title}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{body}</p>
          </div>
        </div>
        {cta && (
          <Button asChild variant="outline" size="sm" className="mt-4 self-start">
            <Link to={cta.to}>
              {cta.label} <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
