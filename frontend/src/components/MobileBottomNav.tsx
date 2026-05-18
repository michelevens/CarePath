import { NavLink, useLocation } from "react-router-dom"
import {
  BookOpen,
  Home,
  MessageCircle,
  Search,
  Sparkles,
  User,
  type LucideIcon,
} from "lucide-react"
import { useAuth } from "@/lib/auth"
import { cn } from "@/lib/utils"

/**
 * Mobile bottom navigation — modeled on the EnnHealth Psychiatry
 * mobile-app.js pattern. Five slots, with the middle one elevated
 * as a primary CTA (the equivalent of EnnHealth's gold "Book"
 * circle, recolored to our violet primary). Background uses
 * backdrop-blur to evoke the iOS Control Center glass.
 *
 * Hidden on >=md (desktop already has the top header), and the
 * caller (App.tsx) is responsible for hiding it on portal/auth
 * routes — those have their own chrome and shouldn't double up.
 *
 * Items reflect the CarePath public scope: discovery + matching.
 * Authenticated users see "Messages" as the rightmost slot; signed-
 * out users see "Sign in" instead. The "Ask AI" button in the
 * middle is the high-conversion path, so it gets the elevated CTA.
 */
export function MobileBottomNav() {
  const { user } = useAuth()
  const { pathname } = useLocation()

  // Active matcher: exact for "/" so it doesn't light up on every
  // page; prefix-match for everything else.
  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to))

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur-lg md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Primary"
    >
      <div className="mx-auto flex max-w-md items-center justify-around px-2 pt-1.5 pb-1">
        <NavItem to="/" label="Home" icon={Home} active={isActive("/")} />
        <NavItem to="/search" label="Search" icon={Search} active={isActive("/search")} />
        <CenterCta to="/tools/care-level-quiz" label="Match me" />
        <NavItem to="/guides" label="Guides" icon={BookOpen} active={isActive("/guides")} />
        {user ? (
          <NavItem
            to="/messages"
            label="Messages"
            icon={MessageCircle}
            active={isActive("/messages")}
          />
        ) : (
          <NavItem to="/login" label="Sign in" icon={User} active={isActive("/login")} />
        )}
      </div>
    </nav>
  )
}

function NavItem({
  to,
  label,
  icon: Icon,
  active,
}: {
  to: string
  label: string
  icon: LucideIcon
  active: boolean
}) {
  return (
    <NavLink
      to={to}
      className={cn(
        "flex min-w-[56px] flex-col items-center gap-0.5 rounded-xl px-2 py-1 text-[10px] font-semibold tracking-wide transition-transform active:scale-95",
        active ? "text-foreground" : "text-muted-foreground"
      )}
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <Icon className={cn("h-5 w-5", active && "text-primary")} strokeWidth={active ? 2.4 : 1.8} />
      <span>{label}</span>
    </NavLink>
  )
}

function CenterCta({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className="flex min-w-[56px] flex-col items-center gap-0.5 text-[10px] font-semibold tracking-wide text-foreground active:scale-95"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <span
        className="-mt-5 flex h-12 w-12 items-center justify-center rounded-full text-primary-foreground shadow-lg transition-transform active:scale-90"
        style={{
          backgroundImage:
            "linear-gradient(135deg, var(--color-primary), color-mix(in oklch, var(--color-primary) 80%, black))",
          boxShadow: "0 6px 18px color-mix(in oklch, var(--color-primary) 45%, transparent)",
        }}
      >
        <Sparkles className="h-5 w-5" strokeWidth={2.2} />
      </span>
      <span>{label}</span>
    </NavLink>
  )
}
