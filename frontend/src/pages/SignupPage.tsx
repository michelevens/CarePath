import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export function SignupPage() {
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
          <form className="mt-6 space-y-4">
            <div>
              <label className="text-sm font-medium">Full name</label>
              <input className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <input
                type="email"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Password</label>
              <input
                type="password"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-ring"
              />
            </div>
            <Button type="submit" className="w-full">
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
