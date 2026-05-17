import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import {
  Award,
  CheckCircle2,
  DollarSign,
  HeartHandshake,
  MapPin,
  Phone,
  ShieldCheck,
  TrendingUp,
} from "lucide-react"
import { api } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/card"
import { Meta } from "@/components/Meta"

interface AdvisorPublic {
  agency_name: string | null
  agency_slug: string
  agency_website: string | null
  bio: string | null
  phone: string | null
  licensed_states: string[]
  service_area_zips: string[]
  commission_split_advisor_pct: number
  commission_split_platform_pct: number
  charges_families: boolean
  family_consultation_fee_cents: number | null
  verified: boolean
  verified_at: string | null
  payout_ready: boolean
  is_accepting_referrals: boolean
  stats: {
    placements_lifetime: number
    placements_retained: number
  }
}

export function PublicAdvisorPage() {
  const { slug } = useParams<{ slug: string }>()
  const [advisor, setAdvisor] = useState<AdvisorPublic | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    api
      .get<{ data: AdvisorPublic }>(`/marketplace/advisors/${slug}`)
      .then((r) => setAdvisor(r.data?.data ?? null))
      .catch((e: unknown) => {
        const err = e as { response?: { data?: { message?: string }; status?: number } }
        setError(
          err.response?.status === 404
            ? "Advisor not found"
            : err.response?.data?.message ?? "Failed to load",
        )
      })
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) {
    return <div className="p-8 text-sm text-muted-foreground">Loading…</div>
  }
  if (error || !advisor) {
    return (
      <div className="p-8">
        <p className="text-sm text-destructive">{error ?? "Unavailable"}</p>
        <Link to="/" className="mt-4 inline-block text-sm text-violet-700 hover:underline">
          ← Back to home
        </Link>
      </div>
    )
  }

  const retainedPct =
    advisor.stats.placements_lifetime > 0
      ? Math.round((advisor.stats.placements_retained / advisor.stats.placements_lifetime) * 100)
      : null

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <Meta
        title={`${advisor.agency_name ?? "Placement advisor"} · CarePath`}
        description={`${advisor.agency_name ?? "Placement advisor"} — verified placement advisor on CarePath. Licensed in ${advisor.licensed_states.join(", ")}.`}
      />

      {/* Header */}
      <Card>
        <CardContent className="space-y-3 p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <HeartHandshake className="h-6 w-6 text-violet-700" />
              <div>
                <h1 className="text-2xl font-semibold">{advisor.agency_name ?? "Placement advisor"}</h1>
                {advisor.verified && (
                  <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                    <ShieldCheck className="h-3 w-3" />
                    Verified placement advisor
                  </div>
                )}
              </div>
            </div>
            {advisor.is_accepting_referrals ? (
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
                Accepting referrals
              </span>
            ) : (
              <span className="rounded-full bg-stone-200 px-2.5 py-1 text-xs font-medium text-stone-700">
                Not currently accepting referrals
              </span>
            )}
          </div>

          {advisor.bio && (
            <p className="text-sm text-muted-foreground leading-relaxed">{advisor.bio}</p>
          )}

          <div className="flex flex-wrap gap-4 border-t pt-3 text-sm text-muted-foreground">
            {advisor.phone && (
              <span className="inline-flex items-center gap-1">
                <Phone className="h-4 w-4" />
                {advisor.phone}
              </span>
            )}
            {advisor.agency_website && (
              <a
                href={advisor.agency_website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-700 hover:underline"
              >
                {advisor.agency_website}
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transparent fee disclosure — the brand bet */}
      <Card className="border-violet-200 bg-violet-50/40">
        <CardContent className="space-y-2 p-5">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-violet-700" />
            <h2 className="text-sm font-semibold">How this advisor gets paid</h2>
          </div>
          <p className="text-sm">
            {advisor.charges_families ? (
              <>
                <strong>Charges families:</strong> Yes —{" "}
                {advisor.family_consultation_fee_cents
                  ? `$${(advisor.family_consultation_fee_cents / 100).toFixed(0)} consultation fee`
                  : "fee disclosed at first meeting"}
                .
              </>
            ) : (
              <>
                <strong>Charges families:</strong> No — services are free to you.
              </>
            )}
          </p>
          <p className="text-sm">
            <strong>Placement-fee split:</strong> When you choose a facility through
            this advisor, the facility pays a placement fee. CarePath takes{" "}
            <strong className="font-mono">{advisor.commission_split_platform_pct}%</strong>{" "}
            and the advisor keeps{" "}
            <strong className="font-mono">{advisor.commission_split_advisor_pct}%</strong>.
            That split is fixed and visible to you up front — there's no hidden
            kickback structure.
          </p>
        </CardContent>
      </Card>

      {/* Coverage */}
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Where they place</h2>
          </div>
          {advisor.licensed_states.length > 0 ? (
            <div>
              <div className="text-xs text-muted-foreground">Licensed in</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {advisor.licensed_states.map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-stone-100 px-2 py-0.5 font-mono text-xs"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No states listed.</p>
          )}
          {advisor.service_area_zips.length > 0 && (
            <div>
              <div className="text-xs text-muted-foreground">Service area (ZIP codes)</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {advisor.service_area_zips.slice(0, 25).map((z) => (
                  <span
                    key={z}
                    className="rounded-full bg-stone-100 px-2 py-0.5 font-mono text-xs"
                  >
                    {z}
                  </span>
                ))}
                {advisor.service_area_zips.length > 25 && (
                  <span className="text-xs text-muted-foreground">
                    + {advisor.service_area_zips.length - 25} more
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Track record */}
      {advisor.stats.placements_lifetime > 0 && (
        <Card>
          <CardContent className="grid grid-cols-3 gap-3 p-5 text-center">
            <div>
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                Placements
              </div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">
                {advisor.stats.placements_lifetime}
              </div>
              <div className="text-[11px] text-muted-foreground">lifetime</div>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <Award className="h-3 w-3" />
                Retained
              </div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">
                {advisor.stats.placements_retained}
              </div>
              <div className="text-[11px] text-muted-foreground">past 30+ days</div>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3 w-3" />
                Retention
              </div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">
                {retainedPct !== null ? `${retainedPct}%` : "—"}
              </div>
              <div className="text-[11px] text-muted-foreground">
                of lifetime placements
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Verified advisors on CarePath are vetted before they can receive
        commission payouts. Verification confirms identity + license status in
        any state where one's required — it isn't an endorsement of any specific
        placement decision.
      </p>
    </div>
  )
}
