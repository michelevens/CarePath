import { Component, type ReactNode } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"

interface Props {
  children: ReactNode
  /** When true, render nothing on error (good for non-critical widgets). */
  silent?: boolean
  /** Optional label shown to the user when not silent. */
  label?: string
}

interface State {
  hasError: boolean
  message: string
}

/**
 * Catches render-time errors so a single broken component doesn't blank
 * the entire app. Mount it around routes AND around any globally-mounted
 * widgets (PWAPrompt, AiChatWidget, OnboardingWizard) — those render on
 * every page, so a crash there nukes everything.
 *
 * `silent` mode hides the widget on error rather than showing UI. Use it
 * for optional widgets where a failure should be invisible to the user.
 *
 * STALE-CHUNK HANDLING: when a user is on an old HTML cache and tries
 * to navigate to a lazy route, the dynamic-import fetches a JS chunk
 * that the new deploy renamed. Browser throws "Failed to fetch
 * dynamically imported module". We detect that specific class of
 * failure and auto-reload ONCE — replacing the user's stale HTML
 * with the current build. The `?_v=stamp` guard prevents reload
 * loops if the bundle is genuinely broken.
 */
const STALE_CHUNK_REGEX = /(Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk \d+ failed)/i
const RELOAD_GUARD_KEY = "carepath:chunk-reload-at"

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" }

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err?.message ?? "Unknown error" }
  }

  componentDidCatch(err: Error) {
    if (import.meta.env.DEV) {
      console.error("[ErrorBoundary]", this.props.label ?? "", err)
    }

    // Stale-chunk recovery: if a dynamic import 404'd, force-reload
    // so the browser fetches the current HTML + chunk hashes. Throttled
    // to one auto-reload per minute per tab — otherwise a real broken
    // bundle would reload-loop.
    const msg = err?.message ?? ""
    if (STALE_CHUNK_REGEX.test(msg)) {
      const lastReload = Number(window.sessionStorage.getItem(RELOAD_GUARD_KEY) ?? 0)
      const now = Date.now()
      if (now - lastReload > 60_000) {
        window.sessionStorage.setItem(RELOAD_GUARD_KEY, String(now))
        // Cache-bust the HTML too in case GH Pages is still serving the
        // old index.html — the query string changes the URL key.
        const url = new URL(window.location.href)
        url.searchParams.set("_v", String(now))
        window.location.replace(url.toString())
      }
    }
  }

  reset = () => this.setState({ hasError: false, message: "" })

  render() {
    if (!this.state.hasError) return this.props.children
    if (this.props.silent) return null

    const isStaleChunk = STALE_CHUNK_REGEX.test(this.state.message)

    return (
      <div className="m-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-amber-900">
              {isStaleChunk
                ? "A new version is available — refreshing…"
                : (this.props.label ?? "Something went wrong")}
            </div>
            <div className="mt-1 text-xs text-amber-800">{this.state.message}</div>
            <button
              onClick={() => {
                if (isStaleChunk) {
                  // Bypass the throttle on explicit user click.
                  window.sessionStorage.removeItem(RELOAD_GUARD_KEY)
                  window.location.reload()
                } else {
                  this.reset()
                }
              }}
              className="mt-2 inline-flex items-center gap-1 rounded border border-amber-300 bg-white px-2 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100"
            >
              <RefreshCw className="h-3 w-3" /> {isStaleChunk ? "Reload now" : "Try again"}
            </button>
          </div>
        </div>
      </div>
    )
  }
}
