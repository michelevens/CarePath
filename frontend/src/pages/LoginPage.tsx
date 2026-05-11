import { useState, type FormEvent } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import {
  HeartHandshake,
  User,
  Stethoscope,
  Building2,
  BarChart3,
  Briefcase,
  Shield,
  Loader2,
  ShieldCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/lib/auth"

interface DemoAccount {
  portal: string
  label: string
  email: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  { portal: "family",     label: "Family member",     email: "family.demo@carepath.io",     description: "Adult child managing care for a parent",     icon: HeartHandshake },
  { portal: "resident",   label: "Resident",          email: "resident.demo@carepath.io",   description: "Resident logging into their own portal",     icon: User },
  { portal: "staff",      label: "Facility staff",    email: "staff.demo@carepath.io",      description: "Nurse / aide working a shift",               icon: Stethoscope },
  { portal: "admin",      label: "Facility admin",    email: "admin.demo@carepath.io",      description: "Administrator / Director of Nursing",       icon: Building2 },
  { portal: "network",    label: "Network operator",  email: "network.demo@carepath.io",    description: "Multi-facility corporate view",              icon: BarChart3 },
  { portal: "referral",   label: "Referral partner",  email: "referral.demo@carepath.io",   description: "Hospital case manager / discharge planner", icon: Briefcase },
  { portal: "superadmin", label: "Super admin",       email: "superadmin.demo@carepath.io", description: "CarePath team — tenant provisioning",        icon: Shield },
]

const DEMO_PASSWORD = "demo1234"

type LoginUiState =
  | { phase: "credentials" }
  | { phase: "two_factor"; challengeId: string }

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, completeTwoFactor } = useAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [ui, setUi] = useState<LoginUiState>({ phase: "credentials" })

  const from =
    (location.state as { from?: { pathname: string } } | null)?.from?.pathname

  const apiErrorMessage = (err: unknown, fallback: string) => {
    const e = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }
    return (
      e.response?.data?.errors?.email?.[0] ??
      e.response?.data?.errors?.code?.[0] ??
      e.response?.data?.errors?.challenge_id?.[0] ??
      e.response?.data?.message ??
      fallback
    )
  }

  const goToPortal = (portal: string | null) => {
    navigate(from && from !== "/login" ? from : `/${portal ?? ""}`, {
      replace: true,
    })
  }

  const signIn = async (e: string, p: string, source: string) => {
    setError(null)
    setSubmitting(source)
    try {
      const result = await login(e, p)
      if (result.kind === "two_factor_required") {
        setUi({ phase: "two_factor", challengeId: result.challengeId })
      } else {
        goToPortal(result.user.portal)
      }
    } catch (err) {
      setError(apiErrorMessage(err, "Sign-in failed. Check your credentials."))
    } finally {
      setSubmitting(null)
    }
  }

  const onCredentialsSubmit = (e: FormEvent) => {
    e.preventDefault()
    void signIn(email, password, "form")
  }

  if (ui.phase === "two_factor") {
    return (
      <TwoFactorStep
        challengeId={ui.challengeId}
        onSuccess={(portal) => goToPortal(portal)}
        onBack={() => {
          setUi({ phase: "credentials" })
          setError(null)
        }}
        completeTwoFactor={completeTwoFactor}
      />
    )
  }

  return (
    <div className="flex min-h-screen items-start justify-center bg-muted/30 p-6 py-12">
      <div className="w-full max-w-3xl space-y-6">
        <Card>
          <CardContent className="p-8">
            <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Welcome back to CarePath.
            </p>
            <form onSubmit={onCredentialsSubmit} className="mt-6 grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-ring"
                />
              </div>
              {error && (
                <div className="md:col-span-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}
              <Button
                type="submit"
                className="md:col-span-2"
                disabled={submitting !== null}
              >
                {submitting === "form" && <Loader2 className="h-4 w-4 animate-spin" />}
                Sign in
              </Button>
            </form>
            <div className="mt-4 flex items-center justify-between text-sm">
              <Link
                to="/forgot-password"
                className="text-muted-foreground underline hover:text-foreground"
              >
                Forgot password?
              </Link>
              <Link
                to="/signup"
                className="text-muted-foreground underline hover:text-foreground"
              >
                Create an account
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-8">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold">Demo accounts</h2>
              <span className="text-xs text-muted-foreground">
                Password:{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono">
                  {DEMO_PASSWORD}
                </code>
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              One-click sign-in for any role. Real Sanctum auth — these create
              actual tokens server-side.
            </p>
            <div className="mt-5 grid gap-2 md:grid-cols-2">
              {DEMO_ACCOUNTS.map((acct) => (
                <button
                  key={acct.portal}
                  onClick={() => signIn(acct.email, DEMO_PASSWORD, acct.portal)}
                  disabled={submitting !== null}
                  className="group flex items-start gap-3 rounded-md border bg-card p-3 text-left transition-colors hover:border-foreground hover:bg-accent disabled:opacity-50"
                >
                  {submitting === acct.portal ? (
                    <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-muted-foreground" />
                  ) : (
                    <acct.icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground group-hover:text-foreground" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{acct.label}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {acct.email}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {acct.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function TwoFactorStep({
  challengeId,
  onSuccess,
  onBack,
  completeTwoFactor,
}: {
  challengeId: string
  onSuccess: (portal: string | null) => void
  onBack: () => void
  completeTwoFactor: (input: {
    challengeId: string
    code?: string
    recoveryCode?: string
  }) => Promise<{ portal: string | null }>
}) {
  const [mode, setMode] = useState<"code" | "recovery">("code")
  const [code, setCode] = useState("")
  const [recoveryCode, setRecoveryCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const user = await completeTwoFactor({
        challengeId,
        code: mode === "code" ? code : undefined,
        recoveryCode: mode === "recovery" ? recoveryCode : undefined,
      })
      onSuccess(user.portal)
    } catch (err) {
      const e = err as {
        response?: { data?: { errors?: Record<string, string[]>; message?: string } }
      }
      setError(
        e.response?.data?.errors?.code?.[0] ??
          e.response?.data?.errors?.challenge_id?.[0] ??
          e.response?.data?.message ??
          "Invalid code."
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <ShieldCheck className="h-8 w-8" />
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">
            Two-factor required
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "code"
              ? "Enter the 6-digit code from your authenticator app."
              : "Enter one of your saved recovery codes."}
          </p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {mode === "code" ? (
              <input
                type="text"
                required
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                autoFocus
                className="w-full rounded-md border bg-background px-3 py-3 text-center font-mono text-2xl tracking-widest outline-hidden focus:ring-2 focus:ring-ring"
              />
            ) : (
              <input
                type="text"
                required
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value)}
                placeholder="xxxxxxxxxx-xxxxxxxxxx"
                autoFocus
                className="w-full rounded-md border bg-background px-3 py-2 font-mono text-sm outline-hidden focus:ring-2 focus:ring-ring"
              />
            )}
            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={submitting || (mode === "code" ? code.length !== 6 : !recoveryCode)}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Verify
            </Button>
          </form>
          <div className="mt-6 flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={onBack}
              className="text-muted-foreground underline hover:text-foreground"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={() => {
                setMode(mode === "code" ? "recovery" : "code")
                setError(null)
              }}
              className="text-muted-foreground underline hover:text-foreground"
            >
              {mode === "code" ? "Use a recovery code" : "Use authenticator app"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
