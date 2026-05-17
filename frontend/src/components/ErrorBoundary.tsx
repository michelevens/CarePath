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
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" }

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err?.message ?? "Unknown error" }
  }

  componentDidCatch(err: Error) {
    if (import.meta.env.DEV) {
      console.error("[ErrorBoundary]", this.props.label ?? "", err)
    }
  }

  reset = () => this.setState({ hasError: false, message: "" })

  render() {
    if (!this.state.hasError) return this.props.children
    if (this.props.silent) return null

    return (
      <div className="m-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-amber-900">
              {this.props.label ?? "Something went wrong"}
            </div>
            <div className="mt-1 text-xs text-amber-800">{this.state.message}</div>
            <button
              onClick={this.reset}
              className="mt-2 inline-flex items-center gap-1 rounded border border-amber-300 bg-white px-2 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100"
            >
              <RefreshCw className="h-3 w-3" /> Try again
            </button>
          </div>
        </div>
      </div>
    )
  }
}
