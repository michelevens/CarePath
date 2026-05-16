import { useState } from "react"
import {
  Building2,
  HeartHandshake,
  Hospital,
  Mail,
  ShieldCheck,
  Users,
  User as UserIcon,
} from "lucide-react"
import { useAuth, type Portal } from "@/lib/auth"
import { Card, CardContent } from "@/components/ui/card"

/**
 * Single help page that swaps content based on the user's portal.
 * Each guide is concise — "what's the portal for, where do you start,
 * what are the common tasks, who do you contact." Editorial content
 * lives inline rather than in MDX because it changes rarely and
 * benefits from being co-located with the UI it references.
 */

interface GuideSection {
  heading: string
  body: React.ReactNode
}

interface Guide {
  title: string
  pitch: string
  icon: React.ComponentType<{ className?: string }>
  sections: GuideSection[]
}

const GUIDES: Record<Portal, Guide> = {
  family: {
    title: "Help · Family member",
    pitch: "You're looking for senior care for a loved one. CarePath is built to make that less overwhelming.",
    icon: HeartHandshake,
    sections: [
      {
        heading: "What CarePath does for you",
        body: (
          <>
            <p>CarePath is a senior-care marketplace. We help you find facilities that
            match your loved one's needs, compare them honestly (CMS ratings, real
            prices where we have them, Medicaid acceptance), and request tours or
            information directly from the facility — no lead-auction.</p>
          </>
        ),
      },
      {
        heading: "Where to start",
        body: (
          <ol className="ml-4 list-decimal space-y-1 text-sm">
            <li><strong>Search</strong> by city, ZIP, or state at the top of any page.</li>
            <li>Use the filters to narrow by care type (assisted living, memory care, skilled nursing, etc.) and budget.</li>
            <li>Hit <strong>Compare</strong> on any facility card to add it to a side-by-side view (up to 4).</li>
            <li>Save your favorites — the heart icon — to revisit them later.</li>
            <li><strong>Request a tour</strong> from any facility detail page. The request goes straight to the facility (or their advisor) — we don't broker it.</li>
          </ol>
        ),
      },
      {
        heading: "Tools that help with planning",
        body: (
          <ul className="ml-4 list-disc space-y-1 text-sm">
            <li><strong>Care level quiz</strong> — picks the right type of facility from a 5-minute questionnaire.</li>
            <li><strong>Cost projection</strong> — estimates 5-year spend across Medicare, Medicaid, LTC insurance, and private pay.</li>
            <li><strong>Medicaid eligibility</strong> + <strong>VA Aid &amp; Attendance</strong> screeners.</li>
            <li><strong>Free guides</strong> covering Medicaid spend-down, what to ask on a tour, how to evaluate memory care.</li>
          </ul>
        ),
      },
      {
        heading: "Family Pro (optional)",
        body: (
          <p className="text-sm">A paid tier ($29/mo or $290/yr) that adds a shared document vault,
          PDF comparison reports for family discussions, custom cost-projection reports,
          and lets you share saved facilities with up to 5 family members. The free tier
          covers everything you need to find a facility.</p>
        ),
      },
    ],
  },
  resident: {
    title: "Help · Resident",
    pitch: "Your own view into the facility you live in. Records, communication, billing — all in one place.",
    icon: UserIcon,
    sections: [
      {
        heading: "What you can do here",
        body: (
          <p className="text-sm">View your own care records, message your care team, see upcoming visits and tours,
          review your billing, and download statements. This portal is yours — your family
          members and care team have separate views with their own permissions.</p>
        ),
      },
      {
        heading: "Privacy",
        body: (
          <p className="text-sm">Your records are private. Only you, the staff at your facility with a need-to-know,
          and family members you've explicitly authorized can see them. Every view is logged
          to an audit trail that you can request from your facility administrator.</p>
        ),
      },
    ],
  },
  staff: {
    title: "Help · Facility staff",
    pitch: "Your shift's residents, care plans, MDS, and handoffs. Built to keep documentation out of your way.",
    icon: HeartHandshake,
    sections: [
      {
        heading: "Daily flow",
        body: (
          <ol className="ml-4 list-decimal space-y-1 text-sm">
            <li><strong>Today</strong> opens your shift's residents + alerts.</li>
            <li><strong>Residents</strong> shows everyone you have access to on this facility.</li>
            <li><strong>Care plans</strong> — review or sign off on tasks. Click a resident to drill in.</li>
            <li><strong>Shift handoffs</strong> — leave notes for the next shift.</li>
          </ol>
        ),
      },
      {
        heading: "Care plan signoff",
        body: (
          <p className="text-sm">Every signoff is timestamped + linked to your account in the audit log.
          That's what makes the document defensible in a survey or a malpractice review,
          so be deliberate about it.</p>
        ),
      },
      {
        heading: "MDS / regulatory",
        body: (
          <p className="text-sm">For SNFs, MDS 3.0 assessments are accessible from the resident detail
          page under Care plans. The system follows the federal RAI manual cadence —
          admission within 14 days, quarterlies, annual.</p>
        ),
      },
    ],
  },
  admin: {
    title: "Help · Facility administrator",
    pitch: "Your facility's bed board, admissions pipeline, compliance pack, and revenue at a glance.",
    icon: Building2,
    sections: [
      {
        heading: "Daily flow",
        body: (
          <ol className="ml-4 list-decimal space-y-1 text-sm">
            <li><strong>Census</strong> — bed board with availability at a glance.</li>
            <li><strong>Admissions</strong> — kanban of every inquiry → tour → assessment → admit.</li>
            <li><strong>Leads</strong> — incoming from your marketplace listing.</li>
            <li><strong>Compliance</strong> — state licensure status, CMS Five-Star, F-tag history.</li>
            <li><strong>Billing & plan</strong> — your subscription tier + payment.</li>
          </ol>
        ),
      },
      {
        heading: "Sponsored boosts",
        body: (
          <p className="text-sm">Pay to put your facility at the top of relevant searches. Bounded daily
          budget + CPC bid; we cap at 2 sponsored slots per search page. Quality score
          (CMS rating) blends with bid — you can't outbid a 5-star facility from a
          1-star starting point. Required by FTC: every sponsored slot is clearly labeled.</p>
        ),
      },
      {
        heading: "Subscription tiers",
        body: (
          <ul className="ml-4 list-disc space-y-1 text-sm">
            <li><strong>Facility · Free</strong> — claim your listing, respond to inquiries, CMS data visible.</li>
            <li><strong>Facility · Pro ($299/mo)</strong> — bed board sync, admissions kanban, tour calendar, MDS tools, brochure customization, lead routing.</li>
            <li><strong>Facility · Network ($999/mo)</strong> — multi-facility dashboard, SAML SSO, white-label family portal, API access, dedicated CSM.</li>
          </ul>
        ),
      },
    ],
  },
  network: {
    title: "Help · Network / corporate admin",
    pitch: "Cross-facility analytics, master data, and contracts for multi-site operators.",
    icon: Building2,
    sections: [
      {
        heading: "What's different from a single-facility admin",
        body: (
          <p className="text-sm">You see every facility you're a member of. The facility switcher in the
          sidebar lets you jump between sites; the Network dashboard rolls up census,
          admissions, and revenue across all of them.</p>
        ),
      },
      {
        heading: "Master data + provisioning",
        body: (
          <p className="text-sm">When CarePath super-admins add new master data (state rules, F-tags, payer
          codes, service types), it's snapshotted into your network on approval — your
          facility admins can then customize their tenant's copy without affecting other
          operators.</p>
        ),
      },
    ],
  },
  referral: {
    title: "Help · Placement advisor",
    pitch: "Your pipeline + payouts + agency profile. CarePath is anti-lead-auction, not anti-advisor.",
    icon: Users,
    sections: [
      {
        heading: "How CarePath thinks about placement advisors",
        body: (
          <p className="text-sm">Most senior-care marketplaces treat advisors as a backstop and pay tiny
          rebates from a captive lead-pool. We charge advisors a SaaS subscription
          (Solo / Team / Agency) plus give you a transparent 82% of the placement fee
          on every admission you source — visible to families on your public profile.
          The trade is transparency: split + license + verification status are all public.</p>
        ),
      },
      {
        heading: "Getting paid",
        body: (
          <ol className="ml-4 list-decimal space-y-1 text-sm">
            <li>Complete Stripe Connect Express onboarding from <strong>Agency profile</strong>.</li>
            <li>When an admission you sourced sticks for 30 days, 70% of the advisor cut is released to your Connect account.</li>
            <li>Remaining 30% releases at 90-day retention.</li>
            <li>Track everything from <strong>Payouts</strong>.</li>
          </ol>
        ),
      },
      {
        heading: "Verification",
        body: (
          <p className="text-sm">Before you can take referrals, ops verifies your agency: your license
          number for any state requiring one (CA, MA, WA, etc.), your insurance, and
          your Connect status. Verification typically takes 1-3 business days.</p>
        ),
      },
    ],
  },
  hospital: {
    title: "Help · Hospital case manager",
    pitch: "Embed the CarePath widget in your discharge workflow. Every referral you route earns placement-fee credit.",
    icon: Hospital,
    sections: [
      {
        heading: "What the widget does",
        body: (
          <p className="text-sm">Drop our search widget into any EHR or discharge-planning page (iframe-ready,
          one snippet). Case managers can find post-acute facilities matching the
          patient's level of care + payer + geography without leaving your workflow.
          Inquiries route back to you for the placement-fee credit.</p>
        ),
      },
      {
        heading: "Setup",
        body: (
          <ol className="ml-4 list-decimal space-y-1 text-sm">
            <li>Fill out your <strong>Profile</strong> — organization name, service area states.</li>
            <li>Generate a widget API key from <strong>Widget &amp; embed code</strong>. <em>It's shown once — copy it immediately.</em></li>
            <li>Complete Stripe Connect onboarding to receive payouts.</li>
            <li>Wait for ops verification (typically 1-3 business days).</li>
            <li>Copy the iframe snippet into your EHR / portal.</li>
          </ol>
        ),
      },
      {
        heading: "Revenue split",
        body: (
          <p className="text-sm">Hospital partners get 12% of the placement fee on admissions sourced via your
          widget — lower than the 82% advisors get because hospital case managers
          introduce, advisors close. Track everything on <strong>Referrals</strong>.</p>
        ),
      },
    ],
  },
  superadmin: {
    title: "Help · CarePath super admin",
    pitch: "Platform overview. Where ops lives.",
    icon: ShieldCheck,
    sections: [
      {
        heading: "Tabs at a glance",
        body: (
          <ul className="ml-4 list-disc space-y-1 text-sm">
            <li><strong>Overview</strong> — platform KPIs, MRR, marketplace activity, alerts.</li>
            <li><strong>Users</strong> — invite users (type-aware), edit roles, deep per-user detail.</li>
            <li><strong>Facilities</strong> — directory of every facility on the platform.</li>
            <li><strong>Data sources</strong> — CMS / OSM / CSV ingest controls + source stats.</li>
            <li><strong>State licensing</strong> — canonical reference table mapping state license terms (RCFE, PCH, ACH, etc.) to CarePath's 8 facility types + client eligibility + payer data.</li>
            <li><strong>Verifications</strong> — pending advisors + hospitals to approve.</li>
            <li><strong>Placements</strong> — cross-tenant placement ledger.</li>
            <li><strong>Subscriptions</strong> — every active sub + MRR + churn flags.</li>
            <li><strong>Plans &amp; pricing</strong> — edit SubscriptionPlan rows (limited fields — see card doc).</li>
            <li><strong>Sponsored</strong> — campaign oversight + user-reported ad reviews.</li>
            <li><strong>Master data</strong> + <strong>Audit log</strong> — reference data + immutable activity trail.</li>
          </ul>
        ),
      },
      {
        heading: "Inviting users",
        body: (
          <p className="text-sm">The invite flow is type-aware — pick the user type and the form asks for what
          that type needs (facility picker for staff/admin/network, agency name for
          advisors, org + partner type for hospitals). Family members and residents need
          no extra context. <strong>super_admin is deliberately not assignable from the UI</strong>;
          promoting users to super_admin should go through Tinker or a separate code path.</p>
        ),
      },
      {
        heading: "Verifying advisors and hospitals",
        body: (
          <p className="text-sm">Approval stamps <code>verified_at</code> AND grants the matching spatie role
          (<code>referral_partner</code> / <code>hospital_partner</code>), so the user
          can immediately access their portal after approval. Reach the queue from the
          dashboard alerts panel or the Verifications tab.</p>
        ),
      },
    ],
  },
}

const ALL_PORTALS: Portal[] = [
  "family",
  "resident",
  "staff",
  "admin",
  "network",
  "referral",
  "hospital",
  "superadmin",
]

export function HelpPage() {
  const { user } = useAuth()
  // Default to the user's portal but let them switch (useful for support reading other portals' guides).
  const userPortal = (user?.portal as Portal | undefined) ?? "family"
  const [active, setActive] = useState<Portal>(userPortal)
  const guide = GUIDES[active] ?? GUIDES.family

  const Icon = guide.icon

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Help</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          One-page guides per CarePath user type. Pick yours below — or read any
          other to understand what the rest of the platform is doing.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {ALL_PORTALS.map((p) => {
          const g = GUIDES[p]
          if (!g) return null
          const I = g.icon
          return (
            <button
              key={p}
              onClick={() => setActive(p)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                active === p
                  ? "border-violet-400 bg-violet-50 text-violet-900"
                  : "hover:border-violet-200 hover:bg-muted/40"
              }`}
            >
              <I className="h-3.5 w-3.5" />
              {g.title.replace("Help · ", "")}
            </button>
          )
        })}
      </div>

      <Card>
        <CardContent className="space-y-5 p-6">
          <div className="flex items-start gap-3 border-b pb-4">
            <div className="rounded-lg bg-violet-100 p-2 text-violet-700">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{guide.title}</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">{guide.pitch}</p>
            </div>
          </div>
          {guide.sections.map((s) => (
            <section key={s.heading} className="space-y-2">
              <h3 className="text-sm font-semibold">{s.heading}</h3>
              <div className="text-sm leading-relaxed text-muted-foreground">{s.body}</div>
            </section>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-start gap-3 p-5">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <div className="text-sm">
            <strong>Need a human?</strong> Email <a href="mailto:help@carepath.io" className="text-violet-700 hover:underline">help@carepath.io</a>{" "}
            — we respond within one business day.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
