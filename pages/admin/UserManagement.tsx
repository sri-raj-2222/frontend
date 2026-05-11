import { useState, useEffect, useMemo, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search, ShieldCheck, Star, AlertTriangle, Eye, Ban,
  CheckCircle2, XCircle, Clock, MessageSquare, Briefcase,
  User, X, RefreshCw, Flag, Activity, ThumbsUp, ThumbsDown,
  Loader2, UserCheck, UserX, ChevronLeft, ChevronRight,
  ChevronDown, ChevronUp, Filter,
} from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"

const API = "http://localhost:5000"
const PAGE_SIZE = 10

// ── Types ──────────────────────────────────────────────────────────────────────
interface UserSkill { name: string; type: string }
interface UserFeedback {
  id?: string; reviewer?: string; reviewer_name?: string
  rating: number; comment?: string; created_at?: string
}
interface UserReport {
  id?: string; reporter?: string; reason?: string
  priority?: string; status?: string; created_at?: string
}
interface EnrichedUser {
  id: string; name: string; email: string; role: string
  profile_pic: string | null; joined_at: string; last_active: string
  status: "active" | "blocked"; verified: boolean
  skills: UserSkill[]; rating: number; ratings_count: number
  projects_completed: number; total_projects: number
  messages_count: number; sessions_count: number
  reports_count: number; is_suspicious: boolean; has_reports: boolean
  feedback: UserFeedback[]; reports: UserReport[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function timeAgo(d: string) {
  if (!d) return "Never"
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "Just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function fmtDate(d: string) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function initials(name: string) {
  return (name || "?").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
}

const GRAD = [
  "from-violet-500 to-purple-600", "from-blue-500 to-cyan-600",
  "from-emerald-500 to-green-600", "from-orange-500 to-amber-600",
  "from-pink-500 to-rose-600",     "from-indigo-500 to-blue-600",
]
function grad(id: string) {
  const h = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0)
  return GRAD[h % GRAD.length]
}

// ── Reusable atoms ─────────────────────────────────────────────────────────────
function Avatar({ user, size = "md" }: { user: EnrichedUser; size?: "sm" | "md" | "lg" }) {
  const sz = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-16 w-16 text-xl" }[size]
  if (user.profile_pic)
    return <img src={user.profile_pic} alt={user.name} className={`${sz} rounded-full object-cover ring-2 ring-border`} />
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br ${grad(user.id)} flex items-center justify-center font-bold text-white shrink-0`}>
      {initials(user.name)}
    </div>
  )
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = {
    freelancer: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    client:     "bg-purple-500/10 text-purple-400 border-purple-500/20",
    both:       "bg-primary/10 text-primary border-primary/20",
    user:       "bg-secondary text-muted-foreground border-border",
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border capitalize ${map[role?.toLowerCase()] ?? map.user}`}>
      {role || "user"}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  return status === "blocked" ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20">
      <XCircle className="h-3 w-3" /> Blocked
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
      <CheckCircle2 className="h-3 w-3" /> Active
    </span>
  )
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      <Star className={`h-3.5 w-3.5 ${rating > 0 ? "text-amber-400 fill-amber-400" : "text-muted-foreground"}`} />
      <span className="text-sm font-medium text-foreground">{rating > 0 ? rating.toFixed(1) : "—"}</span>
    </div>
  )
}

function SortIcon({ field, sortField, sortDir }: { field: string; sortField: string; sortDir: "asc" | "desc" }) {
  if (sortField !== field) return <ChevronDown className="h-3 w-3 text-muted-foreground/40 inline ml-1" />
  return sortDir === "asc"
    ? <ChevronUp className="h-3 w-3 text-primary inline ml-1" />
    : <ChevronDown className="h-3 w-3 text-primary inline ml-1" />
}

// ── Block Modal ────────────────────────────────────────────────────────────────
function BlockModal({ user, onConfirm, onCancel, loading }: {
  user: EnrichedUser; onConfirm: () => void; onCancel: () => void; loading: boolean
}) {
  const blocking = user.status === "active"
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onCancel}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${blocking ? "bg-destructive/10" : "bg-emerald-500/10"}`}>
          {blocking ? <Ban className="h-6 w-6 text-destructive" /> : <UserCheck className="h-6 w-6 text-emerald-400" />}
        </div>
        <h3 className="text-base font-bold text-foreground mb-1">{blocking ? "Block User?" : "Unblock User?"}</h3>
        <p className="text-sm text-muted-foreground mb-6">
          {blocking
            ? `${user.name} will lose platform access and cannot participate in exchanges.`
            : `${user.name} will regain full access to the platform.`}
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors ${blocking ? "bg-destructive text-white hover:bg-destructive/90" : "bg-emerald-500 text-white hover:bg-emerald-600"}`}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : blocking ? <Ban className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
            {blocking ? "Block" : "Unblock"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Verify Modal ───────────────────────────────────────────────────────────────
function VerifyModal({ user, onConfirm, onCancel, loading }: {
  user: EnrichedUser; onConfirm: () => void; onCancel: () => void; loading: boolean
}) {
  const verifying = !user.verified
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onCancel}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 bg-blue-500/10">
          <ShieldCheck className="h-6 w-6 text-blue-400" />
        </div>
        <h3 className="text-base font-bold text-foreground mb-1">{verifying ? "Verify Profile?" : "Remove Verification?"}</h3>
        <p className="text-sm text-muted-foreground mb-6">
          {verifying
            ? `${user.name} will receive a verified badge, signalling trust to other users.`
            : `The verified badge will be removed from ${user.name}'s profile.`}
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 px-4 py-2 rounded-xl text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors flex items-center justify-center gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {verifying ? "Verify" : "Remove"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Detail Modal ───────────────────────────────────────────────────────────────
function DetailModal({ user, onClose, onBlock, onVerify }: {
  user: EnrichedUser; onClose: () => void
  onBlock: (u: EnrichedUser) => void; onVerify: (u: EnrichedUser) => void
}) {
  const [tab, setTab] = useState<"profile" | "activity" | "ratings" | "reports">("profile")

  const positivePct = useMemo(() => {
    if (!user.feedback.length) return 0
    return Math.round(user.feedback.filter(f => f.rating >= 4).length / user.feedback.length * 100)
  }, [user.feedback])

  const chartData = [
    { label: "Projects", value: user.total_projects },
    { label: "Done",     value: user.projects_completed },
    { label: "Sessions", value: user.sessions_count },
    { label: "Msgs",     value: Math.min(user.messages_count, 99) },
    { label: "Reviews",  value: user.ratings_count },
  ]

  const TABS = [
    { id: "profile" as const,  label: "Profile",  Icon: User          },
    { id: "activity" as const, label: "Activity", Icon: Activity      },
    { id: "ratings"  as const, label: "Ratings",  Icon: Star          },
    { id: "reports"  as const, label: "Reports",  Icon: Flag          },
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0, y: 16 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 16 }}
        className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="p-5 border-b border-border flex items-start gap-4">
          <Avatar user={user} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-foreground">{user.name}</h2>
              {user.verified && <ShieldCheck className="h-4 w-4 text-blue-400" />}
              {user.is_suspicious && <AlertTriangle className="h-4 w-4 text-amber-400" />}
            </div>
            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <RoleBadge role={user.role} />
              <StatusBadge status={user.status} />
              <Stars rating={user.rating} />
              {user.ratings_count > 0 && <span className="text-xs text-muted-foreground">({user.ratings_count})</span>}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => onVerify(user)}
              className={`p-2 rounded-xl transition-colors ${user.verified ? "text-blue-400 bg-blue-500/10" : "text-muted-foreground hover:text-blue-400 hover:bg-blue-500/10"}`}
              title={user.verified ? "Remove verification" : "Verify"}>
              <ShieldCheck className="h-4 w-4" />
            </button>
            <button onClick={() => onBlock(user)}
              className={`p-2 rounded-xl transition-colors ${user.status === "blocked" ? "text-emerald-400 bg-emerald-500/10" : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"}`}
              title={user.status === "blocked" ? "Unblock" : "Block"}>
              {user.status === "blocked" ? <UserCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
            </button>
            <button onClick={onClose} className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tab nav */}
        <div className="flex border-b border-border px-5">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`relative flex items-center gap-1.5 px-3 py-3 text-sm font-medium transition-colors ${tab === t.id ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              <t.Icon className="h-3.5 w-3.5" />
              {t.label}
              {tab === t.id && <motion.div layoutId="dtab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
              {t.id === "reports" && user.reports_count > 0 && (
                <span className="ml-1 px-1 rounded text-[10px] font-bold bg-destructive/10 text-destructive">{user.reports_count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab body */}
        <div className="flex-1 overflow-y-auto p-5">
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.14 }}>

              {/* ─ Profile ─ */}
              {tab === "profile" && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Joined",          value: fmtDate(user.joined_at) },
                      { label: "Last Active",     value: timeAgo(user.last_active) },
                      { label: "Total Projects",  value: user.total_projects },
                      { label: "Completed",       value: user.projects_completed },
                    ].map(i => (
                      <div key={i.label} className="bg-secondary/30 rounded-xl p-3">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{i.label}</p>
                        <p className="text-sm font-semibold text-foreground mt-0.5">{i.value}</p>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Skills</p>
                    {user.skills.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No skills recorded</p>
                    ) : (
                      <div className="space-y-3">
                        {["offering", "wanting"].map(type => {
                          const sk = user.skills.filter(s => s.type === type)
                          if (!sk.length) return null
                          return (
                            <div key={type}>
                              <p className="text-xs text-muted-foreground mb-1.5 capitalize">{type === "offering" ? "Offering" : "Wants to Learn"}</p>
                              <div className="flex flex-wrap gap-1.5">
                                {sk.map((s, i) => (
                                  <span key={i} className={`px-2 py-0.5 rounded-lg text-xs font-medium border ${type === "offering" ? "bg-primary/10 text-primary border-primary/20" : "bg-secondary text-muted-foreground border-border"}`}>
                                    {s.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ─ Activity ─ */}
              {tab === "activity" && (
                <div className="space-y-5">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { Icon: Briefcase,    label: "Projects", value: user.total_projects,   sub: `${user.projects_completed} done` },
                      { Icon: MessageSquare,label: "Messages", value: user.messages_count,   sub: "total sent" },
                      { Icon: Activity,     label: "Sessions", value: user.sessions_count,   sub: "exchange rooms" },
                    ].map(c => (
                      <div key={c.label} className="bg-secondary/30 rounded-xl p-4 text-center">
                        <div className="p-2 rounded-lg bg-primary/10 w-fit mx-auto mb-2">
                          <c.Icon className="h-4 w-4 text-primary" />
                        </div>
                        <p className="text-xl font-bold text-foreground">{c.value}</p>
                        <p className="text-[10px] text-muted-foreground">{c.label}</p>
                        <p className="text-[10px] text-muted-foreground/60">{c.sub}</p>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Activity Breakdown</p>
                    <div className="h-36">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                          <XAxis dataKey="label" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} cursor={{ fill: "hsl(var(--secondary))" }} />
                          <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30">
                    <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Last seen</p>
                      <p className="text-sm font-medium text-foreground">{timeAgo(user.last_active)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ─ Ratings ─ */}
              {tab === "ratings" && (
                <div className="space-y-5">
                  <div className="flex items-center gap-6 p-4 bg-secondary/30 rounded-xl">
                    <div className="text-center shrink-0">
                      <p className="text-4xl font-bold text-foreground">{user.rating > 0 ? user.rating.toFixed(1) : "—"}</p>
                      <div className="flex gap-0.5 justify-center mt-1">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} className={`h-3 w-3 ${s <= Math.round(user.rating) ? "text-amber-400 fill-amber-400" : "text-muted-foreground"}`} />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{user.ratings_count} review{user.ratings_count !== 1 ? "s" : ""}</p>
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <ThumbsUp className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${positivePct}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-8 text-right">{positivePct}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ThumbsDown className="h-3.5 w-3.5 text-destructive shrink-0" />
                        <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-destructive rounded-full transition-all duration-500" style={{ width: `${100 - positivePct}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-8 text-right">{100 - positivePct}%</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        AI Sentiment:{" "}
                        <span className={`font-semibold ${positivePct >= 70 ? "text-emerald-400" : positivePct >= 40 ? "text-amber-400" : "text-destructive"}`}>
                          {positivePct >= 70 ? "Mostly Positive" : positivePct >= 40 ? "Mixed" : "Needs Attention"}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Recent Feedback</p>
                    {user.feedback.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No feedback yet</p>
                    ) : user.feedback.slice(0, 6).map((f, i) => (
                      <div key={i} className="p-3 bg-secondary/30 rounded-xl mb-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-foreground">{f.reviewer_name || f.reviewer || "Anonymous"}</span>
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5].map(s => (
                              <Star key={s} className={`h-2.5 w-2.5 ${s <= f.rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground"}`} />
                            ))}
                          </div>
                        </div>
                        {f.comment && <p className="text-xs text-muted-foreground">{f.comment}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ─ Reports ─ */}
              {tab === "reports" && (
                <div className="space-y-3">
                  {user.reports_count === 0 ? (
                    <div className="text-center py-10">
                      <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                      <p className="text-sm font-medium text-foreground">Clean record</p>
                      <p className="text-xs text-muted-foreground">No reports filed against this user</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                        <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                        <p className="text-xs text-amber-400 font-medium">{user.reports_count} report{user.reports_count !== 1 ? "s" : ""} received</p>
                      </div>
                      {user.reports.map((r, i) => (
                        <div key={i} className="p-3 bg-secondary/30 rounded-xl space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-foreground">{r.reason || "Unspecified reason"}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${r.priority === "high" ? "bg-destructive/10 text-destructive" : r.priority === "medium" ? "bg-amber-500/10 text-amber-400" : "bg-secondary text-muted-foreground"}`}>
                              {r.priority || "low"}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">Reporter: {r.reporter || "Anonymous"}</p>
                          {r.created_at && <p className="text-xs text-muted-foreground">{fmtDate(r.created_at)}</p>}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function UserManagement() {
  const [users,        setUsers]        = useState<EnrichedUser[]>([])
  const [stats,        setStats]        = useState({ total: 0, active: 0, blocked: 0, verified: 0, suspicious: 0 })
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState("")
  const [roleFilter,   setRoleFilter]   = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [verifiedFilter, setVerifiedFilter] = useState("all")
  const [sortField,    setSortField]    = useState("joined_at")
  const [sortDir,      setSortDir]      = useState<"asc" | "desc">("desc")
  const [page,         setPage]         = useState(1)
  const [blockModal,   setBlockModal]   = useState<EnrichedUser | null>(null)
  const [verifyModal,  setVerifyModal]  = useState<EnrichedUser | null>(null)
  const [detailUser,   setDetailUser]   = useState<EnrichedUser | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      // Single call to the Express server — it fetches Supabase profiles,
      // merges with seed / local-DB users, and enriches with activity data.
      const r = await fetch(`${API}/api/admin/users`)
      if (!r.ok) throw new Error(`Server returned ${r.status}`)
      const d = await r.json()

      setUsers(d.users || [])
      setStats({
        total:     d.total          || 0,
        active:    d.active_count   || 0,
        blocked:   d.blocked_count  || 0,
        verified:  d.verified_count || 0,
        suspicious:d.suspicious_count || 0,
      })
    } catch (err) {
      console.error("UserManagement: fetchUsers failed —", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  // Client-side filter + sort
  const filtered = useMemo(() => {
    let r = [...users]
    if (search) {
      const q = search.toLowerCase()
      r = r.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.skills.some(s => s.name.toLowerCase().includes(q)))
    }
    if (roleFilter   !== "all") r = r.filter(u => u.role === roleFilter)
    if (statusFilter !== "all") r = r.filter(u => u.status === statusFilter)
    if (verifiedFilter === "verified")   r = r.filter(u => u.verified)
    if (verifiedFilter === "unverified") r = r.filter(u => !u.verified)

    r.sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sortField] ?? ""
      const bv = (b as unknown as Record<string, unknown>)[sortField] ?? ""
      const cmp = typeof av === "number" ? (av as number) - (bv as number) : String(av).localeCompare(String(bv))
      return sortDir === "asc" ? cmp : -cmp
    })
    return r
  }, [users, search, roleFilter, statusFilter, verifiedFilter, sortField, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => { setPage(1) }, [search, roleFilter, statusFilter, verifiedFilter])

  function toggleSort(field: string) {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortField(field); setSortDir("asc") }
  }

  async function handleBlock(user: EnrichedUser) {
    setActionLoading(true)
    try {
      const blocked = user.status === "active"
      await fetch(`${API}/api/admin/users/${user.id}/block`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocked }),
      })
      const next: "active" | "blocked" = blocked ? "blocked" : "active"
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: next } : u))
      setDetailUser(prev => prev?.id === user.id ? { ...prev, status: next } : prev)
    } finally { setActionLoading(false); setBlockModal(null) }
  }

  async function handleVerify(user: EnrichedUser) {
    setActionLoading(true)
    try {
      const verified = !user.verified
      await fetch(`${API}/api/admin/users/${user.id}/verify`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verified }),
      })
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, verified } : u))
      setDetailUser(prev => prev?.id === user.id ? { ...prev, verified } : prev)
    } finally { setActionLoading(false); setVerifyModal(null) }
  }

  const COLS = [
    { label: "User",    field: "name",               sortable: true  },
    { label: "Role",    field: "role",               sortable: true  },
    { label: "Skills",  field: null,                 sortable: false },
    { label: "Rating",  field: "rating",             sortable: true  },
    { label: "Status",  field: "status",             sortable: true  },
    { label: "Verified",field: "verified",           sortable: false },
    { label: "Joined",  field: "joined_at",          sortable: true  },
    { label: "Actions", field: null,                 sortable: false },
  ]

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary mb-0.5">User Management</p>
          <h1 className="text-2xl font-bold text-foreground">All Users</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{filtered.length} of {stats.total} users</p>
        </div>
        <button onClick={fetchUsers}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total",      value: stats.total,     Icon: User,          cls: "bg-secondary/50 border border-border",                   icls: "text-foreground"   },
          { label: "Active",     value: stats.active,    Icon: CheckCircle2,  cls: "bg-emerald-500/5 border border-emerald-500/10",           icls: "text-emerald-400"  },
          { label: "Blocked",    value: stats.blocked,   Icon: Ban,           cls: "bg-destructive/5 border border-destructive/10",           icls: "text-destructive"  },
          { label: "Verified",   value: stats.verified,  Icon: ShieldCheck,   cls: "bg-blue-500/5 border border-blue-500/10",                 icls: "text-blue-400"     },
          { label: "Suspicious", value: stats.suspicious,Icon: AlertTriangle, cls: "bg-amber-500/5 border border-amber-500/10",              icls: "text-amber-400"    },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className={`rounded-xl p-3.5 ${s.cls}`}>
            <div className="flex items-center gap-2">
              <s.Icon className={`h-4 w-4 ${s.icls}`} />
              <p className="text-xl font-bold text-foreground">{s.value}</p>
            </div>
            <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Suspicious alert */}
      <AnimatePresence>
        {stats.suspicious > 0 && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            <p className="text-sm text-amber-400">
              <span className="font-semibold">{stats.suspicious} user{stats.suspicious !== 1 ? "s" : ""}</span> flagged with multiple reports — review immediately.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 bg-secondary/50 border border-border rounded-xl px-3 py-2 flex-1 min-w-48">
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email, or skill…"
            className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none flex-1 min-w-0" />
          {search && <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>}
        </div>

        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
            className="pl-8 pr-3 py-2 bg-secondary/50 border border-border rounded-xl text-sm text-foreground outline-none appearance-none cursor-pointer">
            <option value="all">All Roles</option>
            <option value="freelancer">Freelancer</option>
            <option value="client">Client</option>
            <option value="both">Both</option>
            <option value="user">User</option>
          </select>
        </div>

        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-secondary/50 border border-border rounded-xl text-sm text-foreground outline-none appearance-none cursor-pointer">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="blocked">Blocked</option>
        </select>

        <select value={verifiedFilter} onChange={e => setVerifiedFilter(e.target.value)}
          className="px-3 py-2 bg-secondary/50 border border-border rounded-xl text-sm text-foreground outline-none appearance-none cursor-pointer">
          <option value="all">All Users</option>
          <option value="verified">Verified Only</option>
          <option value="unverified">Unverified</option>
        </select>
      </div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">

        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading users…</span>
          </div>
        ) : paginated.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
            <User className="h-8 w-8 opacity-30" />
            <p className="text-sm font-medium">No users match your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/20">
                  {COLS.map(col => (
                    <th key={col.label}
                      className={`px-4 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap ${col.sortable ? "cursor-pointer hover:text-foreground select-none" : ""}`}
                      onClick={col.sortable && col.field ? () => toggleSort(col.field!) : undefined}>
                      {col.label}
                      {col.sortable && col.field && <SortIcon field={col.field} sortField={sortField} sortDir={sortDir} />}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((user, i) => (
                  <motion.tr key={user.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                    className={`border-b border-border/50 hover:bg-secondary/20 transition-colors ${user.is_suspicious ? "bg-amber-500/[0.03]" : ""}`}>

                    {/* User */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar user={user} size="sm" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold text-foreground truncate max-w-[130px]">{user.name}</p>
                            {user.verified   && <ShieldCheck    className="h-3 w-3 text-blue-400 shrink-0" />}
                            {user.is_suspicious && <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0" />}
                          </div>
                          <p className="text-xs text-muted-foreground truncate max-w-[130px]">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3"><RoleBadge role={user.role} /></td>

                    {/* Skills */}
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap max-w-[170px]">
                        {user.skills.slice(0, 3).map((s, j) => (
                          <span key={j} className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${s.type === "offering" ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>
                            {s.name}
                          </span>
                        ))}
                        {user.skills.length > 3 && <span className="px-1.5 py-0.5 rounded text-[10px] text-muted-foreground bg-secondary">+{user.skills.length - 3}</span>}
                        {user.skills.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                      </div>
                    </td>

                    {/* Rating */}
                    <td className="px-4 py-3"><Stars rating={user.rating} /></td>

                    {/* Status */}
                    <td className="px-4 py-3"><StatusBadge status={user.status} /></td>

                    {/* Verified */}
                    <td className="px-4 py-3">
                      {user.verified
                        ? <span className="inline-flex items-center gap-1 text-xs text-blue-400"><ShieldCheck className="h-3.5 w-3.5" /> Yes</span>
                        : <span className="text-xs text-muted-foreground">—</span>}
                    </td>

                    {/* Joined */}
                    <td className="px-4 py-3">
                      <p className="text-xs text-muted-foreground whitespace-nowrap">{fmtDate(user.joined_at)}</p>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setDetailUser(user)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="View details">
                          <Eye className="h-3.5 w-3.5" />
                        </motion.button>
                        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setVerifyModal(user)}
                          className={`p-1.5 rounded-lg transition-colors ${user.verified ? "text-blue-400 bg-blue-500/10" : "text-muted-foreground hover:text-blue-400 hover:bg-blue-500/10"}`}
                          title={user.verified ? "Remove verification" : "Verify"}>
                          <ShieldCheck className="h-3.5 w-3.5" />
                        </motion.button>
                        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setBlockModal(user)}
                          className={`p-1.5 rounded-lg transition-colors ${user.status === "blocked" ? "text-emerald-400 bg-emerald-500/10" : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"}`}
                          title={user.status === "blocked" ? "Unblock" : "Block"}>
                          {user.status === "blocked" ? <UserCheck className="h-3.5 w-3.5" /> : <UserX className="h-3.5 w-3.5" />}
                        </motion.button>
                      </div>
                    </td>

                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && filtered.length > PAGE_SIZE && (
          <div className="px-5 py-3 border-t border-border flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Modals */}
      <AnimatePresence>
        {blockModal  && <BlockModal  user={blockModal}  onConfirm={() => handleBlock(blockModal)}  onCancel={() => setBlockModal(null)}  loading={actionLoading} />}
        {verifyModal && <VerifyModal user={verifyModal} onConfirm={() => handleVerify(verifyModal)} onCancel={() => setVerifyModal(null)} loading={actionLoading} />}
        {detailUser  && (
          <DetailModal
            user={detailUser}
            onClose={() => setDetailUser(null)}
            onBlock={u  => { setDetailUser(null); setBlockModal(u)  }}
            onVerify={u => { setDetailUser(null); setVerifyModal(u) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
