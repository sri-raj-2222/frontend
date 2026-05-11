import { useAuth } from "@/contexts/auth-context"
import { useNavigate, Link, useLocation } from "react-router-dom"
import { useState, useRef, useEffect } from "react"
import { ModeToggle } from "@/components/ui/mode-toggle"
import { 
  LogOut, 
  User, 
  Settings, 
  Bell, 
  MessageSquare, 
  Users, 
  Workflow, 
  GraduationCap, 
  BookOpen,
  ChevronRight,
  ArrowLeftRight,
  Zap,
  Shield
} from "lucide-react"

import AuthDialog from "@/components/ui/auth-dialog"
import { NavDropdown } from "@/components/ui/nav-dropdown"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "./ui/button"
import { useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { useSocket } from "@/contexts/socket-context"
import type { Notification, Room } from "@/types"

export function Navbar() {
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { socket } = useSocket()

  // Pages that should always show the landing/public navbar
  const isLandingPage = location.pathname === '/' || location.pathname === '/signin'
  // Show app-nav items only when authenticated AND not on a landing page
  const showAppNav = isAuthenticated && !isLandingPage
  // Check if current user has an admin session stored
  const hasAdminSession = !!localStorage.getItem('admin_session')

  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)
  const notificationRef = useRef<HTMLDivElement>(null)
  const chatRef = useRef<HTMLDivElement>(null)

  const CURRENT_USER_ID = user?.id || ""

  const fetchNotifications = useCallback(async () => {
    try {
      const [expressRes, supabaseRes] = await Promise.all([
        fetch(`http://localhost:5000/api/notifications?user_id=${CURRENT_USER_ID}`),
        supabase
          .from('notifications')
          .select('*')
          .eq('user_id', CURRENT_USER_ID)
          .order('created_at', { ascending: false })
      ])
      
      const expressData = await expressRes.json()
      const supabaseData = supabaseRes.data || []
      
      const combined = [...expressData, ...supabaseData].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      setNotifications(combined)
      setUnreadCount(combined.filter((n: Notification) => !n.is_read).length)
    } catch (err) {
      console.error("Failed to fetch notifications:", err)
    }
  }, [CURRENT_USER_ID])

  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/chat/rooms?user_id=${CURRENT_USER_ID}`)
      const data = await res.json()
      setRooms(data || [])
    } catch (err) {
      console.error("Failed to fetch rooms:", err)
    }
  }, [CURRENT_USER_ID])

  useEffect(() => {
    if (!isAuthenticated || !CURRENT_USER_ID) return

    // Load initial data
    Promise.all([fetchNotifications(), fetchRooms()])

    // Supabase Realtime — new notification inserted for this user
    const channel = supabase
      .channel(`notifications:${CURRENT_USER_ID}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${CURRENT_USER_ID}`
      }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev])
        setUnreadCount(prev => prev + 1)
      })
      .subscribe()

    // Socket listeners — only attach if socket is ready (provided by SocketContext)
    if (!socket) return () => { supabase.removeChannel(channel) }

    const onRequestNew = (data: Notification) => {
      setNotifications(prev => [data, ...prev])
      setUnreadCount(prev => prev + 1)
    }

    const onMessageNew = () => fetchRooms()

    const onRequestAccepted = (data: { roomId: string; taskTitle: string }) => {
      if (!data?.roomId) return
      // Guard: skip if page is in an error state
      if (typeof window !== 'undefined' && window.location.protocol === 'chrome-error:') return
      setNotifications(prev => [{
        id: Date.now().toString(),
        type: 'request_accepted',
        message: `🎉 Match confirmed! "${data.taskTitle}" — Opening chat...`,
        is_read: false,
        created_at: new Date().toISOString()
      } as unknown as Notification, ...prev])
      setUnreadCount(prev => prev + 1)
      fetchRooms()
      // Use React Router navigate — no full reload, no new tab
      navigate(`/chat?room=${data.roomId}`)
    }

    const onChatRoomCreated = (data: { roomId: string }) => {
      if (!data?.roomId) return
      if (typeof window !== 'undefined' && window.location.protocol === 'chrome-error:') return
      fetchRooms()
      const currentRoom = new URLSearchParams(window.location.search).get('room')
      if (currentRoom !== data.roomId) {
        navigate(`/chat?room=${data.roomId}`)
      }
    }


    socket.on('request:new', onRequestNew)
    socket.on('message:new', onMessageNew)
    socket.on('request:accepted', onRequestAccepted)
    socket.on('chat:room_created', onChatRoomCreated)

    return () => {
      supabase.removeChannel(channel)
      socket.off('request:new', onRequestNew)
      socket.off('message:new', onMessageNew)
      socket.off('request:accepted', onRequestAccepted)
      socket.off('chat:room_created', onChatRoomCreated)
    }
  }, [isAuthenticated, CURRENT_USER_ID, socket, fetchNotifications, fetchRooms])

  const handleAction = async (notificationId: string, referenceId: string, taskId: string, status: string, type: string) => {
    // Optimistically remove the notification from UI immediately
    setNotifications(prev => prev.filter(n => n.id !== notificationId))
    setUnreadCount(prev => Math.max(0, prev - 1))

    try {
      if (type === 'match_request') {
        // Match request — handled by local Express
        const res = await fetch(`http://localhost:5000/api/match-requests/${referenceId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
        })
        if (res.ok && status === 'accepted') {
          const data = await res.json()
          if (data.room?.id) navigate(`/chat?room=${data.room.id}`)
        }


      } else if (type === 'task_request') {
        // Supabase task request
        const { data: request, error: fetchError } = await supabase
          .from('task_requests')
          .select('*')
          .eq('id', referenceId)
          .single()

        if (fetchError || !request) {
          console.error("Supabase request not found:", fetchError)
          return
        }

        if (status === 'accepted') {
          // 1. Update request & task status in Supabase
          await supabase.from('task_requests').update({ status: 'accepted' }).eq('id', request.id)
          if (request.task_id) {
            await supabase.from('tasks').update({ status: 'matched', assigned_to: request.requester_id }).eq('id', request.task_id)
          }

          // 2. Fetch requester name — try profiles first, then local DB
          let requesterName = ''
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', request.requester_id)
              .single()
            requesterName = profile?.full_name || ''
          } catch { /* ignore */ }

          // If profiles had no name, ask local Express DB (stores names from when requests were sent)
          if (!requesterName) {
            try {
              const nr = await fetch(`http://localhost:5000/api/user-name/${request.requester_id}`)
              if (nr.ok) { const nd = await nr.json(); requesterName = nd.name || '' }
            } catch { /* ignore */ }
          }

          // Final fallback: use the requesting user's email prefix
          if (!requesterName) requesterName = request.requester_id?.split('-')[0] || 'User'

          // 3. Check for existing room to avoid duplicates
          let roomId: string | null = null
          const { data: existingRooms } = await supabase
            .from('chat_rooms')
            .select('id')
            .eq('task_id', request.task_id)
            .or(`and(user_a.eq.${user?.id},user_b.eq.${request.requester_id}),and(user_a.eq.${request.requester_id},user_b.eq.${user?.id})`)
          roomId = existingRooms?.[0]?.id ?? null

          if (!roomId) {
            // Create room in Supabase (no metadata column — doesn't exist in schema)
            const { data: newRoom, error: roomError } = await supabase
              .from('chat_rooms')
              .insert({
                task_id: String(request.task_id),
                user_a:  user?.id,
                user_b:  request.requester_id,
                status:  'active'
              })
              .select('id')
              .single()
            if (roomError) throw roomError
            roomId = newRoom.id
          }

          // 4. Sync to local Express DB + emit server-side socket to requester
          await fetch('http://localhost:5000/api/accept-and-notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              roomId,
              taskId: request.task_id,
              ownerId: user?.id,
              ownerName: user?.name || 'Mentor',
              requesterId: request.requester_id,
              requesterName,
              taskTitle: request.task_title || 'Skill Exchange'
            })
          }).catch(e => console.warn('accept-and-notify failed:', e))

          if (roomId) navigate(`/chat?room=${roomId}`)

        } else {
          // Decline
          await supabase.from('task_requests').update({ status: 'declined' }).eq('id', request.id)
          if (request.task_id) {
            await supabase.from('tasks').update({ status: 'open' }).eq('id', request.task_id)
          }
        }

      } else {
        // Default: local Express task request (request_new type)
        const tid = taskId || 'null'
        const res = await fetch(`http://localhost:5000/api/tasks/${tid}/requests/${referenceId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
        })
        if (res.ok && status === 'accepted') {
          const data = await res.json()
          if (data.room?.id) navigate(`/chat?room=${data.room.id}`)
        }
      }

      // Mark notification as read (both local and Supabase)
      await fetch(`http://localhost:5000/api/notifications/${notificationId}/read`, { method: 'PATCH' }).catch(() => {})
      void supabase.from('notifications').update({ is_read: true }).eq('id', notificationId)
      fetchNotifications()
    } catch (err) {
      console.error("Action error:", err)
    }
  }

  const markAllRead = async () => {
    try {
      setUnreadCount(0)
      
      // Update local express notifications
      const localUnread = notifications.filter(n => !n.is_read && typeof n.id === 'string' && !n.id.includes('-'))
      localUnread.forEach(async (n) => {
        await fetch(`http://localhost:5000/api/notifications/${n.id}/read`, { method: "PATCH" })
      })

      // Update Supabase notifications
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', CURRENT_USER_ID)
        .eq('is_read', false)

    } catch (err) {
      console.error("Failed to mark read:", err)
    }
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false)
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false)
      }
      if (chatRef.current && !chatRef.current.contains(event.target as Node)) {
        setIsChatOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])


  return (
    <nav className="w-full border-b border-slim border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="w-full flex h-16 items-center justify-between px-6 max-w-7xl mx-auto">
        {/* Logo */}
        <div className="flex items-center gap-8">
          <Link to={isAuthenticated ? "/dashboard" : "/"} className="flex items-center gap-2 group">
            <div className="h-10 w-10 flex items-center justify-center transition-transform group-hover:scale-105">
              <img src="/logo.png" alt="ShareSphere" className="h-full w-auto object-contain dark:invert transition-all" />
            </div>
            <span className="font-bold text-xl tracking-tight text-foreground hidden sm:block">
              ShareSphere
            </span>
          </Link>

          {/* ── App Nav: authenticated + not on landing page ── */}
          {showAppNav && (
            <div className="hidden md:flex items-center gap-2">
              <NavDropdown 
                label="Tasks" 
                isMega={true}
                items={[
                  { 
                    label: "One to One Skill Share", 
                    description: "Direct skill swap with one other person.\nI teach you Java, teach me Python.",
                    icon: MessageSquare,
                    href: "/tasks/direct" 
                  },
                  {
                    label: "Available Matches",
                    description: "See peers who offer what you need AND need what you offer.\nAI-powered bidirectional skill matching.",
                    icon: ArrowLeftRight,
                    href: "/tasks/one-to-one/matches"
                  },
                  { 
                    label: "Broadcast Class", 
                    description: "Teach a group. Set seats, share knowledge.\n3-hour React workshop, 12 students.",
                    icon: Users,
                    href: "/broadcast" 
                  },
                  { 
                    label: "Project Composite", 
                    description: "Build a team — multiple specialists, one project.\nProject: frontend, backend, database.",
                    icon: Workflow,
                    href: "/tasks/project" 
                  }
                ]} 
              />
              <NavDropdown 
                label="Learn" 
                isMega={true}
                items={[
                  { 
                    label: "Learn from Tutor", 
                    description: "Get guidance from experienced mentors. Learn skills step-by-step.\nLive sessions: coding + doubt solving + feedback.",
                    icon: GraduationCap,
                    href: "/tutors" 
                  },
                  { 
                    label: "Notes", 
                    description: "Learn from Top Notes by Certified users\nSave notes: topics + key points + examples.",
                    icon: BookOpen,
                    href: "/notes" 
                  }
                ]} 
              />

              <div className="relative" ref={chatRef}>
                <button 
                  onClick={() => setIsChatOpen(!isChatOpen)}
                  className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
                >
                  Messenger
                  <MessageSquare className="h-3.5 w-3.5" />
                </button>

                <AnimatePresence>
                  {isChatOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute left-0 mt-4 w-[320px] bg-card border-slim border-border rounded-[24px] shadow-2xl z-[100] overflow-hidden"
                    >
                      <div className="p-5 border-b border-border flex justify-between items-center bg-secondary/10">
                        <h3 className="font-bold tracking-tight text-sm">Active Chats</h3>
                        <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">{rooms.length} Active</span>
                      </div>
                      <div className="max-h-[380px] overflow-y-auto">
                        {rooms.length === 0 ? (
                          <div className="p-10 text-center opacity-30">
                            <MessageSquare className="h-8 w-8 mx-auto mb-3" />
                            <p className="font-bold text-[9px] uppercase tracking-widest">No chats yet</p>
                          </div>
                        ) : (
                          rooms.map((room) => {
                            const partnerId = room.participants?.find((p: string) => p !== CURRENT_USER_ID)
                            const partner = room.participant_info?.[partnerId || ""] || { name: "Partner" }
                            return (
                              <button 
                                key={room.id}
                                onClick={() => {
                                  navigate(`/chat?room=${room.id}`)
                                  setIsChatOpen(false)
                                }}
                                className="w-full p-4 border-b border-border hover:bg-secondary/30 transition-all text-left group"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0 group-hover:bg-primary/20 transition-colors">
                                    {partner.name?.[0]?.toUpperCase() || "?"}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">{partner.name}</p>
                                    <p className="text-[10px] font-medium text-muted-foreground truncate mt-0.5">
                                      {room.last_message?.content || room.task?.title}
                                    </p>
                                  </div>
                                </div>
                              </button>
                            )
                          })
                        )}
                      </div>
                      <Link 
                        to="/chat" 
                        onClick={() => setIsChatOpen(false)}
                        className="block p-3 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary hover:bg-secondary/50 transition-all"
                      >
                        Open Messenger
                      </Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Link to="/tasks/one-to-one/matches" className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
                Handshakes
                <Zap className="h-3.5 w-3.5 text-primary" />
              </Link>
            </div>
          )}

          {/* ── Landing Nav: always on / and /signin ── */}
          {isLandingPage && (
            <div className="hidden md:flex items-center gap-6">
              <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                How it works
              </a>
              <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Features
              </a>
              <a href="#about" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                About
              </a>
            </div>
          )}
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-4">
          <ModeToggle />
          
          {/* Show full auth controls only when logged in AND not on landing page */}
          {showAppNav ? (
            <div className="flex items-center gap-4">
              <div className="relative" ref={notificationRef}>
                <button 
                  onClick={() => {
                    if (!isNotificationsOpen) markAllRead()
                    setIsNotificationsOpen(!isNotificationsOpen)
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors relative p-2"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-primary flex items-center justify-center border-2 border-background">
                      <span className="text-[8px] font-bold text-primary-foreground">{unreadCount}</span>
                    </span>
                  )}
                </button>

                {/* Notifications Panel */}
                <AnimatePresence>
                  {isNotificationsOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-4 w-[380px] bg-card border-slim border-border rounded-[24px] shadow-2xl z-[100] overflow-hidden"
                    >
                      <div className="p-6 border-b border-border flex justify-between items-center">
                        <h3 className="font-bold tracking-tight text-lg">Notifications</h3>
                        <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">{notifications.length} Pending</span>
                      </div>
                      <div className="max-h-[480px] overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-12 text-center opacity-30">
                            <Bell className="h-10 w-10 mx-auto mb-4" />
                            <p className="font-bold text-[10px] uppercase tracking-widest">No notifications</p>
                          </div>
                        ) : (
                          notifications.map((n) => (
                            <div key={n.id} className="p-6 border-b border-border hover:bg-secondary/20 transition-colors">
                              <div className="flex items-start gap-4 mb-4">
                                <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                                  <User className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <div className="flex-1 min-w-0 pr-4">
                                  <p className="text-[10px] font-bold text-foreground line-clamp-2 leading-relaxed">
                                    {n.content || n.message}
                                  </p>
                                  <p className="text-[8px] font-medium text-muted-foreground mt-1">
                                    {n.created_at}
                                  </p>
                                </div>
                              </div>
                              {(n.type === 'request_new' || n.type === 'broadcast_request' || n.type === 'task_request') && (
                                <div className="flex gap-2">
                                  <Button 
                                    onClick={() => handleAction(n.id, n.data?.request_id || n.reference_id, n.data?.task_id || n.task_id, 'accepted', n.type)}
                                    className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground font-bold text-[10px] uppercase tracking-widest"
                                  >
                                    Accept
                                  </Button>
                                  <Button 
                                    variant="ghost"
                                    onClick={() => handleAction(n.id, n.data?.request_id || n.reference_id, n.data?.task_id || n.task_id, 'declined', n.type)}
                                    className="flex-1 h-10 rounded-xl bg-secondary text-foreground font-bold text-[10px] uppercase tracking-widest"
                                  >
                                    Decline
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                      <a href="/notifications" className="block p-4 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all">
                        View All Activity <ChevronRight className="inline h-3 w-3 ml-1" />
                      </a>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="relative" ref={profileRef}>
                <button 
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="focus:outline-none"
                >
                  <div className="h-8 w-8 rounded-full overflow-hidden border-slim border-border hover:border-primary transition-colors bg-secondary flex items-center justify-center">
                    {user?.profilePic ? (
                      <img src={user.profilePic} alt="Profile" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>
                
                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border-slim border-border bg-card p-1 shadow-sm z-50">
                    <div className="px-3 py-2 text-sm">
                      <p className="font-medium text-foreground">{user?.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    </div>
                    <div className="h-px bg-border my-1" />
                    <button
                      onClick={() => { navigate('/profile'); setIsProfileOpen(false) }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors"
                    >
                      <User className="h-4 w-4" /> My profile
                    </button>
                    {hasAdminSession && (
                      <button
                        onClick={() => { navigate('/admin'); setIsProfileOpen(false) }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      >
                        <Shield className="h-4 w-4" /> Admin Panel
                      </button>
                    )}
                    <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors">
                      <Settings className="h-4 w-4" /> My sessions
                    </button>
                    <div className="h-px bg-border my-1" />
                    <button 
                      onClick={() => { logout(); navigate('/') }} 
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                    >
                      <LogOut className="h-4 w-4" /> Log out
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // On landing pages OR when not authenticated: show Sign In button
            <div className="flex items-center gap-4">
              <AuthDialog />
            </div>
          )}
        </div>
      </div>

    </nav>
  )
}
