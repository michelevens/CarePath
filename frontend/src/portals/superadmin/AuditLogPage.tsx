import { useEffect, useState } from "react"
import { ChevronDown, ChevronRight, Loader2, RefreshCw } from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface LogRow {
  id: string
  occurred_at: string
  action: string
  auditable_type: string
  auditable_id: string
  facility_id: string | null
  user_id: number | null
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  ip_address: string | null
}

interface Paginated<T> {
  data: T[]
  current_page: number
  last_page: number
  total: number
  per_page: number
}

const ACTIONS = ["", "created", "updated", "deleted"]

const KNOWN_TYPES: Record<string, string> = {
  "App\\Models\\Payer": "Payer",
  "App\\Models\\LevelOfCare": "LevelOfCare",
  "App\\Models\\CredentialTemplate": "Credential",
  "App\\Models\\Facility": "Facility",
  "App\\Models\\Resident": "Resident",
  "App\\Models\\Bed": "Bed",
  "App\\Models\\State": "State",
  "App\\Models\\CmsFTag": "CmsFTag",
}

export function AuditLogPage() {
  const [logs, setLogs] = useState<LogRow[]>([])
  const [meta, setMeta] = useState<Omit<Paginated<LogRow>, "data"> | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionFilter, setActionFilter] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)

    const params: Record<string, string | number> = { page, per_page: 50 }
    if (actionFilter) params.action = actionFilter
    if (typeFilter) params.auditable_type = typeFilter

    api
      .get<Paginated<LogRow>>("/superadmin/audit-log", { params })
      .then((r) => {
        if (!alive) return
        setLogs(r.data.data)
        setMeta({
          current_page: r.data.current_page,
          last_page: r.data.last_page,
          total: r.data.total,
          per_page: r.data.per_page,
        })
      })
      .catch((err) => {
        if (alive) setError(err.response?.data?.message ?? "Failed to load")
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [page, actionFilter, typeFilter, tick])

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
          <p className="text-sm text-muted-foreground">
            Immutable record of every write to master data, facility data,
            residents, and beds.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setTick((t) => t + 1)}>
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Action</label>
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value)
              setPage(1)
            }}
            className="mt-1 block rounded-md border bg-background px-3 py-1.5 text-sm outline-hidden focus:ring-2 focus:ring-ring"
          >
            {ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a || "All"}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Model</label>
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value)
              setPage(1)
            }}
            className="mt-1 block rounded-md border bg-background px-3 py-1.5 text-sm outline-hidden focus:ring-2 focus:ring-ring"
          >
            <option value="">All</option>
            {Object.entries(KNOWN_TYPES).map(([fqn, label]) => (
              <option key={fqn} value={fqn}>
                {label}
              </option>
            ))}
          </select>
        </div>
        {meta && (
          <div className="ml-auto text-xs text-muted-foreground">
            {meta.total.toLocaleString()} total · page {meta.current_page}/{meta.last_page}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="w-8"></th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">When</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Action</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Model</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">User</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Facility</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">IP</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center">
                    <Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No entries match these filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isOpen = expanded.has(log.id)
                  return (
                    <RowFragment
                      key={log.id}
                      log={log}
                      isOpen={isOpen}
                      onToggle={() => toggleExpand(log.id)}
                    />
                  )
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={meta.current_page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {meta.current_page} of {meta.last_page}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={meta.current_page === meta.last_page}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}

function RowFragment({
  log,
  isOpen,
  onToggle,
}: {
  log: LogRow
  isOpen: boolean
  onToggle: () => void
}) {
  const hasDiff = log.before !== null || log.after !== null
  const typeLabel = KNOWN_TYPES[log.auditable_type] ?? log.auditable_type.split("\\").pop()

  return (
    <>
      <tr className="border-t hover:bg-muted/30">
        <td className="px-2 py-2 text-center">
          {hasDiff && (
            <button
              onClick={onToggle}
              className="text-muted-foreground hover:text-foreground"
            >
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          )}
        </td>
        <td className="px-4 py-2 text-xs text-muted-foreground">
          {new Date(log.occurred_at).toLocaleString()}
        </td>
        <td className="px-4 py-2">
          <ActionBadge action={log.action} />
        </td>
        <td className="px-4 py-2">
          <div className="font-medium">{typeLabel}</div>
          <div className="text-xs text-muted-foreground font-mono">
            {log.auditable_id.slice(0, 8)}…
          </div>
        </td>
        <td className="px-4 py-2 text-muted-foreground">{log.user_id ?? "—"}</td>
        <td className="px-4 py-2 text-xs text-muted-foreground font-mono">
          {log.facility_id ? log.facility_id.slice(0, 8) + "…" : "—"}
        </td>
        <td className="px-4 py-2 text-xs text-muted-foreground font-mono">
          {log.ip_address ?? "—"}
        </td>
      </tr>
      {isOpen && hasDiff && (
        <tr className="bg-muted/20">
          <td></td>
          <td colSpan={6} className="px-4 py-3">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <div className="mb-1 font-medium text-muted-foreground">Before</div>
                <pre className="overflow-x-auto rounded bg-background p-2 font-mono">
                  {log.before ? JSON.stringify(log.before, null, 2) : "(null)"}
                </pre>
              </div>
              <div>
                <div className="mb-1 font-medium text-muted-foreground">After</div>
                <pre className="overflow-x-auto rounded bg-background p-2 font-mono">
                  {log.after ? JSON.stringify(log.after, null, 2) : "(null)"}
                </pre>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function ActionBadge({ action }: { action: string }) {
  const style =
    action === "created"
      ? "bg-foreground text-background"
      : action === "deleted"
      ? "bg-destructive/15 text-destructive"
      : "bg-muted text-muted-foreground"
  return (
    <span className={cn("inline-flex rounded px-1.5 py-0.5 text-xs font-medium", style)}>
      {action}
    </span>
  )
}
