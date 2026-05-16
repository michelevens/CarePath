import { lazy, Suspense } from "react"
import { Routes, Route } from "react-router-dom"
import { Loader2 } from "lucide-react"
import { LandingPage } from "@/pages/LandingPage"
import { NotFoundPage } from "@/pages/NotFoundPage"
import { PortalShell } from "@/components/PortalShell"
import { ProtectedRoute } from "@/components/ProtectedRoute"

/**
 * Route-based code splitting. LandingPage and NotFoundPage stay eager
 * (first paint + 404 fallback). Everything else is lazy — most notably
 * SearchPage (Leaflet ~140kb), the per-route admin/staff portals, and
 * the article/guide content surfaces. Before this we shipped one ~1MB
 * bundle on every page load.
 */
const SearchPage = lazy(() => import("@/pages/SearchPage").then(m => ({ default: m.SearchPage })))
const FacilityDetailPage = lazy(() => import("@/pages/FacilityDetailPage").then(m => ({ default: m.FacilityDetailPage })))
const ComparePage = lazy(() => import("@/pages/ComparePage").then(m => ({ default: m.ComparePage })))
const LoginPage = lazy(() => import("@/pages/LoginPage").then(m => ({ default: m.LoginPage })))
const SignupPage = lazy(() => import("@/pages/SignupPage").then(m => ({ default: m.SignupPage })))
const ForgotPasswordPage = lazy(() => import("@/pages/ForgotPasswordPage").then(m => ({ default: m.ForgotPasswordPage })))
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage").then(m => ({ default: m.ResetPasswordPage })))
const VerifyEmailPage = lazy(() => import("@/pages/VerifyEmailPage").then(m => ({ default: m.VerifyEmailPage })))
const ArticlesIndexPage = lazy(() => import("@/pages/ArticlesIndexPage").then(m => ({ default: m.ArticlesIndexPage })))
const ArticleDetailPage = lazy(() => import("@/pages/ArticleDetailPage").then(m => ({ default: m.ArticleDetailPage })))
const ToolsPage = lazy(() => import("@/pages/ToolsPage").then(m => ({ default: m.ToolsPage })))
const GuidesPage = lazy(() => import("@/pages/GuidesPage").then(m => ({ default: m.GuidesPage })))
const WhyCarePathPage = lazy(() => import("@/pages/WhyCarePathPage").then(m => ({ default: m.WhyCarePathPage })))
const StateLandingPage = lazy(() => import("@/pages/StateLandingPage").then(m => ({ default: m.StateLandingPage })))
const CityLandingPage = lazy(() => import("@/pages/CityLandingPage").then(m => ({ default: m.CityLandingPage })))
const CareLevelQuizPage = lazy(() => import("@/pages/CareLevelQuizPage").then(m => ({ default: m.CareLevelQuizPage })))
const MedicaidEligibilityPage = lazy(() => import("@/pages/MedicaidEligibilityPage").then(m => ({ default: m.MedicaidEligibilityPage })))
const VaEligibilityPage = lazy(() => import("@/pages/VaEligibilityPage").then(m => ({ default: m.VaEligibilityPage })))
const SecuritySettingsPage = lazy(() => import("@/pages/SecuritySettingsPage").then(m => ({ default: m.SecuritySettingsPage })))

const FamilyDashboard = lazy(() => import("@/portals/family/FamilyDashboard").then(m => ({ default: m.FamilyDashboard })))
const ResidentDashboard = lazy(() => import("@/portals/resident/ResidentDashboard").then(m => ({ default: m.ResidentDashboard })))
const StaffDashboard = lazy(() => import("@/portals/staff/StaffDashboard").then(m => ({ default: m.StaffDashboard })))
const AdminDashboard = lazy(() => import("@/portals/admin/AdminDashboard").then(m => ({ default: m.AdminDashboard })))
const NetworkDashboard = lazy(() => import("@/portals/network/NetworkDashboard").then(m => ({ default: m.NetworkDashboard })))
const ReferralDashboard = lazy(() => import("@/portals/referral/ReferralDashboard").then(m => ({ default: m.ReferralDashboard })))
const ReferralProfilePage = lazy(() => import("@/portals/referral/ReferralProfilePage").then(m => ({ default: m.ReferralProfilePage })))
const ReferralPayoutsPage = lazy(() => import("@/portals/referral/ReferralPayoutsPage").then(m => ({ default: m.ReferralPayoutsPage })))
const ReferralPipelinePage = lazy(() => import("@/portals/referral/ReferralPipelinePage").then(m => ({ default: m.ReferralPipelinePage })))
const ReferralBillingPage = lazy(() => import("@/portals/referral/ReferralBillingPage").then(m => ({ default: m.ReferralBillingPage })))
const HospitalDashboard = lazy(() => import("@/portals/hospital/HospitalDashboard").then(m => ({ default: m.HospitalDashboard })))
const HospitalProfilePage = lazy(() => import("@/portals/hospital/HospitalProfilePage").then(m => ({ default: m.HospitalProfilePage })))
const HospitalReferralsPage = lazy(() => import("@/portals/hospital/HospitalReferralsPage").then(m => ({ default: m.HospitalReferralsPage })))
const HospitalEmbedPage = lazy(() => import("@/portals/hospital/HospitalEmbedPage").then(m => ({ default: m.HospitalEmbedPage })))
const EmbedSearchPage = lazy(() => import("@/pages/EmbedSearchPage").then(m => ({ default: m.EmbedSearchPage })))
const SuperAdminDashboard = lazy(() => import("@/portals/superadmin/SuperAdminDashboard").then(m => ({ default: m.SuperAdminDashboard })))
const MasterDataPage = lazy(() => import("@/portals/superadmin/MasterDataPage").then(m => ({ default: m.MasterDataPage })))
const AuditLogPage = lazy(() => import("@/portals/superadmin/AuditLogPage").then(m => ({ default: m.AuditLogPage })))
const TenantsPage = lazy(() => import("@/portals/superadmin/TenantsPage").then(m => ({ default: m.TenantsPage })))
const VerificationsPage = lazy(() => import("@/portals/superadmin/VerificationsPage").then(m => ({ default: m.VerificationsPage })))
const SubscriptionsPage = lazy(() => import("@/portals/superadmin/SubscriptionsPage").then(m => ({ default: m.SubscriptionsPage })))
const PlacementsPage = lazy(() => import("@/portals/superadmin/PlacementsPage").then(m => ({ default: m.PlacementsPage })))
const SponsoredOversightPage = lazy(() => import("@/portals/superadmin/SponsoredPage").then(m => ({ default: m.SponsoredPage })))
const SourcesPage = lazy(() => import("@/portals/superadmin/SourcesPage").then(m => ({ default: m.SourcesPage })))
const FacilityDataPage = lazy(() => import("@/portals/admin/FacilityDataPage").then(m => ({ default: m.FacilityDataPage })))
const AdmissionsKanban = lazy(() => import("@/portals/admin/AdmissionsKanban").then(m => ({ default: m.AdmissionsKanban })))
const ToursPage = lazy(() => import("@/portals/admin/ToursPage").then(m => ({ default: m.ToursPage })))
const LeadsPage = lazy(() => import("@/portals/admin/LeadsPage").then(m => ({ default: m.LeadsPage })))
const BillingPage = lazy(() => import("@/portals/admin/BillingPage").then(m => ({ default: m.BillingPage })))
const SponsoredCampaignsPage = lazy(() => import("@/portals/admin/SponsoredCampaignsPage").then(m => ({ default: m.SponsoredCampaignsPage })))
const CarePlanIndex = lazy(() => import("@/portals/staff/CarePlanIndex").then(m => ({ default: m.CarePlanIndex })))
const CarePlanDetail = lazy(() => import("@/portals/staff/CarePlanDetail").then(m => ({ default: m.CarePlanDetail })))

const PORTALS = [
  { path: "family", Dashboard: FamilyDashboard },
  { path: "resident", Dashboard: ResidentDashboard },
  { path: "staff", Dashboard: StaffDashboard },
  { path: "admin", Dashboard: AdminDashboard },
  { path: "network", Dashboard: NetworkDashboard },
  { path: "referral", Dashboard: ReferralDashboard },
  { path: "hospital", Dashboard: HospitalDashboard },
  { path: "superadmin", Dashboard: SuperAdminDashboard },
] as const

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Loading…
    </div>
  )
}

function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/facility/:slug" element={<FacilityDetailPage />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/articles" element={<ArticlesIndexPage />} />
        <Route path="/articles/:slug" element={<ArticleDetailPage />} />
        <Route path="/tools" element={<ToolsPage />} />
        <Route path="/guides" element={<GuidesPage />} />
        <Route path="/why-carepath" element={<WhyCarePathPage />} />
        <Route path="/senior-living/:state" element={<StateLandingPage />} />
        <Route path="/senior-living/:state/:city" element={<CityLandingPage />} />
        <Route path="/senior-living/:state/:city/:type" element={<CityLandingPage />} />
        <Route path="/tools/care-level-quiz" element={<CareLevelQuizPage />} />
        <Route path="/tools/medicaid-eligibility" element={<MedicaidEligibilityPage />} />
        <Route path="/tools/va-eligibility" element={<VaEligibilityPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />

        {/* Embeddable widget for hospital partners — iframe target. */}
        <Route path="/embed/search" element={<EmbedSearchPage />} />

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
                <Route path="tenants" element={<TenantsPage />} />
                <Route path="master-data" element={<MasterDataPage />} />
                <Route path="master-data/:type" element={<MasterDataPage />} />
                <Route path="audit" element={<AuditLogPage />} />
                <Route path="verifications" element={<VerificationsPage />} />
                <Route path="placements" element={<PlacementsPage />} />
                <Route path="subscriptions" element={<SubscriptionsPage />} />
                <Route path="sponsored" element={<SponsoredOversightPage />} />
                <Route path="sources" element={<SourcesPage />} />
              </>
            )}
            {path === "admin" && (
              <>
                <Route path="admissions" element={<AdmissionsKanban />} />
                <Route path="tours" element={<ToursPage />} />
                <Route path="leads" element={<LeadsPage />} />
                <Route path="data" element={<FacilityDataPage />} />
                <Route path="billing" element={<BillingPage />} />
                <Route path="sponsored" element={<SponsoredCampaignsPage />} />
              </>
            )}
            {path === "staff" && (
              <>
                <Route path="care-plans" element={<CarePlanIndex />} />
                <Route path="care-plans/:residentId" element={<CarePlanDetail />} />
              </>
            )}
            {path === "referral" && (
              <>
                <Route path="profile" element={<ReferralProfilePage />} />
                <Route path="payouts" element={<ReferralPayoutsPage />} />
                <Route path="placements" element={<ReferralPayoutsPage />} />
                <Route path="pipeline" element={<ReferralPipelinePage />} />
                <Route path="billing" element={<ReferralBillingPage />} />
              </>
            )}
            {path === "hospital" && (
              <>
                <Route path="profile" element={<HospitalProfilePage />} />
                <Route path="referrals" element={<HospitalReferralsPage />} />
                <Route path="embed" element={<HospitalEmbedPage />} />
              </>
            )}
          </Route>
        ))}

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}

export default App
