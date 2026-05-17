import { useEffect, useRef, useState, type FormEvent } from "react"
import { useLocation } from "react-router-dom"
import { Loader2, MessageCircle, Send, Sparkles, X } from "lucide-react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"

/**
 * Floating bottom-right AI assistant. Pattern from ClinicLink +
 * ShiftPulse — both ship a near-identical widget. Drops in over
 * any authenticated page and gives the user a role-aware Q&A
 * surface without leaving what they're doing.
 *
 * Posts to /api/ai/chat which is per-user rate-limited (30/hr).
 * Conversation lives only in component state — nothing persisted,
 * no PII captured.
 */

interface Msg {
  role: "user" | "assistant"
  content: string
}

export function AiChatWidget() {
  const { user } = useAuth()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [history, setHistory] = useState<Msg[]>([])
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const [stubbed, setStubbed] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Don't render for logged-out users (saves cost + the assistant
  // doesn't have useful context for them anyway).
  if (!user) return null

  useEffect(() => {
    if (open) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50)
    }
  }, [open, history.length])

  const send = async (e: FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || busy) return
    const next: Msg[] = [...history, { role: "user", content: text }]
    setHistory(next)
    setInput("")
    setBusy(true)
    try {
      const r = await api.post<{ reply: string; stubbed: boolean }>("/ai/chat", {
        message: text,
        history,
        current_page: location.pathname,
      })
      setHistory((h) => [...h, { role: "assistant", content: r.data.reply }])
      setStubbed(r.data.stubbed)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { reply?: string }; status?: number } }
      setHistory((h) => [
        ...h,
        {
          role: "assistant",
          content:
            e.response?.data?.reply ??
            (e.response?.status === 429
              ? "You've hit the per-hour chat limit. Try again later."
              : "Sorry — I had trouble reaching the assistant."),
        },
      ])
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {/* Trigger button — bottom-right, above the PWA prompt */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-transform hover:scale-105 hover:bg-violet-700"
          aria-label="Open AI assistant"
        >
          <Sparkles className="h-4 w-4" />
          <span className="hidden sm:inline">Ask CarePath</span>
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-4 right-4 z-50 flex h-[32rem] w-[22rem] flex-col overflow-hidden rounded-lg border bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b bg-violet-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-700" />
              <div>
                <div className="text-sm font-semibold">CarePath Assistant</div>
                <div className="text-[10px] text-muted-foreground">
                  Role-aware help · doesn't store conversation
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-3">
            {history.length === 0 && (
              <div className="space-y-2 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Hi {user.first_name ?? user.name?.split(" ")[0] ?? ""} 👋</p>
                <p>
                  I'm context-aware — I know your role and the page you're on.
                  Try:
                </p>
                <ul className="ml-4 list-disc space-y-1">
                  {SUGGESTIONS_FOR_ROLE[user.roles[0] ?? "family_member"]?.map((s) => (
                    <li key={s}>
                      <button
                        onClick={() => setInput(s)}
                        className="text-left text-violet-700 hover:underline"
                      >
                        {s}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {history.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-xs ${
                    m.role === "user"
                      ? "bg-violet-600 text-white"
                      : "bg-stone-100 text-stone-900"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="rounded-lg bg-stone-100 px-3 py-2 text-xs text-stone-600">
                  <Loader2 className="inline h-3 w-3 animate-spin" /> Thinking…
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {stubbed && (
            <div className="border-t bg-amber-50 px-3 py-2 text-[10px] text-amber-900">
              The assistant is running in offline mode (no ANTHROPIC_API_KEY set).
            </div>
          )}

          <form onSubmit={send} className="border-t bg-muted/20 p-2">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything about CarePath…"
                maxLength={4000}
                disabled={busy}
                className="flex-1 rounded-md border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="rounded-md bg-violet-600 px-3 text-white disabled:opacity-50"
                aria-label="Send"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}

// Silence import warnings
void MessageCircle

const SUGGESTIONS_FOR_ROLE: Record<string, string[]> = {
  super_admin: [
    "How do I approve a stuck facility claim?",
    "What's the deal with Tier-4 sources like FL APD?",
    "How do I create a new subscription plan?",
  ],
  facility_admin: [
    "How does sponsored bidding work?",
    "How do I claim multiple facilities?",
    "How do I invite a staff member?",
  ],
  facility_staff: [
    "Where do I find a resident's care plan?",
    "How do I sign off on a task?",
  ],
  referral_partner: [
    "When does my next payout release?",
    "How do I update my licensed states?",
    "What does my public profile look like?",
  ],
  hospital_partner: [
    "How do I embed the widget in Epic?",
    "Where do I find my API key?",
  ],
  family_member: [
    "What level of care does my mom need?",
    "How does Medicaid spend-down work?",
    "How do I compare facilities side-by-side?",
  ],
}
