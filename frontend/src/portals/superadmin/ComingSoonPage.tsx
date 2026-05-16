import { useLocation } from "react-router-dom"
import { Construction } from "lucide-react"

const TITLES: Record<string, { title: string; blurb: string }> = {
  verifications: {
    title: "Advisor + Hospital verifications",
    blurb: "Review queue for advisor agency licenses and hospital partner credentials. Wired to the pending-verification counts on the dashboard.",
  },
  placements: {
    title: "Placement oversight",
    blurb: "Cross-tenant placement ledger with milestone progression, payouts, rescissions, and dispute resolution.",
  },
  subscriptions: {
    title: "Subscription oversight",
    blurb: "All active subscriptions across facilities, advisors, and family Pro users. MRR breakdown, churn flags, past-due alerts.",
  },
  sponsored: {
    title: "Sponsored ads oversight",
    blurb: "Platform-wide campaign review. Spend pacing, FTC disclosure compliance, click-fraud signals.",
  },
}

export function ComingSoonPage() {
  const location = useLocation()
  const slug = location.pathname.split("/").pop() ?? ""
  const meta = TITLES[slug] ?? { title: slug, blurb: "Not built yet." }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{meta.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{meta.blurb}</p>
      </div>
      <div className="flex items-center gap-3 rounded-lg border border-dashed bg-muted/30 p-6 text-sm text-muted-foreground">
        <Construction className="h-5 w-5 text-amber-600" />
        Placeholder. The dashboard counts and quick actions already wire here; the
        management UI lands in a follow-up.
      </div>
    </div>
  )
}
