import { useEffect, useMemo, useState, type FormEvent } from "react"
import {
  ArrowDown,
  ArrowUp,
  Check,
  ExternalLink,
  Loader2,
  Pencil,
  Plus,
  Save,
  Sparkles,
  Star,
  Trash2,
  X,
} from "lucide-react"
import { Link } from "react-router-dom"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { amenityIcon } from "@/lib/amenityIcons"

interface Profile {
  id: string
  slug: string
  name: string
  type: string
  tagline: string | null
  description: string | null
  phone: string | null
  email: string | null
  website: string | null
  price_from_cents: number | null
  address_line_1: string | null
  address_line_2: string | null
  city: string | null
  state: string | null
  zip: string | null
}

interface Amenity {
  id: string
  facility_id: string
  category: string
  name: string
  detail: string | null
  is_featured: boolean
  is_active: boolean
  sort_order: number
}

type Tab = "profile" | "amenities"

const FACILITY_TYPES: Array<{ value: string; label: string }> = [
  { value: "snf", label: "Skilled nursing" },
  { value: "assisted_living", label: "Assisted living" },
  { value: "memory_care", label: "Memory care" },
  { value: "ccrc", label: "Continuing care (CCRC)" },
  { value: "independent_living", label: "Independent living" },
  { value: "group_home", label: "Group home" },
  { value: "adult_family_home", label: "Adult family home" },
  { value: "icf_iid", label: "ICF/IID" },
]

const AMENITY_CATEGORIES: Array<{ value: string; label: string }> = [
  { value: "healthcare", label: "Healthcare" },
  { value: "dining", label: "Dining" },
  { value: "room", label: "Rooms" },
  { value: "community", label: "Community spaces" },
  { value: "activities", label: "Activities" },
  { value: "services", label: "Services" },
]

const INPUT_CLS = "h-9 w-full rounded-md border bg-background px-3 text-sm"
const TEXTAREA_CLS = "w-full rounded-md border bg-background px-3 py-2 text-sm"

export function ManageListingPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>("profile")
  const facilityId = user?.active_facility?.id

  const headers = useMemo(
    () => (facilityId ? { "X-Facility-Id": facilityId } : undefined),
    [facilityId]
  )

  if (!facilityId) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Select a facility from the switcher in the sidebar to edit its
            public listing.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Manage listing</h1>
        <p className="text-sm text-muted-foreground">
          {user?.active_facility?.name} · Edit what families see on your public
          facility page.
        </p>
      </header>

      <div className="flex gap-1 border-b">
        <TabButton active={tab === "profile"} onClick={() => setTab("profile")}>
          Profile
        </TabButton>
        <TabButton active={tab === "amenities"} onClick={() => setTab("amenities")}>
          Amenities
        </TabButton>
      </div>

      {tab === "profile" && <ProfileTab headers={headers} />}
      {tab === "amenities" && <AmenitiesTab headers={headers} />}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors",
        active
          ? "border-violet-600 text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  )
}

// ----------------------------------------------------------------------
// Profile tab
// ----------------------------------------------------------------------

function ProfileTab({ headers }: { headers: Record<string, string> | undefined }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    api
      .get<{ data: Profile }>("/facility/profile", { headers })
      .then((r) => alive && setProfile(r.data.data))
      .catch((e) =>
        alive && setError(e.response?.data?.message ?? "Failed to load listing.")
      )
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [headers])

  const update = <K extends keyof Profile>(key: K, value: Profile[K]) => {
    setProfile((p) => (p ? { ...p, [key]: value } : p))
    setSaved(false)
  }

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!profile) return
    setSaving(true)
    setError(null)
    try {
      const payload: Partial<Profile> = {
        name: profile.name,
        type: profile.type,
        tagline: profile.tagline,
        description: profile.description,
        phone: profile.phone,
        email: profile.email,
        website: profile.website,
        price_from_cents: profile.price_from_cents,
      }
      const r = await api.put<{ data: Profile }>("/facility/profile", payload, {
        headers,
      })
      setProfile(r.data.data)
      setSaved(true)
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } }
      setError(e.response?.data?.message ?? "Save failed.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading listing…
      </div>
    )
  }
  if (!profile) {
    return (
      <div className="p-6 text-sm text-red-700">{error ?? "No profile loaded."}</div>
    )
  }

  const priceDollars =
    profile.price_from_cents != null
      ? Math.round(profile.price_from_cents / 100).toString()
      : ""

  return (
    <form onSubmit={save} className="space-y-6">
      <Card>
        <CardContent className="space-y-5 p-5">
          <SectionHeading
            title="The basics"
            subtitle="Shown at the top of your public page and on every search result."
          />
          <Field label="Facility name">
            <input
              className={INPUT_CLS}
              value={profile.name}
              onChange={(e) => update("name", e.target.value)}
              maxLength={191}
              required
            />
          </Field>
          <Field label="Care type">
            <select
              className={INPUT_CLS}
              value={profile.type}
              onChange={(e) => update("type", e.target.value)}
            >
              {FACILITY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Tagline"
            hint="One-liner shown under your facility name (max 200 chars)."
          >
            <input
              className={INPUT_CLS}
              value={profile.tagline ?? ""}
              onChange={(e) => update("tagline", e.target.value || null)}
              maxLength={200}
              placeholder="e.g. Boutique memory care just steps from the bay"
            />
          </Field>
          <Field
            label="About this community"
            hint="Long-form description. Plain text — no formatting needed."
          >
            <textarea
              className={TEXTAREA_CLS}
              rows={7}
              value={profile.description ?? ""}
              onChange={(e) => update("description", e.target.value || null)}
              maxLength={5000}
              placeholder="Tell families what makes your community special. Highlight your care philosophy, common spaces, dining, and any signature programs."
            />
            <div className="mt-1 text-right text-[11px] text-muted-foreground">
              {(profile.description ?? "").length}/5000
            </div>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5 p-5">
          <SectionHeading
            title="How families reach you"
            subtitle="Used for the contact buttons and tour-request routing on your page."
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Phone">
              <input
                className={INPUT_CLS}
                value={profile.phone ?? ""}
                onChange={(e) => update("phone", e.target.value || null)}
                placeholder="(555) 123-4567"
                maxLength={30}
              />
            </Field>
            <Field label="Public email">
              <input
                className={INPUT_CLS}
                type="email"
                value={profile.email ?? ""}
                onChange={(e) => update("email", e.target.value || null)}
                placeholder="hello@yourcommunity.com"
                maxLength={191}
              />
            </Field>
          </div>
          <Field label="Website">
            <input
              className={INPUT_CLS}
              type="url"
              value={profile.website ?? ""}
              onChange={(e) => update("website", e.target.value || null)}
              placeholder="https://yourcommunity.com"
              maxLength={255}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5 p-5">
          <SectionHeading
            title="Pricing"
            subtitle='Sets the "from $X/mo" anchor on your search-result card and detail page.'
          />
          <Field label="Starting monthly price (USD)">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">$</span>
              <input
                className={INPUT_CLS + " max-w-[200px]"}
                type="number"
                inputMode="numeric"
                min={0}
                step={100}
                value={priceDollars}
                onChange={(e) => {
                  const v = e.target.value
                  update(
                    "price_from_cents",
                    v === "" ? null : Math.max(0, Math.round(Number(v) * 100))
                  )
                }}
                placeholder="4500"
              />
              <span className="text-sm text-muted-foreground">/ month</span>
            </div>
          </Field>
          <p className="text-xs text-muted-foreground">
            Leave blank to show "Contact for pricing" — we recommend a real
            number; APFM-fatigued families filter out "call for price" listings.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-5">
          <SectionHeading
            title="Address"
            subtitle="Read-only here — moving a pin without re-geocoding silently breaks search."
          />
          <div className="rounded-md bg-muted/40 p-3 text-sm text-muted-foreground">
            <div>{profile.address_line_1 ?? "—"}</div>
            {profile.address_line_2 && <div>{profile.address_line_2}</div>}
            <div>
              {profile.city}, {profile.state} {profile.zip}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Need to update your address? Email{" "}
            <a className="underline" href="mailto:support@carepath.io">
              support@carepath.io
            </a>{" "}
            — we re-geocode and update the map in under a business day.
          </p>
        </CardContent>
      </Card>

      <div className="sticky bottom-0 -mx-6 flex flex-col gap-2 border-t bg-card/95 px-6 py-3 backdrop-blur md:-mx-8 md:flex-row md:items-center md:justify-between md:px-8">
        <div className="text-xs">
          {error && <span className="text-red-700">{error}</span>}
          {saved && !error && (
            <span className="inline-flex items-center gap-1 text-emerald-700">
              <Check className="h-3 w-3" /> Saved — live on your public page.
            </span>
          )}
          {!error && !saved && (
            <span className="text-muted-foreground">
              Changes here go live immediately on your public listing.
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to={`/facility/${profile.slug}`} target="_blank" rel="noreferrer">
              Preview public page <ExternalLink className="ml-1 h-3 w-3" />
            </Link>
          </Button>
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Saving…
              </>
            ) : (
              <>
                <Save className="mr-1 h-3 w-3" /> Save changes
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  )
}

// ----------------------------------------------------------------------
// Amenities tab
// ----------------------------------------------------------------------

function AmenitiesTab({ headers }: { headers: Record<string, string> | undefined }) {
  const [rows, setRows] = useState<Amenity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Amenity | "new" | null>(null)

  const refresh = () =>
    api
      .get<{ data: Amenity[] }>("/facility/amenities", { headers })
      .then((r) => setRows(r.data.data))

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    api
      .get<{ data: Amenity[] }>("/facility/amenities", { headers })
      .then((r) => alive && setRows(r.data.data))
      .catch((e) =>
        alive && setError(e.response?.data?.message ?? "Failed to load amenities.")
      )
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [headers])

  const grouped = useMemo(() => {
    const by: Record<string, Amenity[]> = {}
    for (const a of rows) {
      ;(by[a.category] ?? (by[a.category] = [])).push(a)
    }
    return by
  }, [rows])

  const move = async (id: string, direction: -1 | 1) => {
    const idx = rows.findIndex((r) => r.id === id)
    if (idx < 0) return
    const swap = idx + direction
    if (swap < 0 || swap >= rows.length) return
    const next = rows.slice()
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    setRows(next) // optimistic
    try {
      await api.post(
        "/facility/amenities/reorder",
        { order: next.map((r) => r.id) },
        { headers }
      )
    } catch {
      refresh()
    }
  }

  const toggle = async (a: Amenity, field: "is_featured" | "is_active") => {
    const next = !a[field]
    setRows((rs) => rs.map((r) => (r.id === a.id ? { ...r, [field]: next } : r)))
    try {
      await api.put(`/facility/amenities/${a.id}`, { [field]: next }, { headers })
    } catch {
      refresh()
    }
  }

  const remove = async (a: Amenity) => {
    if (!confirm(`Remove "${a.name}" from your amenities?`)) return
    const prev = rows
    setRows((rs) => rs.filter((r) => r.id !== a.id))
    try {
      await api.delete(`/facility/amenities/${a.id}`, { headers })
    } catch {
      setRows(prev)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading amenities…
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold">
              {rows.length} {rows.length === 1 ? "amenity" : "amenities"} listed
            </h2>
            <p className="text-xs text-muted-foreground">
              Star up to 3 as "featured" — those show as the preview chips on
              search results.
            </p>
          </div>
          <Button size="sm" onClick={() => setEditing("new")}>
            <Plus className="mr-1 h-3 w-3" /> Add amenity
          </Button>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {rows.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            <Sparkles className="mx-auto h-6 w-6 text-violet-500" />
            <p className="mt-2">
              No amenities yet. Families filter and compare on amenities — even
              5-6 entries dramatically improves your match rate.
            </p>
            <Button size="sm" className="mt-3" onClick={() => setEditing("new")}>
              <Plus className="mr-1 h-3 w-3" /> Add your first amenity
            </Button>
          </CardContent>
        </Card>
      ) : (
        AMENITY_CATEGORIES.map(
          (cat) =>
            grouped[cat.value] && (
              <Card key={cat.value}>
                <CardContent className="p-0">
                  <div className="border-b px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {cat.label}
                  </div>
                  <ul>
                    {grouped[cat.value].map((a) => {
                      const Icon = amenityIcon(a.name)
                      return (
                        <li
                          key={a.id}
                          className={cn(
                            "flex items-center gap-3 border-b px-4 py-3 last:border-b-0",
                            !a.is_active && "opacity-50"
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0 text-violet-600" />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">
                              {a.name}
                            </div>
                            {a.detail && (
                              <div className="truncate text-xs text-muted-foreground">
                                {a.detail}
                              </div>
                            )}
                          </div>
                          <button
                            title={a.is_featured ? "Unfeature" : "Feature (shows in search preview)"}
                            onClick={() => toggle(a, "is_featured")}
                            className={cn(
                              "rounded p-1 hover:bg-muted",
                              a.is_featured ? "text-amber-500" : "text-muted-foreground"
                            )}
                          >
                            <Star
                              className="h-4 w-4"
                              fill={a.is_featured ? "currentColor" : "none"}
                            />
                          </button>
                          <button
                            title={a.is_active ? "Hide from public page" : "Show on public page"}
                            onClick={() => toggle(a, "is_active")}
                            className="rounded p-1 text-muted-foreground hover:bg-muted"
                          >
                            {a.is_active ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            title="Move up"
                            onClick={() => move(a.id, -1)}
                            className="rounded p-1 text-muted-foreground hover:bg-muted"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </button>
                          <button
                            title="Move down"
                            onClick={() => move(a.id, 1)}
                            className="rounded p-1 text-muted-foreground hover:bg-muted"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </button>
                          <button
                            title="Edit"
                            onClick={() => setEditing(a)}
                            className="rounded p-1 text-muted-foreground hover:bg-muted"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            title="Delete"
                            onClick={() => remove(a)}
                            className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </CardContent>
              </Card>
            )
        )
      )}

      {editing && (
        <AmenityEditor
          initial={editing === "new" ? null : editing}
          headers={headers}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            await refresh()
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

function AmenityEditor({
  initial,
  headers,
  onClose,
  onSaved,
}: {
  initial: Amenity | null
  headers: Record<string, string> | undefined
  onClose: () => void
  onSaved: () => void
}) {
  const [category, setCategory] = useState(initial?.category ?? "healthcare")
  const [name, setName] = useState(initial?.name ?? "")
  const [detail, setDetail] = useState(initial?.detail ?? "")
  const [featured, setFeatured] = useState(initial?.is_featured ?? false)
  const [active, setActive] = useState(initial?.is_active ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = {
        category,
        name,
        detail: detail || null,
        is_featured: featured,
        is_active: active,
      }
      if (initial) {
        await api.put(`/facility/amenities/${initial.id}`, payload, { headers })
      } else {
        await api.post("/facility/amenities", payload, { headers })
      }
      onSaved()
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } }
      setError(e.response?.data?.message ?? "Save failed.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-lg bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="text-sm font-semibold">
            {initial ? "Edit amenity" : "Add amenity"}
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4 p-4">
          <Field label="Category">
            <select
              className={INPUT_CLS}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {AMENITY_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Name">
            <input
              className={INPUT_CLS}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={120}
              placeholder="e.g. Chef-prepared meals"
            />
          </Field>
          <Field
            label="Detail"
            hint="Optional — a short subtitle shown under the amenity name."
          >
            <input
              className={INPUT_CLS}
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              maxLength={500}
              placeholder="Seasonal menus, dietary accommodations"
            />
          </Field>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
              />
              Featured (shows in search preview)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              Visible
            </label>
          </div>
          {error && <div className="text-xs text-red-700">{error}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <Save className="mr-1 h-3 w-3" /> Save
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------
// Shared bits
// ----------------------------------------------------------------------

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-medium text-muted-foreground">{label}</div>
      {children}
      {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
    </label>
  )
}
