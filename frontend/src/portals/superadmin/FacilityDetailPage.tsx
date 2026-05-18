import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { Loader2 } from "lucide-react"
import { api } from "@/lib/api"
import {
  PortalFacilityHeader,
  PortalSectionCard,
  PortalStatTile,
} from "@/components/PortalFacilityHeader"

interface Payload {
  facility: {
    name: string
    slug: string
    type: string | null
    city: string | null
    state: string | null
    zip: string | null
    cms_five_star_overall: number | null
    subscription_tier: string | null
    is_active: boolean
    data_source: string | null
  }
  beds: { total: number; available: number; occupied: number; maintenance: number }
  admins: Array<{ id: string; name: string; email: string; verified: boolean; role: string }>
  claims: Array<{
    id: string
    claimer_name: string
    claimer_title: string | null
    claimer_email: string
    status: string
    created_at: string
    reviewed_at: string | null
  }>
  sponsored_campaigns: Array<{
    id: string
    name: string
    status: string
    bid_cents: number | null
    monthly_budget_cents: number | null
    created_at: string
  }>
  placements_recent: Array<{
    id: string
    advisor: { name: string } | null
    resident: { first_name: string; last_name: string } | null
    status: string
    admitted_on: string | null
    gross_fee_cents: number
    advisor_payout_cents: number
  }>
  placements_summary: {
    count: number
    gross_cents_lifetime: number
    platform_cents_lifetime: number
    by_status: Record<string, number>
  }
  event_funnel_30d: Record<string, number>
  audit_recent: Array<{
    id: string
    action: string
    auditable_type: string
    auditable_id: string | null
    user_id: string | null
    occurred_at: string
  }>
}

const dollars = (cents: number) => `$${Math.round(cents / 100).toLocaleString()}`

export function FacilityDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const [data, setData] = useState<Payload | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    let alive = true
    setData(null)
    setError(null)
    api
      .get<{ data: Payload }>(`/superadmin/facilities/${slug}`)
      .then((r) => alive && setData(r.data.data))
      .catch((e) => alive && setError(e.response?.data?.message ?? "Failed to load facility."))
    return () => {
      alive = false
    }
  }, [slug])

  if (error) {
    return <div className="p-8 text-sm text-red-700">{error}</div>
  }
  if (!data) {
    return (
      <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading facility…
      </div>
    )
  }

  const f = data.facility

  return (
    <div className="space-y-5 p-5 sm:p-8">
      <Link to="/superadmin/tenants" className="text-xs text-muted-foreground hover:underline">
        ← All facilities
      </Link>
      <PortalFacilityHeader
        name={f.name}
        type={f.type}
        city={f.city}
        state={f.state}
        zip={f.zip}
        cmsFiveStarOverall={f.cms_five_star_overall}
        publicSlug={f.slug}
        chips={
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full border bg-muted/40 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide">
              {f.subscription_tier ?? "free"}
            </span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${
                f.is_active
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-stone-200 bg-stone-50 text-stone-700"
              }`}
            >
              {f.is_active ? "Active" : "Inactive"}
            </span>
            {f.data_source && (
              <span className="rounded-full border bg-muted/40 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide">
                src: {f.data_source}
              </span>
            )}
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <PortalStatTile label="Beds total" value={data.beds.total} />
        <PortalStatTile label="Available" value={data.beds.available} hint={`${data.beds.occupied} occupied`} />
        <PortalStatTile label="Admins" value={data.admins.length} />
        <PortalStatTile label="Placements" value={data.placements_summary.count} />
      </div>

      <PortalSectionCard title="Tenant team" subtitle="Users with facility-scoped access.">
        {data.admins.length === 0 ? (
          <p className="text-sm text-muted-foreground">No admins linked. The facility is platform-managed.</p>
        ) : (
          <ul className="divide-y">
            {data.admins.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <div className="font-medium">{a.name}</div>
                  <div className="text-xs text-muted-foreground">{a.email}</div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="rounded border bg-accent/40 px-1.5 py-0.5 font-medium">{a.role ?? "—"}</span>
                  {a.verified ? (
                    <span className="text-emerald-700">verified</span>
                  ) : (
                    <span className="text-amber-700">unverified</span>
                  )}
                  <Link to={`/superadmin/users/${a.id}`} className="text-primary hover:underline">
                    View user
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </PortalSectionCard>

      <PortalSectionCard title="Claim history" subtitle="Self-serve claim attempts on this listing.">
        {data.claims.length === 0 ? (
          <p className="text-sm text-muted-foreground">No claim submissions yet.</p>
        ) : (
          <ul className="divide-y">
            {data.claims.map((c) => (
              <li key={c.id} className="grid grid-cols-1 gap-1 py-2 text-sm sm:grid-cols-[1fr_auto]">
                <div>
                  <div className="font-medium">{c.claimer_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.claimer_title ? `${c.claimer_title} · ` : ""}
                    {c.claimer_email}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span
                    className={`rounded border px-1.5 py-0.5 font-medium uppercase tracking-wide ${
                      c.status === "approved"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : c.status === "pending"
                        ? "border-amber-200 bg-amber-50 text-amber-800"
                        : c.status === "rejected"
                        ? "border-red-200 bg-red-50 text-red-800"
                        : "bg-muted/40"
                    }`}
                  >
                    {c.status}
                  </span>
                  <span className="text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString()}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </PortalSectionCard>

      <PortalSectionCard
        title="Sponsored campaigns"
        subtitle="Self-serve sponsored placements on the search surface."
      >
        {data.sponsored_campaigns.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sponsored campaigns.</p>
        ) : (
          <ul className="divide-y">
            {data.sponsored_campaigns.map((c) => (
              <li key={c.id} className="grid grid-cols-1 gap-1 py-2 text-sm sm:grid-cols-[1fr_auto]">
                <div>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">
                    bid {c.bid_cents != null ? `${dollars(c.bid_cents)}` : "—"} ·
                    budget {c.monthly_budget_cents != null ? `${dollars(c.monthly_budget_cents)}/mo` : "—"}
                  </div>
                </div>
                <span
                  className={`rounded border px-1.5 py-0.5 text-xs font-medium uppercase ${
                    c.status === "active"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "bg-muted/40 text-muted-foreground"
                  }`}
                >
                  {c.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </PortalSectionCard>

      <PortalSectionCard
        title="Placement summary"
        subtitle="Lifetime advisor placements + commission flow."
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <PortalStatTile
            label="Total"
            value={data.placements_summary.count}
            hint={Object.entries(data.placements_summary.by_status)
              .map(([s, c]) => `${s}: ${c}`)
              .join(" · ")}
          />
          <PortalStatTile
            label="Gross fees"
            value={dollars(data.placements_summary.gross_cents_lifetime)}
            hint="Excluding rescinded"
          />
          <PortalStatTile
            label="Platform share"
            value={dollars(data.placements_summary.platform_cents_lifetime)}
          />
        </div>

        <h3 className="mt-5 mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Recent
        </h3>
        {data.placements_recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">No placements recorded.</p>
        ) : (
          <ul className="divide-y">
            {data.placements_recent.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <div className="font-medium">
                    {p.resident ? `${p.resident.first_name} ${p.resident.last_name}` : "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {p.advisor?.name ?? "Direct"} · {p.status}
                    {p.admitted_on && ` · admitted ${new Date(p.admitted_on).toLocaleDateString()}`}
                  </div>
                </div>
                <div className="text-right text-xs">
                  <div className="font-semibold">{dollars(p.gross_fee_cents)}</div>
                  <div className="text-muted-foreground">payout {dollars(p.advisor_payout_cents)}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </PortalSectionCard>

      <PortalSectionCard
        title="Listing funnel (last 30 days)"
        subtitle="From impression to lead — same data as the public-listing analytics."
      >
        <div className="grid gap-3 sm:grid-cols-4">
          {(["impression", "detail_view", "tour_request", "lead"] as const).map((k) => (
            <PortalStatTile
              key={k}
              label={k.replace("_", " ")}
              value={data.event_funnel_30d[k] ?? 0}
            />
          ))}
        </div>
      </PortalSectionCard>

      <PortalSectionCard
        title="Audit log (last 25 events)"
        subtitle="Append-only record of all writes touching this facility."
        action={
          <Link to="/superadmin/audit" className="text-xs text-primary hover:underline">
            Full audit log →
          </Link>
        }
      >
        {data.audit_recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">No audit entries yet.</p>
        ) : (
          <ul className="divide-y font-mono text-xs">
            {data.audit_recent.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 py-1.5">
                <div className="min-w-0 flex-1 truncate">
                  <span className="font-semibold uppercase">{r.action}</span>{" "}
                  <span className="text-muted-foreground">{r.auditable_type}</span>
                </div>
                <span className="shrink-0 text-muted-foreground">
                  {new Date(r.occurred_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </PortalSectionCard>
    </div>
  )
}
