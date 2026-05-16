import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Code2,
  DollarSign,
  Loader2,
  Stethoscope,
  TrendingUp,
  Users,
} from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface Profile {
  name: string
  stripe_account_status: string
  can_receive_payouts: boolean
}

interface Stats {
  earnings_ytd_cents: number
  pending_payouts_cents: number
  referrals_this_month: number
  admitted_this_month: number
  conversion_pct: number
}

export function HospitalDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([
      api.get<{ data: Profile }>("/hospital/profile"),
      api.get<{ data: Stats }>("/hospital/stats"),
    ])
      .then(([p, s]) => {
        if (!alive) return
        setProfile(p.data?.data ?? null)
        setStats(s.data?.data ?? null)
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading hospital dashboard…
      </div>
    )
  }

  const needsProfile = !profile?.name
  const needsConnect = profile?.stripe_account_status !== "active"
  const showOnboardingBanner = needsProfile || needsConnect

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {profile?.name || "Hospital partner"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Embed the CarePath search widget in your discharge-planning
            workflow. Earn placement fees on every referral that admits.
          </p>
        </div>
        {profile?.can_receive_payouts ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Payout-ready
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            Setup incomplete
          </span>
        )}
      </div>

      {showOnboardingBanner && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <Stethoscope className="mt-0.5 h-5 w-5 text-primary" />
              <div className="flex-1">
                <div className="font-semibold">Finish onboarding to start receiving placement fees</div>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Step done={!needsProfile}>1. Complete your hospital profile</Step>
                  </li>
                  <li className="flex items-center gap-2">
                    <Step done={!needsConnect}>2. Connect Stripe for payouts</Step>
                  </li>
                  <li className="flex items-center gap-2">
                    <Step done={false}>3. Drop the widget code into your EHR/discharge tool</Step>
                  </li>
                </ul>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button asChild size="sm">
                    <Link to="/hospital/profile">
                      Continue setup <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/hospital/embed">
                      <Code2 className="h-4 w-4" />
                      Get widget code
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {stats && (
        <div className="grid gap-3 md:grid-cols-4">
          <StatTile
            icon={DollarSign}
            label="Earnings YTD"
            value={`$${(stats.earnings_ytd_cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            sub="Paid out across all milestones"
            highlight
          />
          <StatTile
            icon={TrendingUp}
            label="Pending payouts"
            value={`$${(stats.pending_payouts_cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            sub="Awaiting retention milestones"
          />
          <StatTile
            icon={Users}
            label="Referrals this month"
            value={stats.referrals_this_month.toString()}
            sub={`${stats.admitted_this_month} admitted to date`}
          />
          <StatTile
            icon={BarChart3}
            label="Conversion"
            value={`${stats.conversion_pct}%`}
            sub="Referrals → admissions (this month)"
          />
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="hover-lift">
          <Link to="/hospital/referrals" className="block">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary p-3 text-primary-foreground">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold">Recent referrals</div>
                  <div className="mt-0.5 text-sm text-muted-foreground">
                    Track patients you've referred and their admission status
                  </div>
                </div>
                <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Link>
        </Card>
        <Card className="hover-lift">
          <Link to="/hospital/embed" className="block">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary p-3 text-primary-foreground">
                  <Code2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold">Widget &amp; embed code</div>
                  <div className="mt-0.5 text-sm text-muted-foreground">
                    iframe snippet for your discharge-planning system
                  </div>
                </div>
                <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>

      <Card className="bg-muted/30">
        <CardContent className="p-5 text-sm">
          <div className="font-semibold">How it works</div>
          <p className="mt-2 text-muted-foreground">
            Drop the widget snippet into your discharge-planning EHR or any
            internal page. Case managers search facilities, send referrals to
            the chosen one(s), and the family takes over from there. When a
            referral admits, you earn{" "}
            <span className="font-medium text-foreground">12%</span> of the
            facility's placement fee (default — your contract may vary).
            Payouts release on the same 70/30 / 30/90-day retention schedule
            as placement advisors, paid via Stripe Connect.
          </p>
          <Link
            to="/hospital/profile"
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Update profile <ArrowRight className="h-4 w-4" />
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}

function Step({ done, children }: { done: boolean; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", done && "text-foreground")}>
      {done ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
      ) : (
        <span className="h-3.5 w-3.5 rounded-full border" />
      )}
      {children}
    </span>
  )
}

function StatTile({
  icon: Icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  sub: string
  highlight?: boolean
}) {
  return (
    <Card className={cn(highlight && "border-primary/40 bg-primary/5")}>
      <CardContent className="p-4">
        <Icon className={cn("h-4 w-4", highlight ? "text-primary" : "text-muted-foreground")} />
        <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
        <div className="text-xs font-medium">{label}</div>
        <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
      </CardContent>
    </Card>
  )
}
