import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Calendar, Loader2, Mail, MapPin } from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"

interface PipelineAdmission {
  id: string
  stage: string
  inquirer_name: string | null
  inquirer_email: string | null
  prospect_first_name: string | null
  prospect_last_name: string | null
  prospect_level_of_care: string | null
  target_admit_date: string | null
  facility: { name: string; slug: string; city: string; state: string } | null
  attribution_source: string | null
  created_at: string
}

interface PipelineResponse {
  admissions: PipelineAdmission[]
  by_stage: Record<string, number>
}

const STAGE_LABELS: Record<string, string> = {
  inquiry: "Inquiry",
  tour_scheduled: "Tour scheduled",
  toured: "Toured",
  assessment: "Assessment",
  approved: "Approved",
  admitted: "Admitted",
  declined: "Declined",
  withdrew: "Withdrew",
}

const STAGE_ORDER = ["inquiry", "tour_scheduled", "toured", "assessment", "approved", "admitted"]

export function ReferralPipelinePage() {
  const [data, setData] = useState<PipelineResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [stageFilter, setStageFilter] = useState<string>("active")

  useEffect(() => {
    let alive = true
    api
      .get<{ data: PipelineResponse }>("/referral/pipeline")
      .then((r) => alive && setData(r.data?.data ?? null))
      .catch(() => alive && setData(null))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  const filtered = useMemo(() => {
    if (!data) return []
    if (stageFilter === "all") return data.admissions
    if (stageFilter === "active") {
      return data.admissions.filter((a) =>
        ["inquiry", "tour_scheduled", "toured", "assessment", "approved"].includes(a.stage)
      )
    }
    return data.admissions.filter((a) => a.stage === stageFilter)
  }, [data, stageFilter])

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading pipeline…
      </div>
    )
  }

  const total = data?.admissions.length ?? 0
  const activeCount = data
    ? data.admissions.filter((a) =>
        ["inquiry", "tour_scheduled", "toured", "assessment", "approved"].includes(a.stage)
      ).length
    : 0

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Active pipeline</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every inquiry and tour you sourced. Track them from first contact to
          admission.
        </p>
      </div>

      {/* Stage counters */}
      {data && (
        <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-6">
          {STAGE_ORDER.map((stage) => (
            <StageTile key={stage} label={STAGE_LABELS[stage]} count={data.by_stage[stage] ?? 0} />
          ))}
        </div>
      )}

      {/* Stage filter */}
      <div className="flex flex-wrap gap-2">
        <FilterPill active={stageFilter === "active"} onClick={() => setStageFilter("active")}>
          Active ({activeCount})
        </FilterPill>
        <FilterPill active={stageFilter === "all"} onClick={() => setStageFilter("all")}>
          All ({total})
        </FilterPill>
        {STAGE_ORDER.map((s) => (
          <FilterPill key={s} active={stageFilter === s} onClick={() => setStageFilter(s)}>
            {STAGE_LABELS[s]} ({data?.by_stage[s] ?? 0})
          </FilterPill>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {total === 0
              ? "No leads sourced yet. Share your advisor link with families or hospital case managers to start filling the pipeline."
              : "No leads in this stage."}
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5 text-left font-medium">Family / Resident</th>
                <th className="px-3 py-2.5 text-left font-medium">Facility</th>
                <th className="px-3 py-2.5 text-left font-medium">Stage</th>
                <th className="px-3 py-2.5 text-left font-medium">Source</th>
                <th className="px-3 py-2.5 text-left font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="border-t hover:bg-muted/20">
                  <td className="px-3 py-3 align-top">
                    <div className="font-medium">
                      {a.prospect_first_name} {a.prospect_last_name}
                    </div>
                    {a.prospect_level_of_care && (
                      <div className="mt-0.5 text-xs text-muted-foreground capitalize">
                        {a.prospect_level_of_care} care
                      </div>
                    )}
                    {a.inquirer_name && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        Family contact: {a.inquirer_name}
                      </div>
                    )}
                    {a.inquirer_email && (
                      <div className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <a href={`mailto:${a.inquirer_email}`} className="hover:text-foreground">
                          {a.inquirer_email}
                        </a>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3 align-top">
                    {a.facility ? (
                      <>
                        <Link to={`/facility/${a.facility.slug}`} className="font-semibold text-primary hover:underline">
                          {a.facility.name}
                        </Link>
                        <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {a.facility.city}, {a.facility.state}
                        </div>
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 align-top">
                    <StagePill stage={a.stage} />
                    {a.target_admit_date && (
                      <div className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        Target: {new Date(a.target_admit_date).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3 align-top text-xs text-muted-foreground">
                    {a.attribution_source ? a.attribution_source.replace("_", " ") : "—"}
                  </td>
                  <td className="px-3 py-3 align-top text-xs text-muted-foreground">
                    {new Date(a.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function StageTile({ label, count }: { label: string; count: number }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 text-xl font-semibold tabular-nums">{count}</div>
      </CardContent>
    </Card>
  )
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:border-primary hover:text-foreground"
      )}
    >
      {children}
    </button>
  )
}

function StagePill({ stage }: { stage: string }) {
  const tone =
    stage === "admitted"
      ? "bg-primary/10 text-primary"
      : ["declined", "withdrew"].includes(stage)
      ? "bg-destructive/10 text-destructive"
      : ["approved"].includes(stage)
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
      : "bg-accent text-accent-foreground"
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize", tone)}>
      {STAGE_LABELS[stage] ?? stage}
    </span>
  )
}
