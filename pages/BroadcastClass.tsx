import { useState, useEffect, useCallback, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  Clock, ChevronLeft, ChevronRight, Users, Send, CheckCircle2, AlertCircle,
  Sparkles, Plus, ArrowLeft, BookOpen, Zap, Award, XCircle,
  Play, Square, Eye, Star, Edit3, Loader2, Calendar, MessageSquare
} from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"

const API = "http://localhost:5000"

const CATEGORIES = ['General', 'Development', 'Design', 'Marketing', 'Data Science', 'Business', 'Language', 'Music', 'Other']
const DIFFICULTIES = ['beginner', 'intermediate', 'advanced']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const WEEK_DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa']

const STATUS_COLORS: Record<string, string> = {
  draft:     'text-muted-foreground bg-secondary border-border',
  published: 'text-blue-600 bg-blue-50 border-blue-200',
  live:      'text-red-600 bg-red-50 border-red-200',
  completed: 'text-green-600 bg-green-50 border-green-200',
  cancelled: 'text-orange-600 bg-orange-50 border-orange-200',
}
const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft', published: 'Published', live: 'Live Now', completed: 'Completed', cancelled: 'Cancelled',
}

interface Broadcast {
  id: string; title: string; description: string; duration: string
  deadline: string; max_people: number; current_people: number
  reward_credits: number; category: string; difficulty: string
  prerequisites: string; status: 'draft' | 'published' | 'live' | 'completed' | 'cancelled'
  posted_by: string; user: { name: string; avatar_url: string | null }
  created_at: string; enrollments_count?: number; scheduled_at?: string | null
}

interface Enrollment {
  id: string; broadcast_id: string; user_id: string
  status: 'enrolled' | 'attended' | 'no_show'
  user: { name: string; avatar_url: string | null }
  enrolled_at: string
}

// ── Custom Calendar Date Picker ───────────────────────────────────────────────
function DatePicker({ value, onChange, placeholder = "Select deadline date" }: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const parsed = value ? new Date(value + 'T12:00:00') : null
  const [viewing, setViewing] = useState(() => {
    const d = parsed || new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const daysInMonth = new Date(viewing.year, viewing.month + 1, 0).getDate()
  const firstDay   = new Date(viewing.year, viewing.month, 1).getDay()
  const today      = new Date()
  const todayStr   = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`

  const toISO = (y: number, m: number, d: number) =>
    `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`

  const isPast = (day: number) => toISO(viewing.year, viewing.month, day) < todayStr

  const selectDay = (day: number) => {
    if (isPast(day)) return
    onChange(toISO(viewing.year, viewing.month, day))
    setOpen(false)
  }

  const prev = () => {
    setViewing(v => {
      const d = new Date(v.year, v.month - 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }
  const next = () => {
    setViewing(v => {
      const d = new Date(v.year, v.month + 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  const displayValue = parsed
    ? parsed.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : ''

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          "w-full h-14 px-6 rounded-2xl border bg-card font-bold text-left flex items-center gap-3 transition-all",
          open ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/50"
        )}
      >
        <Calendar className="h-4 w-4 text-primary shrink-0" />
        <span className={displayValue ? "text-foreground" : "text-muted-foreground font-medium"}>
          {displayValue || placeholder}
        </span>
      </button>

      {/* Calendar dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-3 z-50 w-80 bg-card border border-border rounded-[28px] shadow-2xl shadow-black/10 overflow-hidden"
          >
            {/* Month nav */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <button type="button" onClick={prev}
                className="h-9 w-9 rounded-xl border border-border hover:bg-secondary flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="font-black text-sm tracking-tight">
                {MONTHS[viewing.month]} {viewing.year}
              </span>
              <button type="button" onClick={next}
                className="h-9 w-9 rounded-xl border border-border hover:bg-secondary flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Weekday labels */}
            <div className="grid grid-cols-7 px-4 mb-1">
              {WEEK_DAYS.map(d => (
                <div key={d} className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7 gap-1 px-4 pb-4">
              {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const iso = toISO(viewing.year, viewing.month, day)
                const isSelected = value === iso
                const isToday    = iso === todayStr
                const past       = isPast(day)

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => selectDay(day)}
                    disabled={past}
                    className={cn(
                      "h-9 w-full rounded-xl text-sm font-bold transition-all",
                      past       && "text-muted-foreground/25 cursor-not-allowed",
                      !past && !isSelected && "hover:bg-primary/10 hover:text-primary",
                      isToday && !isSelected && "border border-primary/50 text-primary",
                      isSelected && "bg-primary text-primary-foreground font-black shadow-md shadow-primary/30"
                    )}
                  >
                    {day}
                  </button>
                )
              })}
            </div>

            {/* Quick picks */}
            <div className="border-t border-border px-5 py-3 flex gap-3">
              {[
                { label: '+1 week',  days: 7  },
                { label: '+2 weeks', days: 14 },
                { label: '+1 month', days: 30 },
              ].map(({ label, days }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    const d = new Date()
                    d.setDate(d.getDate() + days)
                    onChange(toISO(d.getFullYear(), d.getMonth(), d.getDate()))
                    setOpen(false)
                  }}
                  className="flex-1 py-1.5 rounded-xl bg-secondary hover:bg-primary/10 hover:text-primary text-[10px] font-black uppercase tracking-widest transition-colors text-muted-foreground"
                >
                  {label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  title: '', description: '', duration: '',
  deadline: '', scheduled_at: '', max_people: '10',
  reward_credits: '0', category: 'General',
  difficulty: 'beginner', prerequisites: ''
}

export default function BroadcastClass() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [view, setView]           = useState<'list' | 'create' | 'manage'>('list')
  const [myClasses, setMyClasses] = useState<Broadcast[]>([])
  const [selected, setSelected]   = useState<Broadcast | null>(null)
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading]     = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [attendances, setAttendances] = useState<Record<string, boolean>>({})
  const [success, setSuccess]     = useState(false)
  const [form, setForm]           = useState(EMPTY_FORM)

  const loadMyClasses = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/user/${user.id}/broadcasts`)
      if (res.ok) setMyClasses(await res.json())
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [user?.id])

  useEffect(() => { loadMyClasses() }, [loadMyClasses])

  const loadEnrollments = async (broadcastId: string) => {
    try {
      const res = await fetch(`${API}/api/broadcasts/${broadcastId}/enrollments`)
      if (res.ok) {
        const data: Enrollment[] = await res.json()
        setEnrollments(data)
        const init: Record<string, boolean> = {}
        data.forEach(e => { init[e.user_id] = e.status !== 'no_show' })
        setAttendances(init)
      }
    } catch (err) { console.error(err) }
  }

  // Create & immediately publish
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (!form.deadline) { alert('Please select an enrollment deadline.'); return }
    setSubmitting(true)
    try {
      // Create as published so all users can see it immediately
      const res = await fetch(`${API}/api/broadcasts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          status: 'published',
          posted_by: user.id,
          userName:  user.name,
          userAvatar: user.profilePic
        })
      })
      if (!res.ok) throw new Error('Failed')
      setSuccess(true)
      setTimeout(async () => {
        setSuccess(false); setForm(EMPTY_FORM); setView('list')
        await loadMyClasses()
      }, 1800)
    } catch { alert('Failed to post class. Please try again.') }
    finally { setSubmitting(false) }
  }

  const handlePublish = async (id: string) => {
    setActionLoading(true)
    try {
      const res = await fetch(`${API}/api/broadcasts/${id}/publish`, { method: 'PATCH' })
      if (!res.ok) throw new Error('Failed')
      const updated: Broadcast = await res.json()
      setSelected(updated)
      setMyClasses(prev => prev.map(b => b.id === id ? updated : b))
    } catch { alert('Failed to publish.') }
    finally { setActionLoading(false) }
  }

  const handleStart = async (id: string) => {
    setActionLoading(true)
    try {
      const res = await fetch(`${API}/api/broadcasts/${id}/start`, { method: 'PATCH' })
      if (!res.ok) throw new Error('Failed')
      const updated: Broadcast = await res.json()
      setSelected(updated)
      setMyClasses(prev => prev.map(b => b.id === id ? updated : b))
    } catch { alert('Failed to start session.') }
    finally { setActionLoading(false) }
  }

  const handleEnd = async (id: string) => {
    if (!confirm('End the session and settle credits for attended learners?')) return
    setActionLoading(true)
    try {
      const attendanceList = enrollments.map(e => ({
        user_id: e.user_id, attended: attendances[e.user_id] !== false
      }))
      const res = await fetch(`${API}/api/broadcasts/${id}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendances: attendanceList })
      })
      if (!res.ok) throw new Error('Failed')
      const updated: Broadcast = await res.json()
      setSelected(updated)
      setMyClasses(prev => prev.map(b => b.id === id ? updated : b))
      await loadEnrollments(id)
    } catch { alert('Failed to end session.') }
    finally { setActionLoading(false) }
  }

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this class? Enrolled learners will be notified. This cannot be undone.')) return
    setActionLoading(true)
    try {
      const res = await fetch(`${API}/api/broadcasts/${id}/cancel`, { method: 'PATCH' })
      if (!res.ok) throw new Error('Failed')
      const updated: Broadcast = await res.json()
      setSelected(updated)
      setMyClasses(prev => prev.map(b => b.id === id ? updated : b))
    } catch { alert('Failed to cancel class.') }
    finally { setActionLoading(false) }
  }

  const handleSelectClass = async (broadcast: Broadcast) => {
    setSelected(broadcast); setView('manage')
    await loadEnrollments(broadcast.id)
  }

  // ── CREATE VIEW ─────────────────────────────────────────────────────────────
  if (view === 'create') {
    return (
      <div className="min-h-screen bg-background text-foreground transition-colors">
        <Navbar />
        <main className="max-w-3xl mx-auto px-6 py-24">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <button onClick={() => setView('list')}
              className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground mb-8 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back to My Classes
            </button>

            <div className="mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-black uppercase tracking-widest mb-4">
                <Sparkles className="h-3 w-3" /> Create Class
              </div>
              <h1 className="text-4xl font-black tracking-tighter mb-3">Post a broadcast class</h1>
              <p className="text-muted-foreground font-medium">Once posted, learners can discover and enroll immediately.</p>
            </div>

            <AnimatePresence mode="wait">
              {success ? (
                <motion.div key="ok"
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="p-12 rounded-[40px] border border-primary bg-primary/5 text-center">
                  <CheckCircle2 className="h-14 w-14 text-primary mx-auto mb-4" />
                  <h2 className="text-2xl font-black mb-2">Class posted!</h2>
                  <p className="text-muted-foreground font-medium">Learners can now discover and enroll in your class.</p>
                </motion.div>
              ) : (
                <motion.form key="form" onSubmit={handleCreate} className="space-y-8">

                  {/* Title */}
                  <div className="space-y-3">
                    <label className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Class Title</label>
                    <Input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                      placeholder="e.g. Advanced UI Design Patterns"
                      className="h-14 px-6 rounded-2xl border-border bg-card font-bold text-lg focus:ring-primary shadow-none" />
                  </div>

                  {/* Description */}
                  <div className="space-y-3">
                    <label className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Curriculum & Goals</label>
                    <textarea required value={form.description}
                      onChange={e => setForm({ ...form, description: e.target.value })}
                      placeholder="What will your students learn? What are the prerequisites?"
                      className="w-full min-h-[160px] p-6 rounded-2xl border border-border bg-card font-medium focus:ring-1 focus:ring-primary outline-none resize-none transition-all" />
                  </div>

                  {/* Category + Difficulty */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Category</label>
                      <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                        className="w-full h-14 px-6 rounded-2xl border border-border bg-card font-bold focus:ring-1 focus:ring-primary outline-none">
                        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="space-y-3">
                      <label className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Difficulty</label>
                      <select value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value })}
                        className="w-full h-14 px-6 rounded-2xl border border-border bg-card font-bold focus:ring-1 focus:ring-primary outline-none">
                        {DIFFICULTIES.map(d => (
                          <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Duration + Prerequisites */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 flex items-center gap-2">
                        <Clock className="h-3 w-3" /> Duration
                      </label>
                      <Input required value={form.duration}
                        onChange={e => setForm({ ...form, duration: e.target.value })}
                        placeholder="e.g. 2 hours"
                        className="h-14 px-6 rounded-2xl border-border bg-card font-bold shadow-none" />
                    </div>
                    <div className="space-y-3">
                      <label className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Prerequisites</label>
                      <Input value={form.prerequisites}
                        onChange={e => setForm({ ...form, prerequisites: e.target.value })}
                        placeholder="e.g. Basic JavaScript"
                        className="h-14 px-6 rounded-2xl border-border bg-card font-bold shadow-none" />
                    </div>
                  </div>

                  {/* Scheduled Date & Time */}
                  <div className="space-y-3">
                    <label className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 flex items-center gap-2">
                      <Calendar className="h-3 w-3" /> Scheduled Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={form.scheduled_at}
                      onChange={e => setForm({ ...form, scheduled_at: e.target.value })}
                      min={new Date().toISOString().slice(0, 16)}
                      className="w-full h-14 px-6 rounded-2xl border border-border bg-card font-bold focus:ring-1 focus:ring-primary outline-none transition-all text-foreground"
                    />
                    <p className="text-xs text-muted-foreground font-medium ml-1">
                      The class will automatically go live at this time.
                    </p>
                  </div>

                  {/* Enrollment Deadline — custom calendar */}
                  <div className="space-y-3">
                    <label className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 flex items-center gap-2">
                      <Calendar className="h-3 w-3" /> Enrollment Deadline
                    </label>
                    <DatePicker
                      value={form.deadline}
                      onChange={v => setForm({ ...form, deadline: v })}
                      placeholder="Pick a deadline date"
                    />
                    {form.deadline && (
                      <p className="text-xs text-muted-foreground font-medium ml-1">
                        Learners can enroll until{' '}
                        <span className="text-primary font-black">
                          {new Date(form.deadline + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Max Students + Reward Credits */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4 p-8 rounded-[32px] bg-secondary/50 border border-border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-black text-sm uppercase tracking-tight">Max Students</h3>
                            <p className="text-xs text-muted-foreground font-medium">Enrollment cap</p>
                          </div>
                        </div>
                        <span className="text-2xl font-black text-primary">{form.max_people}</span>
                      </div>
                      <input type="range" min="1" max="50" value={form.max_people}
                        onChange={e => setForm({ ...form, max_people: e.target.value })}
                        className="w-full accent-primary h-2 rounded-full cursor-pointer" />
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        <span>1</span><span>50</span>
                      </div>
                    </div>

                    <div className="space-y-4 p-8 rounded-[32px] bg-secondary/50 border border-border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                            <Star className="h-5 w-5 text-yellow-500" />
                          </div>
                          <div>
                            <h3 className="font-black text-sm uppercase tracking-tight">Reward Credits</h3>
                            <p className="text-xs text-muted-foreground font-medium">Charged per attendee at end</p>
                          </div>
                        </div>
                        <span className="text-2xl font-black text-yellow-500">{form.reward_credits}</span>
                      </div>
                      <input type="range" min="0" max="200" step="5" value={form.reward_credits}
                        onChange={e => setForm({ ...form, reward_credits: e.target.value })}
                        className="w-full accent-yellow-500 h-2 rounded-full cursor-pointer" />
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        <span>Free</span><span>200 cr</span>
                      </div>
                    </div>
                  </div>

                  {/* Submit */}
                  <div className="pt-4">
                    <Button type="submit" disabled={submitting}
                      className="w-full h-16 rounded-[24px] bg-primary text-primary-foreground font-black text-xl shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all gap-3">
                      {submitting
                        ? <><Loader2 className="h-5 w-5 animate-spin" /> Posting…</>
                        : <><Send className="h-5 w-5" /> Post Class</>}
                    </Button>
                    <p className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-5 flex items-center justify-center gap-2">
                      <AlertCircle className="h-3 w-3" />
                      Class is immediately visible to all learners. Reward is locked after posting.
                    </p>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        </main>
      </div>
    )
  }

  // ── MANAGE VIEW ─────────────────────────────────────────────────────────────
  if (view === 'manage' && selected) {
    const isDraft     = selected.status === 'draft'
    const isPublished = selected.status === 'published'
    const isLive      = selected.status === 'live'
    const isCompleted = selected.status === 'completed'
    const attendedCount = enrollments.filter(e => e.status === 'attended').length
    const totalEarned   = attendedCount * (selected.reward_credits || 0)
    const jitsiUrl      = `https://meet.jit.si/ShareSphere-${selected.id}`

    return (
      <div className="min-h-screen bg-background text-foreground transition-colors">
        <Navbar />
        <main className="max-w-4xl mx-auto px-6 py-24">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Top bar */}
            <div className="flex items-center justify-between mb-8">
              <button onClick={() => { setView('list'); setSelected(null) }}
                className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" /> My Classes
              </button>
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => navigate(`/broadcast-chat/${selected.id}`)}
                  variant="outline"
                  className="h-9 px-4 rounded-xl font-black text-xs gap-2 border-border"
                >
                  <MessageSquare className="h-3.5 w-3.5" /> Class Chat
                </Button>
                <span className={cn("px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border flex items-center gap-2",
                  STATUS_COLORS[selected.status])}>
                  {isLive && <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />}
                  {STATUS_LABELS[selected.status]}
                </span>
              </div>
            </div>

            <h1 className="text-3xl md:text-4xl font-black tracking-tighter mb-3">{selected.title}</h1>
            <p className="text-muted-foreground font-medium mb-8 leading-relaxed">{selected.description}</p>

            {/* Meta */}
            <div className="flex flex-wrap gap-4 mb-10 p-5 rounded-2xl bg-secondary/50 border border-border text-xs font-black">
              {selected.category && <span className="flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5 text-primary" />{selected.category}</span>}
              {selected.difficulty && <span className="flex items-center gap-1.5 capitalize"><Zap className="h-3.5 w-3.5 text-yellow-500" />{selected.difficulty}</span>}
              <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-muted-foreground" />{selected.duration}</span>
              <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-muted-foreground" />{selected.current_people}/{selected.max_people} enrolled</span>
              <span className="flex items-center gap-1.5 text-yellow-600"><Star className="h-3.5 w-3.5" />{selected.reward_credits} credits/attendee</span>
              {selected.scheduled_at && (
                <span className="flex items-center gap-1.5 text-primary"><Calendar className="h-3.5 w-3.5" />
                  Scheduled: {new Date(selected.scheduled_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              {selected.deadline && (
                <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  Deadline: {new Date(selected.deadline + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              )}
            </div>

            {/* DRAFT */}
            {isDraft && (
              <div className="p-10 rounded-[32px] border-2 border-dashed border-border bg-secondary/30 text-center">
                <Eye className="h-10 w-10 mx-auto mb-4 text-muted-foreground opacity-30" />
                <h3 className="font-black text-lg mb-2">This class is a draft</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                  Publish to make it visible. The reward ({selected.reward_credits} credits) will be locked.
                </p>
                <Button onClick={() => handlePublish(selected.id)} disabled={actionLoading}
                  className="h-14 px-10 rounded-2xl bg-primary text-primary-foreground font-black shadow-none hover:scale-[1.02] transition-all gap-2">
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ChevronRight className="h-4 w-4" /> Publish Class</>}
                </Button>
              </div>
            )}

            {/* PUBLISHED */}
            {isPublished && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-black text-lg">Enrolled Learners ({enrollments.length})</h3>
                  <div className="flex items-center gap-3">
                    <Button onClick={() => handleCancel(selected.id)} disabled={actionLoading} variant="outline"
                      className="h-12 px-6 rounded-2xl font-black shadow-none border-orange-300 text-orange-600 hover:bg-orange-50 gap-2">
                      <XCircle className="h-4 w-4" /> Cancel Class
                    </Button>
                    <Button onClick={() => handleStart(selected.id)} disabled={actionLoading}
                      className="h-12 px-8 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-black shadow-none hover:scale-[1.02] transition-all gap-2">
                      {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Play className="h-4 w-4" /> Start Session</>}
                    </Button>
                  </div>
                </div>
                {enrollments.length === 0 ? (
                  <div className="text-center py-14 border border-dashed border-border rounded-2xl text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-3 opacity-25" />
                    <p className="text-sm font-medium">No learners enrolled yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {enrollments.map(e => (
                      <div key={e.id} className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-card">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center font-black text-primary text-sm">
                          {e.user.name[0].toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <p className="font-black text-sm">{e.user.name}</p>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Enrolled</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* LIVE */}
            {isLive && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-600">
                  <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                  <span className="font-black text-sm">Session is Live</span>
                </div>

                <div className="rounded-[32px] overflow-hidden border border-border" style={{ height: 480 }}>
                  <iframe src={jitsiUrl} style={{ width: '100%', height: '100%', border: 'none' }}
                    allow="camera; microphone; fullscreen; display-capture; autoplay" title="Live Session" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-black text-lg">Mark Attendance</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Uncheck learners who didn't show. Credits only charged for attended.</p>
                    </div>
                    <Button onClick={() => handleEnd(selected.id)} disabled={actionLoading}
                      className="h-12 px-8 rounded-2xl bg-foreground text-background font-black shadow-none hover:scale-[1.02] transition-all gap-2">
                      {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Square className="h-4 w-4" /> End Session</>}
                    </Button>
                  </div>
                  {enrollments.length === 0
                    ? <p className="text-center text-sm text-muted-foreground py-8">No enrolled learners</p>
                    : (
                      <div className="space-y-3">
                        {enrollments.map(e => (
                          <div key={e.id} className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-card">
                            <input type="checkbox" checked={attendances[e.user_id] !== false}
                              onChange={ev => setAttendances(prev => ({ ...prev, [e.user_id]: ev.target.checked }))}
                              className="h-5 w-5 accent-primary cursor-pointer rounded" />
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center font-black text-primary text-sm">
                              {e.user.name[0].toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <p className="font-black text-sm">{e.user.name}</p>
                              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                {attendances[e.user_id] !== false ? 'Attended' : 'No-show'}
                              </p>
                            </div>
                            {attendances[e.user_id] !== false && selected.reward_credits > 0 && (
                              <span className="text-xs font-black text-red-500">-{selected.reward_credits} cr</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              </div>
            )}

            {/* CANCELLED */}
            {selected.status === 'cancelled' && (
              <div className="p-10 rounded-[32px] bg-orange-50 border border-orange-200 text-center">
                <XCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
                <h3 className="font-black text-xl mb-1 text-orange-700">Class Cancelled</h3>
                <p className="text-sm text-orange-600 font-medium">This class has been cancelled. Enrolled learners have been notified.</p>
              </div>
            )}

            {/* COMPLETED */}
            {isCompleted && (
              <div className="space-y-6">
                <div className="p-8 rounded-[32px] bg-green-50 border border-green-200 text-center">
                  <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="font-black text-xl mb-1 text-green-700">Session Complete</h3>
                  <p className="text-sm text-green-600 font-medium mb-4">Credits settled for all attendees.</p>
                  {selected.reward_credits > 0 && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 text-green-700 font-black text-sm">
                      <Award className="h-4 w-4" />
                      {totalEarned} credits earned ({attendedCount} × {selected.reward_credits} cr)
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-black text-lg mb-4">Attendance Summary</h3>
                  <div className="space-y-3">
                    {enrollments.map(e => (
                      <div key={e.id} className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-card">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center font-black text-primary text-sm">
                          {e.user.name[0].toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <p className="font-black text-sm">{e.user.name}</p>
                        </div>
                        <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                          e.status === 'attended' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600')}>
                          {e.status === 'attended' ? 'Attended' : 'No Show'}
                        </span>
                        {e.status === 'attended' && selected.reward_credits > 0 && (
                          <span className="text-xs font-black text-red-500">-{selected.reward_credits} cr</span>
                        )}
                      </div>
                    ))}
                    {enrollments.length === 0 && (
                      <p className="text-center text-sm text-muted-foreground py-6">No enrollments recorded</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </main>
      </div>
    )
  }

  // ── LIST VIEW ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 py-24">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-end justify-between mb-12">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-black uppercase tracking-widest mb-4">
                <Sparkles className="h-3 w-3" /> My Broadcasts
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-tight">
                Your broadcast<br />classes.
              </h1>
            </div>
            <Button onClick={() => setView('create')}
              className="h-14 px-8 rounded-2xl bg-primary text-primary-foreground font-black shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all gap-2">
              <Plus className="h-5 w-5" /> Create Class
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1,2,3].map(i => <div key={i} className="h-64 rounded-[32px] bg-secondary/50 animate-pulse border border-border" />)}
            </div>
          ) : myClasses.length === 0 ? (
            <div className="text-center py-32 border border-dashed border-border rounded-[40px]">
              <BookOpen className="h-16 w-16 mx-auto mb-6 text-muted-foreground opacity-20" />
              <h2 className="text-2xl font-black mb-2">No classes yet</h2>
              <p className="text-muted-foreground font-medium mb-8">Create your first broadcast class and start teaching.</p>
              <Button onClick={() => setView('create')}
                className="h-14 px-10 rounded-2xl bg-primary text-primary-foreground font-black shadow-none hover:scale-[1.02] transition-all gap-2">
                <Plus className="h-5 w-5" /> Create First Class
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myClasses.map((b, i) => (
                <motion.div key={b.id}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  onClick={() => handleSelectClass(b)}
                  className="group flex flex-col p-6 rounded-[32px] border border-border bg-card hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 cursor-pointer">
                  <div className="flex items-center justify-between mb-4">
                    <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border", STATUS_COLORS[b.status || 'draft'])}>
                      {STATUS_LABELS[b.status || 'draft']}
                    </span>
                    {b.status === 'live' && <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />}
                  </div>
                  <h3 className="text-xl font-black tracking-tight mb-3 group-hover:text-primary transition-colors line-clamp-2">{b.title}</h3>
                  <p className="text-sm text-muted-foreground font-medium line-clamp-3 mb-6 flex-1 leading-relaxed">{b.description}</p>
                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border text-xs">
                    <div className="flex items-center gap-1.5 font-black text-muted-foreground">
                      <Users className="h-3.5 w-3.5" /> {b.current_people}/{b.max_people}
                    </div>
                    <div className="flex items-center gap-1.5 font-black text-yellow-600">
                      <Star className="h-3.5 w-3.5" /> {b.reward_credits || 0} cr
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-primary font-black text-xs group-hover:gap-3 transition-all">
                    <Edit3 className="h-3.5 w-3.5" /> Manage <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </motion.div>
              ))}

              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: myClasses.length * 0.05 }}
                onClick={() => setView('create')}
                className="flex flex-col items-center justify-center p-6 rounded-[32px] border-2 border-dashed border-border hover:border-primary/50 bg-card/50 hover:bg-primary/5 transition-all duration-300 cursor-pointer min-h-[220px] group">
                <Plus className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors mb-3" />
                <p className="font-black text-sm text-muted-foreground group-hover:text-primary transition-colors uppercase tracking-widest">Create New</p>
              </motion.div>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  )
}
