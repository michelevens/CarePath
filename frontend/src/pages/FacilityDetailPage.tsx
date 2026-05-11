import { Link, useParams } from "react-router-dom"
import { Star, MapPin, Shield, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export function FacilityDetailPage() {
  const { slug } = useParams()

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            CarePath
          </Link>
          <Button asChild variant="ghost">
            <Link to="/search">Back to search</Link>
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 grid h-80 grid-cols-4 gap-2 overflow-hidden rounded-xl">
          <div className="col-span-2 row-span-2 bg-muted" />
          <div className="bg-muted" />
          <div className="bg-muted" />
          <div className="bg-muted" />
          <div className="bg-muted" />
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight capitalize">
                {slug?.replace(/-/g, " ")}
              </h1>
              <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-current text-foreground" />
                  <span className="font-medium text-foreground">4.6</span>
                  <span>(124 reviews)</span>
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  Phoenix, AZ
                </span>
                <span className="flex items-center gap-1">
                  <Shield className="h-4 w-4" />
                  CMS Five-Star: 5
                </span>
              </div>
            </div>

            <section>
              <h2 className="text-lg font-semibold">About this facility</h2>
              <p className="mt-2 text-muted-foreground">
                Placeholder description. Full facility profile, services
                offered, level of care, dietary accommodations, languages
                spoken, photos, virtual tour, and resident reviews go here.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">Compliance & quality</h2>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground">
                      Health inspection
                    </div>
                    <div className="mt-1 text-2xl font-semibold">5★</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground">
                      Staffing
                    </div>
                    <div className="mt-1 text-2xl font-semibold">4★</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground">
                      Quality measures
                    </div>
                    <div className="mt-1 text-2xl font-semibold">5★</div>
                  </CardContent>
                </Card>
              </div>
            </section>
          </div>

          <aside>
            <Card className="sticky top-6">
              <CardContent className="p-6">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-2xl font-semibold">$4,500</span>
                    <span className="text-sm text-muted-foreground"> /mo</span>
                  </div>
                  <span className="text-sm font-medium">3 beds available</span>
                </div>
                <Button className="mt-4 w-full" size="lg">
                  <Calendar className="h-4 w-4" />
                  Request a tour
                </Button>
                <Button variant="outline" className="mt-2 w-full">
                  Save facility
                </Button>
                <p className="mt-4 text-xs text-muted-foreground">
                  We don't share your info with other facilities. No spam calls.
                </p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  )
}
