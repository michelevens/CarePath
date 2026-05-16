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
  agency_name: string | null
  agency_slug: string | null
  agency_website: string | null
  bio: string | null
  phone: string | null
  licensed_states: string[]
  service_area_zips: string[]
  commission_split_advisor_pct: number
  commission_split_platform_pct: number
  charges_families: boolean
  family_consultation_fee_cents: number | null
  is_active: boolean
  is_accepting_referrals: boolean
  stripe_account_id: string | null
  stripe_account_status: string
  can_accept_placements: boolean
  verified_at: string | null
}

const STATUS_LABELS: Record<string, { label: string; tone: "good" | "warn" | "bad" }> = {
  not_connected: { label: "Not connected", tone: "warn" },
  pending: { label: "Onboarding in progress", tone: "warn" },
  verifying: { label: "Verifying", tone: "warn" },
  active: { label: "Active — payouts enabled", tone: "good" },
  restricted: { label: "Restricted — action needed", tone: "bad" },
  rejected: { label: "Rejected", tone: "bad" },
}

export function ReferralProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)

  // Form state — initialized from profile on load.
  const [form, setForm] = useState({
    agency_name: "",
    agency_website: "",
    bio: "",
    phone: "",
    licensed_states: "",
    service_area_zips: "",
    commission_split_advisor_pct: 82,
    charges_families: false,
    family_consultation_fee_cents: 0,
    is_accepting_referrals: true,
  })

  const load = async () => {
    setLoading(true)
    try {
      const r = await api.get<{ data: Profile }>("/referral/profile")
      const p = r.data?.data
      if (!p) return
      setProfile(p)
      setForm({
        agency_name: p.agency_name ?? "",
        agency_website: p.agency_website ?? "",
        bio: p.bio ?? "",
        phone: p.phone ?? "",
        licensed_states: (p.licensed_states ?? []).join(", "),
        service_area_zips: (p.service_area_zips ?? []).join(", "),
        commission_split_advisor_pct: p.commission_split_advisor_pct,
        charges_families: p.charges_families,
        family_consultation_fee_cents: p.family_consultation_fee_cents ?? 0,
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
        agency_name: form.agency_name || null,
        agency_website: form.agency_website || null,
        bio: form.bio || null,
        phone: form.phone || null,
        licensed_states: form.licensed_states
          .split(",")
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean),
        service_area_zips: form.service_area_zips
          .split(",")
          .map((s) => s.trim())
          .filter((s) => /^\d{5}$/.test(s)),
        commission_split_advisor_pct: Number(form.commission_split_advisor_pct),
        charges_families: form.charges_families,
        family_consultation_fee_cents: form.charges_families
          ? Number(form.family_consultation_fee_cents)
          : 0,
        is_accepting_referrals: form.is_accepting_referrals,
      }
      const r = await api.put<{ data: Profile }>("/referral/profile", payload)
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
      const r = await api.post<{ data: { onboarding_url: string } }>("/referral/connect/onboarding")
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
        <h1 className="text-2xl font-semibold tracking-tight">Agency profile &amp; payouts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set up how families and facilities see you, what split you take, and
          how you get paid.
        </p>
      </div>

      {/* Stripe Connect status card */}
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
                Required to receive placement payouts. We use Stripe Express —
                they handle identity verification, banking, and 1099s.
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
        <div className="grid gap-6 md:grid-cols-2">
          {/* Public agency info */}
          <Card>
            <CardContent className="space-y-4 p-6">
              <div>
                <h2 className="text-lg font-semibold">Public agency profile</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  How families see you when they're matched with your agency.
                </p>
              </div>
              <Field
                label="Agency name"
                value={form.agency_name}
                onChange={(v) => setForm({ ...form, agency_name: v })}
                placeholder="Acme Senior Placement"
              />
              <Field
                label="Website"
                type="url"
                value={form.agency_website}
                onChange={(v) => setForm({ ...form, agency_website: v })}
                placeholder="https://acmeplacement.com"
              />
              <Field
                label="Phone"
                value={form.phone}
                onChange={(v) => setForm({ ...form, phone: v })}
                placeholder="(555) 123-4567"
              />
              <TextArea
                label="Bio"
                value={form.bio}
                onChange={(v) => setForm({ ...form, bio: v })}
                placeholder="Your background, what families can expect, languages you speak."
                rows={4}
              />
            </CardContent>
          </Card>

          {/* Coverage + accepting referrals toggle */}
          <Card>
            <CardContent className="space-y-4 p-6">
              <div>
                <h2 className="text-lg font-semibold">Coverage area &amp; licensing</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Used to match you to family inquiries.
                </p>
              </div>
              <Field
                label="Licensed states (comma-separated)"
                value={form.licensed_states}
                onChange={(v) => setForm({ ...form, licensed_states: v })}
                placeholder="CA, AZ, NV"
              />
              <Field
                label="Service-area ZIP codes (comma-separated)"
                value={form.service_area_zips}
                onChange={(v) => setForm({ ...form, service_area_zips: v })}
                placeholder="90210, 90211, 90212"
              />
              <p className="text-xs text-muted-foreground">
                Some states (CA, MA, others) require referral agencies to be
                licensed. Keep this list current; we surface license status on
                your public profile.
              </p>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_accepting_referrals}
                  onChange={(e) => setForm({ ...form, is_accepting_referrals: e.target.checked })}
                  className="h-4 w-4"
                />
                Currently accepting new family referrals
              </label>
            </CardContent>
          </Card>

          {/* Compensation transparency */}
          <Card className="md:col-span-2">
            <CardContent className="space-y-4 p-6">
              <div>
                <h2 className="text-lg font-semibold">Compensation transparency</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  CarePath surfaces these on your public profile. Honesty is a
                  requirement for the Vetted Network badge — fabricated terms
                  are grounds for delisting.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Your commission split (%)</label>
                  <input
                    type="number"
                    min={50}
                    max={95}
                    value={form.commission_split_advisor_pct}
                    onChange={(e) => setForm({ ...form, commission_split_advisor_pct: Number(e.target.value) })}
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-ring"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    What you keep of each facility placement fee. CarePath
                    takes the rest ({100 - form.commission_split_advisor_pct}%).
                  </p>
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={form.charges_families}
                      onChange={(e) => setForm({ ...form, charges_families: e.target.checked })}
                      className="h-4 w-4"
                    />
                    I also charge families directly
                  </label>
                  {form.charges_families && (
                    <>
                      <input
                        type="number"
                        min={0}
                        step={50}
                        value={form.family_consultation_fee_cents / 100}
                        onChange={(e) => setForm({ ...form, family_consultation_fee_cents: Number(e.target.value) * 100 })}
                        className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-ring"
                        placeholder="Consultation fee in dollars"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        Disclosed to families upfront. If you charge $0, leave
                        this unchecked.
                      </p>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

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

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
}) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-ring"
      />
    </div>
  )
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-ring"
      />
    </div>
  )
}
