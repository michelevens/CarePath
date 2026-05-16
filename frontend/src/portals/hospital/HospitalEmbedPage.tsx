import { useEffect, useState } from "react"
import { AlertTriangle, Check, Code2, Copy, Eye, Loader2, RefreshCw } from "lucide-react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export function HospitalEmbedPage() {
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    api
      .get<{ data: { api_key: string } }>("/hospital/api-key")
      .then((r) => alive && setApiKey(r.data?.data?.api_key ?? null))
      .catch((e) => {
        const err = e as { response?: { data?: { message?: string } } }
        if (alive) setError(err.response?.data?.message ?? "Failed to load API key")
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  const onRegenerate = async () => {
    if (!confirm("Generate a new key? The old key will stop working immediately and your existing embed will break until you update it.")) return
    setRegenerating(true)
    setError(null)
    try {
      const r = await api.post<{ data: { api_key: string } }>("/hospital/regenerate-api-key")
      setApiKey(r.data?.data?.api_key ?? null)
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } }
      setError(err.response?.data?.message ?? "Failed to regenerate key")
    } finally {
      setRegenerating(false)
    }
  }

  const siteOrigin =
    typeof window !== "undefined" ? window.location.origin : "https://carepath.io"
  const widgetUrl = apiKey ? `${siteOrigin}/embed/search?key=${apiKey}` : ""
  const iframeSnippet = apiKey
    ? `<iframe
  src="${widgetUrl}"
  width="100%"
  height="780"
  frameborder="0"
  style="border: 0; max-width: 1000px;"
  title="CarePath facility search"
  allow="clipboard-write"
></iframe>`
    : ""

  const onCopy = async () => {
    if (!iframeSnippet) return
    try {
      await navigator.clipboard.writeText(iframeSnippet)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard blocked — fall through silently
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading embed code…
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Widget &amp; embed code</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Drop this snippet into your discharge-planning EHR or any internal
          page. Case managers get an in-context facility search. Every
          referral routes back to you for placement-fee credit.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Code2 className="h-4 w-4" />
                iframe embed snippet
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Copy and paste into any HTML page your team has access to.
                Works inside Epic, Cerner, or any EHR that supports HTML
                widgets.
              </p>
            </div>
            <Button onClick={onCopy} disabled={!apiKey}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <pre className="overflow-x-auto rounded-md border bg-muted/30 p-4 text-xs">
            <code>{iframeSnippet || "Loading…"}</code>
          </pre>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardContent className="space-y-3 p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Eye className="h-4 w-4" />
            Live preview
          </h2>
          <p className="text-xs text-muted-foreground">
            Exactly what your case managers will see — search, filter, and
            send a referral. Submitted referrals appear in your{" "}
            <a className="underline hover:text-foreground" href="/hospital/referrals">
              Referrals
            </a>{" "}
            tab.
          </p>
          {apiKey ? (
            <iframe
              src={widgetUrl}
              className="block w-full rounded-md border"
              style={{ height: 780 }}
              title="CarePath embed preview"
            />
          ) : (
            <div className="rounded-md border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              API key missing — generate one below to preview.
            </div>
          )}
        </CardContent>
      </Card>

      {/* API key management */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="text-lg font-semibold">Widget API key</h2>
          <p className="text-xs text-muted-foreground">
            Treat this like a password — anyone with it can submit referrals
            attributed to your hospital. If you suspect it's been leaked,
            regenerate immediately.
          </p>
          <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-3">
            <code className="flex-1 overflow-x-auto font-mono text-xs">
              {apiKey ?? "—"}
            </code>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (apiKey) {
                  void navigator.clipboard.writeText(apiKey)
                }
              }}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Button
            variant="outline"
            onClick={onRegenerate}
            disabled={regenerating}
            className="text-destructive hover:bg-destructive/10"
          >
            {regenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Regenerate key
          </Button>
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
            Regenerating breaks every embed currently using the old key. You'll
            need to update every page where the snippet is installed.
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg border bg-muted/30 p-4 text-xs text-muted-foreground">
        <strong className="text-foreground">Security model:</strong> The widget
        authenticates via your API key, sent in the URL. The widget itself
        runs in an iframe sandbox — it can't read or write anything in your
        EHR. Referrals submitted through the widget carry your hospital's
        attribution and credit you for any resulting admission. We rate-limit
        requests per key to prevent abuse.
      </div>
    </div>
  )
}
