import { useEffect, useMemo, useState, type FormEvent } from "react"
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
} from "@dnd-kit/core"
import { Loader2, Plus, RefreshCw } from "lucide-react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type Stage =
  | "inquiry"
  | "tour_scheduled"
  | "toured"
  | "assessment"
  | "approved"
  | "admitted"
  | "declined"
  | "withdrew"

interface Admission {
  id: string
  stage: Stage
  inquirer_name: string
  inquirer_phone: string | null
  inquirer_email: string | null
  inquirer_relationship: string | null
  prospect_first_name: string
  prospect_last_name: string
  prospect_dob: string | null
  prospect_level_of_care: string | null
  prospect_primary_payer: string | null
  target_admit_date: string | null
  notes: string | null
  stage_changed_at: string | null
  resident_id: string | null
}

const PIPELINE: Array<{ stage: Stage; label: string }> = [
  { stage: "inquiry", label: "Inquiry" },
  { stage: "tour_scheduled", label: "Tour scheduled" },
  { stage: "toured", label: "Toured" },
  { stage: "assessment", label: "Assessment" },
  { stage: "approved", label: "Approved" },
  { stage: "admitted", label: "Admitted" },
]

const TERMINAL: Array<{ stage: Stage; label: string }> = [
  { stage: "declined", label: "Declined" },
  { stage: "withdrew", label: "Withdrew" },
]

export function AdmissionsKanban() {
  const { user } = useAuth()
  const facilityId = user?.active_facility?.id

  const [items, setItems] = useState<Admission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [tick, setTick] = useState(0)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  useEffect(() => {
    if (!facilityId) return
    let alive = true
    setLoading(true)
    setError(null)
    api
      .get<{ data: Admission[] }>("/facility/admissions", {
        headers: { "X-Facility-Id": facilityId },
      })
      .then((r) => alive && setItems(r.data.data))
      .catch((err) => alive && setError(err.response?.data?.message ?? "Failed to load"))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [facilityId, tick])

  const byStage = useMemo(() => {
    const map: Record<Stage, Admission[]> = {
      inquiry: [], tour_scheduled: [], toured: [], assessment: [],
      approved: [], admitted: [], declined: [], withdrew: [],
    }
    items.forEach((it) => map[it.stage]?.push(it))
    return map
  }, [items])

  const moveTo = async (id: string, newStage: Stage) => {
    if (!facilityId) return
    const current = items.find((i) => i.id === id)
    if (!current || current.stage === newStage) return

    // Optimistic
    const prev = items
    setItems((all) => all.map((i) => (i.id === id ? { ...i, stage: newStage } : i)))
    setError(null)
    try {
      const res = await api.put<{ data: Admission }>(
        `/facility/admissions/${id}/stage`,
        { stage: newStage },
        { headers: { "X-Facility-Id": facilityId } }
      )
      // Replace with server truth (catches resident_id changes on admit)
      setItems((all) => all.map((i) => (i.id === id ? res.data.data : i)))
    } catch (err) {
      setItems(prev) // revert
      setError(
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
          "Stage change failed"
      )
    }
  }

  const onDragEnd = (e: DragEndEvent) => {
    const overId = e.over?.id as Stage | undefined
    const activeId = e.active.id as string
    if (overId) void moveTo(activeId, overId)
  }

  if (!facilityId) {
    return (
      <div className="p-4 text-sm text-muted-foreground sm:p-8">
        Select a facility from the switcher to view admissions.
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admissions</h1>
          <p className="text-sm text-muted-foreground">
            {user?.active_facility?.name} · Drag a card to advance it. Moving
            to <em>Admitted</em> auto-creates the resident record.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setTick((t) => t + 1)} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            New inquiry
          </Button>
        </div>
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
      ) : (
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {PIPELINE.map((col) => (
              <KanbanColumn
                key={col.stage}
                stage={col.stage}
                label={col.label}
                cards={byStage[col.stage]}
              />
            ))}
          </div>
          <div className="mt-4">
            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Closed
            </div>
            <div className="grid grid-cols-2 gap-3">
              {TERMINAL.map((col) => (
                <KanbanColumn
                  key={col.stage}
                  stage={col.stage}
                  label={col.label}
                  cards={byStage[col.stage]}
                />
              ))}
            </div>
          </div>
        </DndContext>
      )}

      <NewAdmissionDialog
        open={creating}
        facilityId={facilityId}
        onClose={() => setCreating(false)}
        onCreated={(a) => {
          setCreating(false)
          setItems((prev) => [a, ...prev])
        }}
      />
    </div>
  )
}

function KanbanColumn({
  stage,
  label,
  cards,
}: {
  stage: Stage
  label: string
  cards: Admission[]
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex h-full min-h-[280px] flex-col rounded-lg border bg-card/40 transition-colors",
        isOver && "ring-2 ring-foreground/30 bg-card"
      )}
    >
      <div className="flex items-baseline justify-between border-b px-3 py-2">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">{cards.length}</span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-2">
        {cards.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">—</div>
        ) : (
          cards.map((card) => <Card key={card.id} card={card} />)
        )}
      </div>
    </div>
  )
}

function Card({ card }: { card: Admission }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: card.id })
  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 50,
      }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "cursor-grab rounded-md border bg-background p-3 text-left text-xs shadow-sm transition-shadow",
        isDragging ? "shadow-lg opacity-90" : "hover:shadow-md"
      )}
    >
      <div className="font-medium">
        {card.prospect_first_name} {card.prospect_last_name}
      </div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">
        From {card.inquirer_name}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
        {card.prospect_level_of_care && (
          <span className="rounded bg-muted px-1.5 py-0.5 capitalize">
            {card.prospect_level_of_care}
          </span>
        )}
        {card.prospect_primary_payer && (
          <span className="rounded bg-muted px-1.5 py-0.5">
            {card.prospect_primary_payer.replace(/_/g, " ")}
          </span>
        )}
      </div>
      {card.target_admit_date && (
        <div className="mt-2 text-[11px] text-muted-foreground">
          Target: {new Date(card.target_admit_date).toLocaleDateString()}
        </div>
      )}
      {card.resident_id && (
        <div className="mt-2 inline-block rounded bg-foreground px-1.5 py-0.5 text-[10px] font-medium text-background">
          Resident created
        </div>
      )}
    </div>
  )
}

function NewAdmissionDialog({
  open,
  facilityId,
  onClose,
  onCreated,
}: {
  open: boolean
  facilityId: string
  onClose: () => void
  onCreated: (a: Admission) => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    inquirer_name: "",
    inquirer_relationship: "adult_child" as const,
    prospect_first_name: "",
    prospect_last_name: "",
    prospect_level_of_care: "assisted",
    prospect_primary_payer: "private_pay",
    target_admit_date: "",
  })

  const reset = () => {
    setError(null)
    setForm({
      inquirer_name: "",
      inquirer_relationship: "adult_child",
      prospect_first_name: "",
      prospect_last_name: "",
      prospect_level_of_care: "assisted",
      prospect_primary_payer: "private_pay",
      target_admit_date: "",
    })
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await api.post<{ data: Admission }>(
        "/facility/admissions",
        {
          ...form,
          target_admit_date: form.target_admit_date || null,
        },
        { headers: { "X-Facility-Id": facilityId } }
      )
      onCreated(res.data.data)
      reset()
    } catch (err) {
      const e = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }
      const firstFieldError = e.response?.data?.errors
        ? Object.values(e.response.data.errors)[0]?.[0]
        : undefined
      setError(firstFieldError ?? e.response?.data?.message ?? "Create failed")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>New inquiry</DialogTitle>
            <DialogDescription>
              Starts at the Inquiry stage. You can drag the card to advance it.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Field label="Inquirer name" required value={form.inquirer_name} onChange={(v) => setForm((f) => ({ ...f, inquirer_name: v }))} />
            <Select
              label="Relationship"
              value={form.inquirer_relationship}
              onChange={(v) => setForm((f) => ({ ...f, inquirer_relationship: v as typeof f.inquirer_relationship }))}
              options={[
                { value: "adult_child", label: "Adult child" },
                { value: "spouse", label: "Spouse" },
                { value: "poa", label: "POA" },
                { value: "self", label: "Self" },
                { value: "hospital", label: "Hospital / referral" },
                { value: "other", label: "Other" },
              ]}
            />
            <Field label="Prospect first name" required value={form.prospect_first_name} onChange={(v) => setForm((f) => ({ ...f, prospect_first_name: v }))} />
            <Field label="Prospect last name" required value={form.prospect_last_name} onChange={(v) => setForm((f) => ({ ...f, prospect_last_name: v }))} />
            <Select
              label="Level of care"
              value={form.prospect_level_of_care}
              onChange={(v) => setForm((f) => ({ ...f, prospect_level_of_care: v }))}
              options={[
                { value: "independent", label: "Independent" },
                { value: "assisted", label: "Assisted" },
                { value: "memory", label: "Memory" },
                { value: "skilled", label: "Skilled" },
                { value: "hospice", label: "Hospice" },
              ]}
            />
            <Select
              label="Primary payer"
              value={form.prospect_primary_payer}
              onChange={(v) => setForm((f) => ({ ...f, prospect_primary_payer: v }))}
              options={[
                { value: "private_pay", label: "Private pay" },
                { value: "medicare_a", label: "Medicare A" },
                { value: "medicare_b", label: "Medicare B" },
                { value: "medicare_advantage", label: "Medicare Advantage" },
                { value: "medicaid", label: "Medicaid" },
                { value: "ltc_insurance", label: "LTC insurance" },
                { value: "va", label: "VA" },
                { value: "other", label: "Other" },
              ]}
            />
            <Field
              label="Target admit date"
              type="date"
              value={form.target_admit_date}
              onChange={(v) => setForm((f) => ({ ...f, target_admit_date: v }))}
            />
          </div>
          {error && (
            <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({
  label,
  required,
  type = "text",
  value,
  onChange,
}: {
  label: string
  required?: boolean
  type?: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-ring"
      />
    </div>
  )
}

function Select({
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
      <label className="text-sm font-medium">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-ring"
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
