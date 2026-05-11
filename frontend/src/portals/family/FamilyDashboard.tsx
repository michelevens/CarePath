import { Card, CardContent } from "@/components/ui/card"

export function FamilyDashboard() {
  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back
        </h1>
        <p className="text-sm text-muted-foreground">
          Care updates for your loved ones.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-muted-foreground">Loved one</div>
            <div className="mt-1 text-lg font-semibold">Margaret Chen</div>
            <div className="mt-2 text-sm">Sunset Manor · Room 218</div>
            <div className="mt-4 text-xs text-muted-foreground">
              Last update: 2 hours ago
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-muted-foreground">Upcoming tour</div>
            <div className="mt-1 text-lg font-semibold">
              Willow Creek Skilled Nursing
            </div>
            <div className="mt-2 text-sm">Tomorrow · 2:00 PM</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
