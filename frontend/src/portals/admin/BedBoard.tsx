import { useEffect, useMemo, useState } from "react"
import { Loader2, RefreshCw } from "lucide-react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { BedDetailDrawer } from "@/portals/admin/BedDetailDrawer"

export interface ResidentSummary {
  id: string
  first_name: string
  last_name: string
  date_of_birth: string | null
  level_of_care: string | null
  primary_payer: string | null
  mrn: string | null
  status: string
}

export interface BedRow {
  id: string
  facility_id: string
  room_number: string
  bed_label: string | null
  floor: string | null
  unit: string | null
  level_of_care: string | null
  status: "available" | "reserved" | "occupied" | "offline" | "isolation"
  resident_id: string | null
  resident: ResidentSummary | null
  notes: string | null
}

const STATUS_LABEL: Record<BedRow["status"], string> = {
  available: "Available",
  reserved: "Reserved",
  occupied: "Occupied",
  offline: "Offline",
  isolation: "Isolation",
}

const LOC_LABEL: Record<string, string> = {
  assisted: "Assisted",
  skilled: "Skilled",
  memory: "Memory",
  independent: "Independent",
  hospice: "Hospice",
}

export function BedBoard() {
  const { user } = useAuth()
  const facilityId = user?.active_facility?.id

  const [beds, setBeds] = useState<BedRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<"all" | BedRow["status"]>("all")
  const [locFilter, setLocFilter] = useState<string>("all")
  const [unitFilter, setUnitFilter] = useState<string>("all")
  const [selectedBedId, setSelectedBedId] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!facilityId) return
    let alive = true
    setLoading(true)
    setError(null)
    api
      .get<{ data: BedRow[] }>("/facility/beds", {
        headers: { "X-Facility-Id": facilityId },
      })
      .then((r) => {
        if (alive) setBeds(r.data.data)
      })
      .catch((err) => {
        if (alive) {
          setError(err.response?.data?.message ?? "Failed to load beds.")
        }
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [facilityId, tick])

  const units = useMemo(() => {
    return Array.from(new Set(beds.map((b) => b.unit).filter(Boolean) as string[]))
  }, [beds])

  const filtered = beds.filter((b) => {
    if (statusFilter !== "all" && b.status !== statusFilter) return false
    if (locFilter !== "all" && b.level_of_care !== locFilter) return false
    if (unitFilter !== "all" && b.unit !== unitFilter) return false
    return true
  })

  const summary = useMemo(() => {
    const total = beds.length
    const occupied = beds.filter((b) => b.status === "occupied").length
    const available = beds.filter((b) => b.status === "available").length
    const offline = beds.filter((b) => b.status === "offline").length
    return {
      total,
      occupied,
      available,
      offline,
      occupancyPct: total === 0 ? 0 : Math.round((occupied / total) * 100),
    }
  }, [beds])

  const selected = beds.find((b) => b.id === selectedBedId) ?? null

  const groupedByFloor = useMemo(() => {
    const map = new Map<string, BedRow[]>()
    filtered.forEach((b) => {
      const key = b.floor ? `Floor ${b.floor}${b.unit ? " · " + b.unit : ""}` : "Unassigned floor"
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(b)
    })
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  if (!facilityId) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        Select a facility from the switcher above to view the bed board.
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6 p-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Census</h1>
            <p className="text-sm text-muted-foreground">
              {user?.active_facility?.name} ·{" "}
              <span className="font-medium text-foreground">{summary.occupied}</span>{" "}
              / {summary.total} beds occupied ({summary.occupancyPct}%)
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTick((t) => t + 1)}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi label="Total beds" value={summary.total} />
          <Kpi label="Occupied" value={summary.occupied} />
          <Kpi label="Available" value={summary.available} />
          <Kpi label="Offline / iso" value={summary.offline} />
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <FilterSelect
            label="Status"
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as typeof statusFilter)}
            options={[
              { value: "all", label: "All" },
              ...Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label })),
            ]}
          />
          <FilterSelect
            label="Level of care"
            value={locFilter}
            onChange={setLocFilter}
            options={[
              { value: "all", label: "All" },
              ...Object.entries(LOC_LABEL).map(([value, label]) => ({ value, label })),
            ]}
          />
          <FilterSelect
            label="Unit"
            value={unitFilter}
            onChange={setUnitFilter}
            options={[
              { value: "all", label: "All" },
              ...units.map((u) => ({ value: u, label: u })),
            ]}
          />
          <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
            <LegendSwatch className="bg-foreground/80 text-background" label="Occupied" />
            <LegendSwatch className="bg-muted-foreground/30" label="Reserved" />
            <LegendSwatch className="border border-foreground" label="Available" />
            <LegendSwatch className="bg-destructive/15 text-destructive border border-destructive/30" label="Offline / Iso" />
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading bed board…
          </div>
        ) : groupedByFloor.length === 0 ? (
          <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
            No beds match the current filters.
          </div>
        ) : (
          <div className="space-y-6">
            {groupedByFloor.map(([floorLabel, floorBeds]) => (
              <div key={floorLabel}>
                <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {floorLabel} ({floorBeds.length})
                </h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                  {floorBeds.map((bed) => (
                    <BedCard
                      key={bed.id}
                      bed={bed}
                      onClick={() => setSelectedBedId(bed.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BedDetailDrawer
        bed={selected}
        facilityId={facilityId}
        onClose={() => setSelectedBedId(null)}
        onMutated={() => setTick((t) => t + 1)}
      />
    </>
  )
}

function Kpi({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block rounded-md border bg-background px-3 py-1.5 text-sm outline-hidden focus:ring-2 focus:ring-ring"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function LegendSwatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("inline-block h-3 w-3 rounded-sm", className)} />
      {label}
    </span>
  )
}

function BedCard({ bed, onClick }: { bed: BedRow; onClick: () => void }) {
  const statusClass = (() => {
    switch (bed.status) {
      case "occupied":
        return "bg-foreground/85 text-background border-transparent"
      case "reserved":
        return "bg-muted-foreground/25 border-transparent"
      case "available":
        return "bg-background border-foreground/30 hover:border-foreground"
      case "offline":
        return "bg-destructive/10 text-destructive border-destructive/30"
      case "isolation":
        return "bg-amber-500/10 text-amber-700 border-amber-500/40"
    }
  })()

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex aspect-square flex-col items-start justify-between rounded-md border p-2 text-left text-xs transition-colors hover:shadow-sm",
        statusClass
      )}
    >
      <div className="flex w-full items-baseline justify-between gap-1">
        <span className="font-mono font-semibold">
          {bed.room_number}
          {bed.bed_label && <span className="opacity-70">·{bed.bed_label}</span>}
        </span>
        <span className="text-[10px] uppercase tracking-wider opacity-70">
          {bed.level_of_care ? bed.level_of_care.slice(0, 3) : "—"}
        </span>
      </div>
      <div className="min-w-0 self-stretch truncate text-[11px] opacity-80">
        {bed.resident
          ? `${bed.resident.first_name} ${bed.resident.last_name}`
          : STATUS_LABEL[bed.status]}
      </div>
    </button>
  )
}
