import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
      <h1 className="text-5xl font-semibold tracking-tight">404</h1>
      <p className="mt-2 text-muted-foreground">
        We couldn't find that page.
      </p>
      <Button asChild className="mt-6">
        <Link to="/">Back to home</Link>
      </Button>
    </div>
  )
}
