import { useEffect, useState } from "react"
import { Loader2, Video, Building, Footprints, RefreshCw, Phone, Mail } from "lucide-react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface Tour {
  id: string
  starts_at: string
  duration_minutes: number
  tour_type: "in_person" | "virtual" | "self_guided"
  attendee_name: string
  attendee_email: string
  attendee_phone: string | null
  relationship_to_prospect: string | null
  prospect_first_name: string
  prospect_last_name: string
  prospect_level_of_care: string | null
  status: "confirmed" | "rescheduled" | "completed" | "no_show" | "cancelled"
  notes: string | null
}

const STATUS_STYLE: Record<Tour["status"], string> = {
  confirmed: "bg-foreground text-background",
  rescheduled: "bg-amber-500/20 text-amber-700",
  completed: "bg-muted text-muted-foreground",
  no_show: "bg-destructive/15 text-destructive",
  cancelled: "bg-muted-foreground/30 text-muted-foreground",
}

const TYPE_ICON = {
  in_person: Building,
  virtual: Video,
  self_guided: Footprints,
}

export function ToursPage() {
  const { user } = useAuth()
  const facilityId = user?.active_facility?.id

  const [tours, setTours] = useState<Tour[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<"upcoming" | "past" | "all">("upcoming")
  const [busyId, setBusyId] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!facilityId) return
    let alive = true
    setLoading(true)
    api
      .get<{ data: Tour[] }>("/facility/tours", {
        headers: { "X-Facility-Id": facilityId },
      })
      .then((r) => alive && setTours(r.data.data))
      .catch((err) => alive && setError(err.response?.data?.message ?? "Failed to load"))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [facilityId, tick])

  const now = Date.now()
  const filtered = tours.filter((t) => {
    const ts = new Date(t.starts_at).getTime()
    if (filter === "upcoming") return ts >= now && t.status !== "cancelled"
    if (filter === "past") return ts < now
    return true
  })

  const updateStatus = async (id: string, status: Tour["status"]) => {
    if (!facilityId) return
    setBusyId(id)
    try {
      const res = await api.put<{ data: Tour }>(
        `/facility/tours/${id}/status`,
        { status },
        { headers: { "X-Facility-Id": facilityId } }
      )
      setTours((all) => all.map((t) => (t.id === id ? res.data.data : t)))
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
        Select a facility from the switcher to view tour requests.
      </div>
    )
  }

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tour requests</h1>
          <p className="text-sm text-muted-foreground">
            {user?.active_facility?.name} · Live bookings from the marketplace.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setTick((t) => t + 1)} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="flex gap-1 border-b">
        {(["upcoming", "past", "all"] as const).map((f) => (
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
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {filter === "upcoming"
              ? "No upcoming tours."
              : "No tours match this filter."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => {
            const Icon = TYPE_ICON[t.tour_type]
            const when = new Date(t.starts_at)
            return (
              <Card key={t.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="rounded-md border bg-muted/30 p-2">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">
                            {t.prospect_first_name} {t.prospect_last_name}
                          </h3>
                          <span
                            className={cn(
                              "inline-flex rounded px-1.5 py-0.5 text-xs font-medium capitalize",
                              STATUS_STYLE[t.status]
                            )}
                          >
                            {t.status.replace("_", " ")}
                          </span>
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground capitalize">
                          {t.tour_type.replace("_", " ")} tour ·{" "}
                          {t.prospect_level_of_care && (
                            <>{t.prospect_level_of_care} care · </>
                          )}
                          {when.toLocaleString(undefined, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                    <div>
                      <div className="text-foreground">{t.attendee_name}</div>
                      <div className="capitalize">{t.relationship_to_prospect?.replace("_", " ")}</div>
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5" />
                        {t.attendee_email}
                      </div>
                      {t.attendee_phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5" />
                          {t.attendee_phone}
                        </div>
                      )}
                    </div>
                  </div>

                  {t.notes && (
                    <div className="mt-3 rounded-md bg-muted/30 px-3 py-2 text-sm">
                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Notes
                      </span>
                      <div className="mt-1">{t.notes}</div>
                    </div>
                  )}

                  {t.status === "confirmed" && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => updateStatus(t.id, "completed")}
                        disabled={busyId === t.id}
                      >
                        Mark completed
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus(t.id, "no_show")}
                        disabled={busyId === t.id}
                      >
                        No-show
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus(t.id, "cancelled")}
                        disabled={busyId === t.id}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
