import { useEffect, useState, type FormEvent } from "react"
import {
  AlertTriangle,
  Building2,
  Check,
  Database,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Mail,
  Map,
  Upload,
  Zap,
} from "lucide-react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { TYPE_LABEL, FACILITY_TYPES } from "@/lib/facilityTypes"

interface SourceRow {
  source: string
  facility_count: number
  state_count: number
  last_synced_at: string | null
  by_type: Record<string, number>
}

interface DataSourceSchemaRow {
  id: string
  source_key: string
  display_name: string
  state: string | null
  regulator: string | null
  access_tier: number
  update_frequency: string
  cost: string
  api_endpoint: string | null
  docs_url: string | null
  default_canonical_type: string | null
  default_license_subtype: string | null
  column_mappings: Record<string, string> | null
  access_instructions: string | null
  contact_email: string | null
  contact_phone: string | null
  last_imported_at: string | null
  last_imported_count: number | null
}

interface SourcesPayload {
  sources: SourceRow[]
  totals: {
    facility_count: number
    by_type: Record<string, number>
  }
  schemas: DataSourceSchemaRow[]
  tier_labels: Record<number, string>
}

const STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
]

function timeAgo(iso: string | null) {
  if (!iso) return "never"
  const ms = Date.now() - new Date(iso).getTime()
  const hours = Math.floor(ms / 3_600_000)
  if (hours < 1) return "just now"
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

export function SourcesPage() {
  const [data, setData] = useState<SourcesPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    api
      .get<{ data: SourcesPayload }>("/superadmin/sources")
      .then((r) => setData(r.data?.data ?? null))
      .catch((e: unknown) => {
        const err = e as { response?: { data?: { message?: string } } }
        setError(err.response?.data?.message ?? "Failed to load sources")
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  if (loading && !data) {
    return <div className="p-8 text-sm text-muted-foreground">Loading source statistics…</div>
  }
  if (error) {
    return (
      <div className="p-8">
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      </div>
    )
  }
  if (!data) return null

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Facility data sources</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Where the facilities in CarePath came from, and how to pull more.
          {data.totals.facility_count.toLocaleString()} facilities total.
        </p>
      </div>

      {/* Type-coverage strip — at-a-glance health of each facility type */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-3 text-sm font-semibold">Coverage by type</div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {FACILITY_TYPES.map((t) => {
              const count = data.totals.by_type[t] ?? 0
              const empty = count === 0
              return (
                <div
                  key={t}
                  className={`rounded-md border p-3 text-center ${
                    empty ? "border-dashed border-stone-300 bg-stone-50/40 text-stone-500" : ""
                  }`}
                >
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    {TYPE_LABEL[t]}
                  </div>
                  <div className="mt-1 text-xl font-semibold tabular-nums">
                    {count.toLocaleString()}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Sources table */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center gap-2 border-b p-4">
            <Database className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Sources</h2>
            <span className="ml-auto text-xs text-muted-foreground">
              {data.sources.length} active source{data.sources.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Source</th>
                  <th className="px-4 py-2 text-right font-medium">Facilities</th>
                  <th className="px-4 py-2 text-right font-medium">States</th>
                  <th className="px-4 py-2 text-left font-medium">Top types</th>
                  <th className="px-4 py-2 text-left font-medium">Last synced</th>
                </tr>
              </thead>
              <tbody>
                {data.sources.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No facilities ingested yet. Use the panels below to pull data.
                    </td>
                  </tr>
                )}
                {data.sources.map((s) => {
                  const top = Object.entries(s.by_type)
                    .filter(([, n]) => n > 0)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                  return (
                    <tr key={s.source} className="border-b last:border-b-0">
                      <td className="px-4 py-3">
                        <div className="inline-flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono text-xs">{s.source}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {s.facility_count.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{s.state_count}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {top.map(([t, n]) => `${TYPE_LABEL[t] ?? t}: ${n.toLocaleString()}`).join(" · ") || "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {timeAgo(s.last_synced_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Run panels */}
      <div className="grid gap-4 lg:grid-cols-3">
        <CmsRunPanel onDone={load} />
        <OsmRunPanel onDone={load} />
        <CsvUploadPanel schemas={data.schemas ?? []} onDone={load} />
      </div>

      {/* Reference catalog — per-source detail panels */}
      <SchemaCatalog
        schemas={data.schemas ?? []}
        tierLabels={data.tier_labels ?? {}}
        onChange={load}
      />

      {/* CCLD county-by-county helper for California */}
      <CcldWorklist />

      {/* Public Records Request tracker (Tier 4 sources) */}
      <PrrTracker schemas={data.schemas ?? []} />

      <div className="rounded-md border bg-muted/30 p-4 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">National-scale runs</p>
        <p className="mt-1">
          The per-state buttons here are bounded to fit inside the HTTP timeout.
          For full-country pulls, run from the worker:
        </p>
        <pre className="mt-2 overflow-x-auto rounded bg-stone-900 p-2 text-stone-100">
          railway run --service=worker php artisan cms:ingest{"\n"}
          railway run --service=worker php artisan facilities:ingest-osm --state=ALL --limit=500
        </pre>
      </div>
    </div>
  )
}

// ─── Source-specific run panels ───────────────────────────────────────────────

function CmsRunPanel({ onDone }: { onDone: () => void }) {
  const [state, setState] = useState("FL")
  const [max, setMax] = useState(500)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const run = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setResult(null)
    setErr(null)
    try {
      const r = await api.post<{ ok: boolean; result?: { upserted?: number; skipped?: number } }>(
        "/superadmin/sources/cms/run",
        { state, max },
      )
      const ups = r.data?.result?.upserted ?? 0
      const skp = r.data?.result?.skipped ?? 0
      setResult(`${ups} upserted, ${skp} skipped`)
      onDone()
    } catch (e) {
      const error = e as { response?: { data?: { error?: string; message?: string } } }
      setErr(error.response?.data?.error ?? error.response?.data?.message ?? "Run failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center gap-2">
          <Download className="h-4 w-4 text-violet-700" />
          <h3 className="text-sm font-semibold">CMS Nursing Home Compare</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Federal SNF data with Five-Star ratings + ownership + bed counts.
          SNFs only — federal data doesn't cover ALF / IL / group homes.
        </p>
        <form onSubmit={run} className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="h-9 rounded-md border bg-background px-2 text-sm"
            >
              {STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              max={2000}
              value={max}
              onChange={(e) => setMax(parseInt(e.target.value || "500"))}
              className="h-9 rounded-md border bg-background px-2 text-sm"
            />
          </div>
          <Button type="submit" disabled={busy} className="w-full gap-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Run for {state}
          </Button>
        </form>
        <Result ok={result} err={err} />
      </CardContent>
    </Card>
  )
}

function OsmRunPanel({ onDone }: { onDone: () => void }) {
  const [state, setState] = useState("FL")
  const [limit, setLimit] = useState(200)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const run = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setResult(null)
    setErr(null)
    try {
      const r = await api.post<{ ok: boolean; result?: { upserted?: number; skipped?: number } }>(
        "/superadmin/sources/osm/run",
        { state, limit },
      )
      const ups = r.data?.result?.upserted ?? 0
      const skp = r.data?.result?.skipped ?? 0
      setResult(`${ups} upserted, ${skp} skipped`)
      onDone()
    } catch (e) {
      const error = e as { response?: { data?: { error?: string; message?: string } } }
      setErr(error.response?.data?.error ?? error.response?.data?.message ?? "Run failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center gap-2">
          <Map className="h-4 w-4 text-violet-700" />
          <h3 className="text-sm font-semibold">OpenStreetMap</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          ALF / memory care / CCRC from OSM Overpass. Free + wide coverage but
          no licensure data, no Five-Star. Be polite — limit per call.
        </p>
        <form onSubmit={run} className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="h-9 rounded-md border bg-background px-2 text-sm"
            >
              {STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              max={500}
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value || "200"))}
              className="h-9 rounded-md border bg-background px-2 text-sm"
            />
          </div>
          <Button type="submit" disabled={busy} className="w-full gap-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Map className="h-4 w-4" />}
            Run for {state}
          </Button>
        </form>
        <Result ok={result} err={err} />
      </CardContent>
    </Card>
  )
}

function CsvUploadPanel({
  schemas,
  onDone,
}: {
  schemas: DataSourceSchemaRow[]
  onDone: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [state, setState] = useState("FL")
  const [source, setSource] = useState(schemas[0]?.source_key ?? "manual_upload")
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const run = async (e: FormEvent) => {
    e.preventDefault()
    if (!file) {
      setErr("Pick a CSV first")
      return
    }
    setBusy(true)
    setResult(null)
    setErr(null)
    const form = new FormData()
    form.append("file", file)
    form.append("state", state)
    form.append("source", source)
    try {
      const r = await api.post<{ ok: boolean; output?: string }>(
        "/superadmin/sources/csv/upload",
        form,
        { headers: { "Content-Type": "multipart/form-data" } },
      )
      const out = r.data?.output ?? "Done."
      const tail = out.trim().split("\n").pop() ?? "Done."
      setResult(tail)
      setFile(null)
      onDone()
    } catch (e) {
      const error = e as { response?: { data?: { output?: string; message?: string } } }
      setErr(error.response?.data?.message ?? error.response?.data?.output ?? "Upload failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center gap-2">
          <Upload className="h-4 w-4 text-violet-700" />
          <h3 className="text-sm font-semibold">State licensure CSV</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Upload a state file (FL AHCA, TX HHS, CA DSS, WA AFH registry…).
          Required columns: name, license_no, type, address, city, state, zip.
        </p>
        <form onSubmit={run} className="space-y-2">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-xs file:mr-3 file:rounded-md file:border-0 file:bg-violet-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-violet-700 hover:file:bg-violet-100"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="h-9 rounded-md border bg-background px-2 text-sm"
            >
              {STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="h-9 rounded-md border bg-background px-2 text-sm"
            >
              {schemas.map((s) => (
                <option key={s.source_key} value={s.source_key}>
                  {s.display_name}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" disabled={busy || !file} className="w-full gap-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload + ingest
          </Button>
        </form>
        <Result ok={result} err={err} />
      </CardContent>
    </Card>
  )
}

// ─── Schema catalog (per-source reference panels) ─────────────────────────────

function SchemaCatalog({
  schemas,
  tierLabels,
  onChange,
}: {
  schemas: DataSourceSchemaRow[]
  tierLabels: Record<number, string>
  onChange: () => void
}) {
  const [openId, setOpenId] = useState<string | null>(null)
  const byTier = schemas.reduce<Record<number, DataSourceSchemaRow[]>>((acc, s) => {
    ;(acc[s.access_tier] ??= []).push(s)
    return acc
  }, {})

  if (schemas.length === 0) return null

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div>
          <h2 className="text-sm font-semibold">Source reference catalog</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            What each source publishes, how to access it, what columns we map.
            Tier 1 sources are automated; Tier 3-4 require manual download or
            public records requests.
          </p>
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((tier) => {
            const list = byTier[tier] ?? []
            if (list.length === 0) return null
            return (
              <div key={tier}>
                <div className="mb-2 flex items-center gap-2">
                  <TierBadge tier={tier} />
                  <span className="text-xs text-muted-foreground">
                    {tierLabels[tier]}
                  </span>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {list.map((s) => (
                    <SchemaCard
                      key={s.source_key}
                      schema={s}
                      open={openId === s.id}
                      onToggle={() => setOpenId(openId === s.id ? null : s.id)}
                      onChange={onChange}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function TierBadge({ tier }: { tier: number }) {
  const palette: Record<number, string> = {
    1: "bg-emerald-100 text-emerald-800",
    2: "bg-violet-100 text-violet-800",
    3: "bg-amber-100 text-amber-800",
    4: "bg-destructive/10 text-destructive",
  }
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide ${
        palette[tier] ?? "bg-stone-100 text-stone-700"
      }`}
    >
      TIER {tier}
    </span>
  )
}

function SchemaCard({
  schema,
  open,
  onToggle,
  onChange,
}: {
  schema: DataSourceSchemaRow
  open: boolean
  onToggle: () => void
  onChange: () => void
}) {
  return (
    <div className="rounded-md border bg-background">
      <button
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-3 p-3 text-left hover:bg-muted/30"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{schema.display_name}</span>
            {schema.state && (
              <span className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[10px]">
                {schema.state}
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
            <span>updates {schema.update_frequency.replace(/_/g, " ")}</span>
            <span>·</span>
            <span>{schema.cost.replace(/_/g, " ")}</span>
            {schema.regulator && (
              <>
                <span>·</span>
                <span>{schema.regulator}</span>
              </>
            )}
            {schema.last_imported_at && (
              <>
                <span>·</span>
                <span>
                  last import {new Date(schema.last_imported_at).toLocaleDateString()}
                  {schema.last_imported_count != null && ` (${schema.last_imported_count} rows)`}
                </span>
              </>
            )}
          </div>
        </div>
        <span className="text-xs text-muted-foreground">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="space-y-3 border-t bg-muted/10 p-3 text-xs">
          {schema.access_instructions && (
            <div>
              <div className="mb-1 font-semibold text-foreground">How to access</div>
              <pre className="whitespace-pre-wrap font-sans text-muted-foreground">
                {schema.access_instructions}
              </pre>
            </div>
          )}
          {(schema.contact_email || schema.contact_phone) && (
            <div className="text-muted-foreground">
              {schema.contact_email && (
                <div>
                  Email:{" "}
                  <a
                    href={`mailto:${schema.contact_email}`}
                    className="text-violet-700 hover:underline"
                  >
                    {schema.contact_email}
                  </a>
                </div>
              )}
              {schema.contact_phone && <div>Phone: {schema.contact_phone}</div>}
            </div>
          )}
          {schema.docs_url && (
            <div>
              <a
                href={schema.docs_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-700 hover:underline"
              >
                Docs / source ↗
              </a>
            </div>
          )}
          {schema.column_mappings && Object.keys(schema.column_mappings).length > 0 && (
            <div>
              <div className="mb-1 font-semibold text-foreground">
                Column mapping ({Object.keys(schema.column_mappings).length})
              </div>
              <div className="max-h-40 overflow-y-auto rounded border bg-background p-2">
                <table className="w-full text-[11px]">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="pr-2 text-left font-medium">Their column</th>
                      <th className="text-left font-medium">→ our column</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(schema.column_mappings).map(([k, v]) => (
                      <tr key={k}>
                        <td className="pr-2 font-mono">{k}</td>
                        <td className="font-mono text-violet-700">{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {schema.default_canonical_type && (
            <div className="text-muted-foreground">
              All rows default to canonical type{" "}
              <code className="rounded bg-stone-100 px-1">
                {schema.default_canonical_type}
              </code>
              {schema.default_license_subtype && (
                <>
                  {" "}
                  · subtype{" "}
                  <code className="rounded bg-stone-100 px-1">
                    {schema.default_license_subtype}
                  </code>
                </>
              )}
              .
            </div>
          )}

          {/* Action buttons — tier-specific. Tier 1 with api_endpoint
              gets a "Run now" button (Socrata); Tier 4 with contact_email
              gets a "File PRR" mailto helper. */}
          <SchemaActions schema={schema} onChange={onChange} />
        </div>
      )}
    </div>
  )
}

function Result({ ok, err }: { ok: string | null; err: string | null }) {
  if (!ok && !err) return null
  if (err) {
    return (
      <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>{err}</span>
      </div>
    )
  }
  return (
    <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-800">
      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{ok}</span>
    </div>
  )
}

// ─── SchemaActions: per-tier run/PRR buttons inside schema cards ──────────────

function SchemaActions({
  schema,
  onChange,
}: {
  schema: DataSourceSchemaRow
  onChange: () => void
}) {
  // Built-in adapters already have their own panels at the top; skip
  // to avoid duplicate buttons.
  if (schema.source_key === "cms_pdc" || schema.source_key === "osm_overpass") {
    return null
  }

  // Tier 1 with api_endpoint = Socrata-runnable.
  if (schema.access_tier === 1 && schema.api_endpoint) {
    return <SocrataRunButton schema={schema} onChange={onChange} />
  }

  // Tier 4 with contact_email = PRR-fileable.
  if (schema.access_tier === 4 && schema.contact_email) {
    return <PrrFileButton schema={schema} onChange={onChange} />
  }

  return null
}

function SocrataRunButton({
  schema,
  onChange,
}: {
  schema: DataSourceSchemaRow
  onChange: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const run = async () => {
    setBusy(true)
    setResult(null)
    setErr(null)
    try {
      const r = await api.post<{ result?: { upserted?: number; skipped?: number; rejected?: number } }>(
        "/superadmin/sources/socrata/run",
        { source_key: schema.source_key },
      )
      const x = r.data?.result ?? {}
      setResult(`${x.upserted ?? 0} upserted, ${x.skipped ?? 0} skipped, ${x.rejected ?? 0} rejected`)
      onChange()
    } catch (e) {
      const error = e as { response?: { data?: { error?: string; message?: string } } }
      setErr(error.response?.data?.error ?? error.response?.data?.message ?? "Run failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button onClick={run} disabled={busy} size="sm" className="gap-2">
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
        Run now (Socrata API)
      </Button>
      <Result ok={result} err={err} />
    </div>
  )
}

function PrrFileButton({
  schema,
  onChange,
}: {
  schema: DataSourceSchemaRow
  onChange: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const file = async () => {
    setBusy(true)
    setErr(null)
    try {
      // 1. Get a pre-filled template from the backend.
      const tpl = await api.get<{
        data: {
          source_key: string
          contact_email: string
          subject: string
          body: string
          follow_up_days: number
        }
      }>(`/superadmin/prr/template/${schema.source_key}`)
      const t = tpl.data.data
      // 2. Open user's mail client with the pre-filled message.
      const mailto = `mailto:${encodeURIComponent(t.contact_email)}?subject=${encodeURIComponent(
        t.subject,
      )}&body=${encodeURIComponent(t.body)}`
      window.open(mailto, "_blank")
      // 3. Persist the bookkeeping so it shows up in the PRR tracker.
      await api.post("/superadmin/prr", {
        source_key: t.source_key,
        contact_email: t.contact_email,
        subject: t.subject,
        body: t.body,
        follow_up_days: t.follow_up_days,
      })
      setDone(true)
      onChange()
    } catch (e) {
      const error = e as { response?: { data?: { message?: string } } }
      setErr(error.response?.data?.message ?? "Failed to file")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2 border-t pt-2">
      <Button onClick={file} disabled={busy || done} size="sm" className="gap-2">
        {done ? <Check className="h-3 w-3" /> : busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3" />}
        {done ? "Filed — check tracker below" : "File Public Records Request"}
      </Button>
      <p className="text-[11px] text-muted-foreground">
        Opens your mail client with a pre-filled template + records the
        filing in the PRR tracker with a 30-day follow-up reminder.
      </p>
      {err && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
          {err}
        </div>
      )}
    </div>
  )
}

// ─── CCLD California county worklist ──────────────────────────────────────────

interface CcldCounty {
  county: string
  rcfe_search_url: string
  facility_count_ingested: number
}

function CcldWorklist() {
  const [items, setItems] = useState<CcldCounty[]>([])
  const [summary, setSummary] = useState<{ total_counties: number; covered: number; remaining: number; total_ingested: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    api
      .get<{ data: CcldCounty[]; summary: typeof summary }>("/superadmin/sources/ccld/worklist")
      .then((r) => {
        setItems(r.data?.data ?? [])
        setSummary(r.data?.summary ?? null)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return null
  if (items.length === 0) return null

  const visible = showAll ? items : items.filter((i) => i.facility_count_ingested === 0).slice(0, 12)

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">California CCLD — county worklist</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              CCLD blocks bulk download — but the per-county search URL
              pre-fills the form. Click each county → search → export →
              upload. Progress tracked by counting CA facilities with
              data_source=ca_cdss per county.
            </p>
          </div>
          {summary && (
            <div className="text-right text-xs">
              <div className="font-semibold tabular-nums">
                {summary.covered} / {summary.total_counties}
              </div>
              <div className="text-muted-foreground">counties covered</div>
              <div className="mt-1 text-muted-foreground">
                {summary.total_ingested.toLocaleString()} facilities
              </div>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((c) => (
            <a
              key={c.county}
              href={c.rcfe_search_url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center justify-between gap-2 rounded-md border p-2 text-xs hover:bg-muted/40 ${
                c.facility_count_ingested > 0
                  ? "border-emerald-200 bg-emerald-50/50"
                  : ""
              }`}
            >
              <span className="truncate">{c.county}</span>
              <span className="flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground">
                {c.facility_count_ingested > 0 && (
                  <span className="rounded-full bg-emerald-200 px-1.5 py-0.5 font-medium text-emerald-900">
                    {c.facility_count_ingested}
                  </span>
                )}
                <ExternalLink className="h-3 w-3" />
              </span>
            </a>
          ))}
        </div>
        <button
          onClick={() => setShowAll((v) => !v)}
          className="text-xs text-violet-700 hover:underline"
        >
          {showAll ? "Show only remaining" : `Show all ${items.length} counties`}
        </button>
      </CardContent>
    </Card>
  )
}

// ─── PRR (Public Records Request) tracker ─────────────────────────────────────

interface PrrRow {
  id: string
  source_key: string
  source_display: string | null
  contact_email: string
  subject: string
  filed_at: string
  follow_up_on: string
  response_received_at: string | null
  is_open: boolean
  is_overdue: boolean
  notes: string | null
}

function PrrTracker({ schemas }: { schemas: DataSourceSchemaRow[] }) {
  const [items, setItems] = useState<PrrRow[]>([])
  const [summary, setSummary] = useState<{ open: number; overdue: number; total: number } | null>(null)
  const [loading, setLoading] = useState(true)
  // intentionally unused for now — schemas might be referenced by a future
  // "file new PRR for source X" button on this card.
  void schemas

  const load = () => {
    setLoading(true)
    api
      .get<{ data: PrrRow[]; summary: typeof summary }>("/superadmin/prr")
      .then((r) => {
        setItems(r.data?.data ?? [])
        setSummary(r.data?.summary ?? null)
      })
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const markReceived = async (id: string) => {
    await api.post(`/superadmin/prr/${id}/mark-received`)
    load()
  }

  if (loading) return null
  // Show the section even with zero rows so SuperAdmins know it exists.

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <FileText className="h-4 w-4" />
              Public Records Requests
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Tier-4 sources (FL APD, similar). Filed PRRs land here so
              you don't lose track of who owes a response.
            </p>
          </div>
          {summary && (
            <div className="flex gap-2 text-xs">
              <span className="rounded-full bg-stone-100 px-2 py-0.5">
                {summary.open} open
              </span>
              {summary.overdue > 0 && (
                <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-destructive">
                  {summary.overdue} overdue
                </span>
              )}
            </div>
          )}
        </div>
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No PRRs filed yet. Use the "File Public Records Request" button on a
            Tier-4 source card above.
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((p) => (
              <li
                key={p.id}
                className={`rounded-md border p-2.5 text-xs ${
                  p.is_overdue ? "border-destructive/30 bg-destructive/5" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{p.source_display ?? p.source_key}</div>
                    <div className="text-muted-foreground">
                      Sent to{" "}
                      <a href={`mailto:${p.contact_email}`} className="text-violet-700 hover:underline">
                        {p.contact_email}
                      </a>{" "}
                      on {new Date(p.filed_at).toLocaleDateString()} ·{" "}
                      Follow up by {new Date(p.follow_up_on).toLocaleDateString()}
                      {p.is_overdue && (
                        <span className="ml-1 font-medium text-destructive">— OVERDUE</span>
                      )}
                    </div>
                  </div>
                  {p.is_open ? (
                    <Button size="sm" variant="outline" onClick={() => markReceived(p.id)} className="gap-1">
                      <Check className="h-3 w-3" />
                      Mark received
                    </Button>
                  ) : (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
                      ✓ received
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
