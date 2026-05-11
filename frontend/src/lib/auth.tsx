import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { api, tokenStore } from "@/lib/api"

export type Portal =
  | "family"
  | "resident"
  | "staff"
  | "admin"
  | "network"
  | "referral"
  | "superadmin"

export type Role =
  | "super_admin"
  | "network_admin"
  | "facility_admin"
  | "facility_staff"
  | "referral_partner"
  | "family_member"
  | "resident"

export interface FacilityMembership {
  id: string
  name: string
  slug: string
  role: string | null
}

export interface AuthUser {
  id: number
  name: string
  email: string
  email_verified: boolean
  two_factor_enabled: boolean
  portal: Portal | null
  roles: Role[]
  permissions: string[]
  active_facility: {
    id: string
    name: string
    slug: string
  } | null
  facilities: FacilityMembership[]
}

export type LoginResult =
  | { kind: "authenticated"; user: AuthUser }
  | { kind: "two_factor_required"; challengeId: string }

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<LoginResult>
  completeTwoFactor: (input: {
    challengeId: string
    code?: string
    recoveryCode?: string
  }) => Promise<AuthUser>
  logout: () => Promise<void>
  register: (input: {
    name: string
    email: string
    password: string
    password_confirmation: string
  }) => Promise<AuthUser>
  refreshUser: () => Promise<void>
  resendVerification: () => Promise<void>
  switchFacility: (facilityId: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = tokenStore.get()
    if (!token) {
      setLoading(false)
      return
    }
    api
      .get<{ user: AuthUser }>("/me")
      .then((res) => setUser(res.data.user))
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false))
  }, [])

  const login = async (email: string, password: string): Promise<LoginResult> => {
    const res = await api.post<
      | { token: string; user: AuthUser }
      | { two_factor_required: true; challenge_id: string }
    >("/auth/login", {
      email,
      password,
      device_name: navigator.userAgent.slice(0, 60),
    })

    if ("two_factor_required" in res.data) {
      return { kind: "two_factor_required", challengeId: res.data.challenge_id }
    }

    tokenStore.set(res.data.token)
    setUser(res.data.user)
    return { kind: "authenticated", user: res.data.user }
  }

  const completeTwoFactor: AuthContextValue["completeTwoFactor"] = async ({
    challengeId,
    code,
    recoveryCode,
  }) => {
    const res = await api.post<{ token: string; user: AuthUser }>(
      "/auth/2fa/challenge",
      {
        challenge_id: challengeId,
        code: code || undefined,
        recovery_code: recoveryCode || undefined,
        device_name: navigator.userAgent.slice(0, 60),
      }
    )
    tokenStore.set(res.data.token)
    setUser(res.data.user)
    return res.data.user
  }

  const logout = async () => {
    try {
      await api.post("/auth/logout")
    } catch {
      // best-effort; token cleared regardless
    }
    tokenStore.clear()
    setUser(null)
  }

  const register: AuthContextValue["register"] = async (input) => {
    const res = await api.post<{ token: string; user: AuthUser }>(
      "/auth/register",
      { ...input, device_name: navigator.userAgent.slice(0, 60) }
    )
    tokenStore.set(res.data.token)
    setUser(res.data.user)
    return res.data.user
  }

  const refreshUser = async () => {
    const res = await api.get<{ user: AuthUser }>("/me")
    setUser(res.data.user)
  }

  const resendVerification = async () => {
    await api.post("/auth/resend-verification")
  }

  const switchFacility = async (facilityId: string) => {
    const res = await api.post<{ user: AuthUser }>("/me/active-facility", {
      facility_id: facilityId,
    })
    setUser(res.data.user)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        completeTwoFactor,
        logout,
        register,
        refreshUser,
        resendVerification,
        switchFacility,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}

export function hasRole(user: AuthUser | null, ...roles: Role[]): boolean {
  if (!user) return false
  return roles.some((r) => user.roles.includes(r))
}

export function can(user: AuthUser | null, permission: string): boolean {
  if (!user) return false
  if (user.roles.includes("super_admin")) return true
  return user.permissions.includes(permission)
}
