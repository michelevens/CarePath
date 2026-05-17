import { useEffect, useState } from "react"
import { Check, Loader2, MapPin } from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"

/**
 * Geolocation → nearest ZIP via /marketplace/reverse-zip.
 * Renders as either a bold "Search near me" button (hero variant) or
 * a small "Near me" link (compact variant for filter sidebars).
 *
 * UX rules:
 *   - Label stays "Search near me" / "Near me" — error messages render
 *     as a separate inline note so families don't lose the affordance.
 *   - Error auto-clears after 4s so the button looks fresh again.
 *   - "Permission denied" gets a contextual hint to enter ZIP manually.
 *   - Success briefly flashes a checkmark before the parent's ZIP
 *     filter takes over the visual cue.
 *   - HTTPS warning: geolocation silently fails on http:// origins, so
 *     in non-secure contexts we short-circuit with a clearer message
 *     rather than waiting for the permission API to time out.
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
  const [success, setSuccess] = useState(false)

  // Auto-dismiss the error / success indicator so the button returns
  // to its default state after a few seconds — sticky errors confuse
  // first-time users who think the feature is broken.
  useEffect(() => {
    if (!error && !success) return
    const t = setTimeout(() => {
      setError(null)
      setSuccess(false)
    }, error ? 6000 : 2500)
    return () => clearTimeout(t)
  }, [error, success])

  const onClick = () => {
    if (busy) return
    setSuccess(false)

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Not supported in this browser")
      return
    }
    // Geolocation silently fails on http:// in modern browsers.
    // Tell families upfront rather than waiting for a timeout.
    if (typeof window !== "undefined" && window.location.protocol === "http:" && window.location.hostname !== "localhost") {
      setError("Needs HTTPS — type your ZIP instead")
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
          if (r.data?.data?.zip) {
            onZip(r.data.data.zip)
            setSuccess(true)
          } else {
            setError("No nearby ZIP found")
          }
        } catch {
          setError("Couldn't look up ZIP")
        } finally {
          setBusy(false)
        }
      },
      (err) => {
        setBusy(false)
        // Distinguish the three possible PositionError codes so the
        // hint we surface is actually useful.
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError("Location denied — type ZIP instead")
            break
          case err.POSITION_UNAVAILABLE:
            setError("Couldn't determine your location")
            break
          case err.TIMEOUT:
            setError("Location request timed out")
            break
          default:
            setError("Couldn't get your location")
        }
      },
      { timeout: 8000, maximumAge: 60_000 },
    )
  }

  const baseLabel = variant === "hero" ? "Search near me" : "Near me"
  const showLabel = success ? "Got it" : baseLabel
  const Icon = success ? Check : busy ? Loader2 : MapPin
  const iconClass = busy ? "animate-spin" : ""

  if (variant === "compact") {
    return (
      <span className={cn("inline-flex flex-col items-end gap-0.5", className)}>
        <button
          type="button"
          onClick={onClick}
          disabled={busy}
          className={cn(
            "inline-flex items-center gap-1 text-xs hover:underline disabled:opacity-50",
            success ? "text-emerald-700" : "text-violet-700",
          )}
          title="Use my browser location"
        >
          <Icon className={cn("h-3 w-3", iconClass)} />
          {showLabel}
        </button>
        {error && (
          <span className="text-[10px] text-amber-700" role="status">
            {error}
          </span>
        )}
      </span>
    )
  }

  return (
    <span className={cn("inline-flex flex-col items-center gap-1", className)}>
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold shadow-sm transition-colors disabled:opacity-60",
          success
            ? "border-emerald-300 bg-emerald-50 text-emerald-800"
            : "border-violet-200 bg-white text-violet-700 hover:border-violet-500 hover:bg-violet-50",
        )}
        title="Find facilities near my current location"
      >
        <Icon className={cn("h-4 w-4", iconClass)} />
        {showLabel}
      </button>
      {error && (
        <span className="text-xs text-amber-700" role="status">
          {error}
        </span>
      )}
    </span>
  )
}
