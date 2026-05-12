import { useEffect, useMemo, useState, type FormEvent } from "react"
import { Link, useParams } from "react-router-dom"
import {
  ArrowLeft,
  Loader2,
  Plus,
  ShieldCheck,
  Target,
  Wrench,
  Trash2,
  Check,
} from "lucide-react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Resident {
  id: string
  first_name: string
  last_name: string
  level_of_care: string | null
  mrn: string | null
  primary_payer: string | null
}

interface CarePlanItem {
  id: string
  kind: "goal" | "intervention"
  category: string | null
  description: string
  status: "open" | "in_progress" | "met" | "discontinued"
  target_date: string | null
  frequency: string | null
  responsible_role: string | null
  parent_id: string | null
  sort_order: number
}

interface CarePlan {
  id: string
  status: "draft" | "active" | "on_hold" | "archived"
  started_at: string | null
  signed_at: string | null
  signed_by_name: string | null
  summary: string | null
  items: CarePlanItem[]
}

const CATEGORY_LABEL: Record<string, string> = {
  adl: "ADL",
  mobility: "Mobility",
  nutrition: "Nutrition",
  behavior: "Behavior",
  safety: "Safety",
  meds: "Meds",
  wound: "Wound",
  psychosocial: "Psychosocial",
  continence: "Continence",
  cognition: "Cognition",
}

const FREQ_LABEL: Record<string, string> = {
  daily: "Daily",
  twice_daily: "BID",
  tid: "TID",
  qid: "QID",
  weekly: "Weekly",
  monthly: "Monthly",
  prn: "PRN",
}

export function CarePlanDetail() {
  const { residentId } = useParams<{ residentId: string }>()
  const { user } = useAuth()
  const facilityId = user?.active_facility?.id

  const [resident, setResident] = useState<Resident | null>(null)
  const [plan, setPlan] = useState<CarePlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [addOpen, setAddOpen] = useState<null | { kind: "goal" | "intervention"; parentId?: string }>(null)

  const load = async () => {
    if (!facilityId || !residentId) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.get<{ data: { resident: Resident; plan: CarePlan | null } }>(
        `/facility/care-plans/by-resident/${residentId}`,
        { headers: { "X-Facility-Id": facilityId } }
      )
      setResident(res.data.data.resident)
      setPlan(res.data.data.plan)
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } }
      setError(e.response?.data?.message ?? "Failed to load")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [facilityId, residentId])

  const apiErr = (err: unknown, fallback: string) => {
    const e = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }
    const first = e.response?.data?.errors ? Object.values(e.response.data.errors)[0]?.[0] : undefined
    return first ?? e.response?.data?.message ?? fallback
  }

  const createPlan = async () => {
    if (!facilityId || !residentId) return
    setBusy(true)
    setError(null)
    try {
      const res = await api.post<{ data: CarePlan }>(
        `/facility/care-plans/by-resident/${residentId}`,
        { status: "draft" },
        { headers: { "X-Facility-Id": facilityId } }
      )
      setPlan(res.data.data)
    } catch (err) {
      setError(apiErr(err, "Could not create plan"))
    } finally {
      setBusy(false)
    }
  }

  const sign = async () => {
    if (!facilityId || !plan) return
    setBusy(true)
    setError(null)
    try {
      const res = await api.post<{ data: CarePlan }>(
        `/facility/care-plans/${plan.id}/sign`,
        {},
        { headers: { "X-Facility-Id": facilityId } }
      )
      setPlan(res.data.data)
    } catch (err) {
      setError(apiErr(err, "Sign failed"))
    } finally {
      setBusy(false)
    }
  }

  const unsign = async () => {
    if (!facilityId || !plan) return
    if (!confirm("Unsign this care plan?")) return
    setBusy(true)
    setError(null)
    try {
      const res = await api.post<{ data: CarePlan }>(
        `/facility/care-plans/${plan.id}/unsign`,
        {},
        { headers: { "X-Facility-Id": facilityId } }
      )
      setPlan(res.data.data)
    } catch (err) {
      setError(apiErr(err, "Unsign failed"))
    } finally {
      setBusy(false)
    }
  }

  const toggleMet = async (item: CarePlanItem) => {
    if (!facilityId || !plan) return
    const newStatus = item.status === "met" ? "open" : "met"
    setBusy(true)
    try {
      const res = await api.put<{ data: CarePlanItem }>(
        `/facility/care-plans/${plan.id}/items/${item.id}`,
        { status: newStatus },
        { headers: { "X-Facility-Id": facilityId } }
      )
      setPlan({
        ...plan,
        items: plan.items.map((i) => (i.id === item.id ? res.data.data : i)),
      })
    } catch (err) {
      setError(apiErr(err, "Update failed"))
    } finally {
      setBusy(false)
    }
  }

  const deleteItem = async (item: CarePlanItem) => {
    if (!facilityId || !plan) return
    if (!confirm("Delete this item?")) return
    setBusy(true)
    try {
      await api.delete(`/facility/care-plans/${plan.id}/items/${item.id}`, {
        headers: { "X-Facility-Id": facilityId },
      })
      setPlan({ ...plan, items: plan.items.filter((i) => i.id !== item.id) })
    } catch (err) {
      setError(apiErr(err, "Delete failed"))
    } finally {
      setBusy(false)
    }
  }

  const goals = useMemo(
    () => (plan?.items ?? []).filter((i) => i.kind === "goal").sort((a, b) => a.sort_order - b.sort_order),
    [plan?.items]
  )

  const interventionsByGoal = useMemo(() => {
    const map = new Map<string | null, CarePlanItem[]>()
    ;(plan?.items ?? [])
      .filter((i) => i.kind === "intervention")
      .sort((a, b) => a.sort_order - b.sort_order)
      .forEach((i) => {
        const key = i.parent_id
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(i)
      })
    return map
  }, [plan?.items])

  return (
    <div className="space-y-6 p-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3">
          <Link to="/staff/care-plans">
            <ArrowLeft className="h-4 w-4" />
            All care plans
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : !resident ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Resident not found.
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {resident.first_name} {resident.last_name}
              </h1>
              <p className="text-sm text-muted-foreground">
                {resident.mrn && <>MRN {resident.mrn} · </>}
                <span className="capitalize">{resident.level_of_care ?? "—"}</span> level of care
                {resident.primary_payer && <> · {resident.primary_payer.replace(/_/g, " ")}</>}
              </p>
            </div>
            {plan && (
              <div className="flex flex-col items-end gap-2">
                <span className={cn(
                  "inline-flex rounded px-2 py-0.5 text-xs font-medium capitalize",
                  plan.status === "active"
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground"
                )}>
                  {plan.status.replace("_", " ")}
                </span>
                {plan.signed_at ? (
                  <Button variant="outline" size="sm" onClick={unsign} disabled={busy}>
                    Unsign
                  </Button>
                ) : (
                  <Button onClick={sign} disabled={busy}>
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                    <ShieldCheck className="h-4 w-4" />
                    Sign and activate
                  </Button>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {!plan ? (
            <Card>
              <CardContent className="space-y-3 p-8 text-center">
                <p className="text-sm text-muted-foreground">No care plan yet for this resident.</p>
                <Button onClick={createPlan} disabled={busy}>
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create care plan
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {plan.summary && (
                <Card>
                  <CardContent className="p-5">
                    <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Summary
                    </div>
                    <p className="mt-1 text-sm">{plan.summary}</p>
                  </CardContent>
                </Card>
              )}

              {plan.signed_at && (
                <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                  <ShieldCheck className="mr-1 inline-block h-4 w-4" />
                  Signed by{" "}
                  <span className="font-medium">{plan.signed_by_name}</span>{" "}
                  on {new Date(plan.signed_at).toLocaleDateString()}
                </div>
              )}

              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Goals + interventions</h2>
                <Button size="sm" onClick={() => setAddOpen({ kind: "goal" })}>
                  <Plus className="h-4 w-4" />
                  Add goal
                </Button>
              </div>

              <div className="space-y-3">
                {goals.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center text-sm text-muted-foreground">
                      No goals yet.
                    </CardContent>
                  </Card>
                ) : (
                  goals.map((goal) => (
                    <Card key={goal.id}>
                      <CardContent className="p-5">
                        <div className="flex items-start gap-3">
                          <Target className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                          <div className="flex-1">
                            <div className="flex items-baseline justify-between gap-2">
                              <div className="font-medium">{goal.description}</div>
                              <div className="flex shrink-0 items-center gap-2 text-xs">
                                {goal.category && (
                                  <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                                    {CATEGORY_LABEL[goal.category] ?? goal.category}
                                  </span>
                                )}
                                {goal.target_date && (
                                  <span className="text-muted-foreground">
                                    by {new Date(goal.target_date).toLocaleDateString()}
                                  </span>
                                )}
                                <button
                                  onClick={() => toggleMet(goal)}
                                  disabled={busy}
                                  className={cn(
                                    "rounded px-1.5 py-0.5 text-xs font-medium",
                                    goal.status === "met"
                                      ? "bg-foreground text-background"
                                      : "border border-foreground/30 text-muted-foreground hover:bg-muted"
                                  )}
                                >
                                  {goal.status === "met" ? (
                                    <span className="inline-flex items-center gap-1">
                                      <Check className="h-3 w-3" /> Met
                                    </span>
                                  ) : (
                                    "Mark met"
                                  )}
                                </button>
                                <button
                                  onClick={() => deleteItem(goal)}
                                  disabled={busy}
                                  className="text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>

                            <div className="mt-3 space-y-1.5">
                              {(interventionsByGoal.get(goal.id) ?? []).map((it) => (
                                <InterventionRow
                                  key={it.id}
                                  item={it}
                                  busy={busy}
                                  onDelete={() => deleteItem(it)}
                                />
                              ))}
                              <button
                                onClick={() => setAddOpen({ kind: "intervention", parentId: goal.id })}
                                className="ml-7 mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                Add intervention
                              </button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}

                {(interventionsByGoal.get(null) ?? []).length > 0 && (
                  <Card>
                    <CardContent className="p-5">
                      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Unlinked interventions
                      </div>
                      <div className="mt-2 space-y-1.5">
                        {(interventionsByGoal.get(null) ?? []).map((it) => (
                          <InterventionRow
                            key={it.id}
                            item={it}
                            busy={busy}
                            onDelete={() => deleteItem(it)}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <AddItemDialog
                state={addOpen}
                onClose={() => setAddOpen(null)}
                onCreated={(item) => {
                  setPlan((p) => (p ? { ...p, items: [...p.items, item] } : p))
                  setAddOpen(null)
                }}
                facilityId={facilityId!}
                planId={plan.id}
              />
            </>
          )}
        </>
      )}
    </div>
  )
}

function InterventionRow({
  item,
  busy,
  onDelete,
}: {
  item: CarePlanItem
  busy: boolean
  onDelete: () => void
}) {
  return (
    <div className="ml-7 flex items-start gap-2 rounded border bg-muted/20 px-3 py-1.5">
      <Wrench className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <div className="text-sm">{item.description}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
          {item.responsible_role && (
            <span className="rounded bg-background px-1.5 py-0.5">{item.responsible_role}</span>
          )}
          {item.frequency && <span>{FREQ_LABEL[item.frequency] ?? item.frequency}</span>}
        </div>
      </div>
      <button
        onClick={onDelete}
        disabled={busy}
        className="text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function AddItemDialog({
  state,
  onClose,
  onCreated,
  facilityId,
  planId,
}: {
  state: null | { kind: "goal" | "intervention"; parentId?: string }
  onClose: () => void
  onCreated: (item: CarePlanItem) => void
  facilityId: string
  planId: string
}) {
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [targetDate, setTargetDate] = useState("")
  const [frequency, setFrequency] = useState("")
  const [role, setRole] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (state) {
      setDescription("")
      setCategory("")
      setTargetDate("")
      setFrequency("")
      setRole("")
      setError(null)
    }
  }, [state?.kind, state?.parentId])

  if (!state) return null

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        kind: state.kind,
        description,
      }
      if (category) payload.category = category
      if (state.kind === "goal" && targetDate) payload.target_date = targetDate
      if (state.kind === "intervention") {
        if (frequency) payload.frequency = frequency
        if (role) payload.responsible_role = role
        if (state.parentId) payload.parent_id = state.parentId
      }

      const res = await api.post<{ data: CarePlanItem }>(
        `/facility/care-plans/${planId}/items`,
        payload,
        { headers: { "X-Facility-Id": facilityId } }
      )
      onCreated(res.data.data)
    } catch (err) {
      const e = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }
      const first = e.response?.data?.errors ? Object.values(e.response.data.errors)[0]?.[0] : undefined
      setError(first ?? e.response?.data?.message ?? "Create failed")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>
              {state.kind === "goal" ? "Add goal" : "Add intervention"}
            </DialogTitle>
            <DialogDescription>
              {state.kind === "goal"
                ? "What outcome are you targeting?"
                : "Action the care team will take."}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            <div>
              <label className="text-sm font-medium">Description</label>
              <textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-ring"
                >
                  <option value="">—</option>
                  {Object.entries(CATEGORY_LABEL).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              {state.kind === "goal" ? (
                <div>
                  <label className="text-sm font-medium">Target date</label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-ring"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-sm font-medium">Frequency</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-ring"
                  >
                    <option value="">—</option>
                    {Object.entries(FREQ_LABEL).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            {state.kind === "intervention" && (
              <div>
                <label className="text-sm font-medium">Responsible role</label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="RN, CNA, PT, OT, …"
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-ring"
                />
              </div>
            )}
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
            <Button type="submit" disabled={submitting || !description}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Add
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
