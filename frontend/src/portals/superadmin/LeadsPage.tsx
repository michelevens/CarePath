import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Download, Loader2, Mail, Phone, Search as SearchIcon } from "lucide-react"
import { api } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Lead {
  id: string
  source: string
  status: string
  name: string | null
  email: string | null
  phone: string | null
  zip: string | null
  relationship_to_prospect: string | null
  context: Record<string, unknown> | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  facility_id: string | null
  created_at: string
  facility?: { id: string; name: string; slug: string } | null
}

interface Summary {
  total: number
  by_source: Record<string, number>
  this_week: number
  this_month: number
  with_phone_pct: number
}

interface Meta {
  total: number
  per_page: number
  current_page: number
  last_page: number
}

const SOURCE_LABEL: Record<string, string> = {
  guide_download: "Guide download",
  newsletter: "Newsletter signup",
  cost_projection: "Cost projection",
  saved_search: "Saved search",
  availability_alert: "Availability alert",
  other: "Other",
}

const STATUS_LABEL: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  converted: "Converted",
  unsubscribed: "Unsubscribed",
}

export function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [meta, setMeta] = useState<Meta | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [source, setSource] = useState("")
  const [status, setStatus] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    if (source) params.set("source", source)
    if (status) params.set("status", status)
    if (search) params.set("search", search)
    params.set("page", String(page))

    api
      .get<{ data: Lead[]; meta: Meta; summary: Summary }>(`/superadmin/leads?${params.toString()}`)
      .then((r) => {
        if (!alive) return
        setLeads(r.data.data)
        setMeta(r.data.meta)
        setSummary(r.data.summary)
      })
      .catch((e) =>
        alive && setError(e.response?.data?.message ?? "Failed to load leads.")
      )
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [source, status, search, page])

  const downloadCsv = () => {
    const params = new URLSearchParams()
    if (source) params.set("source", source)
    if (status) params.set("status", status)
    if (search) params.set("search", search)
    params.set("format", "csv")

    api
      .get(`/superadmin/leads?${params.toString()}`, { responseType: "blob" })
      .then((r) => {
        const blob = new Blob([r.data as BlobPart], { type: "text/csv" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `carepath-leads-${new Date().toISOString().slice(0, 10)}.csv`
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
      })
      .catch(() => setError("CSV download failed"))
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every email + phone captured across guide downloads, newsletter signups,
            cost projections, and tour-request leads.
          </p>
        </div>
        <Button onClick={downloadCsv} variant="outline" size="sm">
          <Download className="mr-1 h-4 w-4" />
          Export CSV
        </Button>
      </header>

      {summary && (
        <div className="grid gap-3 sm:grid-cols-4">
          <StatTile label="Total leads" value={summary.total.toLocaleString()} />
          <StatTile label="This week" value={summary.this_week.toLocaleString()} />
          <StatTile label="This month" value={summary.this_month.toLocaleString()} />
          <StatTile
            label="With phone"
            value={`${summary.with_phone_pct}%`}
            hint={summary.with_phone_pct < 80 ? "Some old leads pre-validation" : undefined}
          />
        </div>
      )}

      {summary && Object.keys(summary.by_source).length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              By source
            </h2>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {Object.entries(summary.by_source).map(([src, count]) => (
                <button
                  key={src}
                  onClick={() => setSource(source === src ? "" : src)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                    source === src
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground hover:border-primary hover:text-foreground"
                  )}
                >
                  <span>{SOURCE_LABEL[src] ?? src}</span>
                  <span className="opacity-70">{count}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                placeholder="Email, name, or phone…"
                className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm"
              />
            </div>
            <select
              value={source}
              onChange={(e) => {
                setSource(e.target.value)
                setPage(1)
              }}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">All sources</option>
              {Object.entries(SOURCE_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value)
                setPage(1)
              }}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">All statuses</option>
              {Object.entries(STATUS_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading leads…
            </div>
          ) : leads.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No leads matching these filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-left">
                    <th className="px-3 py-2 font-semibold">When</th>
                    <th className="px-3 py-2 font-semibold">Source</th>
                    <th className="px-3 py-2 font-semibold">Name</th>
                    <th className="px-3 py-2 font-semibold">Email</th>
                    <th className="px-3 py-2 font-semibold">Phone</th>
                    <th className="px-3 py-2 font-semibold">Context</th>
                    <th className="px-3 py-2 font-semibold">Facility</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id} className="border-b last:border-b-0 hover:bg-muted/20">
                      <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                        {new Date(lead.created_at).toLocaleString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <span className="inline-block rounded-full bg-accent/40 px-2 py-0.5 text-xs font-medium text-accent-foreground">
                          {SOURCE_LABEL[lead.source] ?? lead.source}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-top">{lead.name ?? "—"}</td>
                      <td className="px-3 py-2 align-top">
                        {lead.email ? (
                          <a
                            href={`mailto:${lead.email}`}
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            <Mail className="h-3 w-3" />
                            {lead.email}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2 align-top">
                        {lead.phone ? (
                          <a
                            href={`tel:${lead.phone}`}
                            className="inline-flex items-center gap-1 text-foreground hover:underline"
                          >
                            <Phone className="h-3 w-3" />
                            {lead.phone}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                        <LeadContext lead={lead} />
                      </td>
                      <td className="px-3 py-2 align-top text-xs">
                        {lead.facility ? (
                          <Link
                            to={`/superadmin/facilities/${lead.facility.slug}`}
                            className="text-primary hover:underline"
                          >
                            {lead.facility.name}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">
            Page {meta.current_page} of {meta.last_page} · {meta.total} total
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={meta.current_page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={meta.current_page >= meta.last_page}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function StatTile({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-2xl font-semibold tracking-tight">{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  )
}

function LeadContext({ lead }: { lead: Lead }) {
  const ctx = lead.context ?? {}
  const parts: string[] = []
  if (ctx.guide_title) parts.push(`📄 ${ctx.guide_title}`)
  if (ctx.care_type) parts.push(`Care: ${ctx.care_type}`)
  if (lead.relationship_to_prospect) parts.push(`Rel: ${lead.relationship_to_prospect}`)
  if (lead.zip) parts.push(`ZIP ${lead.zip}`)
  if (lead.utm_source) parts.push(`UTM: ${lead.utm_source}`)
  return parts.length > 0 ? <>{parts.join(" · ")}</> : <>—</>
}
