import { useState, type FormEvent } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { api } from "@/lib/api"

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get("token") ?? ""
  const initialEmail = params.get("email") ?? ""

  const [email, setEmail] = useState(initialEmail)
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await api.post("/auth/reset-password", {
        token,
        email,
        password,
        password_confirmation: confirm,
      })
      navigate("/login", {
        replace: true,
        state: { resetSuccess: true },
      })
    } catch (err) {
      const msg =
        (err as { response?: { data?: { errors?: { email?: string[]; password?: string[] } } } })
          .response?.data?.errors?.password?.[0] ??
        (err as { response?: { data?: { errors?: { email?: string[] } } } })
          .response?.data?.errors?.email?.[0] ??
        "Couldn't reset your password. The link may be expired."
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <h1 className="text-xl font-semibold">Invalid reset link</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This password reset link is missing a token.
            </p>
            <Button asChild className="mt-6">
              <Link to="/forgot-password">Request a new link</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <h1 className="text-2xl font-semibold tracking-tight">
            Set a new password
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Resetting password for{" "}
            <span className="font-medium text-foreground">{email}</span>.
          </p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <input type="hidden" value={token} readOnly />
            <input
              type="hidden"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              readOnly
            />
            <div>
              <label className="text-sm font-medium">New password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-ring"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                At least 8 characters.
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Confirm password</label>
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-ring"
              />
            </div>
            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Update password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
