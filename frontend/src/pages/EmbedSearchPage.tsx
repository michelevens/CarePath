import { useEffect, useMemo, useState, type FormEvent } from "react"
import { useSearchParams } from "react-router-dom"
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Loader2,
  MapPin,
  Search,
  Send,
  Star,
} from "lucide-react"
import axios from "axios"
import { Button } from "@/components/ui/button"

/**
 * Embeddable facility-search widget for hospital partners. Designed
 * to be iframed into discharge-planning systems. Authenticates against
 * /api/embed/* via the X-CarePath-Embed-Key header (key from the URL).
 *
 * Self-contained — does NOT use the global axios instance (which adds
 * the family-side auth token); uses its own bare instance keyed to
 * the embed key only. This keeps the widget context fully separate
 * from any family-side session that might be active in the parent.
 */

const TYPE_LABEL: Record<string, string> = {
  snf: "Skilled Nursing",
  assisted_living: "Assisted Living",
  memory_care: "Memory Care",
  ccrc: "Continuing Care",
}

interface EmbedFacility {
  id: string
  name: string
  slug: string
  type: string
  city: string
  state: string
  zip: string | null
  phone: string | null
  cms_five_star_overall: number | null
  price_from_cents: number | null
  medicaid_certified: boolean
  medicare_certified: boolean
  quality_score: { score: number; components: Record<string, unknown> } | null
}

interface PartnerInfo {
  id: string
  name: string
  slug: string
  partner_type: string
  is_accepting_referrals: boolean
  service_area_zips: string[]
  service_area_states: string[]
}

export function EmbedSearchPage() {
  const [urlParams] = useSearchParams()
  const embedKey = urlParams.get("key") ?? ""

  // Bare axios instance — no auth interceptor, no token storage.
  const client = useMemo(() => {
    const base = import.meta.env.VITE_API_URL || "/api"
    return axios.create({
      baseURL: base,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-CarePath-Embed-Key": embedKey,
      },
    })
  }, [embedKey])

  const [partner, setPartner] = useState<PartnerInfo | null>(null)
  const [partnerError, setPartnerError] = useState<string | null>(null)
  const [bootLoading, setBootLoading] = useState(true)

  useEffect(() => {
    if (!embedKey) {
      setPartnerError("Missing embed key.")
      setBootLoading(false)
      return
    }
    let alive = true
    client
      .get<{ data: { partner: PartnerInfo } }>("/embed/config")
      .then((r) => alive && setPartner(r.data?.data?.partner ?? null))
      .catch((e) => {
        const err = e as { response?: { data?: { message?: string }; status?: number } }
        if (alive) setPartnerError(err.response?.data?.message ?? "Invalid embed key.")
      })
      .finally(() => alive && setBootLoading(false))
    return () => { alive = false }
  }, [embedKey, client])

  // Search state
  const [zip, setZip] = useState("")
  const [state, setState] = useState("")
  const [city, setCity] = useState("")
  const [type, setType] = useState("")
  const [medicaidOnly, setMedicaidOnly] = useState(false)
  const [results, setResults] = useState<EmbedFacility[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [selected, setSelected] = useState<EmbedFacility | null>(null)

  const onSearch = async (e?: FormEvent) => {
    if (e) e.preventDefault()
    setSearching(true)
    setSearchError(null)
    try {
      const params: Record<string, string | number | boolean> = { limit: 25 }
      if (zip.length === 5) { params.zip = zip; params.radius_miles = 25 }
      if (state) params.state = state.toUpperCase()
      if (city) params.city = city
      if (type) params.type = type
      if (medicaidOnly) params.medicaid_only = true
      const r = await client.get<{ data: EmbedFacility[] }>("/embed/facilities", { params })
      setResults(Array.isArray(r.data?.data) ? r.data.data : [])
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } }
      setSearchError(err.response?.data?.message ?? "Search failed.")
    } finally {
      setSearching(false)
    }
  }

  if (bootLoading) {
    return (
      <ShellEmpty>
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </ShellEmpty>
    )
  }
  if (partnerError) {
    return (
      <ShellEmpty>
        <AlertTriangle className="h-5 w-5 text-destructive" />
        <div className="text-center text-sm">
          <div className="font-medium">{partnerError}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Check that your embed snippet's <code>key=</code> param matches the
            current API key in your CarePath hospital portal.
          </div>
        </div>
      </ShellEmpty>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 text-sm">
      {/* Compact branded header — narrow because it's iframed */}
      <header className="mb-4 flex items-center justify-between border-b pb-3">
        <div>
          <div className="font-semibold tracking-tight">
            Find long-term care for your patient
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            Brought to you by <span className="font-medium text-foreground">{partner?.name || "your hospital"}</span> · powered by CarePath
          </div>
        </div>
      </header>

      {/* Search form */}
      <form onSubmit={onSearch} className="mb-4 grid gap-2 sm:grid-cols-6">
        <input
          value={zip}
          onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
          placeholder="ZIP"
          maxLength={5}
          className="rounded-md border bg-background px-3 py-2 text-sm sm:col-span-1 outline-hidden focus:ring-2 focus:ring-ring"
        />
        <input
          value={state}
          onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
          placeholder="State"
          maxLength={2}
          className="rounded-md border bg-background px-3 py-2 text-sm sm:col-span-1 outline-hidden focus:ring-2 focus:ring-ring"
        />
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="City"
          className="rounded-md border bg-background px-3 py-2 text-sm sm:col-span-1 outline-hidden focus:ring-2 focus:ring-ring"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm sm:col-span-1 outline-hidden focus:ring-2 focus:ring-ring"
        >
          <option value="">Any type</option>
          {Object.entries(TYPE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-xs sm:col-span-1">
          <input type="checkbox" checked={medicaidOnly} onChange={(e) => setMedicaidOnly(e.target.checked)} className="h-4 w-4" />
          Medicaid only
        </label>
        <Button type="submit" disabled={searching} className="sm:col-span-1">
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Search
        </Button>
      </form>

      {searchError && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {searchError}
        </div>
      )}

      {/* Results */}
      {results.length === 0 && !searching ? (
        <div className="rounded-md border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          Enter search criteria and click <strong className="text-foreground">Search</strong> to find facilities.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {results.map((f) => (
            <FacilityResult key={f.id} f={f} onRefer={() => setSelected(f)} />
          ))}
        </div>
      )}

      {selected && (
        <ReferModal
          facility={selected}
          partner={partner}
          client={client}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}

function FacilityResult({ f, onRefer }: { f: EmbedFacility; onRefer: () => void }) {
  const monthly = f.price_from_cents ? Math.round(f.price_from_cents / 100).toLocaleString() : null
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-semibold">{f.name}</div>
          <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {f.city}, {f.state} {f.zip}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {TYPE_LABEL[f.type] ?? f.type}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 text-xs">
          {f.quality_score && (
            <span className="rounded-full border border-primary/40 bg-primary/5 px-2 py-0.5 font-semibold text-primary">
              {f.quality_score.score.toFixed(1)}/10
            </span>
          )}
          {f.cms_five_star_overall && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
              {f.cms_five_star_overall} CMS
            </span>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-end justify-between text-xs">
        <div className="flex gap-1.5">
          {f.medicaid_certified && (
            <span className="rounded bg-accent px-1.5 py-0.5 text-accent-foreground">Medicaid</span>
          )}
          {f.medicare_certified && (
            <span className="rounded bg-accent px-1.5 py-0.5 text-accent-foreground">Medicare</span>
          )}
        </div>
        <div className="text-sm">
          {monthly ? (
            <><span className="font-semibold">${monthly}</span><span className="text-muted-foreground"> /mo</span></>
          ) : (
            <span className="text-muted-foreground">Call for pricing</span>
          )}
        </div>
      </div>
      <Button size="sm" className="mt-3 w-full" onClick={onRefer}>
        <Send className="h-3.5 w-3.5" />
        Refer a patient
      </Button>
    </div>
  )
}

function ReferModal({
  facility,
  partner,
  client,
  onClose,
}: {
  facility: EmbedFacility
  partner: PartnerInfo | null
  client: ReturnType<typeof axios.create>
  onClose: () => void
}) {
  const [form, setForm] = useState({
    inquirer_name: "",
    inquirer_email: "",
    inquirer_phone: "",
    inquirer_relationship: "hospital" as "hospital" | "adult_child" | "spouse" | "poa" | "self" | "other",
    prospect_first_name: "",
    prospect_last_name: "",
    prospect_level_of_care: "" as "" | "independent" | "assisted" | "memory" | "skilled" | "hospice",
    target_admit_date: "",
    notes: "",
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await client.post("/embed/inquiries", {
        facility_slug: facility.slug,
        ...form,
        inquirer_phone: form.inquirer_phone || undefined,
        prospect_level_of_care: form.prospect_level_of_care || undefined,
        target_admit_date: form.target_admit_date || undefined,
        notes: form.notes || undefined,
      })
      setDone(true)
    } catch (e) {
      const err = e as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }
      const first = err.response?.data?.errors ? Object.values(err.response.data.errors)[0]?.[0] : undefined
      setError(first ?? err.response?.data?.message ?? "Failed to send referral.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-xl rounded-xl border bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        {done ? (
          <div className="space-y-3 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
            <div className="font-semibold">Referral sent to {facility.name}</div>
            <p className="text-sm text-muted-foreground">
              The facility's admissions team has been notified. You'll see this
              referral in your CarePath hospital dashboard under{" "}
              <strong className="text-foreground">Referrals</strong>.
            </p>
            <Button onClick={onClose}>Done</Button>
          </div>
        ) : (
          <form onSubmit={onSubmit}>
            <div className="mb-3">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Refer to
              </div>
              <div className="font-semibold">{facility.name}</div>
              <div className="text-xs text-muted-foreground">
                {facility.city}, {facility.state}{facility.phone && <> · {facility.phone}</>}
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Field required label="Patient first name" value={form.prospect_first_name} onChange={(v) => setForm({ ...form, prospect_first_name: v })} />
              <Field required label="Patient last name" value={form.prospect_last_name} onChange={(v) => setForm({ ...form, prospect_last_name: v })} />
              <SelectField label="Level of care" value={form.prospect_level_of_care} onChange={(v) => setForm({ ...form, prospect_level_of_care: v as typeof form.prospect_level_of_care })}
                options={[
                  { value: "", label: "Pick one" },
                  { value: "skilled", label: "Skilled nursing" },
                  { value: "assisted", label: "Assisted living" },
                  { value: "memory", label: "Memory care" },
                  { value: "independent", label: "Independent" },
                  { value: "hospice", label: "Hospice" },
                ]}
              />
              <Field type="date" label="Target admit date" value={form.target_admit_date} onChange={(v) => setForm({ ...form, target_admit_date: v })} />
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <Field required label="Family contact name" value={form.inquirer_name} onChange={(v) => setForm({ ...form, inquirer_name: v })} />
              <SelectField label="Family relationship" value={form.inquirer_relationship} onChange={(v) => setForm({ ...form, inquirer_relationship: v as typeof form.inquirer_relationship })}
                options={[
                  { value: "hospital", label: "Hospital case manager (me)" },
                  { value: "adult_child", label: "Adult child" },
                  { value: "spouse", label: "Spouse / partner" },
                  { value: "poa", label: "Power of attorney" },
                  { value: "self", label: "Patient themselves" },
                  { value: "other", label: "Other" },
                ]}
              />
              <Field required type="email" label="Family email" value={form.inquirer_email} onChange={(v) => setForm({ ...form, inquirer_email: v })} />
              <Field label="Family phone (optional)" value={form.inquirer_phone} onChange={(v) => setForm({ ...form, inquirer_phone: v })} />
            </div>
            <div className="mt-2">
              <label className="text-xs font-medium">Notes for the facility (optional)</label>
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Discharge planning context, mobility, behaviors, insurance details, etc."
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-ring"
              />
            </div>
            {error && (
              <div className="mt-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </div>
            )}
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                <Send className="h-4 w-4" />
                Send referral
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              By submitting, you confirm you have HIPAA-appropriate authorization
              to share this patient's information with {facility.name}. The
              referral is attributed to {partner?.name ?? "your hospital"}.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}

function Field({
  label, value, onChange, type = "text", required,
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean
}) {
  return (
    <div>
      <label className="text-xs font-medium">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-ring"
      />
    </div>
  )
}

function SelectField({
  label, value, onChange, options,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>
}) {
  return (
    <div>
      <label className="text-xs font-medium">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-ring"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

function ShellEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background p-6 text-sm text-muted-foreground">
      {children}
      <div className="mt-4 flex items-center gap-1 text-xs">
        <Building2 className="h-3 w-3" />
        Powered by CarePath
      </div>
    </div>
  )
}
