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

export interface AuthUser {
  id: number
  name: string
  email: string
  email_verified: boolean
  portal: Portal | null
  active_facility: {
    id: string
    name: string
    slug: string
  } | null
}

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<AuthUser>
  logout: () => Promise<void>
  register: (input: {
    name: string
    email: string
    password: string
    password_confirmation: string
  }) => Promise<AuthUser>
  refreshUser: () => Promise<void>
  resendVerification: () => Promise<void>
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

  const login = async (email: string, password: string): Promise<AuthUser> => {
    const res = await api.post<{ token: string; user: AuthUser }>("/auth/login", {
      email,
      password,
      device_name: navigator.userAgent.slice(0, 60),
    })
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

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, register, refreshUser, resendVerification }}
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
