import { BedBoard } from "@/portals/admin/BedBoard"
import { CompletenessCoach } from "@/components/CompletenessCoach"

/**
 * Census board + a compact completeness coach above it so admins see
 * "your listing is X% complete" every time they hit the dashboard.
 * Clicking the coach jumps to the full analytics page.
 */
export function AdminDashboard() {
  return (
    <div className="space-y-4">
      <div className="px-4 pt-4">
        <CompletenessCoach variant="compact" />
      </div>
      <BedBoard />
    </div>
  )
}
