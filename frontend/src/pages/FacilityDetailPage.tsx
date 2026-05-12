import { useEffect, useState, type FormEvent } from "react"
import { Link, useParams } from "react-router-dom"
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Shield,
  Star,
} from "lucide-react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface Facility {
  id: string
  name: string
  slug: string
  type: string
  address_line_1: string
  address_line_2: string | null
  city: string
  state: string
  zip: string
  phone: string | null
  email: string | null
  website: string | null
  medicaid_certified: boolean
  medicare_certified: boolean
  cms_five_star_overall: number | null
  cms_five_star_health_inspection: number | null
  cms_five_star_staffing: number | null
  cms_five_star_quality: number | null
  total_beds: number
  price_from_cents: number | null
  available_beds: number
  available_by_level: Record<string, number>
}

const TYPE_LABEL: Record<string, string> = {
  snf: "Skilled Nursing",
  assisted_living: "Assisted Living",
  memory_care: "Memory Care",
  ccrc: "Continuing Care",
}

const LEVEL_LABEL: Record<string, string> = {
  independent: "Independent",
  assisted: "Assisted",
  memory: "Memory",
  skilled: "Skilled",
  hospice: "Hospice",
}

export function FacilityDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const [facility, setFacility] = useState<Facility | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tourOpen, setTourOpen] = useState(false)

  useEffect(() => {
    if (!slug) return
    let alive = true
    setLoading(true)
    setError(null)
    api
      .get<{ data: Facility }>(`/marketplace/facilities/${slug}`)
      .then((r) => alive && setFacility(r.data.data))
      .catch((err) => {
        if (!alive) return
        if (err.response?.status === 404) setError("Facility not found.")
        else setError(err.response?.data?.message ?? "Failed to load")
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [slug])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading facility…
      </div>
    )
  }

  if (error || !facility) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
        <p className="text-muted-foreground">{error ?? "Not found"}</p>
        <Button asChild className="mt-6">
          <Link to="/search">Back to search</Link>
        </Button>
      </div>
    )
  }

  const monthly = facility.price_from_cents
    ? Math.round(facility.price_from_cents / 100).toLocaleString()
    : null

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            CarePath
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link to="/search">
              <ArrowLeft className="h-4 w-4" />
              Back to search
            </Link>
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Photo gallery placeholder */}
        <div className="mb-6 grid h-72 grid-cols-4 gap-2 overflow-hidden rounded-xl">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={
                "flex items-center justify-center bg-muted text-muted-foreground/40 " +
                (i === 0 ? "col-span-2 row-span-2" : "")
              }
            >
              <Building2 className="h-10 w-10" />
            </div>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">{facility.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {facility.city}, {facility.state} {facility.zip}
                </span>
                <span>·</span>
                <span>{TYPE_LABEL[facility.type] ?? facility.type}</span>
                {facility.cms_five_star_overall && (
                  <>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-current text-foreground" />
                      <span className="font-medium text-foreground">
                        {facility.cms_five_star_overall}
                      </span>
                      CMS Five-Star
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {facility.medicaid_certified && (
                <Badge>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Medicaid certified
                </Badge>
              )}
              {facility.medicare_certified && (
                <Badge>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Medicare certified
                </Badge>
              )}
            </div>

            <section>
              <h2 className="text-lg font-semibold">Compliance & quality</h2>
              <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                <StarTile label="Overall" value={facility.cms_five_star_overall} />
                <StarTile label="Health inspection" value={facility.cms_five_star_health_inspection} />
                <StarTile label="Staffing" value={facility.cms_five_star_staffing} />
                <StarTile label="Quality measures" value={facility.cms_five_star_quality} />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Ratings sourced from CMS Nursing Home Compare (master data).
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">Availability</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Live bed availability — refreshed in real time from the facility.
              </p>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {Object.entries(facility.available_by_level).map(([level, count]) => (
                  <Card key={level}>
                    <CardContent className="p-4">
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">
                        {LEVEL_LABEL[level] ?? level}
                      </div>
                      <div className="mt-1 text-2xl font-semibold">{count}</div>
                    </CardContent>
                  </Card>
                ))}
                {Object.keys(facility.available_by_level).length === 0 && (
                  <p className="col-span-3 text-sm text-muted-foreground">
                    No beds currently available — waitlist only.
                  </p>
                )}
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold">Contact</h2>
              <div className="mt-3 space-y-2 text-sm">
                <div>
                  {facility.address_line_1}
                  {facility.address_line_2 && <>, {facility.address_line_2}</>}, {facility.city}, {facility.state} {facility.zip}
                </div>
                {facility.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    {facility.phone}
                  </div>
                )}
                {facility.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    {facility.email}
                  </div>
                )}
              </div>
            </section>
          </div>

          <aside>
            <Card className="sticky top-6">
              <CardContent className="p-6">
                <div className="flex items-baseline justify-between">
                  <div>
                    {monthly ? (
                      <>
                        <span className="text-2xl font-semibold">${monthly}</span>
                        <span className="text-sm text-muted-foreground"> /mo from</span>
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">Pricing on request</span>
                    )}
                  </div>
                  <span className="text-sm font-medium">
                    {facility.available_beds} bed{facility.available_beds === 1 ? "" : "s"} available
                  </span>
                </div>

                <Button className="mt-4 w-full" size="lg" onClick={() => setTourOpen(true)}>
                  <Calendar className="h-4 w-4" />
                  Request a tour
                </Button>
                <Button variant="outline" className="mt-2 w-full" asChild>
                  <Link to="/login">Save facility</Link>
                </Button>

                <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
                  <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  We don't sell your contact info. Only this facility sees it.
                </p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>

      <TourRequestDialog
        open={tourOpen}
        onClose={() => setTourOpen(false)}
        facilitySlug={facility.slug}
        facilityName={facility.name}
      />
    </div>
  )
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      {children}
    </span>
  )
}

function StarTile({ label, value }: { label: string; value: number | null }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="text-2xl font-semibold">{value ?? "—"}</span>
          {value && <span className="text-sm text-muted-foreground">/ 5</span>}
        </div>
      </CardContent>
    </Card>
  )
}

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

function TourRequestDialog({
  open,
  onClose,
  facilitySlug,
  facilityName,
}: {
  open: boolean
  onClose: () => void
  facilitySlug: string
  facilityName: string
}) {
  const [form, setForm] = useState({
    inquirer_name: "",
    inquirer_email: "",
    inquirer_phone: "",
    inquirer_relationship: "adult_child",
    prospect_first_name: "",
    prospect_last_name: "",
    prospect_level_of_care: "assisted",
    target_admit_date: "",
    notes: "",
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const reset = () => {
    setSuccess(false)
    setError(null)
    setForm({
      inquirer_name: "",
      inquirer_email: "",
      inquirer_phone: "",
      inquirer_relationship: "adult_child",
      prospect_first_name: "",
      prospect_last_name: "",
      prospect_level_of_care: "assisted",
      target_admit_date: "",
      notes: "",
    })
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await api.post("/marketplace/inquiries", {
        facility_slug: facilitySlug,
        ...form,
        target_admit_date: form.target_admit_date || undefined,
        notes: form.notes || undefined,
        inquirer_phone: form.inquirer_phone || undefined,
      })
      setSuccess(true)
    } catch (err) {
      const e = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }
      const first = e.response?.data?.errors ? Object.values(e.response.data.errors)[0]?.[0] : undefined
      setError(first ?? e.response?.data?.message ?? "Request failed")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          onClose()
          if (success) setTimeout(reset, 300)
        }
      }}
    >
      <DialogContent>
        {success ? (
          <div className="space-y-4 py-2 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-foreground" />
            <DialogHeader>
              <DialogTitle>Tour requested</DialogTitle>
              <DialogDescription>
                {facilityName} will reach out within 1 business day.
              </DialogDescription>
            </DialogHeader>
            <Button onClick={onClose}>Done</Button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>Request a tour — {facilityName}</DialogTitle>
              <DialogDescription>
                We share this info only with the facility. No spam calls, ever.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Field
                label="Your name"
                required
                value={form.inquirer_name}
                onChange={(v) => setForm((f) => ({ ...f, inquirer_name: v }))}
                colspan
              />
              <Field
                label="Email"
                type="email"
                required
                value={form.inquirer_email}
                onChange={(v) => setForm((f) => ({ ...f, inquirer_email: v }))}
              />
              <Field
                label="Phone"
                value={form.inquirer_phone}
                onChange={(v) => setForm((f) => ({ ...f, inquirer_phone: v }))}
              />
              <Select
                label="Relationship"
                value={form.inquirer_relationship}
                onChange={(v) => setForm((f) => ({ ...f, inquirer_relationship: v }))}
                options={[
                  { value: "self", label: "Self" },
                  { value: "spouse", label: "Spouse" },
                  { value: "adult_child", label: "Adult child" },
                  { value: "poa", label: "POA" },
                  { value: "hospital", label: "Hospital / planner" },
                  { value: "other", label: "Other" },
                ]}
              />
              <Select
                label="Level of care"
                value={form.prospect_level_of_care}
                onChange={(v) => setForm((f) => ({ ...f, prospect_level_of_care: v }))}
                options={[
                  { value: "independent", label: "Independent" },
                  { value: "assisted", label: "Assisted" },
                  { value: "memory", label: "Memory care" },
                  { value: "skilled", label: "Skilled nursing" },
                  { value: "hospice", label: "Hospice" },
                ]}
              />
              <Field
                label="Prospective resident — first name"
                required
                value={form.prospect_first_name}
                onChange={(v) => setForm((f) => ({ ...f, prospect_first_name: v }))}
              />
              <Field
                label="Last name"
                required
                value={form.prospect_last_name}
                onChange={(v) => setForm((f) => ({ ...f, prospect_last_name: v }))}
              />
              <Field
                label="Target move-in date"
                type="date"
                value={form.target_admit_date}
                onChange={(v) => setForm((f) => ({ ...f, target_admit_date: v }))}
                colspan
              />
              <div className="col-span-2">
                <label className="text-sm font-medium">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  placeholder="Anything you'd like the facility to know."
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            {error && (
              <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            <DialogFooter className="mt-4">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Send request
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Field({
  label,
  type = "text",
  required,
  value,
  onChange,
  colspan,
}: {
  label: string
  type?: string
  required?: boolean
  value: string
  onChange: (v: string) => void
  colspan?: boolean
}) {
  return (
    <div className={colspan ? "col-span-2" : undefined}>
      <label className="text-sm font-medium">{label}</label>
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

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-ring"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}
