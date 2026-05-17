import { useEffect, useState, useRef, type FormEvent } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import {
  ArrowLeft,
  Building2,
  Loader2,
  Megaphone,
  MessageSquare,
  Send,
} from "lucide-react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface ConversationRow {
  id: string
  subject: string | null
  is_broadcast: boolean
  facility: { name: string; slug: string } | null
  last_message_at: string | null
  unread_count: number
  latest_preview: { body: string; sender_name: string | null } | null
  other_participants: { id: number; name: string; profile_picture: string | null }[]
}

interface MessageRow {
  id: string
  body: string
  sent_at: string
  sender: { id: number; name: string; profile_picture: string | null } | null
  is_you: boolean
}

interface ConversationDetail {
  id: string
  subject: string | null
  is_broadcast: boolean
  facility_id: string | null
  participants: { id: number; name: string; email: string; profile_picture: string | null }[]
  messages: MessageRow[]
}

export function MessagesPage() {
  const { id } = useParams<{ id?: string }>()
  return id ? <ThreadView conversationId={id} /> : <InboxView />
}

function InboxView() {
  const [rows, setRows] = useState<ConversationRow[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const canBroadcast =
    user?.roles.includes("facility_admin") || user?.roles.includes("super_admin")
  const [broadcastOpen, setBroadcastOpen] = useState(false)

  const load = () => {
    setLoading(true)
    api
      .get<{ data: ConversationRow[] }>("/messaging/conversations")
      .then((r) => setRows(r.data?.data ?? []))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Conversations with facilities, advisors, and your team.
          </p>
        </div>
        {canBroadcast && (
          <Button onClick={() => setBroadcastOpen(true)} className="gap-2">
            <Megaphone className="h-4 w-4" />
            Broadcast
          </Button>
        )}
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!loading && rows.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            <MessageSquare className="mx-auto h-8 w-8 opacity-50" />
            <p className="mt-2">No conversations yet.</p>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardContent className="p-0">
          {rows.map((r) => (
            <Link
              key={r.id}
              to={`/messages/${r.id}`}
              className="flex items-start gap-3 border-b p-4 last:border-b-0 hover:bg-muted/30"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700">
                {r.is_broadcast ? (
                  <Megaphone className="h-4 w-4" />
                ) : (
                  (r.other_participants[0]?.name?.[0] ?? "?").toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="truncate text-sm font-medium">
                    {r.subject ??
                      r.other_participants.map((p) => p.name).join(", ") ??
                      "(no subject)"}
                  </div>
                  {r.is_broadcast && (
                    <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                      broadcast
                    </span>
                  )}
                  {r.unread_count > 0 && (
                    <span className="shrink-0 rounded-full bg-violet-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      {r.unread_count}
                    </span>
                  )}
                </div>
                {r.facility && (
                  <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Building2 className="h-3 w-3" />
                    {r.facility.name}
                  </div>
                )}
                {r.latest_preview && (
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {r.latest_preview.sender_name && (
                      <span className="font-medium">{r.latest_preview.sender_name}: </span>
                    )}
                    {r.latest_preview.body}
                  </p>
                )}
              </div>
              {r.last_message_at && (
                <div className="shrink-0 text-[10px] text-muted-foreground">
                  {new Date(r.last_message_at).toLocaleDateString()}
                </div>
              )}
            </Link>
          ))}
        </CardContent>
      </Card>

      {broadcastOpen && <BroadcastModal onClose={() => setBroadcastOpen(false)} onSent={load} />}
    </div>
  )
}

function ThreadView({ conversationId }: { conversationId: string }) {
  const navigate = useNavigate()
  const [data, setData] = useState<ConversationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [body, setBody] = useState("")
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const load = () => {
    api
      .get<{ data: ConversationDetail }>(`/messaging/conversations/${conversationId}`)
      .then((r) => {
        setData(r.data?.data ?? null)
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100)
      })
      .catch(() => navigate("/messages"))
      .finally(() => setLoading(false))
  }
  useEffect(load, [conversationId, navigate])

  const send = async (e: FormEvent) => {
    e.preventDefault()
    if (!body.trim()) return
    setSending(true)
    try {
      await api.post(`/messaging/conversations/${conversationId}/messages`, { body })
      setBody("")
      load()
    } finally {
      setSending(false)
    }
  }

  if (loading || !data) {
    return <div className="p-8 text-sm text-muted-foreground">Loading…</div>
  }

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col p-6">
      <Link
        to="/messages"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> All messages
      </Link>
      <div className="mt-2 mb-4">
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          {data.is_broadcast && <Megaphone className="h-5 w-5 text-amber-700" />}
          {data.subject ?? data.participants.map((p) => p.name).join(", ")}
        </h1>
        <div className="text-xs text-muted-foreground">
          {data.participants.length} participant{data.participants.length !== 1 ? "s" : ""}
        </div>
      </div>

      <Card className="flex-1 overflow-hidden">
        <CardContent className="flex h-[60vh] flex-col p-0">
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {data.messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2 ${m.is_you ? "justify-end" : "justify-start"}`}
              >
                {!m.is_you && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-200 text-[10px] font-semibold text-stone-700">
                    {(m.sender?.name?.[0] ?? "?").toUpperCase()}
                  </div>
                )}
                <div
                  className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                    m.is_you
                      ? "bg-violet-600 text-white"
                      : "bg-stone-100 text-stone-900"
                  }`}
                >
                  {!m.is_you && (
                    <div className="mb-0.5 text-[10px] font-medium text-stone-600">
                      {m.sender?.name ?? "—"}
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{m.body}</div>
                  <div
                    className={`mt-1 text-[10px] ${
                      m.is_you ? "text-violet-100" : "text-stone-500"
                    }`}
                  >
                    {new Date(m.sent_at).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <form onSubmit={send} className="border-t bg-muted/20 p-3">
            {data.is_broadcast ? (
              <p className="text-center text-xs italic text-muted-foreground">
                Broadcasts don't accept replies.
              </p>
            ) : (
              <div className="flex items-end gap-2">
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write a message…"
                  rows={2}
                  maxLength={5000}
                  className="flex-1 resize-none rounded-md border bg-background p-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
                <Button type="submit" disabled={sending || !body.trim()} className="gap-1">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function BroadcastModal({
  onClose,
  onSent,
}: {
  onClose: () => void
  onSent: () => void
}) {
  const { user } = useAuth()
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const isSuperAdmin = user?.roles.includes("super_admin")
  const [audience, setAudience] = useState<"facility_families" | "platform_admins">(
    isSuperAdmin ? "platform_admins" : "facility_families",
  )
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    try {
      const r = await api.post<{ data: { recipients_count: number } }>("/messaging/broadcast", {
        subject,
        body,
        audience,
      })
      alert(`Sent to ${r.data?.data?.recipients_count} recipients.`)
      onSent()
      onClose()
    } catch (e: unknown) {
      const error = e as { response?: { data?: { message?: string } } }
      setErr(error.response?.data?.message ?? "Failed to send")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg border bg-card shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="border-b p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Megaphone className="h-4 w-4" />
            Broadcast announcement
          </h2>
        </div>
        <form onSubmit={submit} className="space-y-4 p-4">
          <div>
            <div className="mb-1 text-xs font-medium text-muted-foreground">Audience</div>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value as "facility_families" | "platform_admins")}
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
            >
              {user?.roles.includes("facility_admin") && (
                <option value="facility_families">
                  Families with current residents at this facility
                </option>
              )}
              {isSuperAdmin && (
                <option value="platform_admins">All facility admins (platform-wide)</option>
              )}
            </select>
          </div>
          <div>
            <div className="mb-1 text-xs font-medium text-muted-foreground">Subject</div>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              maxLength={191}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            />
          </div>
          <div>
            <div className="mb-1 text-xs font-medium text-muted-foreground">Message</div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              rows={5}
              maxLength={5000}
              className="w-full rounded-md border bg-background p-2 text-sm"
            />
          </div>
          {err && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
              {err}
            </div>
          )}
          <div className="flex justify-end gap-2 border-t pt-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy} className="gap-2">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />}
              Send broadcast
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
