import { useState, useEffect, useRef, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft, Send, FileText, MessageSquare, Users, Sparkles, Loader2,
  CheckCircle2, AlertCircle, BookOpen
} from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import { io } from "socket.io-client"

const API = "http://localhost:5000"
const socket = io(API)

interface ChatMessage {
  id: string
  broadcast_id: string
  sender_id: string
  sender_name: string
  content: string
  created_at: string
}

interface BroadcastChatRoom {
  id: string
  broadcast_id: string
  title: string
  notes: string
  messages: ChatMessage[]
  created_at: string
}

interface Participant {
  user_id: string
  user: { name: string; avatar_url: string | null }
  status: string
  is_tutor: boolean
}

export default function BroadcastChat() {
  const { broadcastId } = useParams<{ broadcastId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [room, setRoom] = useState<BroadcastChatRoom | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [notes, setNotes] = useState("")
  const [input, setInput] = useState("")
  const [activeTab, setActiveTab] = useState<'chat' | 'notes'>('chat')
  const [loading, setLoading] = useState(true)
  const [summarizing, setSummarizing] = useState(false)
  const [aiResult, setAiResult] = useState<{ action: string; summary: string } | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)

  const loadRoom = useCallback(async () => {
    if (!broadcastId) return
    try {
      const res = await fetch(`${API}/api/broadcasts/${broadcastId}/chat`)
      if (res.ok) {
        const data: BroadcastChatRoom = await res.json()
        setRoom(data)
        setMessages(data.messages || [])
        setNotes(data.notes || "")
      } else {
        const errBody = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        setLoadError(errBody.error || `Server returned ${res.status}`)
      }
    } catch (err) {
      setLoadError('Cannot reach the server. Make sure it is running on port 5000.')
      console.error(err)
    }
    finally { setLoading(false) }
  }, [broadcastId])

  const loadParticipants = useCallback(async () => {
    if (!broadcastId) return
    try {
      const res = await fetch(`${API}/api/broadcasts/${broadcastId}/participants`)
      if (res.ok) setParticipants(await res.json())
    } catch (err) { console.error(err) }
  }, [broadcastId])

  useEffect(() => {
    loadRoom()
    loadParticipants()
  }, [loadRoom, loadParticipants])

  useEffect(() => {
    if (!broadcastId || !user) return
    socket.emit('register', user.id)
    socket.emit('broadcast_chat:join', broadcastId)

    const onMessage = (msg: ChatMessage) => {
      if (msg.broadcast_id === broadcastId) {
        setMessages(prev => {
          if (prev.find(m => m.id === msg.id)) return prev
          return [...prev, msg]
        })
      }
    }
    const onNotesUpdate = ({ broadcastId: bid, notes: n }: { broadcastId: string; notes: string }) => {
      if (bid === broadcastId) setNotes(n)
    }

    socket.on('broadcast_chat:message', onMessage)
    socket.on('broadcast_chat:notes_update', onNotesUpdate)

    return () => {
      socket.off('broadcast_chat:message', onMessage)
      socket.off('broadcast_chat:notes_update', onNotesUpdate)
    }
  }, [broadcastId, user])

  useEffect(() => {
    if (activeTab === 'chat' && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, activeTab])

  const handleSend = () => {
    if (!input.trim() || !broadcastId || !user) return
    socket.emit('broadcast_chat:message', {
      broadcastId,
      senderId: user.id,
      senderName: user.name,
      content: input.trim()
    })
    setInput("")
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSaveNotes = async () => {
    if (!broadcastId) return
    try {
      await fetch(`${API}/api/broadcasts/${broadcastId}/chat/notes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes })
      })
    } catch (err) { console.error(err) }
  }

  const generateAINotes = async () => {
    if (!broadcastId) return
    const hasNotes = notes.trim().length > 10
    const chatLines = messages
      .filter(m => m.sender_id !== 'system')
      .map(m => `${m.sender_name}: ${m.content}`)
    const chatHistory = chatLines.join('\n')

    if (!hasNotes && chatLines.length === 0) {
      setAiError('Send some messages first, then generate notes from chat.')
      setTimeout(() => setAiError(null), 5000)
      return
    }

    setSummarizing(true)
    setAiResult(null)
    setAiError(null)

    try {
      const res = await fetch(`${API}/api/ai/analyze-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: hasNotes ? notes : '',
          chatHistory,
          exchangeTopic: room?.title || 'Broadcast Class'
        })
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'AI request failed' }))
        throw new Error(
          res.status === 503
            ? 'AI is not configured on the server.'
            : (err.error || 'AI request failed')
        )
      }

      const data = await res.json()
      setNotes(data.improved)
      setAiResult({ action: data.action, summary: data.summary })

      fetch(`${API}/api/broadcasts/${broadcastId}/chat/notes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: data.improved })
      }).catch(() => {})

      setActiveTab('notes')
      setTimeout(() => setAiResult(null), 8000)
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'AI analysis failed')
      setTimeout(() => setAiError(null), 8000)
    } finally {
      setSummarizing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[80vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[80vh] text-center px-6">
          <div className="max-w-sm">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4 opacity-60" />
            <h2 className="text-2xl font-black mb-2">Chat unavailable</h2>
            <p className="text-muted-foreground mb-2 text-sm">
              {loadError || 'This class chat could not be loaded.'}
            </p>
            <p className="text-xs text-muted-foreground mb-6">
              Make sure the server is running, then refresh the page.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
              <Button onClick={() => window.location.reload()}>Retry</Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Navbar />

      <div className="flex-1 flex overflow-hidden max-w-[1800px] mx-auto w-full border-x border-border">

        {/* Participants sidebar */}
        <aside className="hidden lg:flex w-72 border-r border-border flex-col bg-card/20 shrink-0">
          <div className="p-6 border-b border-border">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground mb-5 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest mb-3">
              <BookOpen className="h-3 w-3" /> Class Chat
            </div>
            <h2 className="text-base font-black tracking-tight leading-snug">{room.title}</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
              <Users className="h-3 w-3" /> Participants ({participants.length})
            </p>
            <div className="space-y-1.5">
              {participants.map(p => (
                <div key={p.user_id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-secondary/50 transition-colors">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center font-black text-primary text-xs shrink-0">
                    {p.user.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black truncate">{p.user.name}</p>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                      {p.is_tutor ? 'Tutor' : 'Learner'}
                    </p>
                  </div>
                  {p.user_id === user?.id && (
                    <span className="text-[9px] font-black text-primary shrink-0">(You)</span>
                  )}
                </div>
              ))}
              {participants.length === 0 && (
                <p className="text-xs text-muted-foreground px-2">No participants yet</p>
              )}
            </div>
          </div>
        </aside>

        {/* Main area */}
        <main className="flex-1 flex flex-col bg-background min-w-0">

          {/* Header */}
          <header className="px-6 py-4 border-b border-border flex items-center justify-between bg-card/5 backdrop-blur-md sticky top-0 z-20 gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => navigate(-1)}
                className="lg:hidden h-9 w-9 flex items-center justify-center rounded-xl border border-border hover:bg-secondary shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <BookOpen className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <h3 className="font-black text-sm leading-tight truncate">{room.title}</h3>
                <p className="text-[9px] font-black text-primary/70 uppercase tracking-widest">
                  Group Chat · {participants.length} member{participants.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Tab switcher */}
            <div className="flex items-center gap-1 p-1 bg-secondary/50 rounded-xl border border-border shrink-0">
              {(['chat', 'notes'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                    activeTab === tab
                      ? "bg-card shadow-sm text-foreground border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab === 'chat' ? <MessageSquare className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                  {tab === 'chat' ? 'Chat' : 'Notes'}
                </button>
              ))}
            </div>
          </header>

          {/* AI result / error banner */}
          <AnimatePresence>
            {aiResult && (
              <motion.div
                key="ai-result"
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="mx-6 mt-4 p-4 rounded-2xl bg-green-50 border border-green-200 flex items-start gap-3"
              >
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-black text-green-700 uppercase tracking-widest mb-1">
                    Notes {aiResult.action === 'polished' ? 'Polished' : 'Generated'}
                  </p>
                  <p className="text-xs text-green-600 font-medium">{aiResult.summary}</p>
                </div>
              </motion.div>
            )}
            {aiError && (
              <motion.div
                key="ai-error"
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="mx-6 mt-4 p-4 rounded-2xl bg-destructive/10 border border-destructive/30 flex items-start gap-3"
              >
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-xs text-destructive font-medium">{aiError}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Chat tab ── */}
          {activeTab === 'chat' && (
            <>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center py-24">
                    <div className="text-center">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                      <p className="text-sm font-black text-muted-foreground">No messages yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Start the conversation!</p>
                    </div>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isMe = msg.sender_id === user?.id
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn("flex gap-3", isMe ? "flex-row-reverse" : "flex-row")}
                      >
                        <div className={cn(
                          "h-8 w-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 mt-1",
                          isMe ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                        )}>
                          {msg.sender_name[0]?.toUpperCase()}
                        </div>
                        <div className={cn("max-w-[68%] flex flex-col gap-1", isMe ? "items-end" : "items-start")}>
                          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                            {isMe ? 'You' : msg.sender_name}
                          </span>
                          <div className={cn(
                            "px-4 py-2.5 rounded-2xl text-sm font-medium leading-relaxed break-words",
                            isMe
                              ? "bg-primary text-primary-foreground rounded-tr-sm"
                              : "bg-card border border-border text-foreground rounded-tl-sm"
                          )}>
                            {msg.content}
                          </div>
                          <span className="text-[9px] text-muted-foreground">
                            {new Date(msg.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </motion.div>
                    )
                  })
                )}
              </div>

              {/* Input */}
              <div className="p-4 border-t border-border bg-card/5">
                <div className="flex gap-3 items-end">
                  <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
                    className="flex-1 px-4 py-3 rounded-2xl border border-border bg-card font-medium text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                    style={{ minHeight: 48, maxHeight: 120 }}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!input.trim()}
                    className="h-12 w-12 rounded-2xl bg-primary text-primary-foreground shrink-0 shadow-none hover:scale-105 active:scale-95 transition-all p-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* ── Notes tab ── */}
          {activeTab === 'notes' && (
            <div className="flex-1 flex flex-col p-6 gap-4 overflow-hidden">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="font-black text-sm">Class Notes</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Shared notes visible to all class participants
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={generateAINotes}
                    disabled={summarizing}
                    variant="outline"
                    className="h-10 px-4 rounded-xl font-black text-xs gap-2 border-primary/30 text-primary hover:bg-primary/5"
                  >
                    {summarizing
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Sparkles className="h-3.5 w-3.5" />}
                    {summarizing ? 'Generating…' : 'Generate from Chat'}
                  </Button>
                  <Button
                    onClick={handleSaveNotes}
                    className="h-10 px-4 rounded-xl font-black text-xs gap-2 shadow-none"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Save Notes
                  </Button>
                </div>
              </div>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={
                  "Start typing class notes here…\n\nAll participants can view and edit these notes.\nUse the AI button to auto-generate structured notes from your chat history."
                }
                className="flex-1 p-5 rounded-2xl border border-border bg-card font-medium text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary transition-all leading-relaxed"
              />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
