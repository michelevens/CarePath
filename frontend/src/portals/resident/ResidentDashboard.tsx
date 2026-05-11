import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function ResidentDashboard() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Good morning, Margaret
        </h1>
        <p className="mt-1 text-base text-muted-foreground">
          Here's your day.
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="text-base text-muted-foreground">Today</div>
          <ul className="mt-3 space-y-3 text-lg">
            <li className="flex items-center justify-between">
              <span>Morning medications</span>
              <span className="text-sm text-muted-foreground">8:00 AM</span>
            </li>
            <li className="flex items-center justify-between">
              <span>Physical therapy</span>
              <span className="text-sm text-muted-foreground">10:30 AM</span>
            </li>
            <li className="flex items-center justify-between">
              <span>Lunch</span>
              <span className="text-sm text-muted-foreground">12:00 PM</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Button size="lg" className="w-full">
        Message my care team
      </Button>
    </div>
  )
}
