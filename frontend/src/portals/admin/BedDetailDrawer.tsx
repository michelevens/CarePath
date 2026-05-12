import { useEffect, useState } from "react"
import { Loader2, LogOut, UserPlus } from "lucide-react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { BedRow, ResidentSummary } from "@/portals/admin/BedBoard"

interface Props {
  bed: BedRow | null
  facilityId: string
  onClose: () => void
  onMutated: () => void
}

const STATUSES: Array<{ value: BedRow["status"]; label: string }> = [
  { value: "available", label: "Available" },
  { value: "reserved", label: "Reserved" },
  { value: "occupied", label: "Occupied" },
  { value: "offline", label: "Offline (maintenance)" },
  { value: "isolation", label: "Isolation" },
]

export function BedDetailDrawer({ bed, facilityId, onClose, onMutated }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<"view" | "assign">("view")
  const [unassignedResidents, setUnassignedResidents] = useState<ResidentSummary[]>([])
  const [pickResidentId, setPickResidentId] = useState<string>("")

  useEffect(() => {
    if (!bed) {
      setMode("view")
      setError(null)
      setPickResidentId("")
    }
  }, [bed?.id])

  useEffect(() => {
    if (mode !== "assign" || !bed) return
    api
      .get<{ data: ResidentSummary[] }>("/facility/residents", {
        params: { status: "active", unassigned: 1 },
        headers: { "X-Facility-Id": facilityId },
      })
      .then((r) => setUnassignedResidents(r.data.data))
      .catch(() => setUnassignedResidents([]))
  }, [mode, bed?.id, facilityId])

  if (!bed) return null

  const apiErrorMessage = (err: unknown): string => {
    const e = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }
    const first = e.response?.data?.errors
      ? Object.values(e.response.data.errors)[0]?.[0]
      : undefined
    return first ?? e.response?.data?.message ?? "Action failed."
  }

  const runChangeStatus = async (status: BedRow["status"]) => {
    setBusy(true)
    setError(null)
    try {
      await api.put(`/facility/beds/${bed.id}/status`, { status }, {
        headers: { "X-Facility-Id": facilityId },
      })
      onMutated()
      onClose()
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const runAssign = async () => {
    if (!pickResidentId) return
    setBusy(true)
    setError(null)
    try {
      await api.post(
        `/facility/beds/${bed.id}/assign`,
        { resident_id: pickResidentId },
        { headers: { "X-Facility-Id": facilityId } }
      )
      onMutated()
      onClose()
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const runUnassign = async () => {
    if (!confirm("Unassign this resident from the bed?")) return
    setBusy(true)
    setError(null)
    try {
      await api.post(
        `/facility/beds/${bed.id}/unassign`,
        {},
        { headers: { "X-Facility-Id": facilityId } }
      )
      onMutated()
      onClose()
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const runDischarge = async () => {
    if (!bed.resident) return
    if (!confirm(`Discharge ${bed.resident.first_name} ${bed.resident.last_name}?`)) return
    setBusy(true)
    setError(null)
    try {
      await api.post(
        `/facility/residents/${bed.resident.id}/discharge`,
        {},
        { headers: { "X-Facility-Id": facilityId } }
      )
      onMutated()
      onClose()
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={bed !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Room {bed.room_number}
            {bed.bed_label && <span className="text-muted-foreground"> · Bed {bed.bed_label}</span>}
          </DialogTitle>
          <DialogDescription>
            {bed.unit && <>{bed.unit} · </>}
            Floor {bed.floor ?? "—"} ·{" "}
            <span className="capitalize">{bed.level_of_care ?? "—"}</span> level of care
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {mode === "view" && (
          <>
            {bed.resident ? (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <div>
                  <div className="text-xs text-muted-foreground">Current resident</div>
                  <div className="text-lg font-semibold">
                    {bed.resident.first_name} {bed.resident.last_name}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <ResidentField label="MRN" value={bed.resident.mrn ?? "—"} />
                  <ResidentField
                    label="Age"
                    value={
                      bed.resident.date_of_birth
                        ? `${ageFromDob(bed.resident.date_of_birth)} yrs`
                        : "—"
                    }
                  />
                  <ResidentField
                    label="Payer"
                    value={(bed.resident.primary_payer ?? "—").replace(/_/g, " ")}
                  />
                  <ResidentField
                    label="Level"
                    value={bed.resident.level_of_care ?? "—"}
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-lg border bg-muted/30 p-4 text-center">
                <div className="text-sm text-muted-foreground">No resident assigned</div>
                <div className="mt-1 text-xs text-muted-foreground capitalize">
                  Status: {bed.status}
                </div>
              </div>
            )}

            <div className="space-y-1">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Set status
              </div>
              <div className="flex flex-wrap gap-2">
                {STATUSES.map((s) => (
                  <Button
                    key={s.value}
                    variant={bed.status === s.value ? "default" : "outline"}
                    size="sm"
                    disabled={busy || s.value === bed.status}
                    onClick={() => runChangeStatus(s.value)}
                  >
                    {s.label}
                  </Button>
                ))}
              </div>
            </div>

            <DialogFooter>
              {bed.resident ? (
                <>
                  <Button variant="outline" onClick={runUnassign} disabled={busy}>
                    Unassign
                  </Button>
                  <Button variant="destructive" onClick={runDischarge} disabled={busy}>
                    <LogOut className="h-4 w-4" />
                    Discharge
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => {
                    setMode("assign")
                    setError(null)
                  }}
                  disabled={busy}
                >
                  <UserPlus className="h-4 w-4" />
                  Assign resident
                </Button>
              )}
            </DialogFooter>
          </>
        )}

        {mode === "assign" && (
          <>
            <div>
              <label className="text-sm font-medium">Unassigned active residents</label>
              <select
                value={pickResidentId}
                onChange={(e) => setPickResidentId(e.target.value)}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-ring"
              >
                <option value="">Select a resident…</option>
                {unassignedResidents.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.last_name}, {r.first_name}
                    {r.level_of_care && ` · ${r.level_of_care}`}
                    {r.mrn && ` · ${r.mrn}`}
                  </option>
                ))}
              </select>
              {unassignedResidents.length === 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  No unassigned active residents available.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setMode("view")} disabled={busy}>
                Back
              </Button>
              <Button onClick={runAssign} disabled={busy || !pickResidentId}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Assign
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function ResidentField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted-foreground">{label}</div>
      <div className="capitalize">{value}</div>
    </div>
  )
}

function ageFromDob(dob: string): number {
  const d = new Date(dob)
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--
  return age
}
