import { useEffect, useState, type FormEvent } from "react"
import { Link, useLocation } from "react-router-dom"
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Shield,
} from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Meta } from "@/components/Meta"
import { TrustStrip } from "@/components/TrustStrip"
import { CarePathGuideTemplate } from "@/components/CarePathGuideTemplate"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Person {
  name: string
  role: string
  bio: string
}

interface Guide {
  slug: string
  title: string
  subtitle: string
  description: string
  category: string
  page_count: number
  audience: string
  author: Person | null
  reviewer: Person | null
}

const CATEGORY_LABEL: Record<string, string> = {
  care_basics: "Care basics",
  medicare: "Medicare",
  medicaid: "Medicaid",
  va: "VA benefits",
  transition: "Tours & transitions",
  financial: "Financial planning",
  legal: "Legal",
  dementia: "Memory care",
}

export function GuidesPage() {
  const location = useLocation()
  const navState = location.state as { openGuide?: string } | null
  const requestedSlug = navState?.openGuide

  const [guides, setGuides] = useState<Guide[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Guide | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    api
      .get<{ data: Guide[] }>("/marketplace/guides")
      .then((r) => {
        if (!alive) return
        const list = Array.isArray(r.data?.data) ? r.data.data : []
        setGuides(list)
        // If we arrived from another page asking to open a specific guide,
        // auto-pop the dialog once the catalog is loaded.
        if (requestedSlug) {
          const hit = list.find((g) => g.slug === requestedSlug)
          if (hit) setSelected(hit)
        }
      })
      .catch(() => alive && setGuides([]))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [requestedSlug])

  return (
    <div className="min-h-screen bg-background">
      <Meta
        title="Free, branded long-term care guides — CarePath"
        description="Plain-English PDF guides on Medicare, Medicaid, VA Aid & Attendance, tours, and choosing assisted living. Email only — we don't sell your info."
        canonical="/guides"
      />

      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            CarePath
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
              Back home
            </Link>
          </Button>
        </div>
      </header>

      {/* Canonical guide showcase — the same template renders every
          downloadable guide (see [[carepath-guide-template]] memory). */}
      <CarePathGuideTemplate />

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border bg-accent/60 px-3 py-1 text-xs font-medium text-accent-foreground">
            <FileText className="h-3.5 w-3.5" />
            Free downloadable guides
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
            Plain-English guides, branded &amp; ready to print.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Email only. No phone calls. No advisors will be assigned to you.
            Each guide is researched, written by us, and updated when the rules
            change.
          </p>
        </div>
        <TrustStrip className="mt-8" />

        {loading ? (
          <div className="mt-12 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading guides…
          </div>
        ) : guides.length === 0 ? (
          <Card className="mt-12">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No guides available right now.
            </CardContent>
          </Card>
        ) : (
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {guides.map((g) => (
              <GuideCard key={g.slug} guide={g} onDownload={() => setSelected(g)} />
            ))}
          </div>
        )}

        <div className="mt-14 rounded-2xl border bg-muted/30 p-6 sm:p-8">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <h2 className="text-lg font-semibold">Don't see what you need?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                We add new guides every month. Tell us which topic to cover next.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link to="/tools">Browse our other tools</Link>
            </Button>
          </div>
        </div>
      </section>

      {selected && (
        <GuideDownloadDialog
          guide={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}

function GuideCard({ guide, onDownload }: { guide: Guide; onDownload: () => void }) {
  return (
    <Card className="hover-lift flex h-full flex-col">
      <CardContent className="flex flex-1 flex-col p-6">
        <div className="flex items-start justify-between gap-3">
          <span className="inline-block rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
            {CATEGORY_LABEL[guide.category] ?? guide.category}
          </span>
          <span className="text-xs text-muted-foreground">
            {guide.page_count} pages
          </span>
        </div>
        <h3 className="mt-4 text-lg font-semibold leading-tight tracking-tight">
          {guide.title}
        </h3>
        <p className="mt-2 text-sm font-medium text-muted-foreground">
          {guide.subtitle}
        </p>
        <p className="mt-3 flex-1 text-sm text-muted-foreground">
          {guide.description}
        </p>
        <div className="mt-5 border-t pt-4">
          {guide.author && (
            <div className="mb-3 text-xs text-muted-foreground">
              By <span className="font-medium text-foreground">{guide.author.name}</span>
              {guide.reviewer && (
                <> · Reviewed by <span className="font-medium text-foreground">{guide.reviewer.name}</span></>
              )}
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              For: <span className="font-medium text-foreground">{guide.audience}</span>
            </span>
            <div className="flex items-center gap-1.5">
              <Button asChild size="sm" variant="ghost">
                <Link to={`/guides/${guide.slug}`}>Preview</Link>
              </Button>
              <Button size="sm" onClick={onDownload}>
                <Download className="h-3.5 w-3.5" />
                Download
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function GuideDownloadDialog({
  guide,
  onClose,
}: {
  guide: Guide
  onClose: () => void
}) {
  const [email, setEmail] = useState("")
  const [zip, setZip] = useState("")
  const [careType, setCareType] = useState("")
  const [relationship, setRelationship] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await api.post(
        `/marketplace/guides/${guide.slug}/download`,
        {
          email,
          zip: zip || undefined,
          care_type: careType || undefined,
          relationship_to_prospect: relationship || undefined,
        },
        { responseType: "blob" }
      )
      // Trigger the browser download from the returned PDF blob.
      const blob = new Blob([res.data as BlobPart], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `carepath-${guide.slug}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 0)
      setDone(true)
    } catch (err) {
      // The server returns JSON errors even when we asked for a blob; parse it back.
      const e = err as { response?: { data?: Blob } }
      let message = "Download failed — try again."
      if (e.response?.data instanceof Blob) {
        try {
          const text = await e.response.data.text()
          const json = JSON.parse(text)
          message = json.errors
            ? Object.values(json.errors as Record<string, string[]>)[0]?.[0] ?? message
            : json.message ?? message
        } catch {
          // leave default message
        }
      }
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        {done ? (
          <div className="space-y-4 py-2 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
            <DialogHeader>
              <DialogTitle>Download started</DialogTitle>
              <DialogDescription>
                <span className="font-medium text-foreground">{guide.title}</span>
                <br />
                Check your downloads folder. We've also saved your email — we'll
                only send updates if you opt in.
              </DialogDescription>
            </DialogHeader>
            <Button onClick={onClose}>Done</Button>
          </div>
        ) : (
          <form onSubmit={onSubmit}>
            <DialogHeader>
              <DialogTitle>Download "{guide.title}"</DialogTitle>
              <DialogDescription>
                Email only — no phone calls, no advisor assignment, no
                facility cold-calls. {guide.page_count}-page PDF.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 grid gap-3">
              <Field
                label="Email"
                type="email"
                required
                value={email}
                onChange={setEmail}
                placeholder="you@example.com"
              />
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="ZIP (optional)"
                  value={zip}
                  onChange={(v) => setZip(v.replace(/\D/g, "").slice(0, 5))}
                  placeholder="85016"
                  maxLength={5}
                />
                <Select
                  label="Looking for (optional)"
                  value={careType}
                  onChange={setCareType}
                  options={[
                    { value: "", label: "Not sure yet" },
                    { value: "assisted_living", label: "Assisted Living" },
                    { value: "memory_care", label: "Memory Care" },
                    { value: "snf", label: "Skilled Nursing" },
                    { value: "ccrc", label: "Continuing Care" },
                    { value: "independent", label: "Independent Living" },
                  ]}
                />
              </div>
              <Select
                label="You are (optional)"
                value={relationship}
                onChange={setRelationship}
                options={[
                  { value: "", label: "Prefer not to say" },
                  { value: "self", label: "The person needing care" },
                  { value: "spouse", label: "Spouse / partner" },
                  { value: "adult_child", label: "Adult child" },
                  { value: "poa", label: "Power of attorney" },
                  { value: "hospital", label: "Hospital / discharge planner" },
                  { value: "other", label: "Other family / friend" },
                ]}
              />
            </div>

            <p className="mt-3 inline-flex items-start gap-2 text-xs text-muted-foreground">
              <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              We don't sell, share, or trade your email. Unsubscribe any time.
            </p>

            {error && (
              <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <DialogFooter className="mt-4">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !email}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                <Download className="h-4 w-4" />
                Download PDF
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
  placeholder,
  maxLength,
}: {
  label: string
  type?: string
  required?: boolean
  value: string
  onChange: (v: string) => void
  placeholder?: string
  maxLength?: number
}) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className={cn(
          "mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-ring"
        )}
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
