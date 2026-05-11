import { useState, useEffect, useRef, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft, Send, FileText, MessageSquare, Users, Sparkles, Loader2,
  CheckCircle2, AlertCircle, Workflow, Trophy, XCircle
} from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import { io } from "socket.io-client"

const API = "https://backend-a41z.onrender.com"
const socket = io(API)

interface ChatMessage { id: string; project_id: string; sender_id: string; sender_name: string; content: string; created_at: string }
interface Participant { user_id: string; name: string; avatar_url: string | null; role: string }
interface ProjectRoom {
  id: string; project_id: string; title: string; notes: string
  messages: ChatMessage[]; participants: string[]
  participant_info: Record<string, { name: string; avatar_url: string | null; role: string }>
  created_at: string
}
interface Project { id: string; title: string; total_credits: number; owner_id: string; status: string; members: { user_id: string; credits_allocated: number; role_name: string }[] }

export default function WorkRoom() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [room, setRoom] = useState<ProjectRoom | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [notes, setNotes] = useState("")
  const [input, setInput] = useState("")
  const [activeTab, setActiveTab] = useState<'chat' | 'notes'>('chat')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [summarizing, setSummarizing] = useState(false)
  const [aiResult, setAiResult] = useState<{ action: string; summary: string } | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)
  const [completing, setCompleting] = useState(false)
  const [confirmComplete, setConfirmComplete] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const loadRoom = useCallback(async () => {
    if (!projectId) return
    try {
      const [roomRes, projRes] = await Promise.all([
        fetch(`${API}/api/projects/${projectId}/room`),
        fetch(`${API}/api/projects/${projectId}`)
      ])
      if (!roomRes.ok) { setLoadError("Workspace not ready yet — the team hasn't been assembled."); return }
      const roomData: ProjectRoom = await roomRes.json()
      setRoom(roomData)
      setMessages(roomData.messages || [])
      setNotes(roomData.notes || "")

      if (projRes.ok) {
        const projData: Project = await projRes.json()
        setProject(projData)
        // Build participants list
        const info = roomData.participant_info || {}
        setParticipants(Object.entries(info).map(([uid, p]) => ({ user_id: uid, ...p })))
      }
    } catch { setLoadError("Cannot reach the server.") }
    finally { setLoading(false) }
  }, [projectId])

  useEffect(() => { loadRoom() }, [loadRoom])

  useEffect(() => {
    if (!projectId || !user) return
    socket.emit('register', user.id)
    socket.emit('project:join', projectId)

    const onMessage = (msg: ChatMessage) => {
      if (msg.project_id === projectId) {
        setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg])
      }
    }
    const onNotesUpdate = ({ projectId: pid, notes: n }: { projectId: string; notes: string }) => {
      if (pid === projectId) setNotes(n)
    }
    const onCompleted = () => { loadRoom() }
    const onCancelled = () => { navigate('/tasks/project') }

    socket.on('project:message', onMessage)
    socket.on('project:notes_update', onNotesUpdate)
    socket.on('project:completed', onCompleted)
    socket.on('project:cancelled', onCancelled)

    return () => {
      socket.off('project:message', onMessage)
      socket.off('project:notes_update', onNotesUpdate)
      socket.off('project:completed', onCompleted)
      socket.off('project:cancelled', onCancelled)
    }
  }, [projectId, user, loadRoom, navigate])

  useEffect(() => {
    if (activeTab === 'chat' && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, activeTab])

  const handleSend = () => {
    if (!input.trim() || !projectId || !user) return
    socket.emit('project:message', {
      projectId, senderId: user.id, senderName: user.name, content: input.trim()
    })
    setInput("")
  }

  const handleSaveNotes = async () => {
    if (!projectId) return
    await fetch(`${API}/api/projects/${projectId}/room/notes`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes })
    }).catch(() => { })
    socket.emit('project:notes', { projectId, notes })
  }

  const generateAINotes = async () => {
    if (!projectId) return
    const chatLines = messages.filter(m => m.sender_id !== 'system').map(m => `${m.sender_name}: ${m.content}`)
    if (!notes.trim() && chatLines.length === 0) {
      setAiError('Send some messages first, then generate notes from chat.')
      setTimeout(() => setAiError(null), 5000)
      return
    }
    setSummarizing(true); setAiResult(null); setAiError(null)
    try {
      const res = await fetch(`${API}/api/ai/analyze-notes`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notes.trim(), chatHistory: chatLines.join('\n'), exchangeTopic: room?.title || 'Project' })
      })
      if (!res.ok) throw new Error(res.status === 503 ? 'AI not configured on server.' : 'AI request failed')
      const data = await res.json()
      setNotes(data.improved)
      setAiResult({ action: data.action, summary: data.summary })
      await fetch(`${API}/api/projects/${projectId}/room/notes`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: data.improved })
      }).catch(() => { })
      socket.emit('project:notes', { projectId, notes: data.improved })
      setActiveTab('notes')
      setTimeout(() => setAiResult(null), 8000)
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'AI failed')
      setTimeout(() => setAiError(null), 8000)
    } finally { setSummarizing(false) }
  }

  const handleComplete = async () => {
    if (!projectId) return
    setCompleting(true)
    try {
      const res = await fetch(`${API}/api/projects/${projectId}/complete`, { method: 'POST' })
      if (!res.ok) throw new Error((await res.json()).error || "Failed")
      setConfirmComplete(false)
      loadRoom()
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "Failed to complete project")
      setTimeout(() => setAiError(null), 6000)
    } finally { setCompleting(false) }
  }

  if (loading) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex items-center justify-center h-[80vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
    </div>
  )

  if (!room) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex items-center justify-center h-[80vh] text-center px-6">
        <div className="max-w-sm space-y-4">
          <AlertCircle className="h-12 w-12 text-muted-foreground opacity-40 mx-auto" />
          <h2 className="text-xl font-bold">Workspace Not Ready</h2>
          <p className="text-sm text-muted-foreground">{loadError}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </div>
      </div>
    </div>
  )

  const isOwner = project?.owner_id === user?.id
  const isCompleted = project?.status === 'completed'
  const myCredits = project?.members.find(m => m.user_id === user?.id)?.credits_allocated

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Navbar />

      {/* Confirm Complete Dialog */}
      <AnimatePresence>
        {confirmComplete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-card rounded-2xl border border-border p-6 max-w-sm w-full shadow-2xl space-y-4">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-500" /> Mark Project Complete</h3>
                <p className="text-sm text-muted-foreground mt-2">Credits will be distributed to all contributors immediately. This cannot be undone.</p>
              </div>
              {project && (
                <div className="space-y-1.5">
                  {project.members.map(m => {
                    const info = room.participant_info[m.user_id]
                    return (
                      <div key={m.user_id} className="flex items-center justify-between text-sm px-3 py-2 rounded-xl bg-secondary/30">
                        <span>{info?.name || 'Member'} <span className="text-muted-foreground text-xs">({m.role_name})</span></span>
                        <span className="font-bold text-primary flex items-center gap-1"><Trophy className="h-3 w-3" /> {m.credits_allocated} cr</span>
                      </div>
                    )
                  })}
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <Button variant="outline" onClick={() => setConfirmComplete(false)} className="flex-1 h-10 rounded-xl">Cancel</Button>
                <Button onClick={handleComplete} disabled={completing} className="flex-[2] h-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white gap-2">
                  {completing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  Confirm & Distribute Credits
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex overflow-hidden max-w-[1800px] mx-auto w-full border-x border-border">

        {/* Sidebar */}
        <aside className="hidden lg:flex w-72 border-r border-border flex-col bg-card/20 shrink-0">
          <div className="p-6 border-b border-border space-y-4">
            <button onClick={() => navigate(`/tasks/project/${projectId}`)}
              className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back to Project
            </button>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">
              <Workflow className="h-3 w-3" /> Project Workspace
            </div>
            <h2 className="text-sm font-black tracking-tight leading-snug">{room.title}</h2>
            {project && (
              <div className="flex items-center gap-1.5 text-xs">
                <Trophy className="h-3.5 w-3.5 text-primary" />
                <span className="font-bold text-primary">{project.total_credits} cr</span>
                <span className="text-muted-foreground">total</span>
                {myCredits && <span className="ml-auto text-emerald-600 font-bold">+{myCredits} for you</span>}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
              <Users className="h-3 w-3" /> Team ({participants.length})
            </p>
            <div className="space-y-1.5">
              {participants.map(p => (
                <div key={p.user_id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-secondary/50 transition-colors">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center font-black text-primary text-xs shrink-0">
                    {p.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black truncate">{p.name}</p>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{p.role}</p>
                  </div>
                  {p.user_id === user?.id && <span className="text-[9px] font-black text-primary shrink-0">(You)</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Owner controls */}
          {isOwner && !isCompleted && (
            <div className="p-4 border-t border-border space-y-2">
              <Button onClick={() => setConfirmComplete(true)}
                className="w-full h-9 rounded-xl text-xs font-bold gap-2 bg-emerald-500 hover:bg-emerald-600 text-white">
                <CheckCircle2 className="h-3.5 w-3.5" /> Mark Project Complete
              </Button>
            </div>
          )}
          {isCompleted && (
            <div className="p-4 border-t border-border">
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <p className="text-xs font-bold text-emerald-600">Project Complete</p>
              </div>
            </div>
          )}
        </aside>

        {/* Main */}
        <main className="flex-1 flex flex-col bg-background min-w-0">
          {/* Header */}
          <header className="px-6 py-4 border-b border-border flex items-center justify-between bg-card/5 backdrop-blur-md sticky top-0 z-20 gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => navigate(`/tasks/project/${projectId}`)}
                className="lg:hidden h-9 w-9 flex items-center justify-center rounded-xl border border-border hover:bg-secondary shrink-0">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Workflow className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <h3 className="font-black text-sm leading-tight truncate">{room.title}</h3>
                <p className="text-[9px] font-black text-primary/70 uppercase tracking-widest">
                  Group Workspace · {participants.length} member{participants.length !== 1 ? 's' : ''}
                  {isCompleted && ' · ✅ Completed'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Mobile complete button */}
              {isOwner && !isCompleted && (
                <Button onClick={() => setConfirmComplete(true)} size="sm"
                  className="lg:hidden h-8 px-3 rounded-lg text-xs gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Complete
                </Button>
              )}
              <div className="flex items-center gap-1 p-1 bg-secondary/50 rounded-xl border border-border shrink-0">
                {(['chat', 'notes'] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={cn(
                      "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                      activeTab === tab ? "bg-card shadow-sm text-foreground border border-border" : "text-muted-foreground hover:text-foreground"
                    )}>
                    {tab === 'chat' ? <MessageSquare className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                    {tab === 'chat' ? 'Chat' : 'Notes'}
                  </button>
                ))}
              </div>
            </div>
          </header>

          {/* AI banners */}
          <AnimatePresence>
            {aiResult && (
              <motion.div key="ok" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="mx-6 mt-4 p-4 rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-start gap-3">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-black text-green-700 uppercase tracking-widest mb-1">Notes {aiResult.action === 'polished' ? 'Polished' : 'Generated'}</p>
                  <p className="text-xs text-green-600 font-medium">{aiResult.summary}</p>
                </div>
              </motion.div>
            )}
            {aiError && (
              <motion.div key="err" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="mx-6 mt-4 p-4 rounded-2xl bg-destructive/10 border border-destructive/30 flex items-start gap-3">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-xs text-destructive font-medium flex-1">{aiError}</p>
                <button onClick={() => setAiError(null)}><XCircle className="h-4 w-4 text-destructive/60" /></button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Chat tab */}
          {activeTab === 'chat' && (
            <>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center py-24 text-center">
                    <div>
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                      <p className="text-sm font-black text-muted-foreground">The workspace is ready</p>
                      <p className="text-xs text-muted-foreground mt-1">Start collaborating with your team!</p>
                    </div>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isMe = msg.sender_id === user?.id
                    const isSystem = msg.sender_id === 'system'
                    if (isSystem) return (
                      <div key={msg.id} className="flex justify-center">
                        <span className="text-xs text-muted-foreground px-4 py-2 rounded-full bg-secondary/50 border border-border font-medium">
                          {msg.content}
                        </span>
                      </div>
                    )
                    return (
                      <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className={cn("flex gap-3", isMe ? "flex-row-reverse" : "flex-row")}>
                        <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 mt-1",
                          isMe ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground")}>
                          {msg.sender_name[0]?.toUpperCase()}
                        </div>
                        <div className={cn("max-w-[68%] flex flex-col gap-1", isMe ? "items-end" : "items-start")}>
                          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{isMe ? 'You' : msg.sender_name}</span>
                          <div className={cn("px-4 py-2.5 rounded-2xl text-sm font-medium leading-relaxed break-words",
                            isMe ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-card border border-border text-foreground rounded-tl-sm")}>
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
              {!isCompleted && (
                <div className="p-4 border-t border-border bg-card/5">
                  <div className="flex gap-3 items-end">
                    <textarea
                      value={input} onChange={e => setInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                      rows={1} placeholder="Type a message… (Enter to send)"
                      className="flex-1 px-4 py-3 rounded-2xl border border-border bg-card font-medium text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                      style={{ minHeight: 48, maxHeight: 120 }}
                    />
                    <Button onClick={handleSend} disabled={!input.trim()}
                      className="h-12 w-12 rounded-2xl bg-primary text-primary-foreground shrink-0 hover:scale-105 active:scale-95 transition-all p-0">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Notes tab */}
          {activeTab === 'notes' && (
            <div className="flex-1 flex flex-col p-6 gap-4 overflow-hidden">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="font-black text-sm">Project Notes</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Shared notes visible to all team members</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={generateAINotes} disabled={summarizing} variant="outline"
                    className="h-10 px-4 rounded-xl font-black text-xs gap-2 border-primary/30 text-primary hover:bg-primary/5">
                    {summarizing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    {summarizing ? 'Generating…' : 'AI Summarize'}
                  </Button>
                  <Button onClick={handleSaveNotes} className="h-10 px-4 rounded-xl font-black text-xs gap-2 shadow-none">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Save Notes
                  </Button>
                </div>
              </div>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder={"Project notes shared with the whole team…\n\nUse the AI button to auto-generate action items from your chat history."}
                readOnly={isCompleted}
                className="flex-1 p-5 rounded-2xl border border-border bg-card font-medium text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary transition-all leading-relaxed"
              />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
