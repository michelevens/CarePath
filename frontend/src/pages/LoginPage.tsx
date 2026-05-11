import { Link, useNavigate } from "react-router-dom"
import {
  HeartHandshake,
  User,
  Stethoscope,
  Building2,
  BarChart3,
  Briefcase,
  Shield,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface DemoAccount {
  portal: string
  label: string
  email: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    portal: "family",
    label: "Family member",
    email: "family.demo@carepath.io",
    description: "Adult child managing care for a parent",
    icon: HeartHandshake,
  },
  {
    portal: "resident",
    label: "Resident",
    email: "resident.demo@carepath.io",
    description: "Resident logging into their own portal",
    icon: User,
  },
  {
    portal: "staff",
    label: "Facility staff",
    email: "staff.demo@carepath.io",
    description: "Nurse / aide working a shift",
    icon: Stethoscope,
  },
  {
    portal: "admin",
    label: "Facility admin",
    email: "admin.demo@carepath.io",
    description: "Administrator / Director of Nursing",
    icon: Building2,
  },
  {
    portal: "network",
    label: "Network operator",
    email: "network.demo@carepath.io",
    description: "Multi-facility corporate view",
    icon: BarChart3,
  },
  {
    portal: "referral",
    label: "Referral partner",
    email: "referral.demo@carepath.io",
    description: "Hospital case manager / discharge planner",
    icon: Briefcase,
  },
  {
    portal: "superadmin",
    label: "Super admin",
    email: "superadmin.demo@carepath.io",
    description: "CarePath team — tenant provisioning + master data",
    icon: Shield,
  },
]

const DEMO_PASSWORD = "demo1234"

export function LoginPage() {
  const navigate = useNavigate()

  const enterDemo = (account: DemoAccount) => {
    localStorage.setItem(
      "carepath_demo_user",
      JSON.stringify({
        email: account.email,
        portal: account.portal,
        label: account.label,
      })
    )
    navigate(`/${account.portal}`)
  }

  return (
    <div className="flex min-h-screen items-start justify-center bg-muted/30 p-6 py-12">
      <div className="w-full max-w-3xl space-y-6">
        <Card>
          <CardContent className="p-8">
            <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Welcome back to CarePath.
            </p>
            <form className="mt-6 grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Email</label>
                <input
                  type="email"
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Password</label>
                <input
                  type="password"
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-ring"
                />
              </div>
              <Button type="submit" className="md:col-span-2">
                Sign in
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              New to CarePath?{" "}
              <Link to="/signup" className="font-medium text-foreground underline">
                Create an account
              </Link>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-8">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold">Demo accounts</h2>
              <span className="text-xs text-muted-foreground">
                Password: <code className="rounded bg-muted px-1.5 py-0.5 font-mono">{DEMO_PASSWORD}</code>
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Click any role to enter that portal as a demo user. No auth
              required while we're in scaffold mode.
            </p>
            <div className="mt-5 grid gap-2 md:grid-cols-2">
              {DEMO_ACCOUNTS.map((acct) => (
                <button
                  key={acct.portal}
                  onClick={() => enterDemo(acct)}
                  className="group flex items-start gap-3 rounded-md border bg-card p-3 text-left transition-colors hover:border-foreground hover:bg-accent"
                >
                  <acct.icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground group-hover:text-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{acct.label}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {acct.email}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {acct.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
