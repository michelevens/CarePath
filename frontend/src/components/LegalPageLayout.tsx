import { Link } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { Meta } from "@/components/Meta"

interface Props {
  /** Display title — also becomes the page <title>. */
  title: string
  /** One-line summary used as the meta description + below the H1. */
  intro: string
  /** ISO date of the last substantive revision. */
  lastUpdated: string
  /** URL path under /legal/* for canonical + cross-linking. */
  canonical: string
  /** Optional ToC sections for the right-rail nav. */
  toc?: Array<{ id: string; label: string }>
  children: React.ReactNode
}

/**
 * Shared chrome for the five /legal/* pages. Keeps typography +
 * spacing identical across the policy pages and renders the
 * "draft — pending legal review" banner once at the top, so any
 * page that needs to remind a lawyer or visitor that we have not
 * yet had counsel sign off does so consistently.
 */
export function LegalPageLayout({
  title,
  intro,
  lastUpdated,
  canonical,
  toc,
  children,
}: Props) {
  return (
    <div className="min-h-screen bg-background">
      <Meta title={title} description={intro} canonical={canonical} />

      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            CarePath
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:max-w-4xl">
        {/*
          A small, factual notice rather than a screaming "DRAFT" banner.
          These pages are accurate-to-the-business starter copy that
          needs a real attorney's review before launch — but they are
          *correct enough* to fill the link target until then, which
          beats a 404. Keep the notice subtle so dev/test reviewers see
          it without alarming a real visitor.
        */}
        <div className="mb-6 rounded-md border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs text-amber-900">
          Pre-launch draft. We're operating under these terms while
          counsel finalizes the formal versions.
        </div>

        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-3 text-base text-muted-foreground sm:text-lg">{intro}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Last updated: {new Date(lastUpdated).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>

        {toc && toc.length > 0 && (
          <nav className="mt-6 rounded-lg border bg-muted/30 p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              On this page
            </h2>
            <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
              {toc.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="text-primary hover:underline">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <article className="prose-article mt-8">{children}</article>

        <div className="mt-12 rounded-lg border bg-card p-5 text-sm">
          <h2 className="font-semibold">Questions?</h2>
          <p className="mt-1 text-muted-foreground">
            Email{" "}
            <a className="text-primary hover:underline" href="mailto:legal@carepath.io">
              legal@carepath.io
            </a>{" "}
            for legal questions or{" "}
            <a className="text-primary hover:underline" href="mailto:privacy@carepath.io">
              privacy@carepath.io
            </a>{" "}
            for data requests (access, export, deletion).
          </p>
        </div>
      </main>
    </div>
  )
}

export function LegalSection({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2>{title}</h2>
      {children}
    </section>
  )
}
