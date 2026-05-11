import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth"
import { Card, CardContent } from "@/components/ui/card"

interface DataRow {
  id: string
  source: "master" | "custom"
  name: string
  code: string | null
  is_active: boolean
  type?: string
  renewal_months?: number
}

const TYPES = [
  { type: "payers", title: "Payers" },
  { type: "levels-of-care", title: "Levels of care" },
  { type: "credential-templates", title: "Credentials" },
] as const

export function FacilityDataPage() {
  const { user } = useAuth()
  const [activeType, setActiveType] = useState<(typeof TYPES)[number]["type"]>(TYPES[0].type)
  const [rows, setRows] = useState<DataRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    api
      .get<{ data: DataRow[] }>(`/facility/data/${activeType}`, {
        headers: user?.active_facility?.id
          ? { "X-Facility-Id": user.active_facility.id }
          : undefined,
      })
      .then((r) => {
        if (alive) setRows(r.data.data)
      })
      .catch((err) => {
        if (alive) {
          setError(
            err.response?.data?.message ??
              "Failed to load. Make sure your account has an active facility."
          )
        }
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [activeType, user?.active_facility?.id])

  const masterCount = rows.filter((r) => r.source === "master").length
  const customCount = rows.filter((r) => r.source === "custom").length

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Facility data</h1>
        <p className="text-sm text-muted-foreground">
          {user?.active_facility?.name ?? "No facility selected"} · Master
          snapshots inherited from the platform plus this facility's customs.
        </p>
      </div>

      <div className="flex gap-1 border-b">
        {TYPES.map((t) => (
          <button
            key={t.type}
            onClick={() => setActiveType(t.type)}
            className={cn(
              "border-b-2 px-4 py-2 text-sm transition-colors",
              t.type === activeType
                ? "border-foreground font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.title}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>
              <span className="font-medium text-foreground">{masterCount}</span>{" "}
              master
            </span>
            <span>
              <span className="font-medium text-foreground">{customCount}</span>{" "}
              custom
            </span>
            <span>
              <span className="font-medium text-foreground">{rows.filter(r=>r.is_active).length}</span>{" "}
              active
            </span>
          </div>

          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                      Source
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                      Code
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                      Name
                    </th>
                    {activeType === "payers" && (
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                        Type
                      </th>
                    )}
                    {activeType === "credential-templates" && (
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                        Renewal
                      </th>
                    )}
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                      Active
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        No rows. Provisioning may not have run yet.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr key={row.id} className="border-t hover:bg-muted/30">
                        <td className="px-4 py-2.5">
                          <span
                            className={cn(
                              "inline-flex rounded px-1.5 py-0.5 text-xs font-medium",
                              row.source === "master"
                                ? "bg-muted text-muted-foreground"
                                : "bg-foreground text-background"
                            )}
                          >
                            {row.source}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs">{row.code ?? "—"}</td>
                        <td className="px-4 py-2.5">{row.name}</td>
                        {activeType === "payers" && (
                          <td className="px-4 py-2.5 text-muted-foreground">{row.type ?? "—"}</td>
                        )}
                        {activeType === "credential-templates" && (
                          <td className="px-4 py-2.5 text-muted-foreground">
                            {row.renewal_months ? `${row.renewal_months}mo` : "—"}
                          </td>
                        )}
                        <td className="px-4 py-2.5 text-right">
                          {row.is_active ? "✓" : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
