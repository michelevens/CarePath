import { useEffect, useState } from "react"
import { Loader2, Mail, Phone, RefreshCw, MapPin } from "lucide-react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface Lead {
  id: string
  source: "cost_projection" | "saved_search" | "availability_alert" | "newsletter" | "other"
  email: string
  phone: string | null
  name: string | null
  zip: string | null
  relationship_to_prospect: string | null
  context: Record<string, unknown> | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  referrer: string | null
  status: "new" | "contacted" | "converted" | "unsubscribed"
  contacted_at: string | null
  created_at: string
}

const STATUS_STYLE: Record<Lead["status"], string> = {
  new: "bg-foreground text-background",
  contacted: "bg-amber-500/20 text-amber-700",
  converted: "bg-muted text-muted-foreground",
  unsubscribed: "bg-muted-foreground/30 text-muted-foreground",
}

const SOURCE_LABEL: Record<Lead["source"], string> = {
  cost_projection: "Cost projection",
  saved_search: "Saved search",
  availability_alert: "Availability alert",
  newsletter: "Newsletter",
  other: "Other",
}

export function LeadsPage() {
  const { user } = useAuth()
  const facilityId = user?.active_facility?.id

  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<"new" | "all" | "contacted" | "converted">("new")
  const [busyId, setBusyId] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!facilityId) return
    let alive = true
    setLoading(true)
    setError(null)
    const params: Record<string, string> = {}
    if (filter !== "all") params.status = filter
    api
      .get<{ data: Lead[] }>("/facility/leads", {
        params,
        headers: { "X-Facility-Id": facilityId },
      })
      .then((r) => alive && setLeads(r.data.data))
      .catch((err) => alive && setError(err.response?.data?.message ?? "Failed to load"))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [facilityId, filter, tick])

  const updateStatus = async (id: string, status: Lead["status"]) => {
    if (!facilityId) return
    setBusyId(id)
    try {
      const res = await api.put<{ data: Lead }>(
        `/facility/leads/${id}/status`,
        { status },
        { headers: { "X-Facility-Id": facilityId } }
      )
      setLeads((all) => all.map((l) => (l.id === id ? res.data.data : l)))
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } }
      setError(e.response?.data?.message ?? "Update failed")
    } finally {
      setBusyId(null)
    }
  }

  if (!facilityId) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        Select a facility from the switcher to view leads.
      </div>
    )
  }

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="text-sm text-muted-foreground">
            {user?.active_facility?.name} · Marketplace prospects who haven't yet
            committed to a tour. Reach out before they go cold.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setTick((t) => t + 1)} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="flex gap-1 border-b">
        {(["new", "contacted", "converted", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "border-b-2 px-4 py-2 text-sm capitalize transition-colors",
              filter === f
                ? "border-foreground font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : leads.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No leads match this filter.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {leads.map((l) => (
            <Card key={l.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{l.name ?? l.email}</span>
                      <span
                        className={cn(
                          "inline-flex rounded px-1.5 py-0.5 text-xs font-medium capitalize",
                          STATUS_STYLE[l.status]
                        )}
                      >
                        {l.status}
                      </span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                        {SOURCE_LABEL[l.source]}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-muted-foreground md:grid-cols-2">
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5" />
                        {l.email}
                      </div>
                      {l.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5" />
                          {l.phone}
                        </div>
                      )}
                      {l.zip && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" />
                          {l.zip}
                        </div>
                      )}
                      <div>
                        Captured {new Date(l.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    {l.context && (
                      <details className="mt-3 text-xs">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          Context
                        </summary>
                        <pre className="mt-2 overflow-x-auto rounded bg-muted px-2 py-1 font-mono">
                          {JSON.stringify(l.context, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>

                {l.status !== "converted" && l.status !== "unsubscribed" && (
                  <div className="mt-3 flex gap-2">
                    {l.status === "new" && (
                      <Button
                        size="sm"
                        onClick={() => updateStatus(l.id, "contacted")}
                        disabled={busyId === l.id}
                      >
                        Mark contacted
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatus(l.id, "converted")}
                      disabled={busyId === l.id}
                    >
                      Convert
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => updateStatus(l.id, "unsubscribed")}
                      disabled={busyId === l.id}
                    >
                      Unsubscribe
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
