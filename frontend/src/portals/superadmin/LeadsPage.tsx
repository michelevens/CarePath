import { useEffect, useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import {
  Calendar,
  CheckCircle2,
  Download,
  ExternalLink,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Save,
  Search as SearchIcon,
  X,
} from "lucide-react"
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
  notes: string | null
  context: Record<string, unknown> | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  facility_id: string | null
  next_follow_up_at: string | null
  contacted_at: string | null
  assigned_user_id: number | null
  created_at: string
  facility?: { id: string; name: string; slug: string } | null
  activities?: LeadActivity[]
  assigned_user?: { id: number; name: string } | null
}

interface LeadActivity {
  id: string
  type: string
  body: string | null
  meta: Record<string, unknown> | null
  created_at: string
  actor?: { id: number; name: string } | null
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

const STATUS_PILL: Record<string, string> = {
  new: "border-violet-200 bg-violet-50 text-violet-800",
  contacted: "border-amber-200 bg-amber-50 text-amber-800",
  converted: "border-emerald-200 bg-emerald-50 text-emerald-800",
  unsubscribed: "border-stone-200 bg-stone-50 text-stone-700",
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

  // Drawer state — clicking a row opens the full lead detail in a
  // right-side drawer for status updates / notes / follow-up dates /
  // activity log. The detail loads fresh from /leads/{id} so the
  // activity log is current.
  const [openLeadId, setOpenLeadId] = useState<string | null>(null)
  const onLeadSaved = (updated: Lead) => {
    setLeads((rows) => rows.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)))
  }

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
                    <th className="px-3 py-2 font-semibold">Status</th>
                    <th className="px-3 py-2 font-semibold">Name</th>
                    <th className="px-3 py-2 font-semibold">Email</th>
                    <th className="px-3 py-2 font-semibold">Phone</th>
                    <th className="px-3 py-2 font-semibold">Context</th>
                    <th className="px-3 py-2 font-semibold">Follow-up</th>
                    <th className="px-3 py-2 font-semibold">Facility</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="cursor-pointer border-b last:border-b-0 hover:bg-muted/20"
                      onClick={() => setOpenLeadId(lead.id)}
                    >
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
                      <td className="px-3 py-2 align-top">
                        <span
                          className={cn(
                            "inline-block rounded-full border px-2 py-0.5 text-xs font-medium uppercase tracking-wide",
                            STATUS_PILL[lead.status] ?? "border-stone-200 bg-stone-50"
                          )}
                        >
                          {STATUS_LABEL[lead.status] ?? lead.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-top">{lead.name ?? "—"}</td>
                      <td className="px-3 py-2 align-top" onClick={(e) => e.stopPropagation()}>
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
                      <td className="px-3 py-2 align-top" onClick={(e) => e.stopPropagation()}>
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
                        {lead.next_follow_up_at ? (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1",
                              new Date(lead.next_follow_up_at) < new Date()
                                ? "text-rose-700"
                                : "text-foreground"
                            )}
                          >
                            <Calendar className="h-3 w-3" />
                            {new Date(lead.next_follow_up_at).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 align-top text-xs" onClick={(e) => e.stopPropagation()}>
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

      {openLeadId && (
        <LeadDrawer
          id={openLeadId}
          onClose={() => setOpenLeadId(null)}
          onSaved={onLeadSaved}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Lead detail drawer — opens when a row is clicked. Loads /leads/{id}
// fresh so the activity log is current. PATCHes back to /leads/{id}
// for status / notes / follow-up date / assignment changes.
// ─────────────────────────────────────────────────────────────────

function LeadDrawer({
  id,
  onClose,
  onSaved,
}: {
  id: string
  onClose: () => void
  onSaved: (lead: Lead) => void
}) {
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [statusDraft, setStatusDraft] = useState("")
  const [notesDraft, setNotesDraft] = useState("")
  const [followupDraft, setFollowupDraft] = useState("")

  useEffect(() => {
    let alive = true
    setLoading(true)
    api
      .get<{ data: Lead }>(`/superadmin/leads/${id}`)
      .then((r) => {
        if (!alive) return
        setLead(r.data.data)
        setStatusDraft(r.data.data.status)
        setNotesDraft(r.data.data.notes ?? "")
        setFollowupDraft(
          r.data.data.next_follow_up_at
            ? r.data.data.next_follow_up_at.slice(0, 10)
            : ""
        )
      })
      .catch((e) =>
        alive && setError(e.response?.data?.message ?? "Failed to load.")
      )
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [id])

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!lead) return
    setSaving(true)
    setError(null)
    try {
      const r = await api.patch<{ data: Lead }>(`/superadmin/leads/${id}`, {
        status: statusDraft,
        notes: notesDraft || null,
        next_follow_up_at: followupDraft || null,
      })
      setLead(r.data.data)
      onSaved(r.data.data)
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } }
      setError(err.response?.data?.message ?? "Save failed.")
    } finally {
      setSaving(false)
    }
  }

  const logCall = async () => {
    if (!lead) return
    const body = window.prompt("Call notes:")
    if (!body) return
    try {
      await api.post(`/superadmin/leads/${id}/activities`, {
        type: "call_logged",
        body,
      })
      const r = await api.get<{ data: Lead }>(`/superadmin/leads/${id}`)
      setLead(r.data.data)
    } catch {
      setError("Failed to log call.")
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/40"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-xl flex-col overflow-y-auto bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b p-5">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold truncate">
              {lead?.name ?? lead?.email ?? "Loading…"}
            </h2>
            {lead && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {lead.email} · {SOURCE_LABEL[lead.source] ?? lead.source} ·{" "}
                {new Date(lead.created_at).toLocaleString()}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {loading ? (
          <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading lead…
          </div>
        ) : !lead ? (
          <div className="p-6 text-sm text-red-700">{error ?? "No lead found."}</div>
        ) : (
          <>
            <div className="space-y-5 p-5">
              {lead.email && (
                <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a className="flex-1 truncate text-primary hover:underline" href={`mailto:${lead.email}`}>
                    {lead.email}
                  </a>
                </div>
              )}
              {lead.phone && (
                <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a className="flex-1 truncate text-foreground hover:underline" href={`tel:${lead.phone}`}>
                    {lead.phone}
                  </a>
                </div>
              )}
              {lead.facility && (
                <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  <Link
                    to={`/superadmin/facilities/${lead.facility.slug}`}
                    className="flex-1 truncate text-primary hover:underline"
                  >
                    {lead.facility.name}
                  </Link>
                </div>
              )}

              <form onSubmit={save} className="space-y-4">
                <div>
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(STATUS_LABEL).map(([v, l]) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setStatusDraft(v)}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                          statusDraft === v
                            ? STATUS_PILL[v]
                            : "border-stone-200 bg-card text-muted-foreground hover:border-foreground"
                        )}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Notes (latest)
                  </div>
                  <textarea
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    rows={4}
                    placeholder="Spoke at 2:15p. Looking for memory care, $5k/mo budget, FL panhandle. Will email comparison report."
                    className="w-full rounded-md border bg-background p-2 text-sm"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Each save appends to the activity log below.
                  </p>
                </div>

                <div>
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Next follow-up
                  </div>
                  <input
                    type="date"
                    value={followupDraft}
                    onChange={(e) => setFollowupDraft(e.target.value)}
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                  />
                </div>

                {error && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800">
                    {error}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
                  <Button type="button" variant="outline" size="sm" onClick={logCall}>
                    <Phone className="mr-1 h-3 w-3" /> Log call
                  </Button>
                  <Button type="submit" size="sm" disabled={saving}>
                    {saving ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <Save className="mr-1 h-3 w-3" />
                    )}
                    Save
                  </Button>
                </div>
              </form>
            </div>

            <div className="border-t bg-muted/20 p-5">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Activity
              </h3>
              {lead.activities && lead.activities.length > 0 ? (
                <ul className="space-y-3 text-sm">
                  {lead.activities.map((a) => (
                    <li key={a.id} className="flex items-start gap-3">
                      <ActivityIcon type={a.type} />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-muted-foreground">
                          {a.actor?.name ?? "system"} ·{" "}
                          {new Date(a.created_at).toLocaleString()}
                        </div>
                        <ActivityBody activity={a} />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No activity yet. Status changes, notes, calls, and webhook
                  fires will appear here.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function ActivityIcon({ type }: { type: string }) {
  const map: Record<string, React.ReactNode> = {
    status_change: <CheckCircle2 className="h-4 w-4 text-emerald-700" />,
    note: <MessageSquare className="h-4 w-4 text-violet-700" />,
    call_logged: <Phone className="h-4 w-4 text-amber-700" />,
    email_sent: <Mail className="h-4 w-4 text-blue-700" />,
    followup_set: <Calendar className="h-4 w-4 text-amber-700" />,
    webhook_sent: <ExternalLink className="h-4 w-4 text-muted-foreground" />,
    resend_synced: <Mail className="h-4 w-4 text-muted-foreground" />,
  }
  return (
    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-card">
      {map[type] ?? <MessageSquare className="h-4 w-4 text-muted-foreground" />}
    </div>
  )
}

function ActivityBody({ activity }: { activity: LeadActivity }) {
  if (activity.type === "status_change") {
    const m = activity.meta as Record<string, string> | null
    return (
      <p>
        Status: <strong>{STATUS_LABEL[m?.from ?? ""] ?? m?.from}</strong> →{" "}
        <strong>{STATUS_LABEL[m?.to ?? ""] ?? m?.to}</strong>
      </p>
    )
  }
  if (activity.type === "note") {
    return <p className="whitespace-pre-line">{activity.body}</p>
  }
  if (activity.type === "call_logged") {
    return <p className="whitespace-pre-line">Call logged: {activity.body}</p>
  }
  if (activity.type === "followup_set") {
    const m = activity.meta as Record<string, string | null> | null
    return (
      <p>
        Follow-up set for{" "}
        <strong>{m?.at ? new Date(m.at).toLocaleDateString() : "—"}</strong>
      </p>
    )
  }
  if (activity.type === "webhook_sent") {
    const m = activity.meta as Record<string, unknown> | null
    return (
      <p className="text-xs text-muted-foreground">
        Pushed to CRM webhook · status {String(m?.status_code ?? "?")}
      </p>
    )
  }
  if (activity.type === "resend_synced") {
    return (
      <p className="text-xs text-muted-foreground">
        Synced to Resend Audience for nurture sequence
      </p>
    )
  }
  return <p>{activity.body ?? activity.type}</p>
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
