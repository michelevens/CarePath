import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import {
  Bell,
  Building2,
  ChevronDown,
  HelpCircle,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  User as UserIcon,
  X,
} from "lucide-react"
import { api } from "@/lib/api"
import { useAuth, type Portal } from "@/lib/auth"

/**
 * Cross-portal top bar — section title (left) + global search +
 * notifications bell + help link + avatar dropdown (right).
 *
 * Modeled on the ShiftPulse + ClinicLink TopBar pattern.
 * Page-section title is derived from the current route by matching
 * against the active portal's nav config (passed in by PortalShell).
 */

interface TopBarNavItem {
  to: string
  label: string
}

interface NotificationItem {
  kind: string
  count: number
  label: string
  href: string
}

interface SuggestFacility {
  slug: string
  name: string
  city: string
  state: string
}

export function TopBar({
  portal,
  portalTitle,
  navItems,
  onOpenMobileSidebar,
}: {
  portal: Portal
  portalTitle: string
  navItems: TopBarNavItem[]
  onOpenMobileSidebar: () => void
}) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  // Section title: longest matching nav `to` from the current path.
  const sectionTitle = useMemo(() => {
    const match = [...navItems]
      .sort((a, b) => b.to.length - a.to.length)
      .find((n) => location.pathname === n.to || location.pathname.startsWith(n.to + "/"))
    return match?.label ?? portalTitle
  }, [location.pathname, navItems, portalTitle])

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur md:px-6">
      <button
        onClick={onOpenMobileSidebar}
        className="rounded-md p-1.5 hover:bg-muted md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-2 min-w-0">
        <div className="h-5 w-0.5 rounded-full bg-violet-500" />
        <h1 className="truncate text-sm font-semibold">{sectionTitle}</h1>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <FacilitySearch />
        <NotificationsBell />
        <Link
          to={`/${portal}/help`}
          title="Help"
          className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <HelpCircle className="h-4 w-4" />
        </Link>
        <AvatarDropdown
          name={user?.name ?? ""}
          email={user?.email ?? ""}
          profilePicture={user?.profile_picture ?? null}
          portal={portal}
          onSignOut={async () => {
            await logout()
            navigate("/login", { replace: true })
          }}
        />
      </div>
    </header>
  )
}

/* ───────── FacilitySearch ───────── */

function FacilitySearch() {
  const [q, setQ] = useState("")
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<SuggestFacility[]>([])
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  const wrapRef = useRef<HTMLDivElement>(null)

  // Debounce the suggest call.
  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([])
      return
    }
    setBusy(true)
    const t = setTimeout(() => {
      api
        .get<{ facilities: SuggestFacility[] }>("/marketplace/suggest", { params: { q } })
        .then((r) => setResults(r.data?.facilities ?? []))
        .finally(() => setBusy(false))
    }, 200)
    return () => clearTimeout(t)
  }, [q])

  // Click outside to close.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [])

  return (
    <div ref={wrapRef} className="relative hidden sm:block">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search facilities…"
          className="h-8 w-56 rounded-md border bg-muted/40 pl-8 pr-3 text-xs focus:bg-background focus:outline-none focus:ring-1 focus:ring-violet-400 lg:w-72"
        />
      </div>
      {open && (q.trim().length >= 2) && (
        <div className="absolute right-0 top-9 z-50 w-80 overflow-hidden rounded-md border bg-card text-sm shadow-lg">
          {busy && results.length === 0 && (
            <div className="p-3 text-xs text-muted-foreground">Searching…</div>
          )}
          {!busy && results.length === 0 && (
            <div className="p-3 text-xs text-muted-foreground">No facilities match.</div>
          )}
          {results.slice(0, 8).map((f) => (
            <button
              key={f.slug}
              onMouseDown={(e) => {
                e.preventDefault()
                navigate(`/facility/${f.slug}`)
                setQ("")
                setOpen(false)
              }}
              className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-muted/40"
            >
              <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium">{f.name}</div>
                <div className="text-[10px] text-muted-foreground">
                  {f.city}, {f.state}
                </div>
              </div>
            </button>
          ))}
          {results.length > 8 && (
            <button
              onMouseDown={() => {
                navigate(`/search?q=${encodeURIComponent(q)}`)
                setQ("")
                setOpen(false)
              }}
              className="block w-full border-t px-3 py-2 text-left text-xs text-violet-700 hover:bg-muted/40"
            >
              See all results for "{q}"
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/* ───────── NotificationsBell ───────── */

function NotificationsBell() {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [total, setTotal] = useState(0)
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  const load = () => {
    api
      .get<{ data: { total: number; items: NotificationItem[] } }>("/me/notifications")
      .then((r) => {
        setItems(r.data?.data?.items ?? [])
        setTotal(r.data?.data?.total ?? 0)
      })
      .catch(() => {
        // Silent — non-critical.
      })
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 60_000) // poll every minute
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [])

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {total > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-violet-600 px-1 text-[10px] font-semibold text-white">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-50 w-72 overflow-hidden rounded-md border bg-card shadow-lg">
          <div className="border-b p-3 text-sm font-semibold">Notifications</div>
          {items.length === 0 ? (
            <p className="p-3 text-xs text-muted-foreground">Nothing needs your attention.</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto divide-y">
              {items.map((n) => (
                <li key={n.kind}>
                  <Link
                    to={n.href}
                    onClick={() => setOpen(false)}
                    className="block px-3 py-2.5 text-xs hover:bg-muted/40"
                  >
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

/* ───────── AvatarDropdown ───────── */

function AvatarDropdown({
  name,
  email,
  profilePicture,
  portal,
  onSignOut,
}: {
  name: string
  email: string
  profilePicture: string | null
  portal: Portal
  onSignOut: () => void
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [])

  const initial = (name?.[0] ?? "?").toUpperCase()

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-md p-1 hover:bg-muted"
      >
        {profilePicture ? (
          <img src={profilePicture} alt="" className="h-7 w-7 rounded-full object-cover" />
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700">
            {initial}
          </div>
        )}
        <ChevronDown className="hidden h-3 w-3 text-muted-foreground sm:block" />
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-50 w-60 overflow-hidden rounded-md border bg-card shadow-lg">
          <div className="border-b p-3 text-xs">
            <div className="truncate font-semibold">{name}</div>
            <div className="truncate text-muted-foreground">{email}</div>
            <div className="mt-1 inline-block rounded bg-violet-50 px-1.5 py-0.5 text-[10px] capitalize text-violet-700">
              {portal} portal
            </div>
          </div>
          <DropdownLink to="/settings/profile" icon={UserIcon} label="Profile" onClick={() => setOpen(false)} />
          <DropdownLink to="/settings/security" icon={ShieldCheck} label="Security & 2FA" onClick={() => setOpen(false)} />
          <DropdownLink to={`/${portal}/help`} icon={HelpCircle} label="Help" onClick={() => setOpen(false)} />
          {portal === "admin" && (
            <DropdownLink to="/admin/settings" icon={Settings} label="Facility settings" onClick={() => setOpen(false)} />
          )}
          <div className="border-t">
            <button
              onClick={() => {
                setOpen(false)
                onSignOut()
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-destructive hover:bg-destructive/5"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function DropdownLink({
  to,
  icon: Icon,
  label,
  onClick,
}: {
  to: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick?: () => void
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted/40"
    >
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      {label}
    </Link>
  )
}

// Silence unused-import warning
void X
