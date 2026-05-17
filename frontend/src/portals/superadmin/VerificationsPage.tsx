import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import {
  Building2,
  Check,
  Flag,
  Hospital,
  Loader2,
  ShieldCheck,
  UserCheck,
  X,
} from "lucide-react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface PendingAdvisor {
  id: string
  user_id: number
  agency_name: string | null
  agency_slug: string | null
  licensed_states: string[] | null
  stripe_account_status: string
  is_active: boolean
  is_accepting_referrals: boolean
  created_at: string
  user: { id: number; name: string; email: string; created_at: string } | null
}

interface PendingHospital {
  id: string
  user_id: number
  name: string
  slug: string
  partner_type: string
  service_area_states: string[] | null
  stripe_account_status: string
  is_active: boolean
  is_accepting_referrals: boolean
  created_at: string
  user: { id: number; name: string; email: string; created_at: string } | null
}

interface RecentRow {
  id: string
  user_id: number
  agency_name?: string | null
  name?: string
  verified_at: string
  user: { id: number; name: string; email: string } | null
}

interface VerificationsPayload {
  pending_advisors: PendingAdvisor[]
  pending_hospitals: PendingHospital[]
  recent_advisors: RecentRow[]
  recent_hospitals: RecentRow[]
}

function daysAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

export function VerificationsPage() {
  const [data, setData] = useState<VerificationsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    api
      .get<{ data: VerificationsPayload }>("/superadmin/verifications")
      .then((r) => setData(r.data?.data ?? null))
      .catch((e: unknown) => {
        const err = e as { response?: { data?: { message?: string } } }
        setError(err.response?.data?.message ?? "Failed to load")
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const approveAdvisor = async (id: string) => {
    setBusyId(id)
    try {
      await api.post(`/superadmin/verifications/advisors/${id}/approve`)
      load()
    } finally {
      setBusyId(null)
    }
  }

  const approveHospital = async (id: string) => {
    setBusyId(id)
    try {
      await api.post(`/superadmin/verifications/hospitals/${id}/approve`)
      load()
    } finally {
      setBusyId(null)
    }
  }

  if (loading && !data) {
    return <div className="p-8 text-sm text-muted-foreground">Loading verification queue…</div>
  }
  if (error) {
    return (
      <div className="p-8">
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      </div>
    )
  }
  if (!data) return null

  const advisorCount = data.pending_advisors.length
  const hospitalCount = data.pending_hospitals.length

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Verifications</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {advisorCount + hospitalCount === 0
            ? "All caught up — no pending verifications."
            : `${advisorCount} advisor${advisorCount !== 1 ? "s" : ""} · ${hospitalCount} hospital${hospitalCount !== 1 ? "s" : ""} awaiting review.`}
        </p>
      </div>

      {/* Facility claims */}
      <ClaimsSection />

      {/* Advisors */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center gap-2 border-b p-4">
            <UserCheck className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Pending advisors</h2>
            <span className="ml-auto text-xs text-muted-foreground">{advisorCount} waiting</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">User</th>
                  <th className="px-4 py-2 text-left font-medium">Agency</th>
                  <th className="px-4 py-2 text-left font-medium">Licensed</th>
                  <th className="px-4 py-2 text-left font-medium">Connect</th>
                  <th className="px-4 py-2 text-left font-medium">Waiting</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {advisorCount === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                      No advisors pending verification.
                    </td>
                  </tr>
                )}
                {data.pending_advisors.map((a) => {
                  const wait = daysAgo(a.created_at)
                  const stale = wait >= 7
                  return (
                    <tr key={a.id} className="border-b last:border-b-0">
                      <td className="px-4 py-3">
                        <div className="font-medium">{a.user?.name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{a.user?.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        {a.agency_name || <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {a.licensed_states?.length
                          ? a.licensed_states.join(", ")
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill status={a.stripe_account_status} />
                      </td>
                      <td className={`px-4 py-3 ${stale ? "text-amber-700" : "text-muted-foreground"}`}>
                        {wait}d
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-col items-stretch gap-1">
                          <ScreenButton
                            subjectType="advisor_user"
                            subjectId={a.user?.id}
                            name={a.user?.name ?? a.agency_name ?? ""}
                          />
                          <Button
                            size="sm"
                            onClick={() => approveAdvisor(a.id)}
                            disabled={busyId === a.id}
                            className="gap-1"
                          >
                            {busyId === a.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )}
                            Approve
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Hospitals */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center gap-2 border-b p-4">
            <Hospital className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Pending hospital partners</h2>
            <span className="ml-auto text-xs text-muted-foreground">{hospitalCount} waiting</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">User</th>
                  <th className="px-4 py-2 text-left font-medium">Organization</th>
                  <th className="px-4 py-2 text-left font-medium">Type</th>
                  <th className="px-4 py-2 text-left font-medium">States</th>
                  <th className="px-4 py-2 text-left font-medium">Connect</th>
                  <th className="px-4 py-2 text-left font-medium">Waiting</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {hospitalCount === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                      No hospital partners pending verification.
                    </td>
                  </tr>
                )}
                {data.pending_hospitals.map((h) => {
                  const wait = daysAgo(h.created_at)
                  const stale = wait >= 7
                  return (
                    <tr key={h.id} className="border-b last:border-b-0">
                      <td className="px-4 py-3">
                        <div className="font-medium">{h.user?.name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{h.user?.email}</div>
                      </td>
                      <td className="px-4 py-3">{h.name || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground capitalize">
                        {h.partner_type.replace(/_/g, " ")}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {h.service_area_states?.length ? h.service_area_states.join(", ") : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill status={h.stripe_account_status} />
                      </td>
                      <td className={`px-4 py-3 ${stale ? "text-amber-700" : "text-muted-foreground"}`}>
                        {wait}d
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-col items-stretch gap-1">
                          <ScreenButton
                            subjectType="hospital_user"
                            subjectId={h.user?.id}
                            name={h.user?.name ?? h.name ?? ""}
                          />
                          <Button
                            size="sm"
                            onClick={() => approveHospital(h.id)}
                            disabled={busyId === h.id}
                            className="gap-1"
                          >
                            {busyId === h.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )}
                            Approve
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recent approvals */}
      {(data.recent_advisors.length > 0 || data.recent_hospitals.length > 0) && (
        <Card>
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <h2 className="text-sm font-semibold">Recently verified</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                  Advisors
                </div>
                {data.recent_advisors.length === 0 && (
                  <p className="text-xs text-muted-foreground">No recent approvals.</p>
                )}
                <ul className="space-y-1 text-sm">
                  {data.recent_advisors.map((r) => (
                    <li key={r.id} className="flex justify-between">
                      <span>{r.agency_name ?? r.user?.name ?? "—"}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(r.verified_at).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                  Hospitals
                </div>
                {data.recent_hospitals.length === 0 && (
                  <p className="text-xs text-muted-foreground">No recent approvals.</p>
                )}
                <ul className="space-y-1 text-sm">
                  {data.recent_hospitals.map((r) => (
                    <li key={r.id} className="flex justify-between">
                      <span>{r.name ?? r.user?.name ?? "—"}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(r.verified_at).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const palette: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-800",
    verifying: "bg-amber-100 text-amber-800",
    pending: "bg-amber-100 text-amber-800",
    restricted: "bg-destructive/10 text-destructive",
    rejected: "bg-destructive/10 text-destructive",
    not_connected: "bg-stone-200 text-stone-700",
  }
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${palette[status] ?? palette.not_connected}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  )
}

// ─── Facility claims section ────────────────────────────────────────────────

interface ClaimRow {
  id: string
  facility: { name: string; slug: string; city: string; state: string; website: string | null; phone: string | null } | null
  user: { id: number; name: string; email: string } | null
  claimer_name: string
  claimer_title: string | null
  claimer_email: string
  claimer_phone: string | null
  supporting_notes: string | null
  email_domain_matches: boolean | null
  created_at: string
}

interface RecentClaim {
  id: string
  facility_name: string | null
  facility_slug: string | null
  user_name: string | null
  status: string
  reviewed_at: string | null
}

interface ClaimsPayload {
  pending: ClaimRow[]
  recent: RecentClaim[]
}

function ClaimsSection() {
  const [data, setData] = useState<ClaimsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectNotes, setRejectNotes] = useState("")

  const load = () => {
    setLoading(true)
    api
      .get<{ data: ClaimsPayload }>("/superadmin/claims")
      .then((r) => setData(r.data?.data ?? null))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const approve = async (id: string) => {
    setBusyId(id)
    try {
      await api.post(`/superadmin/claims/${id}/approve`)
      load()
    } finally {
      setBusyId(null)
    }
  }

  const reject = async (id: string) => {
    if (!rejectNotes.trim()) return
    setBusyId(id)
    try {
      await api.post(`/superadmin/claims/${id}/reject`, { notes: rejectNotes })
      setRejectingId(null)
      setRejectNotes("")
      load()
    } finally {
      setBusyId(null)
    }
  }

  if (loading && !data) return null

  const pending = data?.pending ?? []
  const recent = data?.recent ?? []
  if (pending.length === 0 && recent.length === 0) return null

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center gap-2 border-b p-4">
          <Flag className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Facility claims</h2>
          <span className="ml-auto text-xs text-muted-foreground">
            {pending.length} pending
          </span>
        </div>
        {pending.length === 0 ? (
          <p className="p-4 text-xs text-muted-foreground">
            No facility claims pending review.
          </p>
        ) : (
          <ul className="divide-y">
            {pending.map((c) => (
              <li key={c.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <Link
                        to={`/facility/${c.facility?.slug ?? ""}`}
                        className="text-sm font-semibold hover:underline"
                      >
                        {c.facility?.name ?? "—"}
                      </Link>
                      {c.facility && (
                        <span className="text-xs text-muted-foreground">
                          {c.facility.city}, {c.facility.state}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Submitted by{" "}
                      <strong className="text-foreground">{c.user?.name}</strong>{" "}
                      (<span>{c.user?.email}</span>) ·{" "}
                      <span>{new Date(c.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="mt-2 grid gap-1 text-xs">
                      <div>
                        <span className="text-muted-foreground">Claimer:</span>{" "}
                        <strong>{c.claimer_name}</strong>
                        {c.claimer_title && (
                          <span className="text-muted-foreground"> · {c.claimer_title}</span>
                        )}
                      </div>
                      <div className="text-muted-foreground">
                        Work email:{" "}
                        <a href={`mailto:${c.claimer_email}`} className="text-violet-700 hover:underline">
                          {c.claimer_email}
                        </a>
                        {c.email_domain_matches === true && (
                          <span className="ml-2 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">
                            ✓ matches facility domain
                          </span>
                        )}
                        {c.email_domain_matches === false && (
                          <span className="ml-2 rounded-full bg-stone-200 px-1.5 py-0.5 text-[10px] text-stone-700">
                            does not match facility domain
                          </span>
                        )}
                      </div>
                      {c.claimer_phone && (
                        <div className="text-muted-foreground">
                          Phone: {c.claimer_phone}
                        </div>
                      )}
                      {c.facility?.phone && (
                        <div className="text-muted-foreground">
                          Facility on file: {c.facility.phone}
                          {c.facility.website && (
                            <>
                              {" · "}
                              <a
                                href={c.facility.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-violet-700 hover:underline"
                              >
                                {c.facility.website}
                              </a>
                            </>
                          )}
                        </div>
                      )}
                      {c.supporting_notes && (
                        <p className="mt-1 italic text-muted-foreground">
                          "{c.supporting_notes}"
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <Button
                      size="sm"
                      onClick={() => approve(c.id)}
                      disabled={busyId === c.id}
                      className="gap-1"
                    >
                      {busyId === c.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Check className="h-3 w-3" />
                      )}
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setRejectingId(c.id)
                        setRejectNotes("")
                      }}
                      disabled={busyId === c.id}
                      className="gap-1 text-destructive"
                    >
                      <X className="h-3 w-3" /> Reject
                    </Button>
                  </div>
                </div>
                {rejectingId === c.id && (
                  <div className="mt-3 space-y-2 rounded-md border bg-muted/30 p-3">
                    <textarea
                      value={rejectNotes}
                      onChange={(e) => setRejectNotes(e.target.value)}
                      placeholder="Reason — sent to no one, kept for audit."
                      rows={2}
                      className="w-full rounded border bg-background p-2 text-xs"
                    />
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRejectingId(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => reject(c.id)}
                        disabled={!rejectNotes.trim() || busyId === c.id}
                      >
                        Confirm reject
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        {recent.length > 0 && (
          <div className="border-t p-4">
            <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
              Recent decisions
            </div>
            <ul className="space-y-1 text-xs">
              {recent.map((r) => (
                <li key={r.id} className="flex justify-between">
                  <span>
                    <Link
                      to={`/facility/${r.facility_slug ?? ""}`}
                      className="text-violet-700 hover:underline"
                    >
                      {r.facility_name ?? "—"}
                    </Link>
                    <span className="text-muted-foreground"> — {r.user_name}</span>
                  </span>
                  <span className="text-muted-foreground">
                    {r.status} ·{" "}
                    {r.reviewed_at ? new Date(r.reviewed_at).toLocaleDateString() : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── ScreenButton — OIG LEIE + SAM.gov SDN screen ─────────────────────────────

function ScreenButton({
  subjectType,
  subjectId,
  name,
}: {
  subjectType: "advisor_user" | "facility_owner" | "hospital_user"
  subjectId?: number | null
  name: string
}) {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<
    | null
    | {
        any_match: boolean
        oig: { checked: boolean; match: boolean }
        sam: { checked: boolean; match: boolean }
      }
  >(null)

  if (!name) return null

  const run = async () => {
    setBusy(true)
    setResult(null)
    try {
      const r = await api.post<{ data: typeof result }>("/superadmin/screen", {
        subject_type: subjectType,
        subject_id: subjectId,
        name,
      })
      setResult(r.data?.data ?? null)
    } finally {
      setBusy(false)
    }
  }

  if (result) {
    const label = result.any_match
      ? "⚠ Match found"
      : !result.oig.checked && !result.sam.checked
        ? "Not checked (no API keys)"
        : "✓ No match"
    const tone = result.any_match
      ? "border-destructive/30 bg-destructive/10 text-destructive"
      : result.oig.checked || result.sam.checked
        ? "border-emerald-300 bg-emerald-50 text-emerald-800"
        : "border-stone-300 bg-stone-50 text-stone-700"
    return (
      <span
        title={`OIG LEIE: ${result.oig.checked ? (result.oig.match ? "MATCH" : "clean") : "skipped"} · SAM.gov: ${result.sam.checked ? (result.sam.match ? "MATCH" : "clean") : "skipped"}`}
        className={`rounded-md border px-2 py-1 text-[10px] font-medium ${tone}`}
      >
        {label}
      </span>
    )
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={run}
      disabled={busy}
      className="gap-1 text-[11px]"
      title="Run OIG LEIE + SAM.gov screening"
    >
      {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
      Screen
    </Button>
  )
}
