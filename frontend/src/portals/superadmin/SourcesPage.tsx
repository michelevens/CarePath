import { useEffect, useState, type FormEvent } from "react"
import {
  AlertTriangle,
  Building2,
  Check,
  Database,
  Download,
  Loader2,
  Map,
  Upload,
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
      <SchemaCatalog schemas={data.schemas ?? []} tierLabels={data.tier_labels ?? {}} />

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
}: {
  schemas: DataSourceSchemaRow[]
  tierLabels: Record<number, string>
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
}: {
  schema: DataSourceSchemaRow
  open: boolean
  onToggle: () => void
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
