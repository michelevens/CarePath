import { Routes, Route } from "react-router-dom"
import { LandingPage } from "@/pages/LandingPage"
import { SearchPage } from "@/pages/SearchPage"
import { FacilityDetailPage } from "@/pages/FacilityDetailPage"
import { LoginPage } from "@/pages/LoginPage"
import { SignupPage } from "@/pages/SignupPage"
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage"
import { ResetPasswordPage } from "@/pages/ResetPasswordPage"
import { VerifyEmailPage } from "@/pages/VerifyEmailPage"
import { SecuritySettingsPage } from "@/pages/SecuritySettingsPage"
import { PortalShell } from "@/components/PortalShell"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { FamilyDashboard } from "@/portals/family/FamilyDashboard"
import { ResidentDashboard } from "@/portals/resident/ResidentDashboard"
import { StaffDashboard } from "@/portals/staff/StaffDashboard"
import { AdminDashboard } from "@/portals/admin/AdminDashboard"
import { NetworkDashboard } from "@/portals/network/NetworkDashboard"
import { ReferralDashboard } from "@/portals/referral/ReferralDashboard"
import { SuperAdminDashboard } from "@/portals/superadmin/SuperAdminDashboard"
import { MasterDataPage } from "@/portals/superadmin/MasterDataPage"
import { AuditLogPage } from "@/portals/superadmin/AuditLogPage"
import { FacilityDataPage } from "@/portals/admin/FacilityDataPage"
import { AdmissionsKanban } from "@/portals/admin/AdmissionsKanban"
import { ToursPage } from "@/portals/admin/ToursPage"
import { LeadsPage } from "@/portals/admin/LeadsPage"
import { CarePlanIndex } from "@/portals/staff/CarePlanIndex"
import { CarePlanDetail } from "@/portals/staff/CarePlanDetail"
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
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />

      {/* Authenticated, portal-agnostic */}
      <Route
        path="/settings/security"
        element={
          <ProtectedRoute>
            <SecuritySettingsPage />
          </ProtectedRoute>
        }
      />

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
          {path === "superadmin" && (
            <>
              <Route path="master-data" element={<MasterDataPage />} />
              <Route path="audit" element={<AuditLogPage />} />
            </>
          )}
          {path === "admin" && (
            <>
              <Route path="admissions" element={<AdmissionsKanban />} />
              <Route path="tours" element={<ToursPage />} />
              <Route path="leads" element={<LeadsPage />} />
              <Route path="data" element={<FacilityDataPage />} />
            </>
          )}
          {path === "staff" && (
            <>
              <Route path="care-plans" element={<CarePlanIndex />} />
              <Route path="care-plans/:residentId" element={<CarePlanDetail />} />
            </>
          )}
        </Route>
      ))}

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
