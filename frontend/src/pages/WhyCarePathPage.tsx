import { Link } from "react-router-dom"
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Calculator,
  CheckCircle2,
  FileText,
  MinusCircle,
  PhoneOff,
  RefreshCw,
  Shield,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Meta } from "@/components/Meta"
import { TrustStrip } from "@/components/TrustStrip"

type Cell = "yes" | "no" | "partial" | "hidden"

interface Row {
  label: string
  detail?: string
  carepath: Cell
  apfm: Cell
  caring: Cell
  direct: Cell
}

const ROWS: Row[] = [
  {
    label: "Your contact info goes to ONE facility, not 30",
    detail: "We never sell, share, or distribute leads to multiple operators.",
    carepath: "yes", apfm: "no", caring: "no", direct: "yes",
  },
  {
    label: "Real-time bed availability",
    detail: "Pulled from each facility's own census — not 3-week-stale CSV.",
    carepath: "yes", apfm: "no", caring: "no", direct: "partial",
  },
  {
    label: "Transparent monthly pricing on listings",
    detail: "Base rate + level-of-care adders + community fees, itemized.",
    carepath: "yes", apfm: "hidden", caring: "partial", direct: "no",
  },
  {
    label: "Federal CMS Five-Star ratings (live)",
    detail: "Synced daily from Nursing Home Compare. Cited, not paraphrased.",
    carepath: "yes", apfm: "partial", caring: "partial", direct: "no",
  },
  {
    label: "5-year cost projection (Medicare + Medicaid + LTC ins + VA)",
    detail: "Blended payer math, year-by-year. Most calculators do only one payer.",
    carepath: "yes", apfm: "partial", caring: "partial", direct: "no",
  },
  {
    label: "Book a tour online without a phone call",
    detail: "Real calendar, real slots, instant confirmation.",
    carepath: "yes", apfm: "no", caring: "no", direct: "no",
  },
  {
    label: "Free, branded PDF guides — email only",
    detail: "Tour question sheet, Medicare cheat sheet, Medicaid look-back, more.",
    carepath: "yes", apfm: "partial", caring: "no", direct: "no",
  },
  {
    label: "100% free for families",
    detail: "We don't charge families, period. (Facilities pay a flat listing fee.)",
    carepath: "yes", apfm: "yes", caring: "yes", direct: "yes",
  },
  {
    label: "No 'advisor' assigned to manage you",
    detail: "Self-serve search, no high-pressure follow-up calls.",
    carepath: "yes", apfm: "no", caring: "no", direct: "yes",
  },
  {
    label: "Verified reviews tied to confirmed stays",
    detail: "Reviews carry a 'Verified stay' badge when we can match to admission.",
    carepath: "yes", apfm: "partial", caring: "partial", direct: "no",
  },
]

export function WhyCarePathPage() {
  return (
    <div className="min-h-screen bg-background">
      <Meta
        title="Why CarePath vs. A Place for Mom, Caring.com & calling facilities directly"
        description="Side-by-side comparison: transparent pricing, no lead-selling, live CMS data, real-time bed availability, online tour booking. Decide which model fits your family."
        canonical="/why-carepath"
      />

      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            CarePath
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
              Back home
            </Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-12 md:py-16">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border bg-accent/60 px-3 py-1 text-xs font-medium text-accent-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Why CarePath
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
            How families end up here.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Most senior-living websites are <em>lead-gen brokers</em> dressed up as
            search engines — they sell your contact info to dozens of facilities,
            then collect a fee when one signs your loved one. We don't. Here's what
            that actually changes.
          </p>
        </div>

        <TrustStrip className="mt-8" />

        <h2 className="mt-14 text-2xl font-semibold tracking-tight">
          The 10-row honest comparison
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated 2026-05-16. We'll re-check competitors every 90 days and
          re-publish.
        </p>

        <div className="mt-6 overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-medium"></th>
                <th className="px-4 py-3 text-left font-medium">
                  <div className="font-semibold text-primary">CarePath</div>
                </th>
                <th className="px-4 py-3 text-left font-medium">A Place for Mom</th>
                <th className="px-4 py-3 text-left font-medium">Caring.com</th>
                <th className="px-4 py-3 text-left font-medium">Calling facilities directly</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.label} className="border-t">
                  <td className="px-4 py-4">
                    <div className="font-medium">{r.label}</div>
                    {r.detail && (
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {r.detail}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4"><CellMark v={r.carepath} highlight /></td>
                  <td className="px-4 py-4"><CellMark v={r.apfm} /></td>
                  <td className="px-4 py-4"><CellMark v={r.caring} /></td>
                  <td className="px-4 py-4"><CellMark v={r.direct} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="mt-14 text-2xl font-semibold tracking-tight">
          What our model looks like in practice
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <PhoneOff className="h-6 w-6 text-primary" />
              <h3 className="mt-3 font-semibold">No "free advisor" attached to you</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Other sites match you with a "senior living advisor" who is
                paid commission per placement. We don't. You can self-serve from
                start to finish.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <RefreshCw className="h-6 w-6 text-primary" />
              <h3 className="mt-3 font-semibold">Live federal data, not marketing claims</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                CMS Five-Star ratings, F-tag history, and certification status
                come straight from Nursing Home Compare. Resynced daily.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <Building2 className="h-6 w-6 text-primary" />
              <h3 className="mt-3 font-semibold">Real-time bed availability</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                When a facility uses our platform, their census flows into the
                listing. No more "call to confirm" — see what's open right now.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <Calculator className="h-6 w-6 text-primary" />
              <h3 className="mt-3 font-semibold">Blended 5-year cost projection</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Most cost calculators show one payer. Ours blends Medicare A,
                Medicaid spend-down, LTC insurance, VA Aid &amp; Attendance, and
                private pay — year-by-year, with Medicaid eligibility timing.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <FileText className="h-6 w-6 text-primary" />
              <h3 className="mt-3 font-semibold">Free branded guides — email only</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Tour Day question sheet, Medicare cheat sheet, Medicaid 5-year
                look-back checklist, VA application kit, and more. No phone
                number required, no advisor assignment.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <Shield className="h-6 w-6 text-primary" />
              <h3 className="mt-3 font-semibold">Your data stays with you</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Search history, saved facilities, saved searches all live in
                your browser. We don't build a profile to sell. When you
                request a tour, exactly one facility sees your info.
              </p>
            </CardContent>
          </Card>
        </div>

        <h2 className="mt-14 text-2xl font-semibold tracking-tight">
          When other sites might fit better
        </h2>
        <p className="mt-2 text-muted-foreground">
          We don't pretend to be the right answer for every family.
        </p>
        <div className="mt-4 space-y-3">
          <div className="flex items-start gap-3 rounded-lg border bg-card p-4">
            <MinusCircle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
            <div>
              <div className="font-medium">You actively want a human advisor to do the legwork.</div>
              <div className="mt-1 text-sm text-muted-foreground">
                APFM's commissioned advisor model exists because some families
                genuinely want one. We're the wrong fit if you'd rather hand
                off the search entirely.
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border bg-card p-4">
            <MinusCircle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
            <div>
              <div className="font-medium">You need home care, not facility care.</div>
              <div className="mt-1 text-sm text-muted-foreground">
                CarePath focuses on facility-based long-term care (SNF, ALF,
                memory care, CCRC). For in-home care, sister project ShiftPulse
                is being built; in the meantime, Care.com and A Place for Mom's
                home-care directory cover that need.
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border bg-card p-4">
            <MinusCircle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
            <div>
              <div className="font-medium">You're in a state we don't cover deeply yet.</div>
              <div className="mt-1 text-sm text-muted-foreground">
                We cover the full national CMS dataset, but our pricing and
                amenity depth is best in markets where we've onboarded
                facility partners. Check the state page for coverage detail.
              </div>
            </div>
          </div>
        </div>

        <div className="mt-14 grid gap-4 rounded-2xl border bg-muted/30 p-8 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Convinced? Skip the small talk.
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              No form, no advisor assignment. Search by ZIP, filter, save,
              tour. Start where it's useful.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="lg">
              <Link to="/search">Find facilities <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/guides">Free guides</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

function CellMark({ v, highlight }: { v: Cell; highlight?: boolean }) {
  if (v === "yes") {
    return (
      <span className={highlight ? "inline-flex items-center gap-1 font-medium text-foreground" : "inline-flex items-center gap-1 text-foreground"}>
        <CheckCircle2 className="h-4 w-4 text-primary" />
        Yes
      </span>
    )
  }
  if (v === "partial") return <span className="text-muted-foreground">Partial</span>
  if (v === "hidden") return <span className="text-muted-foreground">Hidden</span>
  return <span className="text-muted-foreground/60">—</span>
}

