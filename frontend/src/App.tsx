import { Routes, Route } from "react-router-dom"
import { LandingPage } from "@/pages/LandingPage"
import { SearchPage } from "@/pages/SearchPage"
import { FacilityDetailPage } from "@/pages/FacilityDetailPage"
import { LoginPage } from "@/pages/LoginPage"
import { SignupPage } from "@/pages/SignupPage"
import { PortalShell } from "@/components/PortalShell"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { FamilyDashboard } from "@/portals/family/FamilyDashboard"
import { ResidentDashboard } from "@/portals/resident/ResidentDashboard"
import { StaffDashboard } from "@/portals/staff/StaffDashboard"
import { AdminDashboard } from "@/portals/admin/AdminDashboard"
import { NetworkDashboard } from "@/portals/network/NetworkDashboard"
import { ReferralDashboard } from "@/portals/referral/ReferralDashboard"
import { SuperAdminDashboard } from "@/portals/superadmin/SuperAdminDashboard"
import { NotFoundPage } from "@/pages/NotFoundPage"

const PORTALS = [
  { path: "family", Dashboard: FamilyDashboard },
  { path: "resident", Dashboard: ResidentDashboard },
  { path: "staff", Dashboard: StaffDashboard },
  { path: "admin", Dashboard: AdminDashboard },
  { path: "network", Dashboard: NetworkDashboard },
  { path: "referral", Dashboard: ReferralDashboard },
  { path: "superadmin", Dashboard: SuperAdminDashboard },
] as const

function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/facility/:slug" element={<FacilityDetailPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Portals — gated by ProtectedRoute */}
      {PORTALS.map(({ path, Dashboard }) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <ProtectedRoute portal={path}>
              <PortalShell portal={path} />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
        </Route>
      ))}

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
