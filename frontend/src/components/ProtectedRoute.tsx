import { Navigate, useLocation } from "react-router-dom"
import { useAuth, type Portal } from "@/lib/auth"

interface Props {
  children: React.ReactNode
  portal?: Portal
}

export function ProtectedRoute({ children, portal }: Props) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (portal && user.portal !== portal && user.portal !== "superadmin") {
    return <Navigate to={`/${user.portal ?? "login"}`} replace />
  }

  return <>{children}</>
}
