import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome back to CarePath.
          </p>
          <form className="mt-6 space-y-4">
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
              Sign in
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            New to CarePath?{" "}
            <Link to="/signup" className="font-medium text-foreground underline">
              Create an account
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
