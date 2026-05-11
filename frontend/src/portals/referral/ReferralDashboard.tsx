import { Card, CardContent } from "@/components/ui/card"

export function ReferralDashboard() {
  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Referral partner
        </h1>
        <p className="text-sm text-muted-foreground">
          Track placements and payouts.
        </p>
      </div>
      <Card>
        <CardContent className="p-6">
          <h2 className="font-semibold">Recent placements</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Placement pipeline and Stripe Connect payout history goes here.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
