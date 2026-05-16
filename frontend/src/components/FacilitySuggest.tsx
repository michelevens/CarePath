import { useEffect, useId, useMemo, useRef, useState } from "react"
import { Building, Loader2, MapPin, Search } from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"

interface FacilityHit {
  name: string
  slug: string
  city: string
  state: string
  type: string
}

interface CityHit {
  city: string
  state: string
  facility_count: number
}

interface ZipHit {
  zip: string
  city: string
  state: string
}

interface SuggestResponse {
  facilities: FacilityHit[]
  cities: CityHit[]
  zip: ZipHit | null
}

export type Suggestion =
  | { kind: "facility"; slug: string; name: string; city: string; state: string }
  | { kind: "city"; city: string; state: string; count: number }
  | { kind: "zip"; zip: string; city: string; state: string }

interface Props {
  value: string
  onChange: (v: string) => void
  onSelect: (s: Suggestion) => void
  /** Allow Enter on free text (no suggestion picked) — used on the landing hero. */
  onSubmitFreeText?: (v: string) => void
  placeholder?: string
  size?: "md" | "lg"
  /** Leading icon — defaults to MapPin (location) but the search-page header uses Search. */
  leadingIcon?: "map" | "search"
  className?: string
}

export function FacilitySuggest({
  value,
  onChange,
  onSelect,
  onSubmitFreeText,
  placeholder = "City, ZIP, or facility name",
  size = "md",
  leadingIcon = "map",
  className,
}: Props) {
  const [data, setData] = useState<SuggestResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  // Flattened, ordered list — used for keyboard nav.
  const flat = useMemo<Suggestion[]>(() => {
    if (!data) return []
    const out: Suggestion[] = []
    if (data.zip) {
      out.push({
        kind: "zip",
        zip: data.zip.zip,
        city: data.zip.city,
        state: data.zip.state,
      })
    }
    for (const c of data.cities) {
      out.push({ kind: "city", city: c.city, state: c.state, count: c.facility_count })
    }
    for (const f of data.facilities) {
      out.push({ kind: "facility", slug: f.slug, name: f.name, city: f.city, state: f.state })
    }
    return out
  }, [data])

  // Debounced fetch.
  useEffect(() => {
    const q = value.trim()
    if (q.length < 2) {
      setData(null)
      return
    }
    let alive = true
    const handle = setTimeout(() => {
      setLoading(true)
      api
        .get<SuggestResponse>("/marketplace/suggest", { params: { q } })
        .then((r) => alive && setData(r.data))
        .catch(() => alive && setData(null))
        .finally(() => alive && setLoading(false))
    }, 180)
    return () => {
      alive = false
      clearTimeout(handle)
    }
  }, [value])

  // Reset highlight when results change.
  useEffect(() => {
    setHighlight(0)
  }, [flat.length])

  // Close on click outside.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const choose = (s: Suggestion) => {
    setOpen(false)
    onSelect(s)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      if (flat.length > 0) setOpen(true)
      setHighlight((h) => Math.min(flat.length - 1, h + 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlight((h) => Math.max(0, h - 1))
    } else if (e.key === "Enter") {
      if (open && flat[highlight]) {
        e.preventDefault()
        choose(flat[highlight])
      } else if (onSubmitFreeText) {
        e.preventDefault()
        onSubmitFreeText(value.trim())
      }
    } else if (e.key === "Escape") {
      setOpen(false)
    }
  }

  const sizeClass =
    size === "lg" ? "text-base py-2.5" : "text-sm py-1.5"
  const Icon = leadingIcon === "map" ? MapPin : Search

  const showDropdown = open && value.trim().length >= 2 && (loading || flat.length > 0 || data !== null)

  return (
    <div ref={wrapRef} className={cn("relative flex-1", className)}>
      <div className="flex items-center gap-2 px-3">
        <Icon className={cn("shrink-0 text-muted-foreground", size === "lg" ? "h-5 w-5" : "h-4 w-4")} />
        <input
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            setOpen(true)
          }}
          onFocus={() => value.trim().length >= 2 && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={showDropdown}
          className={cn(
            "flex-1 bg-transparent outline-hidden placeholder:text-muted-foreground",
            sizeClass
          )}
        />
        {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />}
      </div>

      {showDropdown && (
        <div
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-xl border bg-card shadow-lg"
        >
          {flat.length === 0 && !loading && (
            <div className="px-3 py-4 text-center text-sm text-muted-foreground">
              No matches. Try a city, ZIP, or facility name.
            </div>
          )}

          {data?.zip && (
            <Group label="ZIP code">
              <Row
                active={flat[highlight]?.kind === "zip"}
                onClick={() => choose({ kind: "zip", zip: data.zip!.zip, city: data.zip!.city, state: data.zip!.state })}
                icon={<MapPin className="h-4 w-4 text-primary" />}
                primary={data.zip.zip}
                secondary={`${data.zip.city}, ${data.zip.state}`}
              />
            </Group>
          )}

          {data && data.cities.length > 0 && (
            <Group label="Cities">
              {data.cities.map((c, i) => {
                const flatIndex = (data.zip ? 1 : 0) + i
                return (
                  <Row
                    key={`${c.city}-${c.state}`}
                    active={highlight === flatIndex}
                    onClick={() => choose({ kind: "city", city: c.city, state: c.state, count: c.facility_count })}
                    icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
                    primary={`${c.city}, ${c.state}`}
                    secondary={`${c.facility_count} facility${c.facility_count === 1 ? "" : "ies"}`}
                  />
                )
              })}
            </Group>
          )}

          {data && data.facilities.length > 0 && (
            <Group label="Facilities">
              {data.facilities.map((f, i) => {
                const flatIndex = (data.zip ? 1 : 0) + data.cities.length + i
                return (
                  <Row
                    key={f.slug}
                    active={highlight === flatIndex}
                    onClick={() => choose({ kind: "facility", slug: f.slug, name: f.name, city: f.city, state: f.state })}
                    icon={<Building className="h-4 w-4 text-muted-foreground" />}
                    primary={f.name}
                    secondary={`${f.city}, ${f.state}`}
                  />
                )
              })}
            </Group>
          )}
        </div>
      )}
    </div>
  )
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-1">
      <div className="px-3 pb-1 pt-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      {children}
    </div>
  )
}

function Row({
  active,
  onClick,
  icon,
  primary,
  secondary,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  primary: string
  secondary?: string
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors",
        active ? "bg-accent" : "hover:bg-accent/60"
      )}
    >
      <span className="shrink-0">{icon}</span>
      <span className="flex-1 truncate">
        <span className="block truncate font-medium text-foreground">{primary}</span>
        {secondary && <span className="block truncate text-xs text-muted-foreground">{secondary}</span>}
      </span>
    </button>
  )
}
