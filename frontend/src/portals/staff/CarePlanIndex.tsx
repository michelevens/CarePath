import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Loader2, ShieldCheck, FileEdit } from "lucide-react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"

interface CarePlanRow {
  id: string
  resident_id: string
  status: "draft" | "active" | "on_hold" | "archived"
  started_at: string | null
  signed_at: string | null
  signed_by_name: string | null
  items_count: number
  resident: {
    id: string
    first_name: string
    last_name: string
    level_of_care: string | null
    mrn: string | null
    status: string
  }
}

const STATUS_STYLE: Record<CarePlanRow["status"], string> = {
  active: "bg-foreground text-background",
  draft: "bg-muted text-muted-foreground",
  on_hold: "bg-amber-500/20 text-amber-700",
  archived: "bg-muted-foreground/30 text-muted-foreground",
}

export function CarePlanIndex() {
  const { user } = useAuth()
  const facilityId = user?.active_facility?.id

  const [rows, setRows] = useState<CarePlanRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!facilityId) return
    let alive = true
    setLoading(true)
    api
      .get<{ data: CarePlanRow[] }>("/facility/care-plans", {
        headers: { "X-Facility-Id": facilityId },
      })
      .then((r) => alive && setRows(r.data.data))
      .catch((err) => alive && setError(err.response?.data?.message ?? "Failed to load"))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [facilityId])

  if (!facilityId) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        Select a facility from the switcher to view care plans.
      </div>
    )
  }

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Care plans</h1>
        <p className="text-sm text-muted-foreground">
          {user?.active_facility?.name} · Active care plans across residents.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No care plans yet.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Resident</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">MRN</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Level</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Items</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Signed</th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-medium">
                      {row.resident.last_name}, {row.resident.first_name}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                      {row.resident.mrn ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 capitalize text-muted-foreground">
                      {row.resident.level_of_care ?? "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={cn(
                          "inline-flex rounded px-1.5 py-0.5 text-xs font-medium capitalize",
                          STATUS_STYLE[row.status]
                        )}
                      >
                        {row.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{row.items_count}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {row.signed_at ? (
                        <span className="inline-flex items-center gap-1 text-foreground">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          {row.signed_by_name}
                        </span>
                      ) : (
                        "Unsigned"
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Link
                        to={`/staff/care-plans/${row.resident_id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-foreground underline"
                      >
                        <FileEdit className="h-3.5 w-3.5" />
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
