import { useEffect, useMemo, useState } from "react"
import {
  Building2,
  CheckCircle2,
  ExternalLink,
  Filter,
  Search,
  Tag,
  Users,
  XCircle,
} from "lucide-react"
import { api } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/card"

interface LicenseCategory {
  id: string
  state: string
  source_term: string
  canonical_type: string | null
  license_subtype: string | null
  rejected: boolean
  rejection_reason: string | null
  accepted_populations: string[] | null
  payer_programs: string[] | null
  funding_authority: string | null
  eligibility_notes: string | null
  regulator: string | null
  notes: string | null
  source_url: string | null
  is_seeded: boolean
}

interface Payload {
  data: LicenseCategory[]
  states: Record<string, { count: number; mapped: number; rejected: number }>
  enums: {
    canonical_types: string[]
    populations: string[]
    payers: string[]
  }
}

const TYPE_LABEL: Record<string, string> = {
  snf: "Skilled Nursing",
  assisted_living: "Assisted Living",
  memory_care: "Memory Care",
  ccrc: "Continuing Care",
  independent_living: "Independent Living",
  group_home: "Group Home",
  adult_family_home: "Adult Family Home",
  icf_iid: "ICF/IID",
}

const TYPE_COLOR: Record<string, string> = {
  snf: "bg-blue-100 text-blue-800",
  assisted_living: "bg-violet-100 text-violet-700",
  memory_care: "bg-purple-100 text-purple-700",
  ccrc: "bg-emerald-100 text-emerald-700",
  independent_living: "bg-stone-100 text-stone-700",
  group_home: "bg-amber-100 text-amber-800",
  adult_family_home: "bg-indigo-100 text-indigo-700",
  icf_iid: "bg-cyan-100 text-cyan-800",
}

const POPULATION_LABEL: Record<string, string> = {
  general_seniors: "General seniors",
  idd_adults: "IDD adults",
  memory_care_residents: "Memory care",
  mental_health: "Mental health",
  bariatric: "Bariatric",
  ventilator_dependent: "Ventilator",
  young_adults: "Young adults (18-59)",
  youth: "Youth (<18)",
}

const PAYER_LABEL: Record<string, string> = {
  private_pay: "Private pay",
  medicaid_long_term_care: "Medicaid LTC",
  medicaid_hcbs_waiver: "Medicaid HCBS waiver",
  medicaid_idd_waiver: "Medicaid IDD waiver",
  medicare_part_a: "Medicare Part A",
  va_aid_attendance: "VA Aid & Attendance",
  ltc_insurance: "LTC insurance",
  state_supplement: "State supplement",
  ssi_state_supplement: "SSI / SSP",
}

export function LicensingPage() {
  const [payload, setPayload] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stateFilter, setStateFilter] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [q, setQ] = useState("")

  useEffect(() => {
    setLoading(true)
    api
      .get<Payload>("/superadmin/licensing", { params: { state: stateFilter, canonical_type: typeFilter } })
      .then((r) => setPayload(r.data ?? null))
      .catch((e: unknown) => {
        const err = e as { response?: { data?: { message?: string } } }
        setError(err.response?.data?.message ?? "Failed to load")
      })
      .finally(() => setLoading(false))
  }, [stateFilter, typeFilter])

  const filtered = useMemo(() => {
    if (!payload) return []
    if (!q) return payload.data
    const needle = q.toLowerCase()
    return payload.data.filter(
      (r) =>
        r.source_term.toLowerCase().includes(needle) ||
        (r.notes ?? "").toLowerCase().includes(needle) ||
        (r.regulator ?? "").toLowerCase().includes(needle) ||
        (r.funding_authority ?? "").toLowerCase().includes(needle),
    )
  }, [payload, q])

  if (loading && !payload) {
    return <div className="p-8 text-sm text-muted-foreground">Loading licensing reference…</div>
  }
  if (error || !payload) {
    return (
      <div className="p-8">
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error ?? "Unavailable"}
        </div>
      </div>
    )
  }

  const stateOptions = Object.keys(payload.states).sort()

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">State licensing reference</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Canonical mapping from state-licensure terms to CarePath facility types,
          plus client eligibility + payer programs. Backs the CSV / OSM ingest
          pipeline and is editable here for cases the seeder didn't cover.
        </p>
      </div>

      {/* States summary */}
      <Card>
        <CardContent className="space-y-3 p-5">
          <h2 className="text-sm font-semibold">Coverage by state</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 lg:grid-cols-10">
            {stateOptions.map((s) => {
              const stats = payload.states[s]
              return (
                <button
                  key={s}
                  onClick={() => setStateFilter(stateFilter === s ? "" : s)}
                  className={`rounded-md border p-2 text-center transition-colors ${
                    stateFilter === s
                      ? "border-violet-400 bg-violet-50"
                      : "hover:border-violet-200 hover:bg-muted/30"
                  }`}
                >
                  <div className="font-mono text-sm font-semibold">{s}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {stats.count} categor{stats.count !== 1 ? "ies" : "y"}
                  </div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Filter bar */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search term, regulator, funding authority…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 rounded-md border bg-background px-2 text-sm"
          >
            <option value="">All canonical types</option>
            {payload.enums.canonical_types.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABEL[t] ?? t}
              </option>
            ))}
          </select>
          {(stateFilter || typeFilter || q) && (
            <button
              onClick={() => {
                setStateFilter("")
                setTypeFilter("")
                setQ("")
              }}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <Filter className="h-3 w-3" />
              Clear
            </button>
          )}
          <span className="text-xs text-muted-foreground">
            {filtered.length} of {payload.data.length}
          </span>
        </CardContent>
      </Card>

      {/* Cards grid */}
      <div className="grid gap-3 lg:grid-cols-2">
        {filtered.map((r) => (
          <Card key={r.id} className={r.rejected ? "border-destructive/30 bg-destructive/5" : ""}>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 font-mono text-xs">
                      {r.state}
                    </span>
                    <h3 className="text-sm font-semibold">{r.source_term}</h3>
                    {!r.is_seeded && (
                      <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] text-violet-700">
                        custom
                      </span>
                    )}
                  </div>
                  {r.regulator && (
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      Regulator: {r.regulator}
                    </div>
                  )}
                </div>
                {r.rejected ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
                    <XCircle className="h-3 w-3" />
                    Rejected
                  </span>
                ) : (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      TYPE_COLOR[r.canonical_type ?? "unknown"] ?? "bg-stone-200 text-stone-700"
                    }`}
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    {TYPE_LABEL[r.canonical_type ?? ""] ?? r.canonical_type}
                    {r.license_subtype && <span className="opacity-70">· {r.license_subtype}</span>}
                  </span>
                )}
              </div>

              {r.rejected && r.rejection_reason && (
                <div className="rounded-md bg-destructive/5 p-2 text-xs text-destructive">
                  {r.rejection_reason}
                </div>
              )}

              {r.funding_authority && (
                <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <Building2 className="mt-0.5 h-3 w-3 shrink-0" />
                  <span>
                    <strong className="text-foreground">Funded by:</strong> {r.funding_authority}
                  </span>
                </div>
              )}

              {r.accepted_populations && r.accepted_populations.length > 0 && (
                <div className="flex flex-wrap items-center gap-1">
                  <Users className="h-3 w-3 text-muted-foreground" />
                  {r.accepted_populations.map((p) => (
                    <span
                      key={p}
                      className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-800"
                    >
                      {POPULATION_LABEL[p] ?? p}
                    </span>
                  ))}
                </div>
              )}

              {r.payer_programs && r.payer_programs.length > 0 && (
                <div className="flex flex-wrap items-center gap-1">
                  <Tag className="h-3 w-3 text-muted-foreground" />
                  {r.payer_programs.map((p) => (
                    <span
                      key={p}
                      className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-800"
                    >
                      {PAYER_LABEL[p] ?? p}
                    </span>
                  ))}
                </div>
              )}

              {r.eligibility_notes && (
                <p className="text-[11px] italic text-muted-foreground">
                  {r.eligibility_notes}
                </p>
              )}

              {(r.notes || r.source_url) && (
                <div className="border-t pt-2 text-[11px]">
                  {r.notes && <p className="text-muted-foreground">{r.notes}</p>}
                  {r.source_url && (
                    <a
                      href={r.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-violet-700 hover:underline"
                    >
                      Source <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
