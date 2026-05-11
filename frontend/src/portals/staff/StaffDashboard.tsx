import { Card, CardContent } from "@/components/ui/card"

export function StaffDashboard() {
  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
        <p className="text-sm text-muted-foreground">
          Shift: 7:00 AM – 3:00 PM · 18 residents assigned
        </p>
      </div>
      <Card>
        <CardContent className="p-6">
          <h2 className="font-semibold">Care tasks</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Resident-by-resident task list and shift handoff goes here.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
