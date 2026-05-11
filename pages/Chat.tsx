import { useState, useEffect, useRef, useCallback } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import {
  Send, MessageSquare, Search,
  Handshake, CheckCircle2, ArrowLeft, Video,
  FileText, Layout, Sparkles, Star, AlertCircle,
  Check, Upload, Plus, BookOpen, MoreVertical, Flag,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import FeedbackModal from "@/components/ui/feedback-modal"
import ReportUserModal from "@/components/ui/report-user-modal"
import { io } from "socket.io-client"
import type { Message, Room, ConnectionStage, Review } from "@/types"
import { supabase } from "@/lib/supabase"

const socket = io("https://backend-a41z.onrender.com")


export default function Chat() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialRoomId = searchParams.get("room")

  const [rooms, setRooms] = useState<Room[]>([])
  const [activeRoom, setActiveRoom] = useState<Room | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [message, setMessage] = useState("")
  const [notes, setNotes] = useState("")
  const [showFeedback, setShowFeedback] = useState(false)
  const [activeTab, setActiveTab] = useState<'chat' | 'notes'>('chat')
  const [summarizing, setSummarizing] = useState(false)
  const [aiResult, setAiResult] = useState<{ action: "polished" | "generated"; summary: string } | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)

  // Post-Connection Lifecycle State
  const [stages, setStages] = useState<ConnectionStage[]>([])
  const [roomReviews, setRoomReviews] = useState<Review[]>([])
  const [activeModal, setActiveModal] = useState<'connect' | 'done' | 'review' | 'dispute' | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)

  // Modal states
  const [deliveryNote, setDeliveryNote] = useState("")
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewComment, setReviewComment] = useState("")
  const [reviewSkill, setReviewSkill] = useState("Intermediate")
  const [reviewTags, setReviewTags] = useState<string[]>([])
  const [disputeReason, setDisputeReason] = useState("Work not delivered")
  const [disputeDesc, setDisputeDesc] = useState("")

  // Note Upload States
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadData, setUploadData] = useState<{ title: string; description: string; file: File | null }>({
    title: '',
    description: '',
    file: null
  })

  // Report modal state
  const [reportOpen, setReportOpen] = useState(false)
  const [kebabOpen, setKebabOpen] = useState(false)
  const kebabRef = useRef<HTMLDivElement>(null)

  const scrollRef = useRef<HTMLDivElement>(null)

  // Close kebab on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (kebabRef.current && !kebabRef.current.contains(e.target as Node)) setKebabOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const loadRooms = useCallback(async () => {
    if (!user) return
    let localRooms: any[] = []

    // 1. Try local Express DB
    try {
      const res = await fetch(`https://backend-a41z.onrender.com/api/chat/rooms?user_id=${user.id}`)
      if (res.ok) localRooms = await res.json()
    } catch { /* server may be offline */ }

    // 2. Fetch from Supabase chat_rooms (source of truth)
    try {
      const { data: sbRooms } = await supabase
        .from('chat_rooms')
        .select('id, task_id, user_a, user_b, status, created_at')
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)

      if (sbRooms && sbRooms.length > 0) {
        // Get partner names from profiles
        const partnerIds = [...new Set(sbRooms.map(r => r.user_a === user.id ? r.user_b : r.user_a))]
        const { data: partners } = await supabase
          .from('profiles').select('id, name, profile_pic').in('id', partnerIds)
        const partnerMap: Record<string, any> = {}
          ; (partners || []).forEach(p => { partnerMap[p.id] = p })

        // Get task titles
        const taskIds = sbRooms.map(r => r.task_id).filter(Boolean)
        let taskMap: Record<string, any> = {}
        if (taskIds.length > 0) {
          const { data: tasks } = await supabase
            .from('tasks').select('id, title').in('id', taskIds)
            ; (tasks || []).forEach(t => { taskMap[t.id] = t })
        }

        // Merge: add Supabase rooms not already in local DB
        const localIds = new Set(localRooms.map((r: any) => r.id))
        sbRooms.forEach(r => {
          if (localIds.has(r.id)) return
          const partnerId = r.user_a === user.id ? r.user_b : r.user_a
          const partner = partnerMap[partnerId] || {}
          localRooms.push({
            id: r.id,
            task_id: r.task_id,
            task_title: taskMap[r.task_id]?.title || 'Skill Exchange',
            participants: [r.user_a, r.user_b],
            participant_info: {
              [r.user_a]: {
                name: r.user_a === user.id ? (user.name || 'Me') : (partner.name || 'Partner'),
                avatar_url: r.user_a === user.id ? (user.profilePic || null) : (partner.profile_pic || null)
              },
              [r.user_b]: {
                name: r.user_b === user.id ? (user.name || 'Me') : (partner.name || 'Partner'),
                avatar_url: r.user_b === user.id ? (user.profilePic || null) : (partner.profile_pic || null)
              },
            },
            status: r.status || 'active',
            connected: false,
            connection_clicks: [],
            messages: [],
            created_at: r.created_at,
            last_message: null,
            isSb: true, // flag: use Supabase for messages
          })
        })
      }
    } catch (err) { console.error('Supabase rooms fetch error:', err) }

    setRooms(localRooms)
    return localRooms
  }, [user])

  const loadMessages = useCallback(async (roomId: string, isSb?: boolean) => {
    try {
      if (isSb) {
        const { data } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('room_id', roomId)
          .order('created_at', { ascending: true })
        setMessages(data || [])
      } else {
        const res = await fetch(`https://backend-a41z.onrender.com/api/chat/rooms/${roomId}/messages`)
        const data = await res.json()
        setMessages(data || [])
      }
    } catch (err) { console.error(err) }
  }, [])

  const loadRoomStatus = useCallback(async (roomId: string, isSb?: boolean) => {
    try {
      if (isSb) {
        const { data: stages } = await supabase.from('room_stages').select('*').eq('room_id', roomId)
        const { data: reviews } = await supabase.from('room_reviews').select('*').eq('room_id', roomId)
        setStages(stages || [])
        setRoomReviews(reviews || [])
      } else {
        const res = await fetch(`https://backend-a41z.onrender.com/api/connections/${roomId}/status`)
        const data = await res.json()
        setStages(data.stages || [])
        setRoomReviews(data.reviews || [])
        if (data.room) setActiveRoom(data.room)
      }
    } catch (err) { console.error("Error loading room status:", err) }
  }, [])

  // ── Auto-select room after list loads ────────────────────────────────────────
  // Runs whenever the rooms array changes (every loadRooms call)
  useEffect(() => {
    if (rooms.length === 0) return
    if (initialRoomId) {
      // URL has a specific room — select it if found and not already active
      const found = rooms.find((r: any) => r.id === initialRoomId)
      if (found && activeRoom?.id !== found.id) setActiveRoom(found)
    } else if (!activeRoom) {
      // No specific room and nothing selected — auto-open first room on desktop
      setActiveRoom(rooms[0])
    }
  }, [rooms]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Polling: room not in list yet (Accept race condition) ────────────────────
  // Fires when URL has a roomId but the sync hasn't reached local DB yet
  useEffect(() => {
    if (!initialRoomId || !user) return
    const alreadyFound = rooms.find((r: any) => r.id === initialRoomId)
    if (alreadyFound) return // already in list, no polling needed

    let attempts = 0
    const interval = setInterval(async () => {
      attempts++
      try {
        const res = await fetch(`https://backend-a41z.onrender.com/api/chat/rooms?user_id=${user.id}`)
        if (res.ok) {
          const freshRooms: any[] = await res.json()
          const target = freshRooms.find((r: any) => r.id === initialRoomId)
          if (target) {
            setRooms(freshRooms)
            setActiveRoom(target)
            clearInterval(interval)
            return
          }
        }
      } catch { /* ignore */ }
      if (attempts >= 8) clearInterval(interval) // give up after ~5s
    }, 600)

    return () => clearInterval(interval)
  }, [initialRoomId, user]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (user) {
      loadRooms()

      // Use Socket.io for realtime instead of Supabase for consistency
      socket.on("message:new", (msg) => {
        if (activeRoom && msg.room_id === activeRoom.id) {
          setMessages(prev => [...prev, msg])
        }
        loadRooms()
      })

      socket.on("stage:confirmed", ({ stage, confirmed_by }) => {
        if (!activeRoom) return
        setStages(prev => {
          // Prevent duplicates
          if (prev.find(s => s.stage === stage && s.user_id === confirmed_by)) return prev;
          return [...prev, {
            id: Math.random().toString(),
            room_id: activeRoom.id,
            user_id: confirmed_by,
            stage,
            confirmed_at: new Date().toISOString()
          }]
        })
      })

      socket.on("stage:advanced", () => {
        if (!activeRoom) return
        loadRoomStatus(activeRoom.id)
      })

      socket.on("exchange:complete", () => {
        if (!activeRoom) return
        loadRoomStatus(activeRoom.id)
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 5000)
      })

      socket.on("notes:update", ({ notes, roomId }) => {
        if (activeRoom && roomId === activeRoom.id) {
          setNotes(notes)
        }
      })

      return () => {
        socket.off("message:new")
        socket.off("stage:confirmed")
        socket.off("stage:advanced")
        socket.off("exchange:complete")
        socket.off("notes:update")
      }
    }
  }, [user, loadRooms, activeRoom?.id, loadRoomStatus])

  useEffect(() => {
    if (activeRoom?.id) {
      const isSb = (activeRoom as any).is_supabase
      loadMessages(activeRoom.id, isSb)
      loadRoomStatus(activeRoom.id, isSb)
      setNotes(activeRoom.workspace_notes || "")
      socket.emit("join_room", activeRoom.id)
    }
  }, [activeRoom?.id, activeRoom?.workspace_notes, loadMessages, loadRoomStatus])

  const handleSend = async () => {
    if (!message.trim() || !activeRoom || !user) return
    const content = message.trim()

    if ((activeRoom as any).is_supabase) {
      await supabase.from('chat_messages').insert({
        room_id: activeRoom.id,
        sender_id: user.id,
        sender_name: user.name,
        content
      })
      loadMessages(activeRoom.id, true)
    } else {
      socket.emit("send_message", {
        roomId: activeRoom.id,
        senderId: user.id,
        senderName: user.name,
        content
      })
    }

    setMessage("")
  }

  const handleSaveNotes = async () => {
    if (!activeRoom) return
    try {
      const res = await fetch(`https://backend-a41z.onrender.com/api/chat/rooms/${activeRoom.id}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes })
      })
      if (res.ok) {
        socket.emit("save_notes", { roomId: activeRoom.id, notes })
      }
    } catch (err) { console.error(err) }
  }

  const startVideoCall = () => {
    if (!activeRoom) return
    const roomName = `ShareSphere-Exchange-${activeRoom.id.substring(0, 8)}`
    window.open(`https://meet.jit.si/${roomName}`, '_blank')
  }

  const generateAIPortalSummary = async () => {
    if (!activeRoom) return
    const hasNotes = notes.trim().length > 10
    const isSbRoom = !!(activeRoom as any).isSb || !!(activeRoom as any).is_supabase

    setSummarizing(true)
    setAiResult(null)
    setAiError(null)

    try {
      // Always fetch the full chat history — used in BOTH Polish and Generate modes
      // so the AI can read the actual conversation regardless of existing notes
      let freshMessages = messages
      if (isSbRoom) {
        // Supabase room: always fetch fresh from DB (state may be stale)
        const { data } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('room_id', activeRoom.id)
          .order('created_at', { ascending: true })
        freshMessages = data || []
      }

      // Filter system/AI/file-share messages & normalize field names
      // (Supabase: sender_id/sender_name  |  Express: senderId/senderName)
      const chatLines = freshMessages
        .filter(m => {
          const content = m.content || (m as any).message || ''
          return !content.startsWith('FILE_SHARE:') &&
            !content.startsWith('DELIVERY_NOTE:') &&
            m.sender_id !== 'ai-assistant' &&
            m.sender_id !== 'system' &&
            (m as any).senderId !== 'ai-assistant' &&
            (m as any).senderId !== 'system'
        })
        .map(m => {
          const senderName = m.sender_name || (m as any).senderName ||
            (m.sender as any)?.name || 'User'
          const content = m.content || (m as any).message || ''
          return `${senderName}: ${content}`
        })

      const chatHistory = chatLines.join('\n')
      const exchangeTopic = (activeRoom as any).task_title || (activeRoom as any).title || ''

      // Nothing to work with at all
      if (!hasNotes && chatLines.length === 0) {
        setAiError('Send some messages first, then click Generate from Chat.')
        setTimeout(() => setAiError(null), 5000)
        return
      }

      // Send BOTH notes and chatHistory to the server in all cases.
      // Mode A (Polish): server will enrich notes WITH the chat context.
      // Mode B (Generate): server creates structured notes purely from chat.
      const res = await fetch('https://backend-a41z.onrender.com/api/ai/analyze-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: hasNotes ? notes : '',
          chatHistory,                           // ← always included now
          exchangeTopic,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'AI request failed' }))
        const msg = res.status === 429
          ? 'Rate limit reached — wait 30 seconds and try again.'
          : res.status === 503
            ? 'AI is not configured on the server. Please check the GROQ_API_KEY.'
            : (err.error || 'AI request failed')
        throw new Error(msg)
      }

      const data = await res.json()
      setNotes(data.improved)
      setAiResult({ action: data.action, summary: data.summary })

      // Auto-save so both peers see the updated notes
      fetch(`https://backend-a41z.onrender.com/api/chat/rooms/${activeRoom.id}/notes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: data.improved }),
      }).catch(() => { })
      socket.emit('save_notes', { roomId: activeRoom.id, notes: data.improved })

      // Switch to notes tab so user sees the result immediately
      setActiveTab('notes')

      setTimeout(() => setAiResult(null), 8000)

    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'AI analysis failed'
      console.error('AI Sync error:', msg)
      setAiError(msg)
      setTimeout(() => setAiError(null), 8000)
    } finally {
      setSummarizing(false)
    }
  }



  const handleConfirmStage = async (stage: 'connected' | 'work_done') => {
    if (!activeRoom || !user) return
    try {
      if ((activeRoom as any).is_supabase) {
        await supabase.from('room_stages').insert({
          room_id: activeRoom.id,
          user_id: user.id,
          stage,
          delivery_note: stage === 'work_done' ? deliveryNote : null
        })
        loadRoomStatus(activeRoom.id, true)
      } else {
        const res = await fetch(`https://backend-a41z.onrender.com/api/connections/${activeRoom.id}/confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: user.id,
            stage,
            delivery_note: stage === 'work_done' ? deliveryNote : null
          })
        })
        if (res.ok) {
          setActiveModal(null)
          loadRoomStatus(activeRoom.id)
        }
      }
    } catch (err) { console.error("Fetch error:", err) }
  }

  const handleSubmitReview = async () => {
    if (!activeRoom || !user) return
    // Resolve partner ID from both room formats (array OR user_a/user_b)
    const partnerId =
      activeRoom.participants?.find((id: string) => id !== user.id)
      || (activeRoom.user_a === user.id ? activeRoom.user_b : activeRoom.user_a)
    if (!partnerId) { console.error('Could not resolve partner ID'); return }

    try {
      const res = await fetch(`https://backend-a41z.onrender.com/api/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room_id: activeRoom.id,
          reviewer_id: user.id,
          reviewer_name: user.name,
          target_user_id: partnerId,
          rating: reviewRating,
          skill_level: reviewSkill,
          comment: reviewComment,
          tags: reviewTags,
          task_title: activeRoom.task_title || 'Skill Exchange',
          task_id: (activeRoom as any).task_id || null
        })
      })
      if (res.ok) {
        setActiveModal(null)
        // Reset form
        setReviewRating(0)
        setReviewComment('')
        setReviewTags([])
        // Refresh room status to reflect completion
        loadRoomStatus(activeRoom.id)
        loadRooms()
      } else {
        const err = await res.json()
        console.error('Review submit failed:', err)
      }
    } catch (err) { console.error("Review fetch error:", err) }
  }

  const handleRaiseDispute = async () => {
    if (!activeRoom || !user) return
    try {
      const res = await fetch(`https://backend-a41z.onrender.com/api/disputes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room_id: activeRoom.id,
          raised_by: user.id,
          reason: disputeReason,
          description: disputeDesc
        })
      })
      if (res.ok) {
        setActiveModal(null)
      }
    } catch (err) { console.error(err) }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadData(prev => ({ ...prev, file: e.target.files![0] }))
    }
  }

  const submitUpload = async () => {
    if (!uploadData.title || !user || !activeRoom) return
    setUploading(true)
    try {
      const res = await fetch('https://backend-a41z.onrender.com/api/notes/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          title: uploadData.title,
          description: uploadData.description,
          fileName: uploadData.file?.name || "Note",
          roomId: activeRoom.id,
          senderName: user.name
        })
      })
      if (res.ok) {
        setIsUploadModalOpen(false)
        setUploadData({ title: '', description: '', file: null })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  const getPartner = (r: Room) => {
    const partnerId = r.participants?.find(id => id !== user?.id) || (r.user_a === user?.id ? r.user_b : r.user_a);
    if (!partnerId) return { id: null, name: "User", avatar_url: null };

    // Check participant_info first
    let info = r.participant_info?.[partnerId];

    if (!info) {
      // Fallback to searching in info (handle case-sensitivity or key mismatch)
      const infoKey = Object.keys(r.participant_info || {}).find(k => k.toLowerCase() === String(partnerId).toLowerCase());
      if (infoKey) info = r.participant_info![infoKey];
    }

    if (!info) info = { name: "Peer", avatar_url: null };

    return { ...info, id: partnerId };
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Navbar />

      <div className="flex-1 flex overflow-hidden max-w-[1800px] mx-auto w-full border-x border-border">
        {/* Sidebar */}
        <aside className={cn(
          "w-full md:w-[400px] border-r border-border flex flex-col bg-card/20 backdrop-blur-xl transition-all",
          activeRoom ? "hidden lg:flex" : "flex"
        )}>
          <div className="p-8 border-b border-border bg-secondary/10">
            <h2 className="text-2xl font-bold mb-6">Messages</h2>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search connections..." className="pl-12 h-14 rounded-2xl border-border bg-background shadow-none" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {rooms.map(room => {
              const partner = getPartner(room)
              const isSelected = activeRoom?.id === room.id
              return (
                <button
                  key={room.id}
                  onClick={() => { setActiveRoom(room); navigate(`/chat?room=${room.id}`) }}
                  className={cn(
                    "w-full p-5 rounded-[32px] flex items-center gap-4 transition-all text-left",
                    isSelected ? "bg-primary text-primary-foreground shadow-2xl shadow-primary/20" : "hover:bg-secondary/50"
                  )}
                >
                  <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center font-bold text-lg overflow-hidden shrink-0 border border-border/10">
                    {partner.avatar_url ? <img src={partner.avatar_url} className="h-full w-full object-cover" /> : partner.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="font-semibold text-xs truncate">{partner.name}</span>
                      <span className={cn("text-[7px] font-bold uppercase px-2 py-0.5 rounded-md", isSelected ? "bg-white/20" : "bg-primary/10 text-primary")}>{room.status}</span>
                    </div>
                    <p className="text-[9px] truncate opacity-50 font-medium">{room.task_title || "Direct Connection"}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </aside>

        {/* Chat Main Area */}
        <main className={cn(
          "flex-1 flex flex-col bg-background relative",
          !activeRoom ? "hidden md:flex items-center justify-center" : "flex"
        )}>
          {!activeRoom ? (
            <div className="text-center p-12">
              <Layout className="h-24 w-24 mx-auto mb-6 text-muted-foreground opacity-10" />
              <h2 className="text-2xl font-bold">{rooms.length === 0 ? "No conversations yet" : "Choose a conversation"}</h2>
              {rooms.length === 0 && <p className="text-sm text-muted-foreground mt-2">Accept a skill exchange request to start chatting.</p>}
            </div>
          ) : (
            <>
              {/* Header */}
              <header className="px-8 py-4 border-b border-border flex items-center justify-between bg-card/5 backdrop-blur-md sticky top-0 z-20">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="icon" onClick={() => setActiveRoom(null)} className="lg:hidden"><ArrowLeft className="h-5 w-5" /></Button>
                  <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center font-bold text-lg overflow-hidden border border-border/20">
                    {getPartner(activeRoom).avatar_url ? <img src={getPartner(activeRoom).avatar_url || undefined} className="h-full w-full object-cover" /> : getPartner(activeRoom).name[0]}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm leading-tight">{getPartner(activeRoom).name}</h3>
                    <p className="text-[7px] font-bold text-primary/70 uppercase tracking-widest truncate max-w-[200px]">
                      {activeRoom.task_title || "Direct Skill Exchange"}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={startVideoCall} variant="ghost" className="h-10 w-10 p-0 rounded-xl border border-border bg-card/50 hover:bg-primary hover:text-primary-foreground">
                    <Video className="h-4 w-4" />
                  </Button>
                  {/* Kebab / report menu */}
                  <div className="relative" ref={kebabRef}>
                    <Button
                      onClick={() => setKebabOpen(o => !o)}
                      variant="ghost"
                      className="h-10 w-10 p-0 rounded-xl border border-border bg-card/50 hover:bg-secondary"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                    {kebabOpen && (
                      <div className="absolute right-0 top-full mt-2 w-44 bg-card border border-border rounded-2xl shadow-xl overflow-hidden z-50">
                        <button
                          onClick={() => { setKebabOpen(false); setReportOpen(true) }}
                          className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Flag className="h-4 w-4" /> Report user
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </header>

              {/* Status Bar */}
              <div className="bg-card/80 backdrop-blur-xl border-b border-border p-4 md:px-8 sticky top-[73px] z-10 shadow-sm">
                <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                  {/* Step Indicator */}
                  <div className="flex items-center gap-1 md:gap-4 flex-1 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                    {[
                      { id: 'connected', label: 'Connection' },
                      { id: 'work_done', label: 'Work Done' },
                      { id: 'review', label: 'Review' }
                    ].map((step, idx) => {
                      const partnerId = activeRoom?.participants?.find(id => id !== user?.id)

                      const myConfirm = step.id === 'review'
                        ? roomReviews.some(r => r.reviewer_id === user?.id)
                        : stages.some(s => s.stage === step.id && s.user_id === user?.id)

                      const peerConfirm = step.id === 'review'
                        ? roomReviews.some(r => r.reviewer_id === partnerId)
                        : stages.some(s => s.stage === step.id && s.user_id === partnerId)

                      const isComplete = myConfirm && peerConfirm
                      const isActive = !isComplete && (
                        (idx === 0) ||
                        (idx === 1 && stages.filter(s => s.stage === 'connected').length >= 2) ||
                        (idx === 2 && stages.filter(s => s.stage === 'work_done').length >= 2)
                      )

                      return (
                        <div key={step.id} className="flex items-center shrink-0">
                          <div className="flex flex-col items-center gap-2">
                            <div className={cn(
                              "h-8 px-4 rounded-full flex items-center justify-center gap-2 text-[9px] font-bold uppercase tracking-tighter transition-all",
                              isComplete ? "bg-green-500 text-white" :
                                isActive ? "bg-primary text-white scale-110 shadow-lg shadow-primary/20" :
                                  "bg-secondary/20 text-muted-foreground border border-border/50"
                            )}>
                              {isComplete ? <Check className="h-3 w-3" /> : (idx + 1)}
                              <span className="hidden sm:inline">{step.label}</span>
                            </div>
                            <div className="flex gap-1">
                              <span className={cn("text-[7px] font-bold uppercase", myConfirm ? "text-green-500" : "text-muted-foreground/40")}>You {myConfirm ? '✓' : ''}</span>
                              <span className="text-[7px] opacity-20">/</span>
                              <span className={cn("text-[7px] font-bold uppercase", peerConfirm ? "text-green-500" : "text-muted-foreground/40")}>Peer {peerConfirm ? '✓' : ''}</span>
                            </div>
                          </div>
                          {idx < 2 && (
                            <div className={cn("w-6 md:w-12 h-[2px] mx-2 mb-4", isComplete ? "bg-green-500" : "bg-border")} />
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Action Button */}
                  <div className="w-full md:w-auto shrink-0">
                    {activeRoom.status === 'completed' ? (
                      <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest">
                        Exchange Complete <CheckCircle2 className="h-4 w-4" />
                      </div>
                    ) : (
                      <div className="flex flex-col items-end gap-1">
                        {(() => {
                          const myStage1 = stages.find(s => s.stage === 'connected' && s.user_id === user?.id)
                          const bothStage1 = new Set(stages.filter(s => s.stage === 'connected').map(s => s.user_id)).size >= 2
                          const myStage2 = stages.find(s => s.stage === 'work_done' && s.user_id === user?.id)
                          const bothStage2 = new Set(stages.filter(s => s.stage === 'work_done').map(s => s.user_id)).size >= 2
                          const myReview = roomReviews.find(r => r.reviewer_id === user?.id)

                          if (!bothStage1) {
                            return (
                              <Button
                                onClick={() => setActiveModal('connect')}
                                disabled={!!myStage1}
                                className={cn(
                                  "h-11 px-8 rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl transition-all",
                                  myStage1 ? "bg-secondary text-muted-foreground" : "bg-primary text-primary-foreground animate-pulse"
                                )}
                              >
                                {myStage1 ? "Waiting for peer..." : "Make a Connection"}
                              </Button>
                            )
                          }
                          if (!bothStage2) {
                            return (
                              <div className="flex flex-col items-center gap-1">
                                <Button
                                  onClick={() => setActiveModal('done')}
                                  disabled={!!myStage2}
                                  className={cn(
                                    "h-11 px-8 rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl transition-all",
                                    myStage2 ? "bg-secondary text-muted-foreground" : "bg-amber-500 text-white"
                                  )}
                                >
                                  {myStage2 ? "Waiting for peer..." : "Mark work as done"}
                                </Button>
                                {!myStage2 && (
                                  <button onClick={() => setActiveModal('dispute')} className="text-[8px] font-bold text-muted-foreground/60 uppercase hover:text-destructive underline decoration-dotted">Raise a dispute</button>
                                )}
                              </div>
                            )
                          }
                          return (
                            <Button
                              onClick={() => setActiveModal('review')}
                              disabled={!!myReview}
                              className={cn(
                                "h-11 px-8 rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl transition-all",
                                myReview ? "bg-secondary text-muted-foreground" : "bg-primary text-primary-foreground"
                              )}
                            >
                              {myReview ? "Waiting for peer..." : "Leave a review"}
                            </Button>
                          )
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Chat Layout */}
              <div className="flex-1 flex overflow-hidden">
                {/* Chat Panel */}
                <div className={cn("flex-1 flex flex-col border-r border-border bg-background transition-all", activeTab === 'notes' ? 'hidden md:flex' : 'flex')}>
                  <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6">
                    {messages.map(msg => {
                      const isSystem = msg.sender_id === 'system'
                      const isAiGreeting = msg.sender_id === 'ai-assistant'
                      const isDeliveryNote = msg.content?.startsWith('DELIVERY_NOTE:')
                      const isFileShare = msg.content?.startsWith('FILE_SHARE:')

                      if (isSystem) {
                        return (
                          <div key={msg.id} className="flex justify-center py-4">
                            <div className="px-6 py-2 rounded-full bg-secondary/30 border border-border/50 text-[10px] font-bold text-muted-foreground uppercase tracking-widest italic">
                              {msg.content}
                            </div>
                          </div>
                        )
                      }

                      if (isAiGreeting) {
                        return (
                          <div key={msg.id} className="flex justify-center py-6 px-4">
                            <div className="w-full max-w-[640px] rounded-[28px] overflow-hidden border border-primary/20 shadow-xl shadow-primary/5">
                              {/* Header bar */}
                              <div className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-primary/10">
                                <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-primary">ShareSphere AI · Welcome Message</span>
                              </div>
                              {/* Body */}
                              <div className="px-6 py-5 bg-gradient-to-br from-primary/5 to-background">
                                <p className="text-sm font-semibold leading-relaxed text-foreground/90">{msg.content}</p>
                              </div>
                            </div>
                          </div>
                        )
                      }

                      if (isDeliveryNote) {
                        const note = msg.content.replace('DELIVERY_NOTE:', '')
                        return (
                          <div key={msg.id} className="flex justify-center py-6">
                            <div className="max-w-[80%] p-6 rounded-[32px] bg-amber-500/5 border-l-4 border-amber-500 shadow-sm">
                              <p className="text-[10px] font-bold uppercase text-amber-600 mb-2">Delivery Note from {msg.sender?.name || 'Partner'}</p>
                              <p className="text-sm font-semibold leading-relaxed opacity-80">"{note}"</p>
                            </div>
                          </div>
                        )
                      }

                      if (isFileShare) {
                        const [title, fileName] = msg.content.replace('FILE_SHARE:', '').split('|');
                        return (
                          <div key={msg.id} className={cn("flex flex-col", msg.sender_id === user?.id ? "items-end" : "items-start")}>
                            <div className={cn("max-w-[80%] p-6 rounded-[32px] border border-border shadow-sm", msg.sender_id === user?.id ? "bg-primary/5 border-primary/20" : "bg-card")}>
                              <div className="flex items-center gap-4 mb-4">
                                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                  <FileText className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold uppercase text-primary tracking-widest">Shared Resource</p>
                                  <h4 className="font-bold text-sm">{title}</h4>
                                </div>
                              </div>
                              <div className="flex items-center justify-between gap-8 pt-4 border-t border-border">
                                <span className="text-[10px] font-semibold text-muted-foreground truncate max-w-[120px]">{fileName}</span>
                                <Button size="sm" variant="ghost" className="h-8 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-primary hover:text-white transition-all">Download</Button>
                              </div>
                            </div>
                            <span className="text-[8px] font-bold uppercase opacity-30 mt-2 px-3">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        )
                      }

                      return (
                        <div key={msg.id} className={cn("flex flex-col", msg.sender_id === user?.id ? "items-end" : "items-start")}>
                          <div className={cn("max-w-[80%] p-5 rounded-[28px] text-sm font-semibold leading-relaxed", msg.sender_id === user?.id ? "bg-primary text-primary-foreground rounded-br-none shadow-xl shadow-primary/10" : "bg-card border border-border rounded-bl-none")}>
                            {msg.content}
                          </div>
                          <span className="text-[8px] font-bold uppercase opacity-30 mt-2 px-3">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="p-8 border-t border-border bg-card/10">
                    <div className="flex items-center gap-3 bg-background border border-border rounded-[32px] p-2 pr-2 shadow-inner focus-within:border-primary/40 transition-all">
                      <Input value={message} onChange={e => setMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder="Type a message..." className="border-none bg-transparent shadow-none focus-visible:ring-0 h-14 font-semibold px-6" />
                      <Button onClick={handleSend} className="h-14 w-14 rounded-full bg-primary text-primary-foreground"><Send className="h-5 w-5" /></Button>
                    </div>
                  </div>
                </div>

                {/* Collaborative Notepad Panel */}
                <div className={cn("flex-1 flex flex-col transition-all", activeTab === 'notes' ? 'flex' : 'hidden md:flex')}>
                  <div className="p-8 flex-1 flex flex-col space-y-6">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <h2 className="text-2xl font-bold">Exchange Notes</h2>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Collaborative Workspace</p>
                      </div>
                      <div className="flex flex-wrap gap-2 items-center">

                        {/* AI result / error badge */}
                        <AnimatePresence>
                          {aiResult && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.85, y: 4 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.85, y: 4 }}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest"
                            >
                              <Sparkles className="h-3 w-3" />
                              {aiResult.action === "polished" ? "Notes Polished" : "Notes Generated"}
                            </motion.div>
                          )}
                          {aiError && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.85, y: 4 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.85, y: 4 }}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-[10px] font-bold tracking-wide max-w-xs"
                              title={aiError}
                            >
                              <AlertCircle className="h-3 w-3 shrink-0" />
                              {aiError}
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <Button onClick={() => setIsUploadModalOpen(true)} variant="outline" className="rounded-xl border-border h-12 px-6 font-bold uppercase text-[10px] tracking-widest gap-2">
                          <Upload className="h-4 w-4" /> Share File
                        </Button>

                        <Button
                          onClick={generateAIPortalSummary}
                          variant="outline"
                          disabled={summarizing}
                          title={notes.trim() ? "Polish & improve these notes with AI" : "Generate structured notes from your chat history"}
                          className="rounded-xl border-primary/40 text-primary hover:bg-primary/10 h-12 px-6 font-bold uppercase text-[10px] tracking-widest gap-2 transition-all"
                        >
                          <motion.span
                            animate={summarizing ? { rotate: [0, 360] } : { rotate: 0 }}
                            transition={summarizing ? { repeat: Infinity, duration: 1.2, ease: "linear" } : {}}
                            className="inline-flex"
                          >
                            <Sparkles className="h-4 w-4" />
                          </motion.span>
                          {summarizing
                            ? "AI Working…"
                            : notes.trim()
                              ? "Polish Notes"
                              : "Generate from Chat"}
                        </Button>

                        <Button onClick={handleSaveNotes} className="rounded-xl bg-primary text-primary-foreground h-12 px-8 font-bold uppercase text-[10px] tracking-widest gap-2 shadow-lg">
                          Save Notes
                        </Button>
                      </div>
                    </div>

                    {/* AI summary line */}
                    <AnimatePresence>
                      {aiResult && (
                        <motion.p
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          className="text-xs text-primary/70 font-medium -mt-2 flex items-center gap-1.5"
                        >
                          <Sparkles className="h-3 w-3" />
                          {aiResult.summary}
                        </motion.p>
                      )}
                    </AnimatePresence>
                    <div className="flex-1 flex gap-8 min-h-0">
                      {/* Notepad */}
                      <div className="flex-[2] bg-card/50 border border-border rounded-[32px] p-8 shadow-inner overflow-hidden relative">
                        <Textarea
                          value={notes}
                          onChange={e => {
                            setNotes(e.target.value);
                            socket.emit('note_update', { roomId: activeRoom.id, content: e.target.value });
                          }}
                          placeholder="Start typing collaborative notes..."
                          className="w-full h-full border-none bg-transparent shadow-none focus-visible:ring-0 resize-none font-semibold text-lg leading-relaxed p-0"
                        />
                      </div>

                      {/* Shared Files Sidebar */}
                      <div className="flex-1 flex flex-col space-y-4">
                        <div className="flex items-center gap-2 px-2">
                          <BookOpen className="h-4 w-4 text-primary" />
                          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Shared Resources</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                          {messages.filter(m => m.content?.startsWith('FILE_SHARE:')).length > 0 ? (
                            messages.filter(m => m.content?.startsWith('FILE_SHARE:')).map((msg, idx) => {
                              const [title, fileName] = msg.content.replace('FILE_SHARE:', '').split('|');
                              return (
                                <div key={idx} className="p-4 rounded-2xl border border-border bg-card/50 hover:border-primary/30 transition-all group">
                                  <div className="flex items-start gap-3 mb-3">
                                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                      <FileText className="h-4 w-4 text-primary" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-semibold truncate leading-tight group-hover:text-primary transition-colors">{title}</p>
                                      <p className="text-[10px] font-medium text-muted-foreground truncate">{fileName}</p>
                                    </div>
                                  </div>
                                  <Button size="sm" variant="secondary" className="w-full h-8 rounded-lg text-[9px] font-bold uppercase tracking-widest">Download</Button>
                                </div>
                              )
                            })
                          ) : (
                            <div className="h-32 rounded-3xl border border-dashed border-border flex flex-col items-center justify-center p-6 text-center opacity-40">
                              <FileText className="h-6 w-6 mb-2" />
                              <p className="text-[9px] font-bold uppercase tracking-widest leading-tight">No shared files yet</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile Tab Switcher */}
              <div className="md:hidden flex p-4 border-t border-border bg-background gap-4">
                <Button onClick={() => setActiveTab('chat')} className={cn("flex-1 rounded-2xl font-bold", activeTab === 'chat' ? 'bg-primary' : 'bg-secondary')}><MessageSquare className="h-4 w-4 mr-2" /> Chat</Button>
                <Button onClick={() => setActiveTab('notes')} className={cn("flex-1 rounded-2xl font-bold", activeTab === 'notes' ? 'bg-primary' : 'bg-secondary')}><FileText className="h-4 w-4 mr-2" /> Notes</Button>
              </div>
            </>
          )}
        </main>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {activeModal === 'connect' && (
          <Dialog open={true} onOpenChange={() => setActiveModal(null)}>
            <DialogContent className="rounded-[40px] p-10 border-border bg-card">
              <DialogHeader>
                <div className="h-16 w-16 rounded-[24px] bg-primary/10 flex items-center justify-center mb-6">
                  <Handshake className="h-8 w-8 text-primary" />
                </div>
                <DialogTitle className="text-2xl font-bold leading-tight">Make a Connection</DialogTitle>
                <DialogDescription className="text-lg font-medium text-muted-foreground pt-4">
                  You are about to confirm your connection with <span className="text-foreground font-semibold">{activeRoom ? getPartner(activeRoom).name : 'your partner'}</span>.
                  This means you both agree to complete the exchange as posted.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="mt-10 gap-4">
                <Button variant="ghost" onClick={() => setActiveModal(null)} className="h-14 flex-1 rounded-2xl font-bold uppercase tracking-widest text-xs">Cancel</Button>
                <Button onClick={() => handleConfirmStage('connected')} className="h-14 flex-1 rounded-2xl bg-primary text-primary-foreground font-bold uppercase tracking-widest text-xs shadow-xl shadow-primary/20">Confirm</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {activeModal === 'done' && (
          <Dialog open={true} onOpenChange={() => setActiveModal(null)}>
            <DialogContent className="rounded-[40px] p-10 border-border bg-card">
              <DialogHeader>
                <div className="h-16 w-16 rounded-[24px] bg-amber-500/10 flex items-center justify-center mb-6">
                  <CheckCircle2 className="h-8 w-8 text-amber-500" />
                </div>
                <DialogTitle className="text-2xl font-bold leading-tight">Mark Work as Done</DialogTitle>
                <DialogDescription className="text-lg font-medium text-muted-foreground pt-4">
                  Confirm that you have completed your part of the exchange.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-6">
                <div className="flex items-start gap-4 p-6 rounded-2xl bg-secondary/30 border border-border/50">
                  <input type="checkbox" id="confirm-work" className="mt-1 h-5 w-5 rounded border-border bg-background" />
                  <Label htmlFor="confirm-work" className="text-sm font-semibold leading-relaxed cursor-pointer">I confirm I have completed my part of this exchange</Label>
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Delivery Note (Optional)</Label>
                  <Textarea
                    value={deliveryNote}
                    onChange={e => setDeliveryNote(e.target.value)}
                    placeholder="Add a note about what was delivered..."
                    className="min-h-[120px] rounded-2xl border-border bg-background font-semibold"
                  />
                </div>
              </div>
              <DialogFooter className="mt-6 gap-4">
                <Button variant="ghost" onClick={() => setActiveModal(null)} className="h-14 flex-1 rounded-2xl font-bold uppercase tracking-widest text-xs">Cancel</Button>
                <Button onClick={() => handleConfirmStage('work_done')} className="h-14 flex-1 rounded-2xl bg-amber-500 text-white font-bold uppercase tracking-widest text-xs shadow-xl shadow-amber-500/20">Mark Done</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {activeModal === 'review' && (
          <Dialog open={true} onOpenChange={() => setActiveModal(null)}>
            <DialogContent className="max-w-2xl rounded-[40px] p-10 border-border bg-card overflow-y-auto max-h-[90vh]">
              <DialogHeader>
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-16 w-16 rounded-[24px] overflow-hidden border-2 border-border/20">
                    {activeRoom && getPartner(activeRoom).avatar_url ? <img src={getPartner(activeRoom).avatar_url || undefined} className="h-full w-full object-cover" /> : (activeRoom ? getPartner(activeRoom).name[0] : '?')}
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-bold leading-tight">Rate {activeRoom ? getPartner(activeRoom).name : 'Partner'}</DialogTitle>
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Exchange: {activeRoom?.task_title}</p>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-10 py-6">
                {/* Stars */}
                <div className="flex flex-col items-center gap-4">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Overall Rating</Label>
                  <div className="flex gap-3">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button key={star} onClick={() => setReviewRating(star)} className={cn("transition-all hover:scale-125", star <= reviewRating ? "text-amber-500" : "text-muted-foreground/20")}>
                        <Star className={cn("h-10 w-10", star <= reviewRating && "fill-current")} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Skill Level */}
                <div className="space-y-4">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Rate their skill level</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {['Beginner', 'Intermediate', 'Expert'].map(skill => (
                      <button
                        key={skill}
                        onClick={() => setReviewSkill(skill)}
                        className={cn(
                          "h-12 rounded-2xl font-bold text-xs uppercase tracking-widest border-2 transition-all",
                          reviewSkill === skill ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50"
                        )}
                      >
                        {skill}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Tags */}
                <div className="space-y-4">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">What stood out?</Label>
                  <div className="flex flex-wrap gap-2">
                    {['Punctual', 'Clear communicator', 'Highly skilled', 'Would exchange again'].map(tag => (
                      <button
                        key={tag}
                        onClick={() => setReviewTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                        className={cn(
                          "px-6 py-3 rounded-full font-bold text-[10px] uppercase tracking-widest border transition-all",
                          reviewTags.includes(tag) ? "bg-primary/10 text-primary border-primary/20" : "border-border hover:bg-secondary/50"
                        )}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Written Review */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Share your experience</Label>
                    <span className={cn("text-[10px] font-bold uppercase tracking-widest", reviewComment.length < 5 ? "text-destructive" : "text-green-500")}>
                      {reviewComment.length}/5 Min
                    </span>
                  </div>
                  <Textarea
                    value={reviewComment}
                    onChange={e => setReviewComment(e.target.value)}
                    placeholder="Tell us about the exchange..."
                    className="min-h-[120px] rounded-[24px] border-border bg-background font-semibold p-6"
                  />
                </div>
              </div>

              <DialogFooter className="mt-6">
                <Button
                  onClick={handleSubmitReview}
                  disabled={reviewRating === 0 || reviewComment.length < 5}
                  className="h-16 w-full rounded-2xl bg-teal-500 hover:bg-teal-600 text-white font-bold uppercase tracking-widest text-xs shadow-xl shadow-teal-500/20"
                >
                  Submit Review
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {activeModal === 'dispute' && (
          <Dialog open={true} onOpenChange={() => setActiveModal(null)}>
            <DialogContent className="rounded-[40px] p-10 border-border bg-card">
              <DialogHeader>
                <div className="h-16 w-16 rounded-[24px] bg-destructive/10 flex items-center justify-center mb-6">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                </div>
                <DialogTitle className="text-2xl font-bold leading-tight">Raise a Dispute</DialogTitle>
                <DialogDescription className="text-lg font-medium text-muted-foreground pt-4">
                  Tell us what went wrong. An administrator will review the case.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-6">
                <div className="space-y-3">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Reason</Label>
                  <select
                    value={disputeReason}
                    onChange={e => setDisputeReason(e.target.value)}
                    className="w-full h-14 px-6 rounded-2xl border border-border bg-background font-semibold text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  >
                    <option>Work not delivered</option>
                    <option>Work quality issue</option>
                    <option>Peer unresponsive</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Description</Label>
                  <Textarea
                    value={disputeDesc}
                    onChange={e => setDisputeDesc(e.target.value)}
                    placeholder="Provide details about the issue..."
                    className="min-h-[120px] rounded-2xl border-border bg-background font-semibold p-6"
                  />
                </div>
              </div>
              <DialogFooter className="mt-6 gap-4">
                <Button variant="ghost" onClick={() => setActiveModal(null)} className="h-14 flex-1 rounded-2xl font-bold uppercase tracking-widest text-xs">Cancel</Button>
                <Button onClick={handleRaiseDispute} className="h-14 flex-1 rounded-2xl bg-destructive text-white font-bold uppercase tracking-widest text-xs shadow-xl shadow-destructive/20">Raise Dispute</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Upload Notes Modal */}
        <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
          <DialogContent className="sm:max-w-[500px] rounded-[32px] p-8 border-border bg-card">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Upload className="h-5 w-5 text-primary" />
                </div>
                Share Your Notes
              </DialogTitle>
              <DialogDescription className="text-xs font-medium text-muted-foreground pt-2">
                Share your knowledge resources with your peer. These will be added to the collaborative workspace.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">Note Title</label>
                <Input
                  value={uploadData.title}
                  onChange={e => setUploadData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Advanced React Design Patterns"
                  className="h-14 rounded-2xl border-2 border-border bg-background px-6 font-semibold focus:border-primary transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">Description</label>
                <Textarea
                  value={uploadData.description}
                  onChange={e => setUploadData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="What is covered in these notes?"
                  className="min-h-[120px] rounded-[24px] border-2 border-border bg-background p-6 font-semibold focus:border-primary transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">Attachment</label>
                <div className="relative group">
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className={cn(
                    "h-24 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all",
                    uploadData.file ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 bg-secondary/20"
                  )}>
                    {uploadData.file ? (
                      <>
                        <FileText className="h-6 w-6 text-primary" />
                        <span className="text-xs font-bold text-primary truncate max-w-[200px]">{uploadData.file.name}</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Click to select file</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-3 sm:gap-0">
              <Button
                variant="ghost"
                onClick={() => setIsUploadModalOpen(false)}
                className="h-14 rounded-2xl font-bold uppercase tracking-widest text-[10px] flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={submitUpload}
                disabled={!uploadData.title || uploading}
                className="h-14 rounded-2xl bg-primary text-primary-foreground font-bold uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 flex-1"
              >
                {uploading ? "Uploading..." : "Share with Peer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </AnimatePresence>

      {showConfetti && (
        <div className="fixed inset-0 z-[200] pointer-events-none flex items-center justify-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: [0, 1.5, 1] }} transition={{ duration: 1 }} className="text-9xl">🎉</motion.div>
          {/* Simple CSS Confetti simulation could be added here */}
        </div>
      )}

      <FeedbackModal
        isOpen={showFeedback}
        onClose={() => setShowFeedback(false)}
        taskId={activeRoom?.task_id || ""}
        partnerId={activeRoom?.participants ? (activeRoom.participants.find(id => id !== user?.id) || "") : ""}
        onComplete={() => {
          setShowFeedback(false)
          navigate('/activity?tab=completed')
        }}
      />

      {/* Report user modal */}
      {activeRoom && (() => {
        const partner = getPartner(activeRoom)
        const partnerId = activeRoom.participants?.find(id => id !== user?.id)
          || (activeRoom.user_a === user?.id ? activeRoom.user_b : activeRoom.user_a)
        return (
          <ReportUserModal
            open={reportOpen}
            onClose={() => setReportOpen(false)}
            reportedUserId={partnerId || ""}
            reportedUserName={partner.name || "User"}
            chatRoomId={activeRoom.id}
            messages={messages}
            isSbRoom={!!(activeRoom as any).isSb || !!(activeRoom as any).is_supabase}
          />
        )
      })()}
    </div>
  )
}
