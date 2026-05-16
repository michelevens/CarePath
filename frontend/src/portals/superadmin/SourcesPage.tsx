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

interface SourcesPayload {
  sources: SourceRow[]
  totals: {
    facility_count: number
    by_type: Record<string, number>
  }
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
        <CsvUploadPanel onDone={load} />
      </div>

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

function CsvUploadPanel({ onDone }: { onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [state, setState] = useState("FL")
  const [source, setSource] = useState("fl_ahca")
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
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="source tag"
              className="h-9 rounded-md border bg-background px-2 text-sm"
            />
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
