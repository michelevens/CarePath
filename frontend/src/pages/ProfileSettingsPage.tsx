import { useEffect, useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import {
  Bell,
  Check,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  User as UserIcon,
} from "lucide-react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface ProfilePayload {
  id: number
  name: string | null
  first_name: string | null
  last_name: string | null
  email: string
  phone: string | null
  title: string | null
  profile_picture: string | null
  address_line_1: string | null
  address_line_2: string | null
  city: string | null
  state: string | null
  zip: string | null
  time_zone: string | null
  notification_preferences: {
    email_transactional: boolean
    email_marketing: boolean
    sms_reminders: boolean
    sms_marketing: boolean
  }
  onboarding_completed: boolean
  last_login_at: string | null
  created_at: string | null
}

const COMMON_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
]

const STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
]

export function ProfileSettingsPage() {
  const { refreshUser } = useAuth()
  const [data, setData] = useState<ProfilePayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<{ data: ProfilePayload }>("/me/profile")
      .then((r) => setData(r.data?.data ?? null))
      .catch((e: unknown) => {
        const err = e as { response?: { data?: { message?: string } } }
        setError(err.response?.data?.message ?? "Failed to load profile")
      })
      .finally(() => setLoading(false))
  }, [])

  const update = <K extends keyof ProfilePayload>(key: K, value: ProfilePayload[K]) => {
    setData((d) => (d ? { ...d, [key]: value } : d))
    setSaved(false)
  }

  const updatePref = (
    key: keyof ProfilePayload["notification_preferences"],
    value: boolean,
  ) => {
    setData((d) =>
      d ? { ...d, notification_preferences: { ...d.notification_preferences, [key]: value } } : d,
    )
    setSaved(false)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!data) return
    setSaving(true)
    setError(null)
    try {
      await api.put("/me/profile", {
        name: data.name,
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        title: data.title,
        profile_picture: data.profile_picture,
        address_line_1: data.address_line_1,
        address_line_2: data.address_line_2,
        city: data.city,
        state: data.state,
        zip: data.zip,
        time_zone: data.time_zone,
        notification_preferences: data.notification_preferences,
      })
      await refreshUser()
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } }
      const fieldErrs = Object.values(err.response?.data?.errors ?? {}).flat()
      setError(fieldErrs[0] ?? err.response?.data?.message ?? "Save failed")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-sm text-muted-foreground">Loading profile…</div>
  }
  if (!data) {
    return (
      <div className="p-8">
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error ?? "Unavailable"}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your contact info, mailing address, and notification preferences.
        </p>
      </div>

      <div className="flex gap-2 text-xs">
        <Link
          to="/settings/security"
          className="rounded-full border bg-background px-3 py-1 text-muted-foreground hover:bg-muted/40"
        >
          Security & 2FA
        </Link>
        <span className="rounded-full border border-violet-300 bg-violet-50 px-3 py-1 text-violet-700">
          Profile
        </span>
      </div>

      <form onSubmit={submit} className="space-y-6">
        {/* Identity */}
        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center gap-2">
              <UserIcon className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Identity</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="First name">
                <input
                  value={data.first_name ?? ""}
                  onChange={(e) => update("first_name", e.target.value || null)}
                  maxLength={60}
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                />
              </Field>
              <Field label="Last name">
                <input
                  value={data.last_name ?? ""}
                  onChange={(e) => update("last_name", e.target.value || null)}
                  maxLength={60}
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                />
              </Field>
            </div>
            <Field label="Display name (shown in salutations and on lists)">
              <input
                value={data.name ?? ""}
                onChange={(e) => update("name", e.target.value || null)}
                maxLength={120}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              />
            </Field>
            <Field label="Title at your facility / agency (optional)">
              <input
                value={data.title ?? ""}
                onChange={(e) => update("title", e.target.value || null)}
                maxLength={120}
                placeholder="Administrator, DON, Discharge Planner…"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              />
            </Field>
            <Field label="Profile picture URL (optional)">
              <input
                type="url"
                value={data.profile_picture ?? ""}
                onChange={(e) => update("profile_picture", e.target.value || null)}
                maxLength={500}
                placeholder="https://…"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              />
            </Field>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Contact</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Email">
                <input
                  value={data.email}
                  disabled
                  className="h-9 w-full rounded-md border bg-muted/30 px-3 text-sm text-muted-foreground"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Email changes need to go through support.
                </p>
              </Field>
              <Field label="Phone">
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="tel"
                    value={data.phone ?? ""}
                    onChange={(e) => update("phone", e.target.value || null)}
                    maxLength={30}
                    placeholder="+1-555-123-4567"
                    className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm"
                  />
                </div>
              </Field>
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Mailing address</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Used for 1099s (placement advisors) and paper compliance docs.
            </p>
            <Field label="Address line 1">
              <input
                value={data.address_line_1 ?? ""}
                onChange={(e) => update("address_line_1", e.target.value || null)}
                maxLength={191}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              />
            </Field>
            <Field label="Address line 2 (optional)">
              <input
                value={data.address_line_2 ?? ""}
                onChange={(e) => update("address_line_2", e.target.value || null)}
                maxLength={191}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
              <Field label="City">
                <input
                  value={data.city ?? ""}
                  onChange={(e) => update("city", e.target.value || null)}
                  maxLength={120}
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                />
              </Field>
              <Field label="State">
                <select
                  value={data.state ?? ""}
                  onChange={(e) => update("state", e.target.value || null)}
                  className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                >
                  <option value="">—</option>
                  {STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="ZIP">
                <input
                  value={data.zip ?? ""}
                  onChange={(e) => update("zip", e.target.value || null)}
                  maxLength={10}
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                />
              </Field>
            </div>
          </CardContent>
        </Card>

        {/* Locale */}
        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Time zone</h2>
            </div>
            <Field label="Show dates and tour times in">
              <select
                value={data.time_zone ?? ""}
                onChange={(e) => update("time_zone", e.target.value || null)}
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              >
                <option value="">Browser default</option>
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </Field>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Notifications</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Transactional channels (tour confirmations, claim decisions) are on by default — turn them off only if you really mean it.
            </p>
            <div className="space-y-1">
              <PrefRow
                label="Transactional email"
                description="Tour confirmations, claim decisions, password resets"
                value={data.notification_preferences.email_transactional}
                onChange={(v) => updatePref("email_transactional", v)}
              />
              <PrefRow
                label="Marketing email"
                description="Tips, new features, occasional newsletters"
                value={data.notification_preferences.email_marketing}
                onChange={(v) => updatePref("email_marketing", v)}
              />
              <PrefRow
                label="SMS reminders"
                description="Tour reminders 24h + 2h before"
                value={data.notification_preferences.sms_reminders}
                onChange={(v) => updatePref("sms_reminders", v)}
              />
              <PrefRow
                label="SMS marketing"
                description="Occasional promos"
                value={data.notification_preferences.sms_marketing}
                onChange={(v) => updatePref("sms_marketing", v)}
              />
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between border-t pt-4">
          <Link to="/settings/security" className="text-xs text-violet-700 hover:underline">
            <ShieldCheck className="mr-1 inline h-3 w-3" />
            Security & 2FA →
          </Link>
          <Button type="submit" disabled={saving} className="gap-2">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <Check className="h-4 w-4 text-emerald-200" />
            ) : null}
            {saved ? "Saved" : "Save profile"}
          </Button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-medium text-muted-foreground">{label}</div>
      {children}
    </label>
  )
}

function PrefRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string
  description: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-md border bg-background p-3 hover:bg-muted/30">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1"
      />
      <div className="flex-1">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
    </label>
  )
}
