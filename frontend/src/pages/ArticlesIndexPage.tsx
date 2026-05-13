import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowRight, BookOpen, Building2, Clock, Loader2, Search } from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Meta } from "@/components/Meta"

interface Article {
  id: string
  slug: string
  title: string
  subtitle: string | null
  hero_image_url: string | null
  category: string
  summary: string
  author_name: string
  reading_time_minutes: number
  is_featured: boolean
  published_at: string
}

const CATEGORY_LABEL: Record<string, string> = {
  care_basics: "Care basics",
  medicare: "Medicare",
  medicaid: "Medicaid",
  va: "VA benefits",
  dementia: "Memory care",
  transition: "Tours & transitions",
  financial: "Financial planning",
  legal: "Legal",
}

export function ArticlesIndexPage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [category, setCategory] = useState<string>("")

  useEffect(() => {
    let alive = true
    setLoading(true)
    api
      .get<{ data: Article[] }>("/content/articles", {
        params: category ? { category } : {},
      })
      .then((r) => alive && setArticles(r.data.data))
      .catch((err) => alive && setError(err.response?.data?.message ?? "Failed to load"))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [category])

  const featured = useMemo(() => articles.find((a) => a.is_featured), [articles])
  const rest = useMemo(
    () => articles.filter((a) => a.id !== featured?.id),
    [articles, featured]
  )

  return (
    <div className="min-h-screen bg-background">
      <Meta
        title="Long-term care articles, guides & resources"
        description="Plain-English guides on Medicare, Medicaid, VA benefits, and how to pick a long-term care facility. Free, evidence-based, no lead-selling."
        canonical="/articles"
      />
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            CarePath
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link to="/search" className="text-muted-foreground hover:text-foreground">
              Find care
            </Link>
            <Link to="/articles" className="font-medium text-foreground">
              Articles
            </Link>
            <Button asChild variant="ghost" size="sm">
              <Link to="/login">Sign in</Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-12 md:py-16">
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 rounded-full border bg-accent/60 px-3 py-1 text-xs font-medium text-accent-foreground">
            <BookOpen className="h-3.5 w-3.5" />
            Resource library
          </div>
          <h1 className="mt-4 text-balance text-4xl font-semibold tracking-tight md:text-5xl">
            Long-term care, demystified.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-balance text-muted-foreground">
            Plain-English guides on Medicare, Medicaid, VA benefits, and how to
            actually pick a facility. Written by editors, reviewed by a
            licensed gerontologist. Always free.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-2">
          <CategoryPill active={category === ""} onClick={() => setCategory("")}>
            All
          </CategoryPill>
          {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
            <CategoryPill
              key={value}
              active={category === value}
              onClick={() => setCategory(value)}
            >
              {label}
            </CategoryPill>
          ))}
        </div>

        {error && (
          <div className="mx-auto mt-6 max-w-2xl rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-12 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading articles…
          </div>
        ) : articles.length === 0 ? (
          <div className="mt-12 text-center text-sm text-muted-foreground">
            No articles in this category yet.
          </div>
        ) : (
          <div className="mt-10 space-y-6">
            {featured && !category && <FeaturedCard article={featured} />}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {rest.map((a) => (
                <ArticleCard key={a.id} article={a} />
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="border-t bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 px-6 py-14 text-center">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Done reading? Start searching.
          </h2>
          <p className="text-primary-foreground/80">
            8,400+ real facilities. Live availability. No lead-selling.
          </p>
          <Button asChild size="lg" variant="secondary">
            <Link to="/search">
              <Search className="h-4 w-4" />
              Find care near you
            </Link>
          </Button>
        </div>
      </section>
    </div>
  )
}

function CategoryPill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-sm transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:border-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  )
}

function FeaturedCard({ article }: { article: Article }) {
  return (
    <Link to={`/articles/${article.slug}`} className="block">
      <Card className="hover-lift overflow-hidden">
        <div className="grid md:grid-cols-2">
          <div className="aspect-video bg-muted md:aspect-auto">
            {article.hero_image_url ? (
              <img
                src={article.hero_image_url}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
                <Building2 className="h-12 w-12" />
              </div>
            )}
          </div>
          <CardContent className="flex flex-col justify-center p-6 md:p-8">
            <span className="inline-flex items-center gap-1 self-start rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
              Featured · {CATEGORY_LABEL[article.category] ?? article.category}
            </span>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
              {article.title}
            </h2>
            {article.subtitle && (
              <p className="mt-2 text-muted-foreground">{article.subtitle}</p>
            )}
            <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
              <span>{article.author_name}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {article.reading_time_minutes} min read
              </span>
            </div>
            <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary">
              Read article
              <ArrowRight className="h-4 w-4" />
            </span>
          </CardContent>
        </div>
      </Card>
    </Link>
  )
}

function ArticleCard({ article }: { article: Article }) {
  return (
    <Link to={`/articles/${article.slug}`} className="block">
      <Card className="hover-lift overflow-hidden h-full">
        <div className="aspect-video bg-muted">
          {article.hero_image_url ? (
            <img
              src={article.hero_image_url}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
              <Building2 className="h-10 w-10" />
            </div>
          )}
        </div>
        <CardContent className="p-5">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {CATEGORY_LABEL[article.category] ?? article.category}
          </span>
          <h3 className="mt-2 font-semibold leading-tight">{article.title}</h3>
          <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
            {article.summary}
          </p>
          <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {article.reading_time_minutes} min read
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
