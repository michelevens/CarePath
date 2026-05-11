import { useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { QRCodeSVG } from "qrcode.react"
import { Loader2, ShieldCheck, ShieldAlert, Download, ArrowLeft } from "lucide-react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

type EnrollState =
  | { phase: "idle" }
  | { phase: "enrolling"; secret: string; otpauthUrl: string }
  | { phase: "confirmed"; recoveryCodes: string[] }

export function SecuritySettingsPage() {
  const { user, refreshUser } = useAuth()
  const [enroll, setEnroll] = useState<EnrollState>({ phase: "idle" })
  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const errorMessageFrom = (err: unknown): string => {
    const e = err as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } }
    return (
      e.response?.data?.errors?.code?.[0] ??
      e.response?.data?.errors?.password?.[0] ??
      e.response?.data?.message ??
      "Something went wrong."
    )
  }

  const startEnrollment = async () => {
    setError(null)
    setSubmitting(true)
    try {
      const res = await api.post<{ secret: string; otpauth_url: string }>(
        "/auth/2fa/enable"
      )
      setEnroll({
        phase: "enrolling",
        secret: res.data.secret,
        otpauthUrl: res.data.otpauth_url,
      })
    } catch (err) {
      setError(errorMessageFrom(err))
    } finally {
      setSubmitting(false)
    }
  }

  const confirmEnrollment = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await api.post<{ recovery_codes: string[] }>("/auth/2fa/confirm", {
        code,
      })
      setEnroll({ phase: "confirmed", recoveryCodes: res.data.recovery_codes })
      setCode("")
      await refreshUser()
    } catch (err) {
      setError(errorMessageFrom(err))
    } finally {
      setSubmitting(false)
    }
  }

  const disable = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await api.post("/auth/2fa/disable", { password })
      setPassword("")
      setEnroll({ phase: "idle" })
      await refreshUser()
    } catch (err) {
      setError(errorMessageFrom(err))
    } finally {
      setSubmitting(false)
    }
  }

  const downloadCodes = (codes: string[]) => {
    const blob = new Blob([codes.join("\n") + "\n"], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "carepath-recovery-codes.txt"
    a.click()
    URL.revokeObjectURL(url)
  }

  const enabled = user?.two_factor_enabled
  const portalPath = user?.portal ? `/${user.portal}` : "/login"

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-8">
      <Button asChild variant="ghost" size="sm" className="mb-2 -ml-3">
        <Link to={portalPath}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Security</h1>
        <p className="text-sm text-muted-foreground">
          Two-factor authentication and account safety.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-start gap-3">
            {enabled ? (
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-foreground" />
            ) : (
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
            )}
            <div className="flex-1">
              <h2 className="font-semibold">Two-factor authentication</h2>
              <p className="text-sm text-muted-foreground">
                {enabled
                  ? "2FA is enabled. You'll be asked for a code on sign-in."
                  : "Add a TOTP authenticator app for an extra layer of security."}
              </p>
            </div>
            {enabled && (
              <span className="rounded-full bg-foreground px-2 py-0.5 text-xs font-medium text-background">
                Active
              </span>
            )}
          </div>

          {!enabled && enroll.phase === "idle" && (
            <Button onClick={startEnrollment} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Set up 2FA
            </Button>
          )}

          {enroll.phase === "enrolling" && (
            <form onSubmit={confirmEnrollment} className="space-y-4 border-t pt-4">
              <div>
                <h3 className="font-medium">1. Scan this QR code</h3>
                <p className="text-sm text-muted-foreground">
                  In your authenticator app (Google Authenticator, 1Password,
                  Authy, etc.).
                </p>
                <div className="mt-3 inline-block rounded-md border bg-white p-3">
                  <QRCodeSVG value={enroll.otpauthUrl} size={180} />
                </div>
              </div>
              <div>
                <h3 className="font-medium">Or enter this secret manually</h3>
                <code className="mt-1 inline-block break-all rounded bg-muted px-2 py-1 font-mono text-xs">
                  {enroll.secret}
                </code>
              </div>
              <div>
                <h3 className="font-medium">2. Enter the 6-digit code</h3>
                <input
                  type="text"
                  required
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  className="mt-2 w-40 rounded-md border bg-background px-3 py-2 font-mono text-lg tracking-widest outline-hidden focus:ring-2 focus:ring-ring"
                  autoFocus
                />
              </div>
              {error && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}
              <div className="flex gap-2">
                <Button type="submit" disabled={submitting || code.length !== 6}>
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Confirm and enable
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEnroll({ phase: "idle" })}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {enroll.phase === "confirmed" && (
            <div className="space-y-3 border-t pt-4">
              <h3 className="font-medium">Save your recovery codes</h3>
              <p className="text-sm text-muted-foreground">
                Each code can be used once if you lose access to your
                authenticator. Store them somewhere safe.
              </p>
              <div className="grid grid-cols-2 gap-2 rounded-md border bg-muted/40 p-4 font-mono text-sm">
                {enroll.recoveryCodes.map((c) => (
                  <div key={c}>{c}</div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => downloadCodes(enroll.recoveryCodes)}
                >
                  <Download className="h-4 w-4" />
                  Download as .txt
                </Button>
                <Button onClick={() => setEnroll({ phase: "idle" })}>
                  I've saved them
                </Button>
              </div>
            </div>
          )}

          {enabled && enroll.phase === "idle" && (
            <form onSubmit={disable} className="space-y-3 border-t pt-4">
              <h3 className="font-medium">Disable 2FA</h3>
              <p className="text-sm text-muted-foreground">
                Enter your current password to turn off two-factor authentication.
              </p>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Current password"
                className="w-full max-w-sm rounded-md border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-ring"
              />
              {error && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}
              <Button type="submit" variant="destructive" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Disable 2FA
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
