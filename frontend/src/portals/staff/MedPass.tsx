import { useEffect, useMemo, useState } from "react"
import { Check, Clock, Loader2, Pill, RefreshCw, X, Pause, AlertCircle } from "lucide-react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface Slot {
  time: string
  event: {
    id: string
    status: "given" | "refused" | "held" | "missed"
    administered_at: string
    administered_by_name: string | null
  } | null
}

interface Med {
  id: string
  name: string
  dose: string | null
  route: string | null
  frequency: string | null
  indication: string | null
  is_prn: boolean
  slots: Slot[]
}

interface ResidentRow {
  id: string
  first_name: string
  last_name: string
  level_of_care: string | null
  mrn: string | null
  room: string | null
  medications: Med[]
}

const STATUS_STYLE: Record<NonNullable<Slot["event"]>["status"], string> = {
  given: "bg-foreground text-background",
  refused: "bg-amber-500/20 text-amber-700",
  held: "bg-muted-foreground/25 text-muted-foreground",
  missed: "bg-destructive/15 text-destructive",
}

const STATUS_ICON: Record<NonNullable<Slot["event"]>["status"], React.ComponentType<{ className?: string }>> = {
  given: Check,
  refused: X,
  held: Pause,
  missed: AlertCircle,
}

export function MedPass() {
  const { user } = useAuth()
  const facilityId = user?.active_facility?.id

  const [residents, setResidents] = useState<ResidentRow[]>([])
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const [filter, setFilter] = useState<"all" | "due" | "outstanding">("outstanding")

  useEffect(() => {
    if (!facilityId) return
    let alive = true
    setLoading(true)
    setError(null)
    api
      .get<{ date: string; data: ResidentRow[] }>("/facility/medications/today", {
        params: { date },
        headers: { "X-Facility-Id": facilityId },
      })
      .then((r) => alive && setResidents(r.data.data))
      .catch((err) => alive && setError(err.response?.data?.message ?? "Failed to load"))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [facilityId, date, tick])

  const stats = useMemo(() => {
    let scheduled = 0
    let given = 0
    let outstanding = 0
    residents.forEach((r) => {
      r.medications.forEach((m) => {
        m.slots.forEach((s) => {
          scheduled++
          if (s.event?.status === "given") given++
          else if (!s.event) outstanding++
        })
      })
    })
    return { scheduled, given, outstanding }
  }, [residents])

  const filtered = useMemo(() => {
    if (filter === "all") return residents
    return residents.filter((r) =>
      r.medications.some((m) => {
        if (m.slots.length === 0) return false
        if (filter === "outstanding") return m.slots.some((s) => !s.event)
        if (filter === "due") return m.slots.some((s) => !s.event && slotIsDue(s.time))
        return true
      })
    )
  }, [residents, filter])

  const administer = async (
    medId: string,
    status: "given" | "refused" | "held" | "missed",
    scheduledTime: string
  ) => {
    if (!facilityId) return
    const key = `${medId}|${scheduledTime}`
    setBusyKey(key)
    setError(null)
    try {
      await api.post(
        `/facility/medications/${medId}/administer`,
        { status, scheduled_time: scheduledTime, scheduled_date: date },
        { headers: { "X-Facility-Id": facilityId } }
      )
      setTick((t) => t + 1)
    } catch (err) {
      setError(
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? "Failed"
      )
    } finally {
      setBusyKey(null)
    }
  }

  if (!facilityId) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        Select a facility from the switcher to view the med pass.
      </div>
    )
  }

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Med pass</h1>
          <p className="text-sm text-muted-foreground">
            {user?.active_facility?.name} ·{" "}
            <span className="font-medium text-foreground">{stats.given}</span> of{" "}
            {stats.scheduled} scheduled doses given · {stats.outstanding} outstanding
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border bg-background px-3 py-1.5 text-sm outline-hidden focus:ring-2 focus:ring-ring"
          />
          <Button variant="outline" size="sm" onClick={() => setTick((t) => t + 1)} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex gap-1 border-b">
        {(["outstanding", "due", "all"] as const).map((f) => (
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
            {filter === "outstanding"
              ? "All scheduled doses are recorded. Nice."
              : "No residents match this filter."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-5">
                <div className="mb-3 flex items-baseline justify-between">
                  <div>
                    <h2 className="text-base font-semibold">
                      {r.last_name}, {r.first_name}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {r.room && `Room ${r.room} · `}
                      {r.mrn && `MRN ${r.mrn} · `}
                      <span className="capitalize">{r.level_of_care ?? "—"}</span>
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {r.medications.filter((m) => !m.is_prn).length} scheduled ·{" "}
                    {r.medications.filter((m) => m.is_prn).length} PRN
                  </span>
                </div>
                <div className="space-y-2">
                  {r.medications.map((m) => (
                    <div key={m.id} className="rounded-md border bg-muted/30 px-3 py-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <Pill className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">
                              {m.name} <span className="text-muted-foreground">{m.dose}</span>{" "}
                              {m.route && <span className="text-xs text-muted-foreground">· {m.route}</span>}
                            </div>
                            {m.indication && (
                              <div className="text-xs text-muted-foreground">{m.indication}</div>
                            )}
                          </div>
                        </div>
                        {m.is_prn && (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground uppercase">
                            PRN
                          </span>
                        )}
                      </div>
                      {m.slots.length === 0 ? (
                        m.is_prn ? (
                          <div className="mt-2 flex items-center gap-2 pl-6 text-xs text-muted-foreground">
                            <span>As needed —</span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              disabled={busyKey === `${m.id}|prn`}
                              onClick={() => administer(m.id, "given", "")}
                            >
                              {busyKey === `${m.id}|prn` ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Check className="h-3 w-3" />
                              )}
                              Record dose
                            </Button>
                          </div>
                        ) : null
                      ) : (
                        <div className="mt-2 flex flex-wrap gap-2 pl-6">
                          {m.slots.map((s) => (
                            <SlotControl
                              key={s.time}
                              medId={m.id}
                              slot={s}
                              busyKey={busyKey}
                              onAdminister={(status) => administer(m.id, status, s.time)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function SlotControl({
  medId,
  slot,
  busyKey,
  onAdminister,
}: {
  medId: string
  slot: Slot
  busyKey: string | null
  onAdminister: (status: "given" | "refused" | "held" | "missed") => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const isBusy = busyKey === `${medId}|${slot.time}`
  const due = slotIsDue(slot.time)

  if (slot.event) {
    const Icon = STATUS_ICON[slot.event.status]
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs",
          STATUS_STYLE[slot.event.status]
        )}
        title={`${slot.event.status} by ${slot.event.administered_by_name ?? "—"} at ${new Date(
          slot.event.administered_at
        ).toLocaleTimeString()}`}
      >
        <Icon className="h-3.5 w-3.5" />
        <span className="font-mono">{slot.time}</span>
        <span className="capitalize">{slot.event.status}</span>
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => (menuOpen ? setMenuOpen(false) : setMenuOpen(true))}
        disabled={isBusy}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors",
          due
            ? "border-foreground bg-foreground text-background hover:bg-foreground/85"
            : "border-foreground/30 bg-background hover:bg-accent"
        )}
      >
        {isBusy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Clock className="h-3.5 w-3.5" />
        )}
        <span className="font-mono">{slot.time}</span>
        {due && <span className="font-medium">Due</span>}
      </button>
      {menuOpen && (
        <div className="absolute left-0 z-10 mt-1 flex flex-col rounded-md border bg-popover p-1 text-xs shadow-md">
          {(["given", "refused", "held", "missed"] as const).map((s) => {
            const Icon = STATUS_ICON[s]
            return (
              <button
                key={s}
                onClick={() => {
                  setMenuOpen(false)
                  onAdminister(s)
                }}
                className="flex items-center gap-2 rounded-sm px-2 py-1 text-left capitalize hover:bg-accent"
              >
                <Icon className="h-3.5 w-3.5" />
                {s}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function slotIsDue(time: string): boolean {
  // Mark as "due" if scheduled time is within ±30 min of now (rough heuristic
  // for an MVP; real-world rules vary by med + facility policy).
  const [h, m] = time.split(":").map(Number)
  if (Number.isNaN(h)) return false
  const now = new Date()
  const slotMin = h * 60 + (m ?? 0)
  const nowMin = now.getHours() * 60 + now.getMinutes()
  return Math.abs(slotMin - nowMin) <= 30
}
