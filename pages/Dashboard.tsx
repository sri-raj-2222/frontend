import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Zap,
  Users, ArrowRight,
  Bell, Handshake
} from "lucide-react"
import { supabase } from "@/lib/supabase"

import { Navbar } from "@/components/navbar"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"
import { useCallback } from "react"
import type { Notification } from "@/types"

interface Post {
  id: string
  title: string
  post_type: 'direct' | 'broadcast'
  status: string
  created_at: string
  stats: {
    pending: number
    accepted: number
    declined: number
  }
}

interface DashboardNotification {
  id: string
  type: 'request' | 'message' | 'handshake'
  title: string
  description: string
  created_at: string
  status: string
  room_id?: string
}

// interface RequestResponse {...} removed as it was unused

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [posts, setPosts] = useState<Post[]>([])
  const [notifications, setNotifications] = useState<DashboardNotification[]>([])
  const [loading, setLoading] = useState(true)

  const fetchNotifications = useCallback(async (silent = false) => {
    if (!user) return
    if (!silent) setLoading(true)
    try {
      const res = await fetch(`http://localhost:5000/api/notifications?user_id=${user.id}`)
      if (!res.ok) throw new Error("Failed to fetch notifications")
      const data = await res.json()

      const transformed: DashboardNotification[] = data.map((n: Notification) => {
        let type: DashboardNotification['type'] = 'request'
        if (n.type === 'request_accepted' || n.type === 'broadcast_accepted') type = 'handshake'
        if (n.type === 'message') type = 'message'

        return {
          id: n.id,
          type,
          title: n.type.replace('_', ' ').toUpperCase(),
          description: n.content,
          created_at: n.created_at,
          status: n.is_read ? 'read' : 'unread',
          room_id: n.reference_id // Reference ID in notifications usually points to the room or request
        }
      })

      setNotifications(transformed.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
    } catch (err) { console.error(err) }
  }, [user])


  const fetchMyPosts = useCallback(async () => {
    if (!user?.id) return
    try {
      // 1. Fetch from local Express DB
      let localPosts: Post[] = []
      try {
        const res = await fetch(`http://localhost:5000/api/user/${user.id}/posts`)
        if (res.ok) localPosts = await res.json()
      } catch { /* server may be offline */ }

      // 2. Fetch from Supabase (source of truth)
      const { data: supabaseTasks } = await supabase
        .from('tasks')
        .select('id, title, status, created_at, type')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      const supabasePosts: Post[] = (supabaseTasks || []).map(t => ({
        id: t.id,
        title: t.title,
        post_type: 'direct' as const,
        status: t.status || 'open',
        created_at: t.created_at,
        stats: { pending: 0, accepted: 0, declined: 0 }
      }))

      // 3. Merge — local DB takes priority (has request stats), Supabase fills missing
      const merged = [...localPosts]
      const localIds = new Set(localPosts.map(p => p.id))
      supabasePosts.forEach(p => {
        if (!localIds.has(p.id)) merged.push(p)
      })

      // Sort by newest first
      merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setPosts(merged)
    } catch (err) { console.error(err) }
  }, [user])

  const fetchData = useCallback(async () => {
    await Promise.all([fetchMyPosts(), fetchNotifications(true)])
  }, [fetchMyPosts, fetchNotifications])

  useEffect(() => {
    if (user) {
      const init = async () => {
        setLoading(true)
        await fetchData()
        setLoading(false)
      }
      init()
    }
  }, [user, fetchData])

  return (
    <div className="min-h-screen w-full bg-background overflow-x-hidden">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 pt-24 pb-32">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 mb-16">
          <div className="space-y-4">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 text-primary font-semibold uppercase tracking-widest text-[9px] bg-primary/5 px-3 py-1.5 rounded-full w-fit">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Pulse Active: {user?.name}
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-tight">
              Your <span className="text-muted-foreground">Sphere.</span>
            </h1>
          </div>

          <div className="flex gap-4">
            <Button onClick={() => navigate("/tasks/one-to-one/matches")} variant="outline" className="h-12 px-6 rounded-2xl border-primary/20 bg-primary/5 text-primary font-semibold text-sm hover:bg-primary/10 transition-all flex items-center gap-2.5">
              <Zap className="h-4 w-4 fill-primary" />
              Handshake Discovery
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-12">
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold flex items-center gap-2.5"><Zap className="h-5 w-5 text-primary fill-primary" /> Active Projects</h2>
                <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">{posts.length} ACTIVE</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {loading ? [1, 2].map(i => <div key={i} className="h-56 rounded-3xl bg-secondary/20 animate-pulse" />) : posts.map(post => (
                  <motion.div
                    key={post.id}
                    whileHover={{ y: -3 }}
                    onClick={() => navigate('/activity')}
                    className="p-6 rounded-3xl border border-border bg-card/50 backdrop-blur-md relative overflow-hidden group cursor-pointer hover:border-primary/50 transition-all"
                  >
                    <div className="flex justify-between items-start mb-5">
                      <div className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[9px] font-semibold uppercase border border-primary/20">{post.post_type}</div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <h3 className="text-xl font-semibold mb-6 line-clamp-2">{post.title}</h3>
                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="bg-secondary/30 p-2.5 rounded-xl text-center"><p className="text-base font-semibold">{post.stats.pending}</p><p className="text-[7px] font-semibold uppercase opacity-40 tracking-tighter">Pending</p></div>
                      <div className="bg-primary/5 p-2.5 rounded-xl text-center"><p className="text-base font-semibold text-primary">{post.stats.accepted}</p><p className="text-[7px] font-semibold uppercase text-primary/40 tracking-tighter">Matches</p></div>
                      <div className="bg-destructive/5 p-2.5 rounded-xl text-center"><p className="text-base font-semibold text-destructive">{post.stats.declined}</p><p className="text-[7px] font-semibold uppercase text-destructive/40 tracking-tighter">Skip</p></div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar Notifications */}
          <aside className="space-y-6">
            <div className="p-6 rounded-3xl border border-border bg-secondary/10 backdrop-blur-md h-fit">
              <h2 className="text-lg font-semibold mb-6 flex items-center gap-2.5">
                <Bell className="h-4 w-4 text-primary" /> Live Updates
              </h2>

              <div className="space-y-6">
                <AnimatePresence mode="popLayout">
                  {notifications.length === 0 ? (
                    <div className="py-12 text-center opacity-30"><p className="text-xs font-semibold uppercase">No new activity</p></div>
                  ) : notifications.map(notif => (
                    <motion.div
                      key={notif.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      onClick={() => {
                        if (notif.type === 'handshake') {
                          navigate(`/chat${notif.room_id ? `?room=${notif.room_id}` : ''}`)
                        } else {
                          navigate('/tasks/direct')
                        }
                      }}
                      className="p-5 rounded-[28px] bg-background border border-border hover:border-primary/40 transition-all cursor-pointer group shadow-sm"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={cn(
                          "h-8 w-8 rounded-xl flex items-center justify-center",
                          notif.type === 'request' ? "bg-amber-500/10 text-amber-500" : "bg-green-500/10 text-green-500"
                        )}>
                          {notif.type === 'request' ? <Users className="h-4 w-4" /> : <Handshake className="h-4 w-4" />}
                        </div>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{notif.title}</p>
                      </div>
                      <p className="text-xs font-semibold leading-relaxed mb-1">{notif.description}</p>
                      <p className="text-[9px] font-semibold text-primary/40 uppercase">{new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <Button onClick={() => navigate("/activity")} variant="ghost" className="w-full mt-8 rounded-2xl text-[10px] font-semibold uppercase tracking-widest gap-2">View Activity History <ArrowRight className="h-3 w-3" /></Button>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}
