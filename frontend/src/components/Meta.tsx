import { useEffect } from "react"

const SITE_NAME = "CarePath"
const DEFAULT_TITLE = "CarePath — Long-term care, modernized"
const DEFAULT_DESCRIPTION =
  "Find skilled nursing, assisted living, and memory care with real availability, real reviews, and real prices."
const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1582719188393-bb71ca45dbb9?w=1200&q=80"

interface MetaProps {
  title?: string
  description?: string
  image?: string
  /** Path relative to site root, e.g. "/articles/foo". Auto-canonicalized. */
  canonical?: string
  /** Open Graph type — defaults to "website" */
  type?: "website" | "article"
  /** Optional schema.org JSON-LD payload */
  jsonLd?: object
}

function upsertMeta(selector: string, attrs: Record<string, string>) {
  let el = document.head.querySelector<HTMLMetaElement>(selector)
  if (!el) {
    el = document.createElement("meta")
    Object.entries(attrs).forEach(([k, v]) => {
      if (k !== "content") el!.setAttribute(k, v)
    })
    document.head.appendChild(el)
  }
  el.setAttribute("content", attrs.content)
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement("link")
    el.setAttribute("rel", rel)
    document.head.appendChild(el)
  }
  el.setAttribute("href", href)
}

function setJsonLd(id: string, payload: object | null) {
  let el = document.getElementById(id) as HTMLScriptElement | null
  if (!payload) {
    el?.remove()
    return
  }
  if (!el) {
    el = document.createElement("script")
    el.id = id
    el.type = "application/ld+json"
    document.head.appendChild(el)
  }
  el.text = JSON.stringify(payload)
}

/**
 * Per-route meta tag helper. Renders nothing; performs side-effects on the
 * document head. Cleans up the JSON-LD blob on unmount so it doesn't leak
 * into the next page; meta tags persist (will be overwritten by the next
 * <Meta /> mount).
 */
export function Meta({
  title,
  description,
  image,
  canonical,
  type = "website",
  jsonLd,
}: MetaProps) {
  useEffect(() => {
    const fullTitle = title ? `${title} · ${SITE_NAME}` : DEFAULT_TITLE
    const desc = description ?? DEFAULT_DESCRIPTION
    const img = image ?? DEFAULT_IMAGE
    const url =
      typeof window !== "undefined"
        ? canonical
          ? new URL(canonical, window.location.origin).toString()
          : window.location.href.split("#")[0]
        : ""

    document.title = fullTitle
    upsertMeta('meta[name="description"]', { name: "description", content: desc })

    // Open Graph
    upsertMeta('meta[property="og:title"]', { property: "og:title", content: fullTitle })
    upsertMeta('meta[property="og:description"]', { property: "og:description", content: desc })
    upsertMeta('meta[property="og:image"]', { property: "og:image", content: img })
    upsertMeta('meta[property="og:type"]', { property: "og:type", content: type })
    upsertMeta('meta[property="og:site_name"]', { property: "og:site_name", content: SITE_NAME })
    if (url) upsertMeta('meta[property="og:url"]', { property: "og:url", content: url })

    // Twitter
    upsertMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary_large_image" })
    upsertMeta('meta[name="twitter:title"]', { name: "twitter:title", content: fullTitle })
    upsertMeta('meta[name="twitter:description"]', { name: "twitter:description", content: desc })
    upsertMeta('meta[name="twitter:image"]', { name: "twitter:image", content: img })

    // Canonical
    if (url) upsertLink("canonical", url)

    // JSON-LD
    if (jsonLd) setJsonLd("carepath-jsonld", jsonLd)

    return () => {
      if (jsonLd) setJsonLd("carepath-jsonld", null)
    }
  }, [title, description, image, canonical, type, jsonLd])

  return null
}
