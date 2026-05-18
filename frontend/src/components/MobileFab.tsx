import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Search } from "lucide-react"

/**
 * Scroll-triggered "Find care" floating action button. Mirrors the
 * EnnHealth Psychiatry "Book Now" FAB — the user scrolls past the
 * fold, the page action sticks with them as a pill until they tap
 * it. Sits above the MobileBottomNav (so the safe-area + nav-height
 * offset is hard-coded to clear it).
 *
 * Only renders on <md screens AND only after 400px of scroll, so
 * the fold stays visually clean.
 */
export function MobileFab() {
  const navigate = useNavigate()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <button
      onClick={() => navigate("/search")}
      aria-label="Find care"
      className={`fixed right-4 z-30 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-primary-foreground shadow-xl transition-all duration-300 active:scale-95 md:hidden ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
      }`}
      style={{
        bottom: "calc(86px + env(safe-area-inset-bottom, 0px))",
        backgroundImage:
          "linear-gradient(135deg, var(--color-primary), color-mix(in oklch, var(--color-primary) 80%, black))",
        boxShadow: "0 8px 24px color-mix(in oklch, var(--color-primary) 45%, transparent)",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <Search className="h-4 w-4" />
      Find care
    </button>
  )
}
