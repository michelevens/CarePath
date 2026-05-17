import { useState } from "react"
import { Loader2, MapPin } from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"

/**
 * Geolocation → nearest ZIP via /marketplace/reverse-zip.
 * Renders as either a bold "Search near me" button (hero variant) or
 * a small "Near me" link (compact variant for filter sidebars).
 *
 * Fails silently inline (denied / no-zip / no-support) so families
 * don't get hit with browser alert popups.
 */
export function NearMeButton({
  onZip,
  variant = "hero",
  className,
}: {
  onZip: (zip: string) => void
  variant?: "hero" | "compact"
  className?: string
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onClick = () => {
    if (busy) return
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Not supported")
      return
    }
    setBusy(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const r = await api.get<{ data: { zip: string } | null }>(
            "/marketplace/reverse-zip",
            { params: { lat: pos.coords.latitude, lon: pos.coords.longitude } },
          )
          if (r.data?.data?.zip) onZip(r.data.data.zip)
          else setError("No nearby ZIP")
        } catch {
          setError("No nearby ZIP")
        } finally {
          setBusy(false)
        }
      },
      () => {
        setBusy(false)
        setError("Location denied")
      },
      { timeout: 8000, maximumAge: 60_000 },
    )
  }

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className={cn(
          "inline-flex items-center gap-1 text-xs text-violet-700 hover:underline disabled:opacity-50",
          className,
        )}
        title="Use my browser location"
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <MapPin className="h-3 w-3" />}
        {error ?? "Near me"}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm transition-colors hover:border-violet-500 hover:bg-violet-50 disabled:opacity-60",
        className,
      )}
      title="Find facilities near my current location"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
      {error ?? "Search near me"}
    </button>
  )
}
