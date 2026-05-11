import { Link } from "react-router-dom"
import { Search, Shield, HeartHandshake, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="text-xl font-semibold tracking-tight">
            CarePath
          </Link>
          <nav className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link to="/signup">List your facility</Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-24 text-center">
        <h1 className="text-balance text-5xl font-semibold tracking-tight md:text-6xl">
          Find the right long-term care.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Skilled nursing, assisted living, and memory care — with real
          availability, real reviews, and real prices.
        </p>
        <div className="mx-auto mt-10 flex max-w-xl items-center gap-2 rounded-full border bg-card p-2 shadow-sm">
          <Search className="ml-4 h-5 w-5 text-muted-foreground" />
          <input
            placeholder="City, ZIP, or facility name"
            className="flex-1 bg-transparent text-base outline-hidden placeholder:text-muted-foreground"
          />
          <Button asChild size="lg" className="rounded-full">
            <Link to="/search">Search</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 pb-24 md:grid-cols-3">
        <Card>
          <CardContent className="flex flex-col items-start gap-3 p-6">
            <Building2 className="h-6 w-6" />
            <h3 className="font-semibold">Real availability</h3>
            <p className="text-sm text-muted-foreground">
              See live bed counts, not call-the-facility-and-hope.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-start gap-3 p-6">
            <Shield className="h-6 w-6" />
            <h3 className="font-semibold">CMS Five-Star</h3>
            <p className="text-sm text-muted-foreground">
              Inspection history and quality ratings, transparently displayed.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-start gap-3 p-6">
            <HeartHandshake className="h-6 w-6" />
            <h3 className="font-semibold">No high-pressure sales</h3>
            <p className="text-sm text-muted-foreground">
              We don't sell your information to a hundred call centers.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
