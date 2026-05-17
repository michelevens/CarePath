import { Link, Navigate, useParams } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Meta } from "@/components/Meta"
import { CarePathGuideTemplate } from "@/components/CarePathGuideTemplate"
import { guideContentFor } from "@/lib/guideContent"

/**
 * Per-guide showcase that renders the canonical CarePathGuideTemplate
 * with that guide's content. Route: /guides/:slug.
 *
 * Unknown slug → redirect to the /guides list. Future guides only
 * need a row in lib/guideContent.ts to light up automatically.
 */
export function GuideShowcasePage() {
  const { slug = "" } = useParams<{ slug: string }>()
  const guide = guideContentFor(slug)

  if (!guide) {
    return <Navigate to="/guides" replace />
  }

  return (
    <div className="min-h-screen bg-background">
      <Meta
        title={`${guide.coverTitle} — CarePath`}
        description={guide.coverSubtitle}
        canonical={`/guides/${slug}`}
      />

      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            CarePath
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link to="/guides">
              <ArrowLeft className="h-4 w-4" />
              All guides
            </Link>
          </Button>
        </div>
      </header>

      <CarePathGuideTemplate guide={guide} />
    </div>
  )
}
