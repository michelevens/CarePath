import { Link } from "react-router-dom"
import { MapPin, Star } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const SAMPLE_RESULTS = [
  {
    slug: "sunset-manor",
    name: "Sunset Manor",
    city: "Phoenix, AZ",
    type: "Assisted Living",
    rating: 4.6,
    reviews: 124,
    priceFrom: 4500,
    beds: 3,
  },
  {
    slug: "willow-creek-snf",
    name: "Willow Creek Skilled Nursing",
    city: "Phoenix, AZ",
    type: "Skilled Nursing",
    rating: 4.2,
    reviews: 88,
    priceFrom: 8200,
    beds: 1,
  },
  {
    slug: "harbor-memory",
    name: "Harbor Memory Care",
    city: "Scottsdale, AZ",
    type: "Memory Care",
    rating: 4.8,
    reviews: 67,
    priceFrom: 6800,
    beds: 5,
  },
]

export function SearchPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            CarePath
          </Link>
          <input
            placeholder="Phoenix, AZ"
            className="w-80 rounded-full border bg-card px-4 py-2 text-sm outline-hidden"
          />
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[1fr_400px]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">
              {SAMPLE_RESULTS.length} facilities near Phoenix, AZ
            </h1>
            <select className="rounded-md border bg-card px-3 py-1.5 text-sm">
              <option>Recommended</option>
              <option>Rating: high to low</option>
              <option>Price: low to high</option>
            </select>
          </div>

          {SAMPLE_RESULTS.map((r) => (
            <Link key={r.slug} to={`/facility/${r.slug}`} className="block">
              <Card className="overflow-hidden transition-shadow hover:shadow-md">
                <div className="flex">
                  <div className="h-40 w-56 shrink-0 bg-muted" />
                  <CardContent className="flex-1 p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{r.name}</h3>
                        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          {r.city} · {r.type}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="h-4 w-4 fill-current" />
                        <span className="font-medium">{r.rating}</span>
                        <span className="text-muted-foreground">
                          ({r.reviews})
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 flex items-end justify-between">
                      <div>
                        <span className="text-lg font-semibold">
                          ${r.priceFrom.toLocaleString()}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {" "}
                          /mo
                        </span>
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        {r.beds} beds available
                      </span>
                    </div>
                  </CardContent>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        <div className="sticky top-24 hidden h-[calc(100vh-8rem)] rounded-lg border bg-muted lg:block">
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Map view (placeholder)
          </div>
        </div>
      </div>
    </div>
  )
}
