import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Search, Sparkles, RefreshCcw, AlertCircle, Clock, CheckCircle2, MessageSquare, History, User2, Zap
} from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import SkillIntake from "./SkillIntake"
import { useNavigate } from "react-router-dom"
import { useSocket } from "@/contexts/socket-context"
import type { Task, Room } from "@/types"


interface ActivityItem {
  id: string
  task_id?: string
  title?: string
  status: string
  created_at: string
  isOwnTask?: boolean
  task?: { title: string; offering: string; wanting: string; posted_by?: string }
  requester?: { name: string; avatar_url: string | null }
  owner?: { name: string; avatar_url: string | null }
  owner_id?: string
  requester_id?: string
  room_id?: string
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function DirectExchange() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { socket, addNotification } = useSocket()

  const [tasks, setTasks] = useState<Task[]>([])
  const [recommendations, setRecommendations] = useState<Task[]>([])
  const [recReasons, setRecReasons] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [showIntake, setShowIntake] = useState(false)
  
  // Track requests sent by ME to disable buttons
  const [requestedTasks, setRequestedTasks] = useState<string[]>([])

  const [myActivity, setMyActivity] = useState<ActivityItem[]>([])
  const [activeActivityTab, setActiveActivityTab] = useState<'pending' | 'accepted' | 'declined'>('pending')

  const getGeminiRecs = useCallback(async (allPossible: Task[], myNeeds: string[], myOffers: string[]) => {
    try {
      const geminiPrompt = `
        Matchmaker AI Pro:
        User Offerings: ${JSON.stringify(myOffers)}
        User Needs: ${JSON.stringify(myNeeds)}

        Available Pool:
        ${JSON.stringify(allPossible.slice(0, 15).map(t => ({ 
          id: t.id, 
          name: t.users?.name,
          offers: t.offering, 
          wants: t.wanting 
        })))}

        Find the 3 BEST MUTUAL handshakes.
        Return JSON ONLY:
        { "top_matches": [ { "task_id": "id", "reason": "why" } ] }
      `
      const res = await fetch("http://localhost:5000/api/ai/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: geminiPrompt })
      })
      if (!res.ok) return
      const text = await res.text()
      const jsonMatch = text.match(/\{.*\}/s)
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0])
        const recTasks = data.top_matches.map((r: { task_id: string }) => allPossible.find((t) => t.id === r.task_id)).filter(Boolean) as Task[]
        const reasons: Record<string, string> = {}
        data.top_matches.forEach((r: { task_id: string; reason: string }) => reasons[r.task_id] = r.reason)
        setRecommendations(recTasks.slice(0, 3))
        setRecReasons(reasons)
      }
    } catch (err) { console.error("Gemini Error:", err) }
  }, [])

  const loadFeed = useCallback(async (overrideWanting?: string, silent = false) => {
    if (!user?.id) return
    if (!silent) setLoading(true)
    try {
      // Step 1 — load already-sent requests so buttons show correct state
      const { data: myRequests } = await supabase
        .from('task_requests')
        .select('task_id')
        .eq('requester_id', user.id)
        .in('status', ['pending', 'accepted'])
      if (myRequests) setRequestedTasks(myRequests.map((r: { task_id: string }) => r.task_id))

      // Step 2 — server does the bilateral match:
      //   Person A's offering  ∩  Person B's wanting  ≠ ∅
      //   AND
      //   Person B's offering  ∩  Person A's wanting  ≠ ∅
      //   → only then recommend Person B to Person A (and vice-versa)
      const recRes = await fetch(`http://localhost:5000/api/recommendations/${user.id}`)
      const matched: Task[] = recRes.ok ? await recRes.json().catch(() => []) : []

      // Step 3 — if SkillIntake passed an override skill, narrow further
      const filtered: Task[] = overrideWanting
        ? matched.filter((t: Task) => {
            const offers = (Array.isArray(t.offering) ? t.offering : [t.offering || ''])
              .map((s: string) => s.toLowerCase())
            return offers.some(s =>
              s.includes(overrideWanting.toLowerCase()) ||
              overrideWanting.toLowerCase().includes(s)
            )
          })
        : matched

      setTasks(filtered)

      // Step 4 — AI picks the best 3 from the already bilateral-filtered pool
      if (filtered.length > 0) {
        // their wanting = what I offer | their offering = what I need
        const myOffers = Array.from(new Set(
          filtered.flatMap((t: Task) => Array.isArray(t.wanting) ? t.wanting : [t.wanting || ''])
            .filter(Boolean).map((s: string) => s.toLowerCase())
        ))
        const myNeeds = Array.from(new Set(
          filtered.flatMap((t: Task) => Array.isArray(t.offering) ? t.offering : [t.offering || ''])
            .filter(Boolean).map((s: string) => s.toLowerCase())
        ))
        await getGeminiRecs(filtered, myNeeds, myOffers)
      }
    } catch (err) {
      console.error("Feed Error:", err)
    } finally {
      setLoading(false)
    }
  }, [user, getGeminiRecs])

  const loadMyActivity = useCallback(async (silent = false) => {
    if (!user) return
    if (!silent) setLoading(true)
    try {
      // 1. Fetch Requests (Incoming/Outgoing)
      const res = await fetch(`http://localhost:5000/api/user/${user.id}/requests`)
      const data = await res.json()
      
      // 2. Fetch Own Posts
      const postRes = await fetch(`http://localhost:5000/api/user/${user.id}/posts`)
      const ownPosts = await postRes.json()

      const combined = [
        ...(data.incoming || []), 
        ...(data.outgoing || []),
        ...(ownPosts || []).map((p: { title: string; offering: string | string[]; wanting: string | string[] }) => ({ 
          ...p, 
          isOwnTask: true, 
          task: { 
            title: p.title, 
            offering: Array.isArray(p.offering) ? p.offering.join(", ") : p.offering,
            wanting: Array.isArray(p.wanting) ? p.wanting.join(", ") : p.wanting
          } 
        }))
      ].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      
      const roomRes = await fetch(`http://localhost:5000/api/chat/rooms?user_id=${user.id}`)
      const rooms = await roomRes.json()

      const enriched = combined.map((item: ActivityItem) => {
        const room = rooms.find((r: Room) => r.task_id === item.task_id || r.request_id === item.id)
        return { ...item, room_id: room?.id }
      })

      let filtered = enriched
      if (activeActivityTab === 'pending') {
        filtered = enriched.filter(item => item.status === 'pending' || item.isOwnTask)
      } else if (activeActivityTab === 'accepted') {
        filtered = enriched.filter(item => ['active', 'accepted', 'in_progress', 'completed'].includes(item.status))
      } else {
        filtered = enriched.filter(item => item.status === 'declined')
      }

      setMyActivity(filtered)
    } catch (err) {
      console.error("Activity Error:", err)
    }
  }, [user, activeActivityTab])


  useEffect(() => {
    if (user?.id) {
      loadFeed()
      loadMyActivity()
      
      // Subscribe to re-enable button on decline
      const channel = supabase
        .channel(`requests:${user.id}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'task_requests',
          filter: `requester_id=eq.${user.id}`
        }, (payload) => {
          if (payload.new.status === 'declined') {
            setRequestedTasks(prev => prev.filter(id => id !== payload.new.task_id))
          }
        })
        .subscribe()
      if (socket) {
        socket.on('request:new', () => { loadFeed(undefined, true); loadMyActivity(true); })
        socket.on('task:removed', ({ taskId }) => {
          setTasks(prev => prev.filter(t => t.id !== taskId))
          setRecommendations(prev => prev.filter(t => t.id !== taskId))
        })
      }
      
      return () => { 
        supabase.removeChannel(channel)
        if (socket) {
          socket.off('notification:new')
          socket.off('request:new')
          socket.off('task:removed')
        }
      }
    }
  }, [user, loadFeed, loadMyActivity])

  useEffect(() => {
    if (user) loadMyActivity(true)
  }, [activeActivityTab]) // eslint-disable-line react-hooks/exhaustive-deps

  const onIntakeComplete = (wanting: string, geminiData: { top_matches: unknown[], also_try: unknown[] }) => {
    if (geminiData) console.log("AI Intake data received");
    sessionStorage.setItem('intake_done', 'true')
    setShowIntake(false)
    loadFeed(wanting, true)
    loadMyActivity(true)
  }

  const handleRequest = async (task: Task) => {
    if (requestedTasks.includes(task.id)) return
    
    // Step 1 — Disable the button immediately on click
    setRequestedTasks(prev => [...prev, task.id])
    
    try {
      // Step 2 — Insert into task_requests
      const { data: reqData, error: reqError } = await supabase
        .from('task_requests')
        .insert({
          task_id:      task.id,
          requester_id: user?.id,
          owner_id:     task.user_id,
          status:       'pending'
        })
        .select()
        .single()
      
      if (reqError) {
        console.error('Request insert failed:', reqError)
        setRequestedTasks(prev => prev.filter(id => id !== task.id))
        return
      }

      // Step 3 — Update task status to 'requested'
      await supabase
        .from('tasks')
        .update({ status: 'requested' })
        .eq('id', task.id)

      // Step 2 — Send Notification to Owner
      const offering = Array.isArray(task.wanting) ? task.wanting.join(", ") : task.wanting
      const notificationMessage = `${user?.name || 'Someone'} wants to exchange ${offering} for your "${task.title}"`

      await supabase
        .from('notifications')
        .insert({
          user_id:   task.user_id,
          type:      'task_request',
          title:     'New Connection Request',
          message:   notificationMessage,
          data: {
            task_id:       task.id,
            task_title:    task.title,
            requester_id:  user?.id,
            requester_name: user?.name,
            request_id:    reqData.id,
            offering:      offering
          },
          is_read:   false
        })

      // NEW: Send Real-time Socket Notification
      if (socket) {
        socket.emit('request:new', {
          targetUserId: task.user_id,
          requesterId: user?.id,
          requesterName: user?.name,
          taskTitle: task.title,
          message: notificationMessage
        })
      }

      addNotification(`Request sent for ${task.title}!`, 'success')
      
    } catch (err) { 
      console.error('[DirectExchange] Error:', err)
      setRequestedTasks(prev => prev.filter(id => id !== task.id))
    }
  }

  const handleUpdateStatus = async (item: ActivityItem, status: string) => {
    try {
      const res = await fetch(`http://localhost:5000/api/requests/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      })
      
      if (res.ok) {
        const data = await res.json()
        if (status === 'accepted' && data.room?.id) {
          navigate(`/chat?room=${data.room.id}`)
        }
        loadMyActivity(true)
        loadFeed(undefined, true)
        alert(`Connection ${status === 'active' || status === 'accepted' ? 'accepted' : status}!`)
      }
    } catch (err) { console.error(err) }
  }

  const filteredTasks = tasks.filter(t => !recommendations.some(r => r.id === t.id))

  if (showIntake) return <SkillIntake onComplete={onIntakeComplete} />

  return (
    <div className="min-h-screen bg-background pb-32">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 py-12 mt-16">
        {/* Search Header */}
        <div className="mb-12 flex flex-col md:flex-row items-start md:items-center justify-between p-8 rounded-[40px] bg-secondary/20 border border-border/50 gap-6">
          <div className="flex items-center gap-6">
            <div className="h-14 w-14 rounded-2xl bg-background border border-border flex items-center justify-center">
              <Search className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Your Match Profile</p>
              <div className="flex items-center gap-2">
                <span className="px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-black flex items-center gap-2">
                  Matching your skills
                </span>
                <Button variant="ghost" onClick={() => setShowIntake(true)} className="h-8 px-3 rounded-full text-[10px] font-black uppercase tracking-widest gap-1.5 hover:bg-primary/10">
                  <RefreshCcw className="h-3 w-3" /> Post a Task
                </Button>
              </div>
            </div>
          </div>
          <div className="hidden lg:flex items-center gap-4 border-l border-border pl-8 text-right">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Status</p>
              <p className="text-sm font-black text-foreground">Analyzing {tasks.length} matches</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center"><Sparkles className="h-5 w-5 text-primary" /></div>
          </div>
        </div>

        {/* My Activity Tabs */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <History className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-black tracking-tight">My Connection Status</h2>
            </div>
            <div className="flex p-1 bg-secondary/30 rounded-2xl border border-border/50">
              {(['pending', 'accepted', 'declined'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveActivityTab(tab)}
                  className={cn(
                    "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    activeActivityTab === tab ? "bg-card text-primary shadow-lg" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {myActivity.length === 0 ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 text-center rounded-[40px] border-2 border-dashed border-border bg-secondary/5">
                <p className="text-muted-foreground font-bold">No {activeActivityTab} activity found.</p>
              </motion.div>
            ) : (
              <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid gap-4">
                {myActivity.map((item) => (
                  <div key={item.id} className="p-6 rounded-[32px] border border-border bg-card/30 flex flex-col md:flex-row items-center justify-between gap-6 hover:border-primary/30 transition-all">
                    <div className="flex items-center gap-4">
                      <div 
                        onClick={() => {
                          const targetId = item.isOwnTask ? user?.id : (item.owner_id === user?.id ? item.requester_id : item.owner_id);
                          if (targetId) navigate(`/profile?id=${targetId}`);
                        }}
                        className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center font-black text-primary cursor-pointer hover:bg-primary/20 transition-all"
                      >
                        {item.isOwnTask ? <User2 className="h-6 w-6" /> : (item.owner_id === user?.id ? item.requester?.name?.[0] : item.owner?.name?.[0])}
                      </div>
                      <div 
                        onClick={() => {
                          const targetId = item.isOwnTask ? user?.id : (item.owner_id === user?.id ? item.requester_id : item.owner_id);
                          if (targetId) navigate(`/profile?id=${targetId}`);
                        }}
                        className="cursor-pointer group/name"
                      >
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover/name:text-primary transition-colors">
                          {item.isOwnTask ? "Your Posted Task" : (item.owner_id === user?.id ? `From ${item.requester?.name}` : `Sent to ${item.owner?.name}`)}
                        </p>
                        <h4 className="font-black text-lg leading-tight group-hover/name:text-primary transition-colors">{item.task?.title}</h4>
                        {item.task && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {item.task.offering && (
                              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[8px] font-black uppercase">Giving: {item.task.offering}</span>
                            )}
                            {item.task.wanting && (
                              <span className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground text-[8px] font-black uppercase">Seeking: {item.task.wanting}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {item.isOwnTask ? (
                        <span className="px-4 py-2 rounded-xl bg-primary/10 text-primary text-[10px] font-black uppercase flex items-center gap-2">
                          <Clock className="h-3 w-3" /> Awaiting Matches
                        </span>
                      ) : (
                        <>
                          {item.status === 'pending' && item.owner_id === user?.id && (
                            <>
                              <Button onClick={() => handleUpdateStatus(item, 'active')} className="h-10 px-6 rounded-xl bg-primary text-primary-foreground font-black text-[10px] uppercase">Accept</Button>
                              <Button onClick={() => handleUpdateStatus(item, 'declined')} variant="ghost" className="h-10 px-6 rounded-xl bg-secondary hover:bg-destructive/10 hover:text-destructive font-black text-[10px] uppercase">Decline</Button>
                            </>
                          )}
                          {(item.status === 'active' || item.status === 'in_progress') && (
                            <Button onClick={() => navigate(`/chat${item.room_id ? `?room=${item.room_id}` : ''}`)} className="h-10 px-6 rounded-xl bg-foreground text-background font-black text-[10px] uppercase gap-2"><MessageSquare className="h-4 w-4" /> Chat</Button>
                          )}
                          {item.status === 'completed' && (
                            <span className="px-4 py-2 rounded-xl bg-green-500/10 text-green-500 text-[10px] font-black uppercase flex items-center gap-2"><CheckCircle2 className="h-3 w-3" /> Completed</span>
                          )}
                          {item.status === 'declined' && (
                            <span className="px-4 py-2 rounded-xl bg-destructive/10 text-destructive text-[10px] font-black uppercase">Declined</span>
                          )}
                          {item.status === 'pending' && item.requester_id === user?.id && (
                            <span className="px-4 py-2 rounded-xl bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase flex items-center gap-2"><Clock className="h-3 w-3" /> Pending</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* AI Recommendations */}
        {recommendations.length > 0 && (
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <Zap className="h-6 w-6 text-amber-500 fill-amber-500" />
              <h2 className="text-2xl font-black tracking-tight text-amber-600">Smart Peer Recommendations</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {recommendations.map((task) => {
                const isRequested = requestedTasks.includes(task.id)
                return (
                  <motion.div 
                    key={`rec-${task.id}`} 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="p-8 rounded-[40px] border-2 border-amber-500/40 bg-gradient-to-br from-amber-500/[0.05] to-amber-500/[0.02] flex flex-col relative overflow-hidden group shadow-xl"
                  >
                    <div className="absolute top-4 right-4 h-8 w-8 bg-amber-500 text-white rounded-full flex items-center justify-center font-black text-xs shadow-lg transform rotate-12 group-hover:rotate-0 transition-transform">
                      AI
                    </div>
                    <div 
                      onClick={() => navigate(`/profile?id=${task.user_id}`)}
                      className="flex items-center gap-4 mb-6 cursor-pointer group/user"
                    >
                      <div className="h-12 w-12 rounded-2xl bg-amber-500/20 flex items-center justify-center font-black text-amber-700 text-xl group-hover/user:bg-amber-500/30 transition-all">{task.users?.name?.[0]}</div>
                      <div>
                        <p className="font-black text-sm text-amber-900 group-hover/user:text-amber-600 transition-colors">{task.users?.name}</p>
                        <div className="text-[10px] text-amber-600 font-black uppercase flex items-center gap-1 tracking-widest">
                          Perfect Peer Found
                        </div>
                      </div>
                    </div>
                    <h3 className="text-xl font-black mb-4 text-amber-900">{task.title}</h3>
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-6 flex gap-3">
                      <Sparkles className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-[11px] font-bold text-amber-800 italic leading-relaxed">"{recReasons[task.id]}"</p>
                    </div>
                    <Button 
                      onClick={() => handleRequest(task)} 
                      disabled={isRequested}
                      style={{
                        opacity:  isRequested ? 0.5 : 1,
                        cursor:   isRequested ? 'not-allowed' : 'pointer',
                        background: isRequested ? '#888' : undefined
                      }}
                      className={cn(
                        "w-full h-14 rounded-2xl font-black shadow-xl shadow-amber-600/20 disabled:opacity-50",
                        isRequested ? "" : "bg-amber-600 hover:bg-amber-700 text-white"
                      )}
                    >
                      {isRequested ? "Request Sent" : "Connect with this Peer"}
                    </Button>
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}

        <h2 className="text-2xl font-black tracking-tight mb-8">Available Matches</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {loading ? (
             <div className="col-span-full py-20 text-center font-black text-muted-foreground animate-pulse">Deep scanning profiles for handshakes...</div>
          ) : filteredTasks.length === 0 && recommendations.length === 0 ? (
            <div className="col-span-full py-32 text-center rounded-[48px] border-2 border-dashed border-border bg-secondary/10"><AlertCircle className="h-12 w-12 mx-auto mb-6 opacity-20" /><h3 className="text-xl font-black mb-2">No direct matches yet</h3><p className="text-muted-foreground font-medium">We're searching for someone who offers what you need.</p></div>
          ) : (
            filteredTasks.map((task) => {
              const isRequested = requestedTasks.includes(task.id)
              return (
                <motion.div key={task.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-8 rounded-[40px] border border-border bg-card/50 hover:border-primary/40 transition-all">
                  <div 
                    onClick={() => navigate(`/profile?id=${task.user_id}`)}
                    className="flex items-center gap-4 mb-6 cursor-pointer group/user"
                  >
                    <div className="h-14 w-14 rounded-2xl bg-secondary flex items-center justify-center font-black text-primary text-xl group-hover/user:bg-primary/10 transition-all">
                      {task.users?.name?.[0]}
                    </div>
                    <div>
                      <p className="font-black text-foreground group-hover/user:text-primary transition-colors">{task.users?.name}</p>
                      <p className="text-[10px] font-black text-muted-foreground uppercase">{timeAgo(task.created_at)}</p>
                    </div>
                  </div>
                  <h3 className="text-xl font-black mb-3">{task.title}</h3>
                  <p className="text-sm text-muted-foreground mb-8 font-medium line-clamp-3">{task.description}</p>
                  <div className="mt-auto space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase">Has: {task.offering}</span>
                      <span className="px-3 py-1 rounded-full bg-secondary text-muted-foreground text-[10px] font-black uppercase">Needs: {task.wanting}</span>
                    </div>
                    <Button 
                      onClick={() => handleRequest(task)} 
                      disabled={isRequested}
                      className="w-full h-14 rounded-2xl bg-foreground text-background font-black hover:bg-primary hover:text-primary-foreground transition-all disabled:opacity-50"
                    >
                      {isRequested ? "Requested" : "Request this Task"}
                    </Button>
                  </div>
                </motion.div>
              )
            })
          )}
        </div>
      </main>
    </div>
  )
}
