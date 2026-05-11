import { Card, CardContent } from "@/components/ui/card"

export function NetworkDashboard() {
  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Network</h1>
        <p className="text-sm text-muted-foreground">
          Cross-facility analytics for your portfolio.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {["Avg occupancy", "Total census", "Compliance score"].map((label) => (
          <Card key={label}>
            <CardContent className="p-5">
              <div className="text-sm text-muted-foreground">{label}</div>
              <div className="mt-2 text-2xl font-semibold">—</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
