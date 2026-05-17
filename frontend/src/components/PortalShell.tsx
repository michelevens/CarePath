import { useState } from "react"
import { Outlet, NavLink, Link, useNavigate } from "react-router-dom"
import {
  Home,
  Users,
  Calendar,
  ClipboardList,
  Building2,
  BarChart3,
  Settings,
  HeartHandshake,
  Shield,
  ShieldCheck,
  Sliders,
  Sparkles,
  HelpCircle,
  LogOut,
  MailWarning,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { FacilitySwitcher } from "@/components/FacilitySwitcher"
import { useAuth, type Portal } from "@/lib/auth"

interface NavItem {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const NAV_CONFIG: Record<Portal, { title: string; items: NavItem[] }> = {
  family: {
    title: "Family",
    items: [
      { to: "/family", label: "Overview", icon: Home },
      { to: "/family/loved-ones", label: "My loved ones", icon: HeartHandshake },
      { to: "/family/saved", label: "Saved facilities", icon: Building2 },
      { to: "/family/tours", label: "Tour requests", icon: Calendar },
    ],
  },
  resident: {
    title: "My care",
    items: [
      { to: "/resident", label: "Overview", icon: Home },
      { to: "/resident/records", label: "My records", icon: ClipboardList },
      { to: "/resident/billing", label: "Billing", icon: BarChart3 },
    ],
  },
  staff: {
    title: "Staff",
    items: [
      { to: "/staff", label: "Today", icon: Home },
      { to: "/staff/residents", label: "Residents", icon: Users },
      { to: "/staff/care-plans", label: "Care plans", icon: ClipboardList },
      { to: "/staff/handoffs", label: "Shift handoffs", icon: Calendar },
    ],
  },
  admin: {
    title: "Facility admin",
    items: [
      { to: "/admin", label: "Census", icon: Home },
      { to: "/admin/admissions", label: "Admissions", icon: Users },
      { to: "/admin/beds", label: "Beds & rooms", icon: Building2 },
      { to: "/admin/tours", label: "Tour requests", icon: Calendar },
      { to: "/admin/leads", label: "Leads", icon: HeartHandshake },
      { to: "/admin/compliance", label: "Compliance", icon: Shield },
      { to: "/admin/data", label: "Facility data", icon: ClipboardList },
      { to: "/admin/sponsored", label: "Sponsored boosts", icon: Sparkles },
      { to: "/admin/billing", label: "Billing & plan", icon: BarChart3 },
      { to: "/admin/reports", label: "Reports", icon: BarChart3 },
      { to: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
  network: {
    title: "Network",
    items: [
      { to: "/network", label: "Overview", icon: Home },
      { to: "/network/facilities", label: "Facilities", icon: Building2 },
      { to: "/network/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  referral: {
    title: "Placement advisor",
    items: [
      { to: "/referral", label: "Overview", icon: Home },
      { to: "/referral/pipeline", label: "Pipeline", icon: Users },
      { to: "/referral/payouts", label: "Payouts", icon: BarChart3 },
      { to: "/referral/billing", label: "Subscription", icon: BarChart3 },
      { to: "/referral/profile", label: "Agency profile", icon: Settings },
    ],
  },
  hospital: {
    title: "Hospital partner",
    items: [
      { to: "/hospital", label: "Overview", icon: Home },
      { to: "/hospital/referrals", label: "Referrals", icon: Users },
      { to: "/hospital/embed", label: "Widget & embed code", icon: Sparkles },
      { to: "/hospital/profile", label: "Profile", icon: Settings },
    ],
  },
  superadmin: {
    title: "Super admin",
    items: [
      { to: "/superadmin", label: "Overview", icon: Home },
      { to: "/superadmin/users", label: "Users", icon: Users },
      { to: "/superadmin/tenants", label: "Facilities", icon: Building2 },
      { to: "/superadmin/sources", label: "Data sources", icon: ClipboardList },
      { to: "/superadmin/licensing", label: "State licensing", icon: Shield },
      { to: "/superadmin/verifications", label: "Verifications", icon: ShieldCheck },
      { to: "/superadmin/placements", label: "Placements", icon: HeartHandshake },
      { to: "/superadmin/subscriptions", label: "Subscriptions", icon: BarChart3 },
      { to: "/superadmin/plans", label: "Plans & pricing", icon: Sliders },
      { to: "/superadmin/sponsored", label: "Sponsored", icon: Sparkles },
      { to: "/superadmin/master-data", label: "Master data", icon: ClipboardList },
      { to: "/superadmin/audit", label: "Audit log", icon: Shield },
    ],
  },
}

export function PortalShell({ portal }: { portal: Portal }) {
  const navigate = useNavigate()
  const { user, logout, resendVerification } = useAuth()
  const config = NAV_CONFIG[portal]

  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle")

  const handleSignOut = async () => {
    await logout()
    navigate("/login", { replace: true })
  }

  const handleResend = async () => {
    setResendState("sending")
    try {
      await resendVerification()
      setResendState("sent")
    } catch {
      setResendState("idle")
    }
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <aside className="flex h-full w-60 flex-col border-r bg-card">
        <div className="flex h-16 items-center border-b px-6">
          <span className="text-lg font-semibold tracking-tight">CarePath</span>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <div className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {config.title}
          </div>
          <nav className="space-y-1">
            {config.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === `/${portal}`}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="border-t p-3 space-y-1">
          {user && (
            <Link to="/settings/profile" className="block">
              <div className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-muted/40">
                {user.profile_picture ? (
                  <img
                    src={user.profile_picture}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700">
                    {(user.first_name?.[0] ?? user.name?.[0] ?? "?").toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1 text-xs">
                  <div className="truncate font-medium text-foreground">{user.name}</div>
                  <div className="truncate text-muted-foreground">{user.email}</div>
                </div>
              </div>
            </Link>
          )}
          <FacilitySwitcher />
          <Button
            asChild
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground"
          >
            <Link to={`/${portal}/help`}>
              <HelpCircle className="h-4 w-4" />
              Help
            </Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground"
          >
            <Link to="/settings/security">
              <ShieldCheck className="h-4 w-4" />
              Security
              {user?.two_factor_enabled && (
                <span className="ml-auto text-xs">●</span>
              )}
            </Link>
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        {user && !user.email_verified && (
          <div className="flex items-center gap-3 border-b bg-muted/50 px-6 py-3 text-sm">
            <MailWarning className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="flex-1 text-muted-foreground">
              Please verify your email address to unlock all features.
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleResend}
              disabled={resendState !== "idle"}
            >
              {resendState === "idle" && "Resend verification email"}
              {resendState === "sending" && "Sending…"}
              {resendState === "sent" && "Sent — check your inbox"}
            </Button>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  )
}
