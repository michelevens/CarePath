import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Circle,
  DollarSign,
  Sparkles,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

/**
 * Internal monetization plan — written for the SuperAdmin team
 * (founder + close advisors). Not a marketing surface. Plain,
 * specific, numbers-first. Updated as we ship streams.
 *
 * Last reviewed: 2026-05-19
 */
export function MonetizationPlanPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6 md:p-10">
      <Header />
      <ExecutiveSummary />
      <SponsoredAdsAssessment />
      <RevenueStreams />
      <FacilitySalesPlaybook />
      <PricingStrategy />
      <RoadmapPhases />
      <NorthStarMetrics />
      <RisksAndOpenQuestions />
    </div>
  )
}

function Header() {
  return (
    <header className="border-b pb-6">
      <div className="inline-flex items-center gap-2 rounded-full border bg-accent/40 px-3 py-1 text-xs font-medium text-accent-foreground">
        <DollarSign className="h-3.5 w-3.5" />
        SuperAdmin · internal document
      </div>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
        The CarePath Monetization Plan
      </h1>
      <p className="mt-3 max-w-3xl text-base text-muted-foreground">
        Where we are vs the market, the five revenue streams, what we
        charge whom, the facility-side sales playbook, and a phased
        roadmap with concrete targets. Living document — last reviewed
        2026-05-19.
      </p>
    </header>
  )
}

function ExecutiveSummary() {
  return (
    <Section title="Executive summary" eyebrow="The 60-second version">
      <p>
        CarePath is positioned against the two incumbent business
        models in family-side senior care: <strong>A Place for
        Mom</strong> (placement-fee auction; facility pays 70-100%
        of a month's rent per move-in) and <strong>Caring.com /
        SeniorAdvisor</strong> (lead-resale; family contact info sold
        to 3-5 facilities at $150-300 per qualified lead). Both extract
        from the facility side at the moment of conversion. We don't.
      </p>
      <p>
        Our wedge is <strong>"the marketplace that doesn't auction
        your lead"</strong> — families get a directory that respects
        their data, facilities get tour requests routed straight to
        their inbox at no per-move-in cost. Revenue comes from
        <em>optional</em> facility-side subscriptions and sponsored
        boosts (clearly labeled, quality-blended ranking, never
        editorial dilution) plus advisor-commission splits and family-
        side premium tools.
      </p>
      <table className="mt-5 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="px-3 py-2 text-left font-semibold">Stream</th>
            <th className="px-3 py-2 text-left font-semibold">Status</th>
            <th className="px-3 py-2 text-right font-semibold">Year-1 target</th>
            <th className="px-3 py-2 text-right font-semibold">Year-3 target</th>
          </tr>
        </thead>
        <tbody>
          <Row stream="Facility Pro subscription" status="live" y1="$120K ARR" y3="$2.5M ARR" />
          <Row stream="Sponsored ads (CPC + monthly)" status="live" y1="$80K" y3="$3.5M" />
          <Row stream="Advisor commission splits (Stripe Connect)" status="live" y1="$60K" y3="$1.8M" />
          <Row stream="Family Pro subscription" status="ship Q3" y1="$30K ARR" y3="$1.2M ARR" />
          <Row stream="Hospital partner widget + LTC data licensing" status="design" y1="$0" y3="$800K" />
          <tr className="border-t bg-muted/30 font-semibold">
            <td className="px-3 py-2" colSpan={2}>Total</td>
            <td className="px-3 py-2 text-right">~$290K</td>
            <td className="px-3 py-2 text-right">~$9.8M</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-3 text-xs text-muted-foreground">
        Year-1 numbers assume 800 claimed facilities by month 12 (FL, CA,
        TX focus) and a 12% conversion to Pro. Year-3 assumes 8,000
        claimed facilities and the addition of family-side + B2B
        streams.
      </p>
    </Section>
  )
}

function Row({ stream, status, y1, y3 }: { stream: string; status: string; y1: string; y3: string }) {
  const statusCls =
    status === "live"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : status === "ship Q3"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-stone-200 bg-stone-50 text-stone-700"
  return (
    <tr className="border-b last:border-b-0">
      <td className="px-3 py-2">{stream}</td>
      <td className="px-3 py-2">
        <span className={`inline-block rounded border px-2 py-0.5 text-xs font-medium ${statusCls}`}>
          {status}
        </span>
      </td>
      <td className="px-3 py-2 text-right">{y1}</td>
      <td className="px-3 py-2 text-right">{y3}</td>
    </tr>
  )
}

function SponsoredAdsAssessment() {
  return (
    <Section title="Sponsored ads — where we stand vs the market" eyebrow="Stream #1 assessment">
      <p>
        Honest assessment: <strong>structurally best-in-market for
        senior-living-specific advertising.</strong> No senior-living
        marketplace currently has bid×quality ranking, per-creative A/B
        testing, per-surface bidding, and conversion-attribution wired
        all the way through to actual placement revenue. We do. The
        gaps are operational, not structural — features that exist on
        Google Ads / Meta but that most domain-specific marketplaces
        skip on purpose.
      </p>

      <h3 className="mt-6 text-lg font-semibold">What we have</h3>
      <CheckList>
        <li><strong>Sponsored campaigns</strong> with bid + monthly budget caps + start/end dates, all manageable from the facility admin portal</li>
        <li><strong>Quality-blended ranking</strong> — sponsored rank is (bid × quality_score) where quality includes CMS rating, verification status, photo completeness, and historical CTR. A 1-star facility cannot outbid a 4-star one. <em>Editorial integrity intact.</em></li>
        <li><strong>Per-surface bidding</strong> — separate bids for search results, city landing pages, and detail-page sidecar</li>
        <li><strong>A/B testable creatives</strong> — multiple headline + body variants per campaign with session-hash routing for stable assignment + statistical significance detection</li>
        <li><strong>Negative targeting</strong> — pause your ad on specific competitor pages</li>
        <li><strong>Frequency capping</strong> — max impressions per session, per day, per surface</li>
        <li><strong>Click attribution → admission → placement</strong> — full chain wired via FKs (placements.sponsored_click_id) so ROAS is a single SUM, not a recompute</li>
        <li><strong>Monthly billing via Stripe Invoices</strong> with downloadable PDF invoices</li>
        <li><strong>Bid recommendations panel</strong> — "Why didn't I win more?" insights per campaign</li>
        <li><strong>Self-serve sponsored detail page</strong> (/admin/sponsored/{`{id}`}) with daily time-series, per-variant CTR, conversion funnel</li>
      </CheckList>

      <h3 className="mt-6 text-lg font-semibold">Comparison to senior-living competitors</h3>
      <table className="mt-3 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="px-3 py-2 text-left font-semibold">Feature</th>
            <th className="px-3 py-2 text-left font-semibold">CarePath</th>
            <th className="px-3 py-2 text-left font-semibold">A Place for Mom</th>
            <th className="px-3 py-2 text-left font-semibold">Caring.com</th>
            <th className="px-3 py-2 text-left font-semibold">SeniorAdvisor</th>
          </tr>
        </thead>
        <tbody>
          <Cmp label="Self-serve campaign create" us="✓" apfm="N/A" caring="N/A" sa="✓" />
          <Cmp label="Bid + budget controls" us="✓" apfm="—" caring="—" sa="—" />
          <Cmp label="Quality-blended ranking" us="✓" apfm="—" caring="—" sa="—" />
          <Cmp label="Per-creative A/B testing" us="✓" apfm="—" caring="—" sa="—" />
          <Cmp label="Per-surface bidding" us="✓" apfm="—" caring="—" sa="—" />
          <Cmp label="Negative targeting" us="✓" apfm="—" caring="—" sa="—" />
          <Cmp label="Real placement-revenue ROAS" us="✓" apfm="N/A — placement model" caring="—" sa="—" />
          <Cmp label="Monthly self-serve invoice (PDF)" us="✓" apfm="—" caring="—" sa="—" />
        </tbody>
      </table>
      <p className="mt-2 text-xs text-muted-foreground">
        APFM doesn't run a sponsored-ad system; it runs a placement-fee model. Caring/SeniorAdvisor have premium listings but not bid-based sponsored placements.
      </p>

      <h3 className="mt-6 text-lg font-semibold">Gaps vs Google Ads / Meta (intentionally deferred)</h3>
      <CheckList icon="circle">
        <li><strong>Audience targeting</strong> — by ZIP radius, household income, care-type interest. Build in Q4 when we have enough conversion data to train the targeting.</li>
        <li><strong>Auto-bidding (target-CPA, target-ROAS)</strong> — needs ≥30 days of conversion data per campaign before it works. Layer on after 6 months of live data.</li>
        <li><strong>Bid forecasting</strong> — "if you bid $X you'll get ~Y impressions". Requires saturated auction data; we'll have it in 6-12 months.</li>
        <li><strong>Lookalike audiences</strong> — show ads to families with similar profile to past converters. Future, post-Family-Pro launch.</li>
        <li><strong>Conversion-based bidding</strong> — bid per placement instead of per click. Adventurous; defer until ROAS data stabilizes.</li>
        <li><strong>Custom audiences from CRM upload</strong> — facility uploads their existing waitlist, we retarget. Privacy concerns; defer.</li>
        <li><strong>View-through attribution</strong> — credit campaigns that drove an impression but not a click. Tiny lift for senior-living; defer indefinitely.</li>
      </CheckList>

      <h3 className="mt-6 text-lg font-semibold">The verdict</h3>
      <Callout kind="ok">
        <strong>Yes, we have the best-structured sponsored-ad system in
        senior-living-specific marketplaces.</strong> The gaps vs Google
        Ads are appropriate to defer — they need scale + conversion data
        we don't have yet. Right priority is operational: get facilities
        to actually use what's already shipped.
      </Callout>
    </Section>
  )
}

function Cmp({ label, us, apfm, caring, sa }: { label: string; us: string; apfm: string; caring: string; sa: string }) {
  return (
    <tr className="border-b last:border-b-0">
      <td className="px-3 py-2">{label}</td>
      <td className="px-3 py-2 font-semibold text-emerald-700">{us}</td>
      <td className="px-3 py-2 text-muted-foreground">{apfm}</td>
      <td className="px-3 py-2 text-muted-foreground">{caring}</td>
      <td className="px-3 py-2 text-muted-foreground">{sa}</td>
    </tr>
  )
}

function RevenueStreams() {
  return (
    <Section title="The 5 revenue streams" eyebrow="What we charge whom">
      <Stream
        idx={1}
        title="Facility Pro subscription"
        status="live"
        who="SNFs, ALFs, memory care, group homes, CCRCs"
        price="$199/mo (Standard) · $399/mo (Pro) · $799/mo (Enterprise)"
        what={`Standard: claim, photos, amenities, tour-request routing, basic analytics, verified-manager badge.
Pro: + listing-completeness coach, 30-day analytics with funnel, sponsored campaign creation (cost extra), review-response posting, A/B-testable creatives, multi-admin invites.
Enterprise: + multi-facility network roll-up, white-label embed, API access, custom reports.`}
        target="200 Pro subs by month 12, 800 by month 24, 2,500 by month 36"
      />
      <Stream
        idx={2}
        title="Sponsored ads"
        status="live"
        who="Pro / Enterprise tier facilities"
        price="$0.50-$3.00 CPC bid (facility sets); typical campaign $300-1,500/month"
        what={`Bid × quality-score ranking on search results, city/state landing pages, and detail-page sidecar. Monthly invoice via Stripe. Full attribution to placement revenue.`}
        target="20% of Pro subs run an active campaign by month 12, avg $800/mo spend"
      />
      <Stream
        idx={3}
        title="Advisor commission splits"
        status="live"
        who="Placement advisors (vetted referral partners)"
        price="Platform keeps 18% of advisor's commission; advisor takes 82%"
        what={`When a vetted advisor sources a family that places at a facility, the facility pays a placement fee (typically 80-100% of one month's rent). Stripe Connect splits — advisor 82%, platform 18%. Industry standard is ~20% platform take.`}
        target="50 active advisors by month 12, generating ~150 placements/mo @ avg $4,500 platform fee"
      />
      <Stream
        idx={4}
        title="Family Pro subscription"
        status="ship Q3 2026"
        who="Adult-child families navigating placement"
        price="$9.99/mo (monthly) or $79/yr"
        what={`Free tier: search, view facility details, request tours, download 3 guides/month.
Pro tier: unlimited guide downloads, unlimited saved searches with email alerts, AI Care Concierge (Claude-powered chat with the full guide library + your loved one's profile as context), printable comparison reports, cost projection with state-specific Medicaid math, priority response on tour requests.`}
        target="2,500 Family Pro subs by month 18 (~$300K ARR)"
      />
      <Stream
        idx={5}
        title="Hospital partner widget + LTC data licensing"
        status="design phase"
        who="Hospital discharge planners; LTC insurers; state agencies"
        price="$2,500-15,000/yr per hospital (widget); $25K-100K/yr (data API)"
        what={`Hospital widget: embeddable iframe ("Find a Skilled Nursing Bed Tonight") that discharge planners use; we route the inquiry to the family + the matched facility. Hospital pays a flat annual fee.
Data licensing: anonymized occupancy + price + demand-curve data feeds to LTC insurers for underwriting, to state agencies for waitlist planning. Subscription-based.`}
        target="10 hospital widget customers by month 18; first data customer in month 12"
      />
    </Section>
  )
}

function Stream({ idx, title, status, who, price, what, target }: { idx: number; title: string; status: string; who: string; price: string; what: string; target: string }) {
  const cls =
    status === "live"
      ? "border-emerald-200 bg-emerald-50/40"
      : status === "ship Q3 2026"
      ? "border-amber-200 bg-amber-50/40"
      : "border-stone-200 bg-stone-50/40"
  return (
    <Card className={`mt-4 ${cls}`}>
      <CardContent className="space-y-2 p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-lg font-semibold">{idx}. {title}</h3>
          <span className="rounded-full border bg-card px-2 py-0.5 text-xs font-medium uppercase tracking-wide">
            {status}
          </span>
        </div>
        <p className="text-sm"><strong>Who:</strong> {who}</p>
        <p className="text-sm"><strong>Price:</strong> {price}</p>
        <p className="whitespace-pre-line text-sm text-muted-foreground">{what}</p>
        <p className="text-sm"><strong>Target:</strong> {target}</p>
      </CardContent>
    </Card>
  )
}

function FacilitySalesPlaybook() {
  return (
    <Section title="The facility-side sales playbook" eyebrow="How to convince them to advertise">
      <p>
        Most facilities have been burned by lead-gen ($150-300 per
        "qualified lead" that didn't tour, no transparency on
        attribution) or by placement-fee platforms ($3,800-5,500
        clawed off every move-in). They're hostile to the category
        for good reasons. The sales conversation isn't "buy our
        thing" — it's "we're different and here's the proof."
      </p>

      <h3 className="mt-6 text-lg font-semibold">The 4-step conversion flow</h3>

      <Card className="mt-3">
        <CardContent className="space-y-3 p-5">
          <h4 className="font-semibold">Step 1 — Claim (free, friction-free)</h4>
          <p className="text-sm">
            Every facility in the directory is already claimable for free.
            They claim → email-domain auto-approves (instant) → access
            admin portal → upload real photos. <strong>This is the
            wedge.</strong> Manager sees their facility look 2-3× better
            on a free claim. They're now sticky on the platform.
          </p>
          <p className="text-sm text-muted-foreground">
            Sales motion: outbound email to unclaimed facilities with the
            "your free listing has 47 views/month — claim to control the
            narrative" hook. Zero monetary ask.
          </p>
        </CardContent>
      </Card>

      <Card className="mt-3">
        <CardContent className="space-y-3 p-5">
          <h4 className="font-semibold">Step 2 — Hand them the data</h4>
          <p className="text-sm">
            Once claimed, 30-day analytics start collecting. <strong>The
            listing-completeness coach + the funnel report do the
            selling for us.</strong> They see: "Your listing was shown
            1,247 times this week, clicked 89 times, generated 4 tour
            requests." They see their position vs nearby facilities.
            They see what's missing from their listing.
          </p>
          <p className="text-sm text-muted-foreground">
            They start to think about <em>how to get more</em>. That's the
            opening for Step 3.
          </p>
        </CardContent>
      </Card>

      <Card className="mt-3">
        <CardContent className="space-y-3 p-5">
          <h4 className="font-semibold">Step 3 — Upgrade to Pro (~$200/mo)</h4>
          <p className="text-sm">
            Pro unlocks: deeper analytics, multi-admin team, A/B-testable
            creatives, review response, listing-completeness coach
            (advanced), bed-board census public display.
          </p>
          <p className="text-sm">
            Pitch: <strong>"For less than half the cost of one APFM
            placement fee per year, you get the tools to win the
            placements yourself."</strong> The pricing anchors against
            the competitor's per-placement cost, which is order-of-
            magnitude more.
          </p>
        </CardContent>
      </Card>

      <Card className="mt-3">
        <CardContent className="space-y-3 p-5">
          <h4 className="font-semibold">Step 4 — Sponsored boost when they need fill</h4>
          <p className="text-sm">
            Pro facility has 6 open beds in November. They run a sponsored
            campaign with $800 monthly budget targeting their service
            radius. <strong>Bid × quality means they don't have to
            outbid the world to win impressions.</strong> Campaign closes
            2 placements = $9,000+ in revenue from $800 in ad spend.
            That's the case study we lead with for the next 100 prospects.
          </p>
        </CardContent>
      </Card>

      <h3 className="mt-6 text-lg font-semibold">The 5 objections we'll hear (and answers)</h3>
      <Objection
        q="We already pay APFM. Why pay you too?"
        a="APFM charges $3,800-5,500 per move-in (a month's rent). Our annual Pro cost is $2,400 + whatever you spend on sponsored boosts. ROI flips at ~1 placement per year via CarePath. Most Pro facilities see 6-15 per year."
      />
      <Objection
        q="We tried Caring.com leads. They were trash."
        a="Caring's model resells your lead to 3-5 facilities. Ours doesn't. Tour requests on CarePath go to your inbox only. We don't even have a tier where the lead is shared."
      />
      <Objection
        q="Sponsored placement feels gross / pay-to-play."
        a="We agree, which is why our sponsored rank is bid × quality, not bid alone. A 1-star facility can't outbid a 4-star one. Every sponsored placement is clearly labeled. CMS ratings + reviews are NEVER part of the paid tier."
      />
      <Objection
        q="Can you guarantee a certain number of leads?"
        a="No, because guarantees are how lead-gen platforms got their bad reputation. We can show you historical CTR on listings like yours and bid recommendations, but the auction is real and competitive."
      />
      <Objection
        q="How does my data get used?"
        a="Your listing data is public-record-derived (CMS, state boards) + whatever you add. We don't sell facility-side data. Tour-request data goes to you alone, never resold."
      />

      <h3 className="mt-6 text-lg font-semibold">Outbound sales — the first 500 facilities</h3>
      <p>
        Manual outreach by founder (you) for the first 500. Goal: 50%
        claim rate, 15% Pro conversion within 90 days. Script and
        target list:
      </p>
      <CheckList>
        <li><strong>Target list:</strong> 100 facilities in each of FL, CA, TX, AZ, NC where (a) CMS rating ≥3 stars, (b) currently unclaimed on CarePath, (c) website has a public contact email or admissions phone</li>
        <li><strong>Channel:</strong> personalized email (CSV → mail-merge), with the manager's name from the state licensure file when available</li>
        <li><strong>Hook:</strong> "Your facility has [X] impressions per month on our directory — currently shown with the generic placeholder photo. Claim takes 2 min and lets you control what families see."</li>
        <li><strong>CTA:</strong> link to <code>/facility/{`{slug}`}</code> with the claim card primed</li>
        <li><strong>Cadence:</strong> first email Tue, follow-up Thu, third nudge the following Tue, drop after that</li>
        <li><strong>Measurement:</strong> open rate target 45%, claim rate target 8% (industry benchmark for cold facility outreach is 2-4%)</li>
      </CheckList>
    </Section>
  )
}

function Objection({ q, a }: { q: string; a: string }) {
  return (
    <div className="mt-3 rounded-lg border bg-card p-4">
      <p className="text-sm font-semibold">"{q}"</p>
      <p className="mt-2 text-sm text-muted-foreground">{a}</p>
    </div>
  )
}

function PricingStrategy() {
  return (
    <Section title="Pricing strategy" eyebrow="Three pricing principles">
      <ol className="space-y-4 text-sm">
        <li>
          <strong>1. Always cheaper than the next-best alternative on
          a per-placement basis.</strong>
          <p className="mt-1 text-muted-foreground">
            Pro at $2,400/yr is cheaper than 1 APFM placement (~$5,000).
            Sponsored at $800/mo is cheaper than 2 placements/yr that it
            generates. The math has to be obvious to the prospect in under
            30 seconds.
          </p>
        </li>
        <li>
          <strong>2. Free tier always usable.</strong>
          <p className="mt-1 text-muted-foreground">
            A claimed facility on the free tier still gets photos, amenities,
            pricing edit, basic analytics. Family-side Free tier still gets
            search, compare, 3 guides, tour requests. <em>Pro is for power
            users, never for basic value.</em>
          </p>
        </li>
        <li>
          <strong>3. Annual prepay 17% discount (2 months free).</strong>
          <p className="mt-1 text-muted-foreground">
            Predictable revenue, lower churn, locks the customer in for
            12 months. Pro $199/mo or $1,990/yr (effective $166/mo).
          </p>
        </li>
      </ol>
    </Section>
  )
}

function RoadmapPhases() {
  return (
    <Section title="Phased roadmap to ~$10M ARR" eyebrow="36-month plan">
      <Phase
        n="Phase 1"
        months="Now → Month 6"
        target="$120K ARR run rate by month 6"
        focus="Supply-side priming"
        items={[
          "Outbound to 500 facilities in FL, CA, TX, AZ, NC",
          "Get 250 claims, convert 30 to Pro = ~$72K ARR",
          "Launch sponsored campaigns for the most-engaged 20 Pro accounts",
          "Wire facility-claim → onboarding-to-Pro flow with auto-upgrade prompt at week 4",
          "Publish 5 case studies (anonymized) showing ROAS on real campaigns",
        ]}
      />
      <Phase
        n="Phase 2"
        months="Month 6 → Month 12"
        target="$290K ARR by month 12"
        focus="Family-side launch + advisor network"
        items={[
          "Ship Family Pro subscription ($9.99/mo) with AI Care Concierge",
          "Vet + onboard 50 placement advisors via Stripe Connect; soft-launch advisor commissions",
          "Sponsored ad spend scales 5× as case studies land",
          "Hospital partner widget pilot with 1-2 health systems",
          "Brand campaign positioning against APFM placement-fee model (\"keep the move-in revenue\")",
        ]}
      />
      <Phase
        n="Phase 3"
        months="Month 12 → Month 24"
        target="$2M ARR"
        focus="Scale + data infrastructure"
        items={[
          "Geographic expansion: full nationwide claim outreach (8,000 facility targets)",
          "Ship auto-bidding (target-CPA, target-ROAS) once conversion data stabilizes",
          "Hospital widget at 10+ health systems",
          "First LTC data licensing customer (insurer or state agency)",
          "Network/enterprise tier ($799/mo) for multi-facility operators",
        ]}
      />
      <Phase
        n="Phase 4"
        months="Month 24 → Month 36"
        target="$9-10M ARR"
        focus="Platform + B2B"
        items={[
          "2,500+ paying facilities; 25,000+ Family Pro subs",
          "Audience targeting (ZIP/income/interest); lookalike audiences",
          "Self-serve hospital widget signup; ~25 hospital customers",
          "Multi-state data licensing deals",
          "Optional: white-label CarePath for regional health systems",
        ]}
      />
    </Section>
  )
}

function Phase({ n, months, target, focus, items }: { n: string; months: string; target: string; focus: string; items: string[] }) {
  return (
    <Card className="mt-4">
      <CardContent className="p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-lg font-semibold">{n} · {focus}</h3>
          <span className="text-xs text-muted-foreground">{months}</span>
        </div>
        <p className="mt-1 text-sm font-medium text-primary">Target: {target}</p>
        <ul className="mt-3 space-y-1.5">
          {items.map((it) => (
            <li key={it} className="flex items-start gap-2 text-sm">
              <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span>{it}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function NorthStarMetrics() {
  return (
    <Section title="North-star metrics" eyebrow="What to watch">
      <p>The metrics that tell you the business is healthy:</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <MetricCard
          label="Claimed-Facility Penetration"
          formula="(claimed facilities ÷ total directory) × 100"
          target="3% by month 6 · 10% by month 12 · 25% by month 24"
          why="Supply-side health"
        />
        <MetricCard
          label="Tour Request Response Time"
          formula="Median time from family tour request → facility first reply"
          target="< 4 hours (industry: 24-48h)"
          why="The wedge against APFM"
        />
        <MetricCard
          label="Sponsored ROAS"
          formula="Σ placement_revenue ÷ Σ ad_spend per campaign"
          target="≥ 5× (industry-leading: 3-4×)"
          why="Pro tier renewal driver"
        />
        <MetricCard
          label="Family Conversion Funnel"
          formula="impression → detail view → tour request → admission → placement"
          target="0.5% impression-to-placement"
          why="Marketplace health"
        />
        <MetricCard
          label="Pro Tier Net Revenue Retention"
          formula="(Pro renewals + expansions − churn) ÷ starting MRR"
          target="≥ 110%"
          why="Stickiness"
        />
        <MetricCard
          label="Advisor Placement Velocity"
          formula="Placements per active advisor per month"
          target="≥ 2.5 by month 12"
          why="Advisor unit economics"
        />
      </div>
    </Section>
  )
}

function MetricCard({ label, formula, target, why }: { label: string; formula: string; target: string; why: string }) {
  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <h4 className="text-sm font-semibold">{label}</h4>
        <p className="text-xs text-muted-foreground"><strong>Formula:</strong> {formula}</p>
        <p className="text-xs"><strong className="text-primary">Target:</strong> {target}</p>
        <p className="text-xs text-muted-foreground italic">{why}</p>
      </CardContent>
    </Card>
  )
}

function RisksAndOpenQuestions() {
  return (
    <Section title="Risks + open questions" eyebrow="What can break this plan">
      <Risk
        title="APFM cuts placement fees in response to pressure"
        body="They've held the line for 20 years but could discount to 50% of monthly to keep facilities. Our positioning would need to shift from cost arbitrage to quality + control."
        likelihood="medium"
      />
      <Risk
        title="State-level lead-gen regulation tightens"
        body="A few states (NJ, NY) have proposed senior-housing referral-agent licensing. Our advisor commission model fits these frameworks cleanly; lead-gen platforms don't. Net positive for us, but compliance cost."
        likelihood="medium"
      />
      <Risk
        title="Big Tech enters senior-living"
        body="Google or Amazon could launch a senior-care marketplace with their distribution advantage. Mitigation: our editorial integrity + manager-claim flow is hard to replicate at scale; relationship density wins."
        likelihood="low-medium"
      />
      <Risk
        title="Pro tier conversion is lower than 12% projected"
        body="If actual is 5-7%, year-3 ARR drops to ~$4M. Mitigation: shift more revenue to sponsored ads (higher ARPU per active campaign than Pro flat fee)."
        likelihood="medium"
      />
      <Risk
        title="Family Pro doesn't reach consumer-pricing critical mass"
        body="$9.99/mo is right for the value but families historically pay for products differently than for services. If conversion stalls, pivot to a free-with-ads model and monetize family-side via sponsored placements only."
        likelihood="medium-high"
      />
    </Section>
  )
}

function Risk({ title, body, likelihood }: { title: string; body: string; likelihood: string }) {
  const cls =
    likelihood === "high" || likelihood === "medium-high"
      ? "border-rose-200 bg-rose-50/40"
      : likelihood === "medium"
      ? "border-amber-200 bg-amber-50/40"
      : "border-stone-200 bg-stone-50/40"
  return (
    <Card className={`mt-3 ${cls}`}>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h4 className="text-sm font-semibold">{title}</h4>
          <span className="rounded border bg-card px-2 py-0.5 text-xs font-medium uppercase tracking-wide">
            {likelihood}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{body}</p>
      </CardContent>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────
// Shared section primitive
// ─────────────────────────────────────────────────────────────

function Section({ eyebrow, title, children }: { eyebrow?: string; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        {eyebrow && (
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {eyebrow}
          </div>
        )}
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h2>
      </div>
      <div className="prose-article max-w-none text-sm leading-relaxed">{children}</div>
    </section>
  )
}

function CheckList({ children, icon = "check" }: { children: React.ReactNode; icon?: "check" | "circle" }) {
  const Icon = icon === "check" ? CheckCircle2 : Circle
  return (
    <ul className="mt-3 space-y-2">
      {Array.isArray(children)
        ? children.map((c, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{c}</span>
            </li>
          ))
        : children}
    </ul>
  )
}

function Callout({ kind, children }: { kind: "ok" | "warn"; children: React.ReactNode }) {
  const cls =
    kind === "ok"
      ? "border-emerald-200 bg-emerald-50/60 text-emerald-900"
      : "border-amber-200 bg-amber-50/60 text-amber-900"
  const Icon = kind === "ok" ? Sparkles : AlertTriangle
  return (
    <div className={`mt-4 flex items-start gap-3 rounded-lg border p-4 ${cls}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="text-sm">{children}</div>
    </div>
  )
}
