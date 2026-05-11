import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bed, Users, ClipboardCheck, AlertTriangle } from "lucide-react"

const KPIS = [
  { label: "Occupancy", value: "94%", change: "+2.1%", icon: Bed },
  { label: "Census", value: "118 / 125", change: "+3", icon: Users },
  { label: "Pending admissions", value: "7", change: "+2", icon: ClipboardCheck },
  { label: "Open compliance items", value: "3", change: "-1", icon: AlertTriangle },
]

const BEDS = Array.from({ length: 24 }, (_, i) => ({
  room: `${100 + i}`,
  status:
    i % 8 === 0 ? "available" : i % 11 === 0 ? "reserved" : "occupied",
}))

export function AdminDashboard() {
  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Census</h1>
          <p className="text-sm text-muted-foreground">
            Sunset Manor · Phoenix, AZ
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Export</Button>
          <Button>New admission</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {KPIS.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{k.label}</span>
                <k.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-semibold">{k.value}</span>
                <span className="text-xs text-muted-foreground">{k.change}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Bed board</h2>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-foreground/80" />
                Occupied
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                Reserved
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full border border-foreground" />
                Available
              </span>
            </div>
          </div>
          <div className="grid grid-cols-8 gap-2">
            {BEDS.map((b) => (
              <button
                key={b.room}
                className={
                  "aspect-square rounded-md border p-2 text-left text-xs transition-colors hover:border-foreground " +
                  (b.status === "occupied"
                    ? "bg-foreground/80 text-background"
                    : b.status === "reserved"
                    ? "bg-muted-foreground/20"
                    : "bg-background")
                }
              >
                <div className="font-medium">{b.room}</div>
                <div className="mt-1 capitalize opacity-70">{b.status}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
