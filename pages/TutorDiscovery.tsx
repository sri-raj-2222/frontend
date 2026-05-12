import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search, BookOpen, Clock, Users,
  Sparkles, ArrowRight, MessageSquare, GraduationCap, Star, Zap, Radio,
  X, Calendar, CheckCircle2, AlertCircle, Loader2, Award, Video, XCircle
} from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"

const API = "https://backend-a41z.onrender.com"

interface Broadcast {
  id: string
  title: string
  description: string
  duration: string
  deadline: string
  max_people: number
  current_people: number
  reward_credits: number
  category: string
  scheduled_at: string | null
  difficulty: string
  prerequisites: string
  status: 'published' | 'live' | 'completed' | 'cancelled'
  posted_by: string
  user: { name: string; avatar_url: string | null }
  created_at: string
  my_enrollment?: 'enrolled' | 'attended' | 'no_show' | null
}

interface MyEnrollment {
  id: string
  broadcast_id: string
  user_id: string
  status: 'enrolled' | 'attended' | 'no_show'
  enrolled_at: string
  broadcast: Broadcast
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'text-green-600 bg-green-50 border-green-200',
  intermediate: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  advanced: 'text-red-600 bg-red-50 border-red-200',
}

// -- Class Detail Modal --------------------------------------------------------
function ClassDetailModal({
  broadcast,
  onClose,
  onEnroll,
  enrolling,
}: {
  broadcast: Broadcast
  onClose: () => void
  onEnroll: () => void
  enrolling: boolean
}) {
  const spotsLeft = broadcast.max_people - broadcast.current_people
  const isFull = spotsLeft <= 0

  const formatDate = (iso: string | null) => {
    if (!iso) return null
    return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    })
  }

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
      />

      {/* Panel */}
      <motion.div
        key="panel"
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.97 }}
        transition={{ type: 'spring', damping: 30, stiffness: 350 }}
        className="fixed inset-x-4 bottom-0 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[640px] z-50 bg-card rounded-t-[40px] md:rounded-[40px] md:bottom-auto md:top-1/2 md:-translate-y-1/2 border border-border shadow-2xl shadow-black/20 overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Live banner */}
        {broadcast.status === 'live' && (
          <div className="flex items-center justify-center gap-2 py-2.5 bg-red-500 text-white text-xs font-black uppercase tracking-widest">
            <Radio className="h-3 w-3" />
            <span className="animate-pulse">Session is Live Now</span>
          </div>
        )}

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 p-8">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center font-black text-primary text-lg shrink-0">
                {broadcast.user.name[0].toUpperCase()}
              </div>
              <div>
                <p className="font-black text-sm">{broadcast.user.name}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Course Mentor</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="h-9 w-9 rounded-xl border border-border hover:bg-secondary flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Title */}
          <h2 className="text-2xl md:text-3xl font-black tracking-tighter mb-3 leading-tight">
            {broadcast.title}
          </h2>

          {/* Badges */}
          <div className="flex flex-wrap gap-2 mb-6">
            {broadcast.difficulty && (
              <span className={cn(
                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border flex items-center gap-1",
                DIFFICULTY_COLORS[broadcast.difficulty] || 'text-muted-foreground bg-secondary border-border'
              )}>
                <Zap className="h-2.5 w-2.5" />{broadcast.difficulty}
              </span>
            )}
            {broadcast.category && broadcast.category !== 'General' && (
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary border border-primary/20">
                {broadcast.category}
              </span>
            )}
            {broadcast.status === 'live' && (
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-red-100 text-red-600 border border-red-200 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />Live
              </span>
            )}
          </div>

          {/* Description */}
          <div className="mb-6">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground mb-2">About This Class</h3>
            <p className="text-sm text-foreground font-medium leading-relaxed whitespace-pre-line">
              {broadcast.description}
            </p>
          </div>

          {/* Prerequisites */}
          {broadcast.prerequisites && (
            <div className="mb-6 p-4 rounded-2xl bg-yellow-50 border border-yellow-200">
              <p className="text-xs font-black uppercase tracking-widest text-yellow-700 mb-1 flex items-center gap-1.5">
                <AlertCircle className="h-3 w-3" /> Prerequisites
              </p>
              <p className="text-sm text-yellow-800 font-medium">{broadcast.prerequisites}</p>
            </div>
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="p-4 rounded-2xl bg-secondary/50 border border-border">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1">
                <Clock className="h-3 w-3" /> Duration
              </p>
              <p className="font-black text-sm">{broadcast.duration}</p>
            </div>
            <div className="p-4 rounded-2xl bg-secondary/50 border border-border">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1">
                <Users className="h-3 w-3" /> Spots
              </p>
              <p className={cn("font-black text-sm", isFull ? 'text-destructive' : 'text-primary')}>
                {isFull ? 'Class Full' : `${spotsLeft} of ${broadcast.max_people} left`}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-secondary/50 border border-border">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1">
                <Award className="h-3 w-3" /> Cost
              </p>
              <p className={cn("font-black text-sm", broadcast.reward_credits > 0 ? 'text-yellow-600' : 'text-green-600')}>
                {broadcast.reward_credits > 0 ? `${broadcast.reward_credits} credits` : 'Free'}
              </p>
            </div>
            {broadcast.deadline && (
              <div className="p-4 rounded-2xl bg-secondary/50 border border-border">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Enroll By
                </p>
                <p className="font-black text-sm">{formatDate(broadcast.deadline)}</p>
              </div>
            )}
          </div>

          {/* Credit notice */}
          {broadcast.reward_credits > 0 && (
            <div className="mb-6 p-4 rounded-2xl bg-primary/5 border border-primary/20 flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                Joining this class costs <span className="text-foreground font-black">{broadcast.reward_credits} credits</span>. These will be deducted from your balance now and moved to the tutor once the session is completed.
              </p>
            </div>
          )}
        </div>

        {/* Sticky CTA */}
        <div className="p-6 border-t border-border bg-card shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="h-14 px-6 rounded-2xl font-black shadow-none border-border"
            >
              Cancel
            </Button>
            <Button
              onClick={onEnroll}
              disabled={enrolling || isFull}
              className="flex-1 h-14 rounded-2xl font-black shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all gap-2 bg-primary text-primary-foreground"
            >
              {enrolling
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Enrolling�</>
                : isFull
                  ? 'Class Full'
                  : <><CheckCircle2 className="h-4 w-4" /> Confirm Enrollment</>}
            </Button>
          </div>
          {broadcast.reward_credits === 0 && (
            <p className="text-center text-[10px] font-black uppercase tracking-widest text-green-600 mt-3">
              ? This class is completely free
            </p>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

// -- Main Page -----------------------------------------------------------------
export default function TutorDiscovery() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'discover' | 'my-classes'>('discover')
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [myEnrollments, setMyEnrollments] = useState<MyEnrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingEnrollments, setLoadingEnrollments] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState("All")
  const [enrollingId, setEnrollingId] = useState<string | null>(null)
  const [preview, setPreview] = useState<Broadcast | null>(null)

  const CATEGORIES = ["All", "Development", "Design", "Marketing", "Data Science", "Business", "Language", "Music"]

  const loadFeed = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const url = user?.id
        ? `${API}/api/broadcasts?user_id=${user.id}`
        : `${API}/api/broadcasts`
      const res = await fetch(url)
      if (res.ok) setBroadcasts(await res.json())
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  const loadMyEnrollments = useCallback(async () => {
    if (!user?.id) return
    setLoadingEnrollments(true)
    try {
      const res = await fetch(`${API}/api/user/${user.id}/enrollments`)
      if (res.ok) setMyEnrollments(await res.json())
    } catch (err) { console.error(err) }
    finally { setLoadingEnrollments(false) }
  }, [user?.id])

  useEffect(() => { loadFeed() }, [loadFeed])

  useEffect(() => {
    if (activeTab === 'my-classes') loadMyEnrollments()
  }, [activeTab, loadMyEnrollments])

  // Called from the card button
  const handleCardClick = (broadcast: Broadcast) => {
    if (!user) { alert("Please sign in to enroll in a class"); return }

    // If live and already enrolled ? open Jitsi directly
    if (broadcast.status === 'live' && broadcast.my_enrollment === 'enrolled') {
      window.open(`https://meet.jit.si/ShareSphere-${broadcast.id}`, '_blank')
      return
    }

    // Already processed states ? do nothing
    if (broadcast.my_enrollment === 'attended' || broadcast.my_enrollment === 'no_show') return
    if (broadcast.posted_by === user.id) return

    // Open detail modal
    setPreview(broadcast)
  }

  // Called from the modal's confirm button
  const handleEnroll = async () => {
    if (!preview || !user) return

    setEnrollingId(preview.id)
    try {
      const res = await fetch(`${API}/api/broadcasts/${preview.id}/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          userName: user.name,
          userAvatar: user.profilePic
        })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to enroll' }))
        alert(err.error || 'Failed to enroll')
        return
      }
      setPreview(null)
      await loadFeed(true)
    } catch {
      alert("Failed to enroll. Please try again.")
    } finally {
      setEnrollingId(null)
    }
  }

  const filtered = broadcasts.filter(b => {
    const matchSearch = !searchQuery ||
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchCat = activeCategory === "All" || b.category === activeCategory
    return matchSearch && matchCat
  })

  const getButtonLabel = (b: Broadcast) => {
    if (b.posted_by === user?.id) return "My Class"
    if (b.status === 'live' && b.my_enrollment === 'enrolled') return "Join Session"
    if (b.my_enrollment === 'enrolled') return "Enrolled"
    if (b.my_enrollment === 'attended' || b.my_enrollment === 'no_show') return "Completed"
    if (b.current_people >= b.max_people) return "Class Full"
    return "Enroll Now"
  }

  const getButtonStyle = (b: Broadcast) => {
    if (b.status === 'live' && b.my_enrollment === 'enrolled')
      return "bg-red-500 hover:bg-red-600 text-white"
    if (b.my_enrollment === 'enrolled')
      return "bg-green-500/10 text-green-700 border border-green-300"
    if (b.my_enrollment)
      return "bg-secondary text-muted-foreground border border-border"
    return "bg-primary text-primary-foreground hover:bg-primary/90"
  }

  const isDisabled = (b: Broadcast) =>
    b.posted_by === user?.id ||
    (!!b.my_enrollment && !(b.status === 'live' && b.my_enrollment === 'enrolled')) ||
    enrollingId === b.id ||
    (b.current_people >= b.max_people && !b.my_enrollment)

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      <Navbar />

      {/* Detail modal */}
      {preview && (
        <ClassDetailModal
          broadcast={preview}
          onClose={() => setPreview(null)}
          onEnroll={handleEnroll}
          enrolling={enrollingId === preview.id}
        />
      )}

      <main className="max-w-7xl mx-auto px-6 py-24">
        {/* Hero */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="max-w-2xl">
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-black uppercase tracking-widest mb-6">
              <GraduationCap className="h-3 w-3" /> Cohort Discovery
            </motion.div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 leading-[0.9]">
              Learn from<br />the experts.
            </h1>
            <p className="text-xl text-muted-foreground font-medium max-w-lg">
              Find cohort-based courses taught by community mentors.
              Enroll and learn alongside others.
            </p>
          </div>
          <div className="flex-1 max-w-md w-full">
            <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search topics, tutors, or skills�"
                className="h-16 pl-14 pr-6 rounded-[24px] border-border bg-card font-bold text-lg focus:ring-primary shadow-none" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-8 p-1.5 bg-secondary/50 rounded-2xl border border-border w-fit">
          {(['discover', 'my-classes'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={cn(
                "px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                activeTab === tab
                  ? "bg-card shadow-sm text-foreground border border-border"
                  : "text-muted-foreground hover:text-foreground"
              )}>
              {tab === 'discover' ? 'Discover' : 'My Classes'}
            </button>
          ))}
        </div>

        {activeTab === 'discover' && (
          <>
            {/* Category filters */}
            <div className="flex items-center gap-3 mb-10 overflow-x-auto pb-3 scrollbar-hide">
              {CATEGORIES.map(cat => (
                <Button key={cat} variant="secondary" onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "rounded-full h-10 px-6 font-black uppercase tracking-widest text-[10px] gap-2 shrink-0",
                    activeCategory === cat
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border text-muted-foreground hover:bg-secondary"
                  )}>
                  {cat}
                </Button>
              ))}
            </div>

            {/* Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-[440px] rounded-[40px] bg-secondary/50 animate-pulse border border-border" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-32 border border-dashed border-border rounded-[40px]">
                <BookOpen className="h-16 w-16 mx-auto mb-6 text-muted-foreground opacity-20" />
                <h2 className="text-2xl font-black mb-2">No classes found</h2>
                <p className="text-muted-foreground font-medium">Try adjusting your search or check back later.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filtered.map((b, i) => (
                  <motion.div key={b.id}
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="group relative flex flex-col p-8 rounded-[40px] border border-border bg-card hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 overflow-hidden">

                    {/* Live badge */}
                    {b.status === 'live' && (
                      <div className="absolute top-5 right-5 flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500 text-white text-[10px] font-black uppercase tracking-widest">
                        <Radio className="h-3 w-3" /> Live
                      </div>
                    )}

                    <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                      <Sparkles className="h-8 w-8 text-primary/20" />
                    </div>

                    {/* Tutor */}
                    <div className="flex items-center gap-3 mb-5">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center font-black text-primary text-sm">
                        {b.user.name[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-black text-sm">{b.user.name}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Mentor</p>
                      </div>
                    </div>

                    <h3 className="text-2xl font-black mb-3 tracking-tight leading-tight group-hover:text-primary transition-colors line-clamp-2">
                      {b.title}
                    </h3>

                    {/* Difficulty + Category */}
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                      {b.difficulty && (
                        <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest capitalize border",
                          DIFFICULTY_COLORS[b.difficulty] || 'text-muted-foreground bg-secondary border-border')}>
                          <Zap className="h-2.5 w-2.5 inline mr-1" />{b.difficulty}
                        </span>
                      )}
                      {b.category && b.category !== 'General' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary border border-primary/20">
                          {b.category}
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground font-medium line-clamp-3 mb-8 flex-1 leading-relaxed">
                      {b.description}
                    </p>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3 mb-6 pt-5 border-t border-border">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Duration
                        </span>
                        <span className="text-xs font-black truncate">{b.duration}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" /> Spots
                        </span>
                        <span className={cn("text-xs font-black", b.current_people >= b.max_people ? 'text-destructive' : 'text-primary')}>
                          {b.max_people - b.current_people} left
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                          <Star className="h-3 w-3" /> Cost
                        </span>
                        <span className="text-xs font-black text-yellow-600">
                          {b.reward_credits > 0 ? `${b.reward_credits} cr` : 'Free'}
                        </span>
                      </div>
                    </div>

                    <Button onClick={() => handleCardClick(b)} disabled={isDisabled(b)}
                      className={cn(
                        "w-full h-14 rounded-2xl font-black text-sm shadow-none group-hover:scale-[1.02] active:scale-[0.98] transition-all gap-2",
                        getButtonStyle(b)
                      )}>
                      {getButtonLabel(b)}
                      <ArrowRight className="h-4 w-4" />
                    </Button>

                    {/* Show Class Chat for enrolled learners */}
                    {b.my_enrollment && b.my_enrollment !== 'no_show' && b.posted_by !== user?.id && b.status !== 'cancelled' && (
                      <Button
                        onClick={() => navigate(`/broadcast-chat/${b.id}`)}
                        variant="outline"
                        className="w-full h-10 rounded-2xl font-black text-xs gap-2 border-border mt-2"
                      >
                        <MessageSquare className="h-3.5 w-3.5" /> Class Chat
                      </Button>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'my-classes' && (
          <>
            {loadingEnrollments ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-64 rounded-[40px] bg-secondary/50 animate-pulse border border-border" />
                ))}
              </div>
            ) : myEnrollments.length === 0 ? (
              <div className="text-center py-32 border border-dashed border-border rounded-[40px]">
                <GraduationCap className="h-16 w-16 mx-auto mb-6 text-muted-foreground opacity-20" />
                <h2 className="text-2xl font-black mb-2">No classes yet</h2>
                <p className="text-muted-foreground font-medium mb-8">Enroll in a class to see it here.</p>
                <Button onClick={() => setActiveTab('discover')}
                  className="h-14 px-10 rounded-full bg-primary text-primary-foreground font-black shadow-none gap-2">
                  Browse Classes <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {myEnrollments.map((e, i) => {
                  const b = e.broadcast
                  const isLive = b.status === 'live'
                  const isCancelled = b.status === 'cancelled'
                  return (
                    <motion.div key={e.id}
                      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      className={cn(
                        "flex flex-col p-8 rounded-[40px] border bg-card transition-all duration-300",
                        isLive ? "border-red-300 shadow-lg shadow-red-500/10" : "border-border",
                        isCancelled && "opacity-60"
                      )}>

                      {/* Status badge */}
                      <div className="flex items-center justify-between mb-5">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border flex items-center gap-1",
                          e.status === 'attended' ? 'bg-green-50 text-green-700 border-green-200' :
                            e.status === 'no_show' ? 'bg-red-50 text-red-600 border-red-200' :
                              isLive ? 'bg-red-50 text-red-600 border-red-200' :
                                isCancelled ? 'bg-orange-50 text-orange-600 border-orange-200' :
                                  'bg-blue-50 text-blue-600 border-blue-200'
                        )}>
                          {isLive && <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />}
                          {e.status === 'attended' ? 'Attended' :
                            e.status === 'no_show' ? 'No Show' :
                              isLive ? 'Live Now' :
                                isCancelled ? 'Cancelled' : 'Enrolled'}
                        </span>
                        {b.reward_credits > 0 && (
                          <span className="text-xs font-black text-yellow-600 flex items-center gap-1">
                            <Star className="h-3 w-3" />{b.reward_credits} cr
                          </span>
                        )}
                      </div>

                      {/* Tutor */}
                      <div className="flex items-center gap-2 mb-4">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center font-black text-primary text-xs">
                          {b.user.name[0].toUpperCase()}
                        </div>
                        <span className="text-xs font-black text-muted-foreground">{b.user.name}</span>
                      </div>

                      <h3 className="text-xl font-black tracking-tight mb-3 leading-tight line-clamp-2">{b.title}</h3>
                      <p className="text-sm text-muted-foreground font-medium line-clamp-2 mb-6 flex-1">{b.description}</p>

                      {/* Meta */}
                      <div className="flex flex-wrap gap-3 mb-6 pt-4 border-t border-border text-[10px] font-black text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{b.duration}</span>
                        {b.scheduled_at && (
                          <span className="flex items-center gap-1 text-primary">
                            <Calendar className="h-3 w-3" />
                            {new Date(b.scheduled_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>

                      {/* Action */}
                      {isLive && e.status === 'enrolled' ? (
                        <Button onClick={() => window.open(`https://meet.jit.si/ShareSphere-${b.id}`, '_blank')}
                          className="w-full h-12 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-black shadow-none gap-2">
                          <Video className="h-4 w-4" /> Join Session
                        </Button>
                      ) : isCancelled ? (
                        <div className="h-12 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center gap-2 text-orange-600 text-xs font-black">
                          <XCircle className="h-4 w-4" /> Class Cancelled
                        </div>
                      ) : e.status === 'attended' ? (
                        <div className="h-12 rounded-2xl bg-green-50 border border-green-200 flex items-center justify-center gap-2 text-green-700 text-xs font-black">
                          <CheckCircle2 className="h-4 w-4" /> Completed
                        </div>
                      ) : (
                        <div className="h-12 rounded-2xl bg-secondary border border-border flex items-center justify-center gap-2 text-muted-foreground text-xs font-black">
                          <CheckCircle2 className="h-4 w-4 text-primary" /> Enrolled
                        </div>
                      )}

                      {/* Class chat � always visible for non-cancelled classes */}
                      {!isCancelled && (
                        <Button
                          onClick={() => navigate(`/broadcast-chat/${b.id}`)}
                          variant="outline"
                          className="w-full h-10 rounded-2xl font-black text-xs gap-2 border-border mt-2"
                        >
                          <MessageSquare className="h-3.5 w-3.5" /> Class Chat
                        </Button>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* Footer CTA */}
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          className="mt-32 p-12 rounded-[48px] bg-secondary/50 border border-border text-center overflow-hidden relative">
          <div className="relative z-10">
            <h2 className="text-4xl font-black mb-4">Want to teach a class?</h2>
            <p className="text-muted-foreground font-medium mb-8 max-w-md mx-auto">
              Share your expertise with the community. Create a broadcast and start your own cohort today.
            </p>
            <Button onClick={() => navigate("/broadcast")}
              className="h-14 px-10 rounded-full bg-foreground text-background font-black shadow-none hover:bg-foreground/90 transition-all gap-2">
              Start Broadcasting
              <MessageSquare className="h-4 w-4" />
            </Button>
          </div>
          <div className="absolute -bottom-24 -right-24 h-64 w-64 bg-primary/10 blur-[100px] rounded-full" />
        </motion.div>
      </main>
    </div>
  )
}

