import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  CheckCircle2, Inbox, Send, MessageSquare, Clock, XCircle
} from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import { useSocket } from "@/contexts/socket-context"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"

type Tab = 'incoming' | 'sent' | 'completed'

interface ExchangeRequest {
  id: string
  task_id: string
  // Supabase fields
  requester_id?: string
  owner_id?: string
  // Local Express fields
  requested_by?: string
  target_user_id?: string
  from_user_id?: string
  to_user_id?: string
  from_name?: string
  from_avatar?: string | null
  to_name?: string
  to_avatar?: string | null
  status: 'pending' | 'active' | 'in_progress' | 'pending_feedback' | 'completed' | 'declined' | 'review'
  type: 'direct' | 'broadcast' | 'match'
  created_at: string
  message: string
  tasks: {
    title: string
    offering: string
    wanting: string
  }
  requester?: {
    name: string
    avatar_url: string | null
  }
  owner?: {
    name: string
    avatar_url: string | null
  }
  room_id?: string | null
}

export default function MyActivity() {
  const { user } = useAuth()
  const { addNotification } = useSocket()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>('incoming')
  const [requests, setRequests] = useState<ExchangeRequest[]>([])
  const [loading, setLoading] = useState(true)

  const loadRequests = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      // ── 1. Local Express DB ────────────────────────────────────────────────
      let expressIncoming: ExchangeRequest[] = []
      let expressOutgoing: ExchangeRequest[] = []
      try {
        const expressRes = await fetch(`https://backend-a41z.onrender.com/api/user/${user.id}/requests`)
        if (expressRes.ok) {
          const expressData = await expressRes.json()
          expressIncoming = expressData.incoming || []
          expressOutgoing = expressData.outgoing || []
        }
      } catch { /* server may be offline */ }

      // ── 2. Supabase task_requests (flat — no FK joins) ─────────────────────
      const { data: sbReqs } = await supabase
        .from('task_requests')
        .select('id, task_id, requester_id, owner_id, status, created_at')
        .or(`requester_id.eq.${user.id},owner_id.eq.${user.id}`)

      let sbIncoming: ExchangeRequest[] = []
      let sbOutgoing: ExchangeRequest[] = []

      if (sbReqs && sbReqs.length > 0) {
        // Get task titles
        const taskIds = [...new Set(sbReqs.map(r => r.task_id).filter(Boolean))]
        let taskMap: Record<string, any> = {}
        if (taskIds.length > 0) {
          const { data: tasks } = await supabase.from('tasks').select('id, title, offering, wanting').in('id', taskIds)
            ; (tasks || []).forEach(t => { taskMap[t.id] = t })
        }

        // Get user names for requester + owner IDs
        const userIds = [...new Set([...sbReqs.map(r => r.requester_id), ...sbReqs.map(r => r.owner_id)].filter(Boolean))]
        let profileMap: Record<string, any> = {}
        if (userIds.length > 0) {
          const { data: profiles } = await supabase.from('profiles').select('id, name, profile_pic').in('id', userIds)
            ; (profiles || []).forEach(p => { profileMap[p.id] = p })
        }

        const localExpressIds = new Set([...expressIncoming, ...expressOutgoing].map(r => r.id))

        sbReqs.forEach(r => {
          if (localExpressIds.has(r.id)) return // skip duplicates
          const task = taskMap[r.task_id] || {}
          const requesterProfile = profileMap[r.requester_id] || {}
          const ownerProfile = profileMap[r.owner_id] || {}
          const mapped: ExchangeRequest = {
            id: r.id,
            task_id: r.task_id || '',
            status: r.status as ExchangeRequest['status'],
            type: 'direct',
            created_at: r.created_at,
            message: '',
            tasks: {
              title: task.title || 'Skill Exchange',
              offering: task.offering || '',
              wanting: task.wanting || '',
            },
            requester: { name: requesterProfile.name || 'User', avatar_url: requesterProfile.profile_pic || null },
            owner: { name: ownerProfile.name || 'User', avatar_url: ownerProfile.profile_pic || null },
            requester_id: r.requester_id,
            owner_id: r.owner_id,
          }
          if (r.owner_id === user.id) sbIncoming.push(mapped)
          else sbOutgoing.push(mapped)
        })
      }

      // ── 3. Merge all data ────────────────────────────────────────────────────
      const allIncoming = [...expressIncoming, ...sbIncoming]
      const allOutgoing = [...expressOutgoing, ...sbOutgoing]
      const activeStatuses = ['pending', 'active', 'in_progress', 'pending_feedback']

      if (activeTab === 'incoming') {
        setRequests(allIncoming.filter(r => activeStatuses.includes(r.status)))
      } else if (activeTab === 'sent') {
        setRequests(allOutgoing.filter(r => activeStatuses.includes(r.status)))
      } else {
        // Completed: check both 'completed' and 'review' statuses
        const completed = [...allIncoming, ...allOutgoing]
          .filter(r => ['completed', 'review', 'pending_feedback'].includes(r.status))
        setRequests(completed)
      }
    } catch (err) {
      console.error('Load Requests Error:', err)
    } finally {
      setLoading(false)
    }
  }, [user, activeTab])

  useEffect(() => {
    if (user) {
      loadRequests()

      const channel = supabase
        .channel(`activity:${user.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'task_requests',
          filter: `owner_id=eq.${user.id}`
        }, () => {
          loadRequests()
        })
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    }
  }, [user, loadRequests])

  const handleAccept = async (request: ExchangeRequest) => {
    try {
      // Detect source: local Express DB requests always have requested_by or from_user_id
      const isLocalRequest = !!(request.requested_by || request.from_user_id)
      const requestType = request.type || 'direct'

      if (isLocalRequest) {
        let data: any = null

        if (requestType === 'match') {
          const res = await fetch(`https://backend-a41z.onrender.com/api/match-requests/${request.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'accepted' })
          })
          data = await res.json()
        } else {
          const taskId = request.task_id || 'null'
          const res = await fetch(`https://backend-a41z.onrender.com/api/tasks/${taskId}/requests/${request.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'accepted' })
          })
          data = await res.json()
        }

        const room = data?.room
        addNotification('Request accepted! Opening chat…', 'success')
        navigate(room?.id ? `/chat?room=${room.id}` : '/chat')
        return
      }

      // ── Supabase request flow ────────────────────────────────────────────────
      const requesterUserId = request.requester_id
      if (!requesterUserId || !user?.id) {
        addNotification('Cannot identify request parties', 'info')
        return
      }

      // 1. Update request & task status in Supabase
      const { error: reqError } = await supabase
        .from('task_requests')
        .update({ status: 'accepted' })
        .eq('id', request.id)
      if (reqError) throw reqError

      if (request.task_id) {
        await supabase
          .from('tasks')
          .update({ status: 'matched', assigned_to: requesterUserId })
          .eq('id', request.task_id)
      }

      // 2. Check for existing room to avoid duplicates
      let roomId: string | null = null
      if (request.task_id) {
        const { data: existingRooms } = await supabase
          .from('chat_rooms')
          .select('id')
          .eq('task_id', request.task_id)
          .or(`and(user_a.eq.${user.id},user_b.eq.${requesterUserId}),and(user_a.eq.${requesterUserId},user_b.eq.${user.id})`)
        roomId = existingRooms?.[0]?.id ?? null
      }

      if (!roomId) {
        // Create in Supabase (no metadata column — doesn't exist in schema)
        const { data: newRoom, error: roomError } = await supabase
          .from('chat_rooms')
          .insert({
            task_id: request.task_id ? String(request.task_id) : null,
            user_a: user.id,
            user_b: requesterUserId,
            status: 'active'
          })
          .select('id')
          .single()
        if (roomError) throw roomError
        roomId = newRoom.id
      }

      // 3. Sync to local Express DB AND emit server-side socket to requester
      //    (only the server can push socket events to another connected user)
      // Resolve requester name: request object → local DB → UUID prefix
      let requesterName = request.requester?.name || ''
      if (!requesterName) {
        try {
          const nr = await fetch(`https://backend-a41z.onrender.com/api/user-name/${requesterUserId}`)
          if (nr.ok) { const nd = await nr.json(); requesterName = nd.name || '' }
        } catch { /* ignore */ }
      }
      if (!requesterName) requesterName = requesterUserId?.split('-')[0] || 'User'

      const notifyRes = await fetch('https://backend-a41z.onrender.com/api/accept-and-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          taskId: request.task_id,
          ownerId: user.id,
          ownerName: user.name || 'Mentor',
          requesterId: requesterUserId,
          requesterName,
          taskTitle: request.tasks?.title || 'Skill Exchange'
        })
      })

      if (!notifyRes.ok) {
        const errData = await notifyRes.json().catch(() => ({}))
        console.warn('accept-and-notify failed:', (errData as any).error)
      }

      addNotification('Request accepted! Opening chat…', 'success')
      navigate(roomId ? `/chat?room=${roomId}` : '/chat')
    } catch (err) {
      console.error("Accept Flow Error:", err)
      addNotification('Failed to accept request', 'info')
    }
  }

  const handleDecline = async (request: ExchangeRequest) => {
    try {
      const isLocalRequest = !!(request.requested_by || request.from_user_id)
      const requestType = request.type || 'direct'

      if (isLocalRequest) {
        let endpoint = ''
        if (requestType === 'match') {
          endpoint = `https://backend-a41z.onrender.com/api/match-requests/${request.id}`
        } else {
          const taskId = request.task_id || 'null'
          endpoint = `https://backend-a41z.onrender.com/api/tasks/${taskId}/requests/${request.id}`
        }
        await fetch(endpoint, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'declined' })
        })
      } else {
        // Supabase request
        const requesterUserId = request.requester_id
        await supabase.from('task_requests').update({ status: 'declined' }).eq('id', request.id)
        if (request.task_id) {
          await supabase.from('tasks').update({ status: 'open' }).eq('id', request.task_id)
        }
        if (requesterUserId) {
          supabase.from('notifications').insert({
            user_id: requesterUserId,
            type: 'request_declined',
            title: 'Request not accepted',
            message: `${user?.name || 'Mentor'} couldn't accept your request this time`,
            data: { task_id: request.task_id },
            is_read: false
          })
        }
      }

      loadRequests()
    } catch (err) {
      console.error("Decline Flow Error:", err)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 py-12 mt-16">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tight mb-2">My Activity</h1>
            <p className="text-muted-foreground font-medium">Manage your skill exchanges and track progress.</p>
          </div>

          <div className="flex p-1 bg-secondary/30 rounded-2xl border border-border/50 backdrop-blur-xl">
            {(['incoming', 'sent', 'completed'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                  activeTab === tab ? "bg-card text-primary shadow-lg" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 rounded-[32px] bg-secondary/20 animate-pulse border border-border" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="py-32 text-center rounded-[48px] border-2 border-dashed border-border bg-secondary/10">
            {activeTab === 'incoming' ? <Inbox className="h-12 w-12 mx-auto mb-6 text-muted-foreground opacity-20" /> : <Send className="h-12 w-12 mx-auto mb-6 text-muted-foreground opacity-20" />}
            <h3 className="text-xl font-black mb-2">No {activeTab} requests</h3>
            <p className="text-muted-foreground max-w-sm mx-auto font-medium">
              {activeTab === 'incoming' ? "You don't have any incoming requests yet." : "You haven't sent any requests yet."}
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            <AnimatePresence mode="popLayout">
              {requests.map((req) => (
                <motion.div
                  key={req.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="group p-8 rounded-[40px] border border-border bg-card/50 backdrop-blur-xl hover:border-primary/40 hover:shadow-2xl transition-all duration-500"
                >
                  <div className="flex flex-col md:flex-row md:items-center gap-8">
                    <div className="flex items-center gap-4 md:w-1/4">
                      {(() => {
                        const displayName = activeTab === 'incoming'
                          ? (req.requester?.name || req.from_name || 'User')
                          : (req.owner?.name || req.to_name || 'User')
                        return (
                          <>
                            <div className="relative">
                              <div className="h-14 w-14 rounded-2xl bg-secondary flex items-center justify-center font-black text-xl text-primary border border-border">
                                {displayName[0]?.toUpperCase() || '?'}
                              </div>
                              <div className={cn(
                                "absolute -bottom-1 -right-1 h-6 w-6 rounded-lg flex items-center justify-center border-2 border-card text-[10px]",
                                req.status === 'pending' ? "bg-amber-500 text-white" : "bg-primary text-primary-foreground"
                              )}>
                                {req.status === 'pending' ? <Clock className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                              </div>
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                                {activeTab === 'incoming' ? "From" : "To"}
                              </p>
                              <p className="font-black text-foreground">{displayName}</p>
                            </div>
                          </>
                        )
                      })()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-black mb-1 truncate">{req.tasks?.title}</h3>
                      <p className="text-sm text-muted-foreground font-medium truncate">
                        {activeTab === 'incoming' ? `Wants to give: ${req.tasks?.wanting}` : `Wants to learn: ${req.tasks?.offering}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 md:w-1/3 justify-end">
                      {activeTab === 'incoming' && req.status === 'pending' && (
                        <>
                          <Button onClick={() => handleAccept(req)} className="h-12 px-6 rounded-2xl bg-primary text-primary-foreground font-bold text-[10px] uppercase tracking-widest">
                            Accept
                          </Button>
                          <Button onClick={() => handleDecline(req)} variant="ghost" className="h-12 px-6 rounded-2xl bg-secondary/50 font-bold text-[10px] uppercase tracking-widest hover:bg-destructive/10 hover:text-destructive">
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {(req.status === 'active' || req.status === 'in_progress' || req.status === 'review') && (
                        <Button onClick={() => navigate(`/chat${req.room_id ? `?room=${req.room_id}` : ''}`)} className="h-12 px-8 rounded-2xl bg-foreground text-background font-bold text-[10px] uppercase tracking-widest gap-2">
                          <MessageSquare className="h-4 w-4" /> Chat Now
                        </Button>
                      )}
                      {req.status === 'completed' && (
                        <div className="flex items-center gap-2 text-green-500 font-black text-[10px] uppercase tracking-widest bg-green-500/10 px-4 py-2 rounded-xl border border-green-500/20">
                          <CheckCircle2 className="h-4 w-4" /> Completed
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  )
}
