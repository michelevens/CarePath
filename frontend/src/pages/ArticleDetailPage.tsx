import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Clock,
  Loader2,
  ShieldCheck,
} from "lucide-react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface Article {
  id: string
  slug: string
  title: string
  subtitle: string | null
  hero_image_url: string | null
  category: string
  summary: string
  body: string
  author_name: string
  author_title: string | null
  reading_time_minutes: number
  published_at: string
}

interface RelatedArticle {
  id: string
  slug: string
  title: string
  subtitle: string | null
  hero_image_url: string | null
  reading_time_minutes: number
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

export function ArticleDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const [article, setArticle] = useState<Article | null>(null)
  const [related, setRelated] = useState<RelatedArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    let alive = true
    setLoading(true)
    setError(null)
    api
      .get<{ data: Article; related: RelatedArticle[] }>(`/content/articles/${slug}`)
      .then((r) => {
        if (!alive) return
        setArticle(r.data.data)
        setRelated(r.data.related)
        window.scrollTo({ top: 0, behavior: "instant" })
      })
      .catch((err) => {
        if (!alive) return
        setError(err.response?.status === 404 ? "Article not found." : "Failed to load")
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [slug])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading…
      </div>
    )
  }

  if (error || !article) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
        <p className="text-muted-foreground">{error ?? "Not found"}</p>
        <Button asChild className="mt-6">
          <Link to="/articles">Browse articles</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            CarePath
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link to="/articles">
              <ArrowLeft className="h-4 w-4" />
              All articles
            </Link>
          </Button>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-6 py-10">
        <Link
          to={`/articles?category=${article.category}`}
          className="text-xs font-medium uppercase tracking-wider text-primary hover:underline"
        >
          {CATEGORY_LABEL[article.category] ?? article.category}
        </Link>
        <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight md:text-5xl">
          {article.title}
        </h1>
        {article.subtitle && (
          <p className="mt-4 text-balance text-lg text-muted-foreground">
            {article.subtitle}
          </p>
        )}
        <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>By {article.author_name}</span>
          {article.author_title && (
            <>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" />
                {article.author_title}
              </span>
            </>
          )}
          <span>·</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {article.reading_time_minutes} min read
          </span>
          <span>·</span>
          <span>{new Date(article.published_at).toLocaleDateString()}</span>
        </div>

        {article.hero_image_url && (
          <div className="mt-8 overflow-hidden rounded-xl">
            <img
              src={article.hero_image_url}
              alt=""
              className="aspect-[16/9] w-full object-cover"
              loading="lazy"
            />
          </div>
        )}

        <div
          className="prose-article mt-8"
          dangerouslySetInnerHTML={{ __html: article.body }}
        />

        <Card className="mt-12 bg-accent/40">
          <CardContent className="flex flex-col items-start gap-3 p-6 md:flex-row md:items-center">
            <div className="flex-1">
              <div className="text-sm font-semibold">Ready to compare facilities?</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Search 8,400+ real facilities with live availability and
                transparent pricing. No lead-selling.
              </div>
            </div>
            <Button asChild>
              <Link to="/search">
                Find care near you
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </article>

      {related.length > 0 && (
        <section className="border-t bg-muted/30">
          <div className="mx-auto max-w-7xl px-6 py-12">
            <h2 className="text-xl font-semibold">Related articles</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {related.map((r) => (
                <Link key={r.id} to={`/articles/${r.slug}`} className="block">
                  <Card className="hover-lift overflow-hidden h-full">
                    <div className="aspect-video bg-muted">
                      {r.hero_image_url ? (
                        <img
                          src={r.hero_image_url}
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
                      <h3 className="font-semibold leading-tight">{r.title}</h3>
                      {r.subtitle && (
                        <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                          {r.subtitle}
                        </p>
                      )}
                      <div className="mt-3 text-xs text-muted-foreground">
                        {r.reading_time_minutes} min read
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
