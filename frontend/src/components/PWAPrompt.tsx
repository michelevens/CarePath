import { useEffect, useState } from "react"
import { Download, X } from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * PWA install prompt — small bottom-right toast that appears when
 * the browser fires `beforeinstallprompt`. Dismissal is remembered
 * in localStorage so we don't badger the user.
 *
 * Pattern lifted directly from InsureFlow + ClinicLink (the
 * exact same ~50-line component is in both — proven across two
 * production apps).
 *
 * The service worker registration that ENABLES this event lives
 * in main.tsx; this component only handles the UI.
 */
export function PWAPrompt() {
  const [show, setShow] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      if (!localStorage.getItem("carepath-pwa-prompt-dismissed")) {
        setShow(true)
      }
    }
    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  const install = async () => {
    if (!deferredPrompt) return
    // BeforeInstallPromptEvent isn't in lib.dom.d.ts; cast through unknown.
    const p = deferredPrompt as unknown as { prompt: () => Promise<void> }
    await p.prompt()
    setShow(false)
    setDeferredPrompt(null)
  }

  const dismiss = () => {
    setShow(false)
    localStorage.setItem("carepath-pwa-prompt-dismissed", "1")
  }

  if (!show) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 rounded-lg border bg-card p-4 shadow-xl md:left-auto md:right-4 md:w-96">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
          <Download className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">Install CarePath</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Get faster access and a home-screen shortcut for searching facilities,
            checking tour requests, and managing your account.
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={install}>
              Install
            </Button>
            <Button size="sm" variant="ghost" onClick={dismiss}>
              Not now
            </Button>
          </div>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
