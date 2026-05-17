import { useState, type FormEvent } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/lib/auth"

type FieldErrors = Partial<Record<"name" | "email" | "password", string>>

export function SignupPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { register } = useAuth()

  // Deep-link signals from the facility detail page Claim CTA.
  // After successful signup, redirect to the facility with ?claim=1
  // so the claim modal auto-opens.
  const intent = searchParams.get("intent")
  const facilitySlug = searchParams.get("facility_slug")

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrors({})
    setSubmitting(true)
    try {
      const user = await register({
        name,
        email,
        password,
        password_confirmation: confirm,
      })
      if (intent === "claim_facility" && facilitySlug) {
        navigate(`/facility/${facilitySlug}?claim=1`, { replace: true })
      } else {
        navigate(`/${user.portal ?? ""}`, { replace: true })
      }
    } catch (err) {
      const apiErrs = (err as { response?: { data?: { errors?: Record<string, string[]> } } })
        .response?.data?.errors
      if (apiErrs) {
        setErrors({
          name: apiErrs.name?.[0],
          email: apiErrs.email?.[0],
          password: apiErrs.password?.[0],
        })
      } else {
        setErrors({ email: "Sign-up failed. Try again." })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <h1 className="text-2xl font-semibold tracking-tight">
            Create your account
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Get started with CarePath.
          </p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <Field
              label="Full name"
              value={name}
              onChange={setName}
              error={errors.name}
            />
            <Field
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              error={errors.email}
            />
            <Field
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              error={errors.password}
              hint="At least 8 characters."
            />
            <Field
              label="Confirm password"
              type="password"
              value={confirm}
              onChange={setConfirm}
            />
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Create account
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-foreground underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function Field({
  label,
  type = "text",
  value,
  onChange,
  error,
  hint,
}: {
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
  error?: string
  hint?: string
}) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <input
        type={type}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-ring"
      />
      {error ? (
        <p className="mt-1 text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}
