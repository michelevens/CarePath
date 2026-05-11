import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { CheckCircle2, Loader2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"

type Status = "verifying" | "success" | "error"

export function VerifyEmailPage() {
  const [params] = useSearchParams()
  const { refreshUser, user } = useAuth()
  const [status, setStatus] = useState<Status>("verifying")
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const id = params.get("id")
    const hash = params.get("hash")
    const expires = params.get("expires")
    const signature = params.get("signature")

    if (!id || !hash || !expires || !signature) {
      setStatus("error")
      setMessage("Verification link is missing required parameters.")
      return
    }

    api
      .post("/auth/verify-email", { id: Number(id), hash, expires: Number(expires), signature })
      .then(async () => {
        setStatus("success")
        if (user) await refreshUser()
      })
      .catch((err) => {
        setStatus("error")
        const msg =
          err.response?.data?.errors?.email?.[0] ??
          err.response?.data?.message ??
          "Verification failed."
        setMessage(msg)
      })
  }, [params, refreshUser, user])

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          {status === "verifying" && (
            <>
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-muted-foreground" />
              <h1 className="mt-4 text-xl font-semibold">Verifying your email…</h1>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle2 className="mx-auto h-12 w-12 text-foreground" />
              <h1 className="mt-4 text-2xl font-semibold tracking-tight">
                Email verified
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                You're all set. Welcome to CarePath.
              </p>
              <Button asChild className="mt-6">
                <Link to={user?.portal ? `/${user.portal}` : "/login"}>
                  {user ? "Go to your portal" : "Sign in"}
                </Link>
              </Button>
            </>
          )}
          {status === "error" && (
            <>
              <XCircle className="mx-auto h-12 w-12 text-destructive" />
              <h1 className="mt-4 text-xl font-semibold">Verification failed</h1>
              <p className="mt-2 text-sm text-muted-foreground">{message}</p>
              <Button asChild variant="outline" className="mt-6">
                <Link to="/login">Back to sign in</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
