import { useEffect, useState } from "react"
import { Bell, Clock, Loader2, Play, RefreshCw } from "lucide-react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface SavedSearchJob {
  enabled_searches: number
  last_run_at: string | null
  alerts_last_24h: number
  schedule: string
  command: string
}

interface Health {
  saved_search_alerts: SavedSearchJob
}

interface RunResult {
  command: string
  dry_run: boolean
  exit_code: number
  output: string
  completed_at: string
}

/**
 * Health + manual-trigger widget for scheduled artisan jobs. Lives on
 * the SuperAdmin dashboard so we can verify Railway's worker process
 * is firing schedule:run.
 *
 * If `last_run_at` is missing or older than expected, the worker is
 * probably not running — surface that as a warning.
 */
export function ScheduledJobsWidget() {
  const [health, setHealth] = useState<Health | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState<string | null>(null)
  const [lastRun, setLastRun] = useState<RunResult | null>(null)

  const load = () => {
    api
      .get<{ data: Health }>("/superadmin/scheduled-jobs/health")
      .then((r) => setHealth(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const runNow = async (command: string, dryRun: boolean) => {
    setRunning(command)
    setLastRun(null)
    try {
      const r = await api.post<{ data: RunResult }>(
        `/superadmin/scheduled-jobs/run/${command}${dryRun ? "?dry_run=1" : ""}`,
      )
      setLastRun(r.data.data)
      load()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setLastRun({
        command,
        dry_run: dryRun,
        exit_code: -1,
        output: err.response?.data?.message ?? "Run failed",
        completed_at: new Date().toISOString(),
      })
    } finally {
      setRunning(null)
    }
  }

  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        <Loader2 className="inline h-3 w-3 animate-spin" /> Loading scheduled-job health…
      </div>
    )
  }
  if (!health) return null

  const j = health.saved_search_alerts
  const stale = j.last_run_at
    ? (Date.now() - new Date(j.last_run_at).getTime()) / 3600_000 > 48
    : true

  return (
    <section className="rounded-lg border bg-card p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Scheduled jobs
        </h2>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          title="Refresh"
        >
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </div>

      <div className="mt-3 rounded-md border bg-background p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-violet-600" />
              <span className="text-sm font-semibold">Saved-search alerts</span>
              {stale && j.enabled_searches > 0 && (
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                  ⚠ Worker may be stalled
                </span>
              )}
            </div>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">
              {j.command} · {j.schedule}
            </p>
            <dl className="mt-3 grid grid-cols-3 gap-3 text-xs">
              <div>
                <dt className="text-muted-foreground">Enabled searches</dt>
                <dd className="mt-0.5 text-base font-semibold">{j.enabled_searches}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Last run</dt>
                <dd className="mt-0.5 text-base font-semibold">
                  <Clock className="mr-1 inline h-3 w-3" />
                  {fmtRelative(j.last_run_at)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Alerts (24h)</dt>
                <dd className="mt-0.5 text-base font-semibold">{j.alerts_last_24h}</dd>
              </div>
            </dl>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => runNow(j.command, true)}
              disabled={running === j.command}
            >
              {running === j.command ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
              Dry run
            </Button>
            <Button
              size="sm"
              onClick={() => runNow(j.command, false)}
              disabled={running === j.command}
            >
              {running === j.command ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
              Run now
            </Button>
          </div>
        </div>

        {lastRun && lastRun.command === j.command && (
          <div className="mt-3 rounded border bg-muted/30 p-3">
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-semibold">
                {lastRun.dry_run ? "Dry-run" : "Run"} result · exit {lastRun.exit_code}
              </span>
              <span className={cn(lastRun.exit_code === 0 ? "text-emerald-700" : "text-red-700")}>
                {lastRun.exit_code === 0 ? "✓ OK" : "✗ failed"}
              </span>
            </div>
            <pre className="mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap font-mono text-[10px] text-muted-foreground">
              {lastRun.output || "(no output)"}
            </pre>
          </div>
        )}
      </div>

      {stale && j.enabled_searches > 0 && (
        <p className="mt-3 text-xs text-amber-800">
          Last run is &gt; 48 hours ago. Confirm the Railway <code className="rounded bg-muted px-1">worker</code> service
          is deployed and running <code className="rounded bg-muted px-1">php artisan schedule:run</code>.
        </p>
      )}
    </section>
  )
}

function fmtRelative(iso: string | null): string {
  if (!iso) return "never"
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return "just now"
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`
  return `${Math.round(diff / 86400)}d ago`
}
