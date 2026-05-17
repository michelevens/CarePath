import { useState, useEffect, type FormEvent } from "react"
import { Check, Loader2, Mail, ShieldCheck, Trash2, UserPlus, Users, X } from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface DataRow {
  id: string
  source: "master" | "custom"
  name: string
  code: string | null
  is_active: boolean
  type?: string
  renewal_months?: number
}

const TYPES = [
  { type: "payers", title: "Payers" },
  { type: "levels-of-care", title: "Levels of care" },
  { type: "credential-templates", title: "Credentials" },
  { type: "diagnosis-codes", title: "Diagnoses" },
  { type: "service-codes", title: "Service codes" },
  { type: "service-types", title: "Service types" },
  { type: "doc-presets", title: "Documents" },
] as const

export function FacilityDataPage() {
  const { user } = useAuth()
  const [activeType, setActiveType] = useState<(typeof TYPES)[number]["type"]>(TYPES[0].type)
  const [rows, setRows] = useState<DataRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    api
      .get<{ data: DataRow[] }>(`/facility/data/${activeType}`, {
        headers: user?.active_facility?.id
          ? { "X-Facility-Id": user.active_facility.id }
          : undefined,
      })
      .then((r) => {
        if (alive) setRows(r.data.data)
      })
      .catch((err) => {
        if (alive) {
          setError(
            err.response?.data?.message ??
              "Failed to load. Make sure your account has an active facility."
          )
        }
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [activeType, user?.active_facility?.id])

  const masterCount = rows.filter((r) => r.source === "master").length
  const customCount = rows.filter((r) => r.source === "custom").length

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Facility data</h1>
        <p className="text-sm text-muted-foreground">
          {user?.active_facility?.name ?? "No facility selected"} · Master
          snapshots inherited from the platform plus this facility's customs.
        </p>
      </div>

      <div className="flex gap-1 border-b">
        {TYPES.map((t) => (
          <button
            key={t.type}
            onClick={() => setActiveType(t.type)}
            className={cn(
              "border-b-2 px-4 py-2 text-sm transition-colors",
              t.type === activeType
                ? "border-foreground font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.title}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>
              <span className="font-medium text-foreground">{masterCount}</span>{" "}
              master
            </span>
            <span>
              <span className="font-medium text-foreground">{customCount}</span>{" "}
              custom
            </span>
            <span>
              <span className="font-medium text-foreground">{rows.filter(r=>r.is_active).length}</span>{" "}
              active
            </span>
          </div>

          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                      Source
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                      Code
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                      Name
                    </th>
                    {activeType === "payers" && (
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                        Type
                      </th>
                    )}
                    {activeType === "credential-templates" && (
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                        Renewal
                      </th>
                    )}
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                      Active
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        No rows. Provisioning may not have run yet.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr key={row.id} className="border-t hover:bg-muted/30">
                        <td className="px-4 py-2.5">
                          <span
                            className={cn(
                              "inline-flex rounded px-1.5 py-0.5 text-xs font-medium",
                              row.source === "master"
                                ? "bg-muted text-muted-foreground"
                                : "bg-foreground text-background"
                            )}
                          >
                            {row.source}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs">{row.code ?? "—"}</td>
                        <td className="px-4 py-2.5">{row.name}</td>
                        {activeType === "payers" && (
                          <td className="px-4 py-2.5 text-muted-foreground">{row.type ?? "—"}</td>
                        )}
                        {activeType === "credential-templates" && (
                          <td className="px-4 py-2.5 text-muted-foreground">
                            {row.renewal_months ? `${row.renewal_months}mo` : "—"}
                          </td>
                        )}
                        <td className="px-4 py-2.5 text-right">
                          {row.is_active ? "✓" : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}

      <FacilityAdminsSection />
    </div>
  )
}

// ─── Multi-admin / staff management ───────────────────────────────────────────

interface MemberRow {
  id: number
  name: string
  email: string
  email_verified: boolean
  two_factor_enabled: boolean
  pivot_role: "admin" | "staff"
  added_at: string
  is_you: boolean
}

function FacilityAdminsSection() {
  const { user } = useAuth()
  const [members, setMembers] = useState<MemberRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)

  const headers = user?.active_facility?.id
    ? { "X-Facility-Id": user.active_facility.id }
    : undefined

  const load = () => {
    setLoading(true)
    api
      .get<{ data: MemberRow[] }>("/facility/admins", { headers })
      .then((r) => setMembers(r.data?.data ?? []))
      .catch((e: unknown) => {
        const err = e as { response?: { data?: { message?: string }; status?: number } }
        // Staff users get 403 from the middleware — silently hide
        // the section rather than show an error.
        if (err.response?.status === 403) {
          setMembers([])
        } else {
          setError(err.response?.data?.message ?? "Failed to load team")
        }
      })
      .finally(() => setLoading(false))
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [user?.active_facility?.id])

  const remove = async (id: number) => {
    if (!confirm("Remove this member from the facility? Their CarePath account stays; they just lose access to this site.")) return
    setBusyId(id)
    try {
      await api.delete(`/facility/admins/${id}`, { headers })
      load()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } }
      const msg = Object.values(err.response?.data?.errors ?? {}).flat()[0] ?? err.response?.data?.message ?? "Remove failed"
      alert(msg)
    } finally {
      setBusyId(null)
    }
  }

  const changeRole = async (id: number, pivotRole: "admin" | "staff") => {
    setBusyId(id)
    try {
      await api.put(`/facility/admins/${id}/role`, { pivot_role: pivotRole }, { headers })
      load()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      alert(err.response?.data?.message ?? "Update failed")
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return null
  if (error) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
      </Card>
    )
  }
  if (members.length === 0) return null

  return (
    <>
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Users className="h-4 w-4" /> Team on this facility ({members.length})
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Who else can manage {user?.active_facility?.name}. Admins can manage
                the team; staff can manage residents + care plans.
              </p>
            </div>
            <Button size="sm" onClick={() => setInviteOpen(true)} className="gap-1">
              <UserPlus className="h-3 w-3" />
              Invite
            </Button>
          </div>
          <div className="divide-y">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{m.name || "—"}</span>
                    {m.is_you && (
                      <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">
                        you
                      </span>
                    )}
                    {m.two_factor_enabled && (
                      <ShieldCheck className="h-3 w-3 text-violet-700" />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">{m.email}</div>
                </div>
                <select
                  value={m.pivot_role}
                  onChange={(e) => changeRole(m.id, e.target.value as "admin" | "staff")}
                  disabled={m.is_you || busyId === m.id}
                  className="h-8 rounded-md border bg-background px-2 text-xs"
                >
                  <option value="admin">Admin</option>
                  <option value="staff">Staff</option>
                </select>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => remove(m.id)}
                  disabled={m.is_you || busyId === m.id}
                  className="gap-1 text-destructive hover:bg-destructive/10"
                >
                  {busyId === m.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {inviteOpen && (
        <InviteTeamMemberModal
          headers={headers}
          onClose={() => setInviteOpen(false)}
          onInvited={() => {
            setInviteOpen(false)
            load()
          }}
        />
      )}
    </>
  )
}

function InviteTeamMemberModal({
  headers,
  onClose,
  onInvited,
}: {
  headers: Record<string, string> | undefined
  onClose: () => void
  onInvited: () => void
}) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [pivotRole, setPivotRole] = useState<"admin" | "staff">("staff")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    try {
      await api.post("/facility/admins/invite", { name, email, pivot_role: pivotRole }, { headers })
      onInvited()
    } catch (e: unknown) {
      const error = e as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } }
      const fieldErrs = Object.values(error.response?.data?.errors ?? {}).flat()
      setErr(fieldErrs[0] ?? error.response?.data?.message ?? "Invite failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg border bg-card shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="text-sm font-semibold">Invite team member</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4 p-4">
          <p className="text-xs text-muted-foreground">
            Creates the account if needed, adds them to this facility, and emails
            a set-password link. They land in their portal after first login.
          </p>
          <label className="block">
            <div className="mb-1 text-xs font-medium text-muted-foreground">Name</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={120}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            />
          </label>
          <label className="block">
            <div className="mb-1 text-xs font-medium text-muted-foreground">Email</div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            />
          </label>
          <div>
            <div className="mb-1 text-xs font-medium text-muted-foreground">Role</div>
            <div className="space-y-1">
              {[
                ["staff", "Staff", "Care team — residents, care plans, MDS, handoffs."],
                ["admin", "Admin", "Full access — billing, compliance, team management."],
              ].map(([value, label, desc]) => (
                <label
                  key={value}
                  className={cn(
                    "flex cursor-pointer items-start gap-2 rounded-md border p-2 text-sm",
                    pivotRole === value ? "border-violet-300 bg-violet-50" : "hover:bg-muted/30",
                  )}
                >
                  <input
                    type="radio"
                    name="pivot_role"
                    value={value}
                    checked={pivotRole === value}
                    onChange={() => setPivotRole(value as "admin" | "staff")}
                    className="mt-1 h-3 w-3"
                  />
                  <div>
                    <div className="font-medium">{label}</div>
                    <div className="text-[11px] text-muted-foreground">{desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
          {err && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
              {err}
            </div>
          )}
          <div className="flex justify-end gap-2 border-t pt-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy} className="gap-2">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              Send invite
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Silence Check icon warning if unused
void Check
