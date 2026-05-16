import { useEffect, useState, type FormEvent } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Loader2,
  Save,
  ShieldCheck,
} from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface Profile {
  id: string
  name: string
  slug: string | null
  partner_type: string
  contact_phone: string | null
  service_area_zips: string[]
  service_area_states: string[]
  commission_split_partner_pct: number
  commission_split_platform_pct: number
  is_active: boolean
  is_accepting_referrals: boolean
  stripe_account_id: string | null
  stripe_account_status: string
  can_receive_payouts: boolean
}

const STATUS_LABELS: Record<string, { label: string; tone: "good" | "warn" | "bad" }> = {
  not_connected: { label: "Not connected", tone: "warn" },
  pending: { label: "Onboarding in progress", tone: "warn" },
  verifying: { label: "Verifying", tone: "warn" },
  active: { label: "Active — payouts enabled", tone: "good" },
  restricted: { label: "Restricted — action needed", tone: "bad" },
  rejected: { label: "Rejected", tone: "bad" },
}

const PARTNER_TYPES = [
  { value: "hospital", label: "Hospital" },
  { value: "health_system", label: "Health system" },
  { value: "rehab", label: "Rehab facility" },
  { value: "snf_discharge", label: "SNF (discharge)" },
  { value: "accountable_care", label: "Accountable Care Organization" },
]

export function HospitalProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)

  const [form, setForm] = useState({
    name: "",
    partner_type: "hospital",
    contact_phone: "",
    service_area_states: "",
    service_area_zips: "",
    is_accepting_referrals: true,
  })

  const load = async () => {
    setLoading(true)
    try {
      const r = await api.get<{ data: Profile }>("/hospital/profile")
      const p = r.data?.data
      if (!p) return
      setProfile(p)
      setForm({
        name: p.name ?? "",
        partner_type: p.partner_type ?? "hospital",
        contact_phone: p.contact_phone ?? "",
        service_area_states: (p.service_area_states ?? []).join(", "),
        service_area_zips: (p.service_area_zips ?? []).join(", "),
        is_accepting_referrals: p.is_accepting_referrals,
      })
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } }
      setError(err.response?.data?.message ?? "Failed to load profile")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const onSave = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSavedFlash(false)
    try {
      const payload = {
        name: form.name,
        partner_type: form.partner_type,
        contact_phone: form.contact_phone || null,
        service_area_states: form.service_area_states
          .split(",")
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean),
        service_area_zips: form.service_area_zips
          .split(",")
          .map((s) => s.trim())
          .filter((s) => /^\d{5}$/.test(s)),
        is_accepting_referrals: form.is_accepting_referrals,
      }
      const r = await api.put<{ data: Profile }>("/hospital/profile", payload)
      setProfile(r.data?.data ?? null)
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 1500)
    } catch (e) {
      const err = e as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }
      const first = err.response?.data?.errors ? Object.values(err.response.data.errors)[0]?.[0] : undefined
      setError(first ?? err.response?.data?.message ?? "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const onConnect = async () => {
    setConnecting(true)
    setError(null)
    try {
      const r = await api.post<{ data: { onboarding_url: string } }>("/hospital/connect/onboarding")
      const url = r.data?.data?.onboarding_url
      if (url) {
        window.location.href = url
        return
      }
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } }
      setError(err.response?.data?.message ?? "Failed to generate onboarding link")
    } finally {
      setConnecting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading profile…
      </div>
    )
  }

  const status = profile?.stripe_account_status ?? "not_connected"
  const statusMeta = STATUS_LABELS[status] ?? STATUS_LABELS.not_connected

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Hospital profile &amp; payouts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Identify your institution + set the service area where you can refer
          patients. Connect Stripe to receive placement fees.
        </p>
      </div>

      <Card
        className={cn(
          statusMeta.tone === "good" && "border-primary/30 bg-primary/5",
          statusMeta.tone === "warn" && "border-amber-500/40 bg-amber-500/5",
          statusMeta.tone === "bad" && "border-destructive/30 bg-destructive/5"
        )}
      >
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            {statusMeta.tone === "good" ? (
              <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
            ) : statusMeta.tone === "bad" ? (
              <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
            ) : (
              <CreditCard className="mt-0.5 h-5 w-5 text-amber-700" />
            )}
            <div>
              <div className="font-semibold">Stripe Connect: {statusMeta.label}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Required to receive placement payouts. Stripe Express handles
                identity verification, banking, and 1099s.
              </div>
            </div>
          </div>
          <Button onClick={onConnect} disabled={connecting} variant={statusMeta.tone === "good" ? "outline" : "default"}>
            {connecting && <Loader2 className="h-4 w-4 animate-spin" />}
            <ExternalLink className="h-4 w-4" />
            {status === "active" ? "Manage on Stripe" : status === "not_connected" ? "Connect Stripe" : "Continue setup"}
          </Button>
        </CardContent>
      </Card>

      <form onSubmit={onSave}>
        <Card>
          <CardContent className="space-y-4 p-6">
            <div>
              <h2 className="text-lg font-semibold">Institution details</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Surfaced to families inside the widget so they know who's
                helping them.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Institution name</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="St. Joseph's Medical Center"
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Type</label>
                <select
                  value={form.partner_type}
                  onChange={(e) => setForm({ ...form, partner_type: e.target.value })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-ring"
                >
                  {PARTNER_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Contact phone</label>
                <input
                  value={form.contact_phone}
                  onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                  placeholder="(555) 123-4567"
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-ring"
                />
              </div>
              <label className="flex items-end gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_accepting_referrals}
                  onChange={(e) => setForm({ ...form, is_accepting_referrals: e.target.checked })}
                  className="h-4 w-4"
                />
                Currently sending referrals
              </label>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardContent className="space-y-4 p-6">
            <div>
              <h2 className="text-lg font-semibold">Service area</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Limits which facilities show up in your widget. Empty = no
                limit (national).
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Licensed/operating states (comma-separated)</label>
              <input
                value={form.service_area_states}
                onChange={(e) => setForm({ ...form, service_area_states: e.target.value })}
                placeholder="CA, NV, AZ"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Catchment ZIP codes (comma-separated)</label>
              <input
                value={form.service_area_zips}
                onChange={(e) => setForm({ ...form, service_area_zips: e.target.value })}
                placeholder="90210, 90211, 90212"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-ring"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mt-4 bg-muted/20">
          <CardContent className="p-6 text-sm">
            <div className="font-semibold">Compensation</div>
            <p className="mt-2 text-muted-foreground">
              Default split:{" "}
              <span className="font-medium text-foreground">
                {profile?.commission_split_partner_pct ?? 12}% to you
              </span>{" "}
              ·{" "}
              <span className="font-medium text-foreground">
                {profile?.commission_split_platform_pct ?? 88}% to CarePath
              </span>{" "}
              on every placement that admits via your widget. Payouts release on
              the 30-day / 90-day retention milestones. Contact us for
              custom-contract rates (health-system enterprise tiers available).
            </p>
          </CardContent>
        </Card>

        {error && (
          <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save profile
          </Button>
          {savedFlash && (
            <span className="inline-flex items-center gap-1 text-sm text-primary">
              <CheckCircle2 className="h-4 w-4" />
              Saved
            </span>
          )}
        </div>
      </form>
    </div>
  )
}
