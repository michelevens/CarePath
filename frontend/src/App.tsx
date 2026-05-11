import { Routes, Route } from "react-router-dom"
import { LandingPage } from "@/pages/LandingPage"
import { SearchPage } from "@/pages/SearchPage"
import { FacilityDetailPage } from "@/pages/FacilityDetailPage"
import { LoginPage } from "@/pages/LoginPage"
import { SignupPage } from "@/pages/SignupPage"
import { PortalShell } from "@/components/PortalShell"
import { FamilyDashboard } from "@/portals/family/FamilyDashboard"
import { ResidentDashboard } from "@/portals/resident/ResidentDashboard"
import { StaffDashboard } from "@/portals/staff/StaffDashboard"
import { AdminDashboard } from "@/portals/admin/AdminDashboard"
import { NetworkDashboard } from "@/portals/network/NetworkDashboard"
import { ReferralDashboard } from "@/portals/referral/ReferralDashboard"
import { SuperAdminDashboard } from "@/portals/superadmin/SuperAdminDashboard"
import { NotFoundPage } from "@/pages/NotFoundPage"

function App() {
  return (
    <Routes>
      {/* Public — Airbnb/Zillow-style marketplace */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/facility/:slug" element={<FacilityDetailPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Portals — each gets its own shell */}
      <Route path="/family" element={<PortalShell portal="family" />}>
        <Route index element={<FamilyDashboard />} />
      </Route>
      <Route path="/resident" element={<PortalShell portal="resident" />}>
        <Route index element={<ResidentDashboard />} />
      </Route>
      <Route path="/staff" element={<PortalShell portal="staff" />}>
        <Route index element={<StaffDashboard />} />
      </Route>
      <Route path="/admin" element={<PortalShell portal="admin" />}>
        <Route index element={<AdminDashboard />} />
      </Route>
      <Route path="/network" element={<PortalShell portal="network" />}>
        <Route index element={<NetworkDashboard />} />
      </Route>
      <Route path="/referral" element={<PortalShell portal="referral" />}>
        <Route index element={<ReferralDashboard />} />
      </Route>
      <Route path="/superadmin" element={<PortalShell portal="superadmin" />}>
        <Route index element={<SuperAdminDashboard />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
