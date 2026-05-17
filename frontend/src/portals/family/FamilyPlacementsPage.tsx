import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Circle,
  ClipboardList,
  Loader2,
  Mail,
  MapPin,
  Phone,
} from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"

interface PlacementSummary {
  id: string
  stage: string
  stage_label: string
  prospect_name: string
  facility: { name: string; slug: string; city: string; state: string } | null
  latest_event: { label: string; occurred_at: string } | null
  target_admit_date: string | null
  created_at: string
}

interface PlacementEvent {
  key: string
  label: string
  occurred_at: string
  stage?: string
  note?: string
}

interface PlacementDetail {
  id: string
  stage: string
  stage_label: string
  prospect_name: string
  inquirer_name: string
  inquirer_relationship: string | null
  target_admit_date: string | null
  level_of_care: string | null
  facility: {
    id: string
    name: string
    slug: string
    city: string
    state: string
    address_line_1: string | null
    zip: string | null
    phone: string | null
    email: string | null
  } | null
  events: PlacementEvent[]
  upcoming: Array<{ key: string; label: string; stage?: string }>
  reached_keys: string[]
  created_at: string
}

/**
 * "Where is mom's placement?" surface — the wedge against APFM's only
 * retention play (advisor calling families every 3 days). Replaces the
 * call with a visible status timeline + email triggers.
 */
export function FamilyPlacementsPage() {
  const { id } = useParams<{ id?: string }>()
  if (id) return <PlacementDetailView id={id} />
  return <PlacementListView />
}

function PlacementListView() {
  const [rows, setRows] = useState<PlacementSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get<{ data: PlacementSummary[] }>("/family/placements")
      .then((r) => setRows(r.data?.data ?? []))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="mx-auto flex max-w-3xl items-center gap-2 p-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your placements…
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="mx-auto max-w-3xl p-8">
        <h1 className="text-2xl font-semibold">Placement status</h1>
        <div className="mt-6 rounded-lg border bg-card p-8 text-center">
          <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium">No placements in progress</p>
          <p className="mt-1 text-xs text-muted-foreground">
            When you request a tour, your placement will appear here with a live status timeline.
          </p>
          <Link
            to="/search"
            className="mt-4 inline-flex items-center gap-1 rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700"
          >
            Find a facility
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">Placement status</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Every tour request becomes a placement here. Open one to see the timeline.
      </p>
      <ul className="mt-6 space-y-2">
        {rows.map((r) => (
          <li key={r.id}>
            <Link
              to={`/family/placements/${r.id}`}
              className="block rounded-lg border bg-card p-4 transition-colors hover:border-violet-300 hover:bg-violet-50/30"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{r.prospect_name}</span>
                    <StageChip stage={r.stage} label={r.stage_label} />
                  </div>
                  {r.facility && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Building2 className="h-3 w-3" /> {r.facility.name}
                      <span>·</span>
                      <MapPin className="h-3 w-3" /> {r.facility.city}, {r.facility.state}
                    </p>
                  )}
                  {r.latest_event && (
                    <p className="mt-2 text-xs text-foreground">
                      Latest: <span className="font-medium">{r.latest_event.label}</span>
                      <span className="ml-1 text-muted-foreground">
                        {fmtRelative(r.latest_event.occurred_at)}
                      </span>
                    </p>
                  )}
                </div>
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function PlacementDetailView({ id }: { id: string }) {
  const [data, setData] = useState<PlacementDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<{ data: PlacementDetail }>(`/family/placements/${id}`)
      .then((r) => setData(r.data?.data ?? null))
      .catch(() => setError("This placement isn't visible from your account."))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="mx-auto flex max-w-3xl items-center gap-2 p-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    )
  }
  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl p-8 text-sm text-muted-foreground">
        {error ?? "Not found."}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <Link
        to="/family/placements"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> All placements
      </Link>

      <div className="mt-3 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{data.prospect_name}</h1>
          {data.facility && (
            <p className="mt-1 text-sm text-muted-foreground">
              Moving to{" "}
              <Link to={`/facility/${data.facility.slug}`} className="font-medium text-violet-700 hover:underline">
                {data.facility.name}
              </Link>{" "}
              · {data.facility.city}, {data.facility.state}
            </p>
          )}
        </div>
        <StageChip stage={data.stage} label={data.stage_label} />
      </div>

      {data.target_admit_date && (
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1 text-xs text-amber-900">
          <Calendar className="h-3 w-3" /> Target move-in:{" "}
          <span className="font-semibold">{fmtDate(data.target_admit_date)}</span>
        </div>
      )}

      {/* Timeline */}
      <section className="mt-6 rounded-lg border bg-card p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Timeline
        </h2>
        <ol className="mt-3 space-y-3">
          {data.events.map((e, i) => (
            <li key={i} className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium">{e.label}</span>
                  <span className="text-xs text-muted-foreground">{fmtRelative(e.occurred_at)}</span>
                </div>
                {e.note && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{e.note}</p>
                )}
              </div>
            </li>
          ))}
          {data.upcoming.map((u, i) => (
            <li key={`upcoming-${i}`} className="flex items-start gap-3 opacity-50">
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <span className="text-sm">{u.label}</span>
                <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                  Upcoming
                </span>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Facility contact */}
      {data.facility && (
        <section className="mt-4 rounded-lg border bg-card p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Facility contact
          </h2>
          <div className="mt-3 space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{data.facility.name}</span>
            </div>
            {(data.facility.address_line_1 || data.facility.city) && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                <span>
                  {data.facility.address_line_1}
                  {data.facility.address_line_1 ? ", " : ""}
                  {data.facility.city}, {data.facility.state} {data.facility.zip}
                </span>
              </div>
            )}
            {data.facility.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                <a href={`tel:${data.facility.phone}`} className="text-violet-700 hover:underline">
                  {data.facility.phone}
                </a>
              </div>
            )}
            {data.facility.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                <a href={`mailto:${data.facility.email}`} className="text-violet-700 hover:underline">
                  {data.facility.email}
                </a>
              </div>
            )}
          </div>
        </section>
      )}

      {data.level_of_care && (
        <section className="mt-4 rounded-lg border bg-card p-4 text-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Details
          </h2>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <dt className="text-muted-foreground">Level of care</dt>
            <dd className="font-medium">{data.level_of_care.replace(/_/g, " ")}</dd>
            {data.inquirer_name && (
              <>
                <dt className="text-muted-foreground">Inquirer</dt>
                <dd className="font-medium">
                  {data.inquirer_name}
                  {data.inquirer_relationship && (
                    <span className="ml-1 text-muted-foreground">
                      ({data.inquirer_relationship.replace(/_/g, " ")})
                    </span>
                  )}
                </dd>
              </>
            )}
          </dl>
        </section>
      )}
    </div>
  )
}

function StageChip({ stage, label }: { stage: string; label: string }) {
  const tone = stage === "admitted"
    ? "bg-emerald-500/15 text-emerald-700"
    : stage === "declined" || stage === "withdrew"
    ? "bg-stone-500/15 text-stone-700"
    : "bg-violet-500/15 text-violet-700"
  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", tone)}>
      {label}
    </span>
  )
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return iso
  }
}

function fmtRelative(iso: string): string {
  try {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000
    if (diff < 60) return "just now"
    if (diff < 3600) return `${Math.round(diff / 60)}m ago`
    if (diff < 86400) return `${Math.round(diff / 3600)}h ago`
    const days = Math.round(diff / 86400)
    if (days < 30) return `${days}d ago`
    return fmtDate(iso)
  } catch {
    return iso
  }
}
