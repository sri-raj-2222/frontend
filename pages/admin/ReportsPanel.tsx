import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Flag, Filter, RefreshCw, X,
  AlertTriangle, CheckCircle2, Clock, Eye, Loader2,
  MessageSquare, ShieldX, ShieldAlert, ShieldCheck,
  ArrowLeft, Calendar, ExternalLink,
} from "lucide-react"

const API = "https://backend-a41z.onrender.com"

// ── Shared types ──────────────────────────────────────────────────────────────
interface AdminSession { id?: string; email?: string; name?: string; role?: string }
interface UserProfile {
  profile_pic?: string | null; name?: string; email?: string; status?: string
  rating?: number; sessions_count?: number; reports_count?: number; warning_count?: number
  projects_completed?: number; verified?: boolean
  skills?: { id?: string; skill_name: string; skill_type: string }[]
}
interface ReportUser {
  profile_pic?: string | null; name?: string; email?: string
  created_at?: string; warning_count?: number; status?: string
}
interface ChatMsg { id?: string; content: string; sender_name?: string }
interface PriorReport { id: string; reason_category: string; status: string; created_at: string }
interface ModerationAction {
  id: string; action_type: string; duration_days?: number; created_at: string; admin_note: string
}
interface ReportEntry {
  id: string; reason_category: string; status: string; description: string; created_at: string
  chat_room_id?: string; evidence_message_ids?: string[]
  reporter_id?: string; reported_user_id?: string
  reporter?: ReportUser; reported?: ReportUser
  distinct_reporter_count?: number
}
interface ReportData {
  report: ReportEntry
  chatHistory: ChatMsg[]
  priorReports: PriorReport[]
  moderationActions: ModerationAction[]
  distinctReporterCount: number
  reporterFiledCount: number
}

// ── User Profile Modal ────────────────────────────────────────────────────────
function UserProfileModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [data, setData] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}/api/admin/users/${userId}`)
      .then(r => r.json()).then(setData).catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [userId])

  return (
    <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
        className="bg-card border border-border rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <p className="font-bold text-sm text-foreground flex-1">User Profile</p>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5">
          {loading ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : !data ? (
            <p className="text-center text-sm text-muted-foreground py-8">Could not load profile.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {data.profile_pic
                  ? <img src={data.profile_pic} className="h-14 w-14 rounded-2xl object-cover ring-2 ring-border" />
                  : <div className="h-14 w-14 rounded-2xl bg-primary/20 flex items-center justify-center text-xl font-bold text-primary">{(data.name || '?')[0]}</div>}
                <div>
                  <p className="font-bold text-foreground">{data.name}</p>
                  <p className="text-xs text-muted-foreground">{data.email}</p>
                  <span className={`inline-block mt-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg
                    ${data.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'}`}>
                    {data.status || 'active'}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Rating', value: data.rating ?? '—' },
                  { label: 'Sessions', value: data.sessions_count ?? 0 },
                  { label: 'Reports', value: data.reports_count ?? 0 },
                  { label: 'Warnings', value: data.warning_count ?? 0 },
                  { label: 'Completed', value: data.projects_completed ?? 0 },
                  { label: 'Verified', value: data.verified ? 'Yes' : 'No' },
                ].map(i => (
                  <div key={i.label} className={`bg-secondary/30 rounded-xl p-2.5 ${i.label === 'Reports' && Number(i.value) > 0 ? 'bg-destructive/10' : ''}`}>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{i.label}</p>
                    <p className={`text-sm font-bold mt-0.5 ${i.label === 'Reports' && Number(i.value) > 0 ? 'text-destructive' : 'text-foreground'}`}>{i.value}</p>
                  </div>
                ))}
              </div>
              {data.skills && data.skills.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {data.skills.slice(0, 8).map((s) => (
                      <span key={s.id || s.skill_name} className={`text-[10px] font-bold px-2 py-1 rounded-lg ${s.skill_type === 'offering' ? 'bg-primary/10 text-primary' : 'bg-amber-500/10 text-amber-500'}`}>
                        {s.skill_name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  under_review: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  resolved: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  dismissed: "bg-secondary text-muted-foreground border-border",
}

const ACTION_CONFIGS = [
  { type: "dismiss", label: "Dismiss", icon: CheckCircle2, cls: "border-border text-muted-foreground hover:border-primary hover:text-primary", duration: false },
  { type: "warn", label: "Issue Warning", icon: ShieldAlert, cls: "border-amber-500/30 text-amber-400 hover:bg-amber-500/10", duration: false },
  { type: "temp_ban", label: "Temp Ban", icon: Clock, cls: "border-orange-500/30 text-orange-400 hover:bg-orange-500/10", duration: true },
  { type: "permanent_ban", label: "Permanent Ban", icon: ShieldX, cls: "border-destructive/30 text-destructive hover:bg-destructive/10", duration: false },
]

function fmtDate(d: string | number | Date | undefined | null) {
  if (!d) return "—"
  try {
    const date = new Date(d)
    if (isNaN(date.getTime())) return "—"
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  } catch {
    return "—"
  }
}

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status] ?? "bg-secondary text-muted-foreground border-border"
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${cls}`}>
      {status.replace("_", " ")}
    </span>
  )
}

function FlagIcon({ color, label }: { color: string; label: string }) {
  if (color === 'none') return null
  return (
    <span title={label} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[9px] font-bold border ${color === 'red' ? 'bg-destructive/10 border-destructive/20 text-destructive' :
        color === 'orange' ? 'bg-orange-500/10 border-orange-500/20 text-orange-500' :
          'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'}`}>
      <Flag className="h-2.5 w-2.5" />{label}
    </span>
  )
}

function UserChip({ profile, flagCount = 0, onClick }: { profile: ReportUser | undefined; flagCount?: number; onClick?: () => void }) {
  if (!profile) return <span className="text-muted-foreground text-xs">—</span>
  const flagColor = flagCount >= 3 ? 'red' : flagCount >= 1 ? 'yellow' : 'none'
  const flagLabel = flagCount >= 3 ? `${flagCount} reports` : flagCount >= 1 ? `${flagCount} report` : ''
  return (
    <button onClick={onClick} className={`flex items-center gap-2 text-left ${onClick ? 'hover:opacity-80 transition-opacity cursor-pointer' : 'cursor-default'}`}>
      {profile.profile_pic
        ? <img src={profile.profile_pic} className="h-7 w-7 rounded-full object-cover ring-1 ring-border" />
        : <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
          {(profile.name || "?")[0].toUpperCase()}
        </div>
      }
      <div>
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-semibold text-foreground leading-tight">{profile.name || "—"}</p>
          {onClick && <ExternalLink className="h-2.5 w-2.5 text-muted-foreground/50" />}
        </div>
        <p className="text-[10px] text-muted-foreground leading-tight truncate max-w-[120px]">{profile.email}</p>
      </div>
      {flagColor !== 'none' && <FlagIcon color={flagColor} label={flagLabel} />}
    </button>
  )
}

// ── Detail + Action Panel ─────────────────────────────────────────────────────
function ReportDetail({ reportId, adminSession, onBack, onActionDone }: {
  reportId: string; adminSession: AdminSession; onBack: () => void; onActionDone: () => void
}) {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionType, setActionType] = useState("")
  const [adminNote, setAdminNote] = useState("")
  const [durationDays, setDurationDays] = useState(7)
  const [submitting, setSubmitting] = useState(false)
  const [actionMsg, setActionMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [profileModalId, setProfileModalId] = useState<string | null>(null)
  const [showChat, setShowChat] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`${API}/api/admin/reports/${reportId}`)
      if (r.ok) setData(await r.json())
    } finally { setLoading(false) }
  }, [reportId])

  useEffect(() => { load() }, [load])

  async function submitAction() {
    if (!actionType || !adminNote.trim()) return
    setSubmitting(true)
    try {
      const r = await fetch(`${API}/api/admin/reports/${reportId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action_type: actionType,
          admin_id: adminSession?.id || null,
          admin_email: adminSession?.email || "admin@sharesphere.com",
          admin_note: adminNote.trim(),
          duration_days: actionType === "temp_ban" ? durationDays : undefined,
        }),
      })
      const res = await r.json()
      if (r.ok) {
        setActionMsg({ text: "Action recorded successfully.", ok: true })
        setActionType(""); setAdminNote("")
        onActionDone()
        setTimeout(() => { setActionMsg(null); load() }, 2000)
      } else {
        setActionMsg({ text: res.error || "Failed to submit action.", ok: false })
      }
    } catch {
      setActionMsg({ text: "Network error — please check the server and try again.", ok: false })
    } finally { setSubmitting(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24 gap-3 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" /><span className="text-sm">Loading report…</span>
    </div>
  )

  if (!data) return (
    <div className="text-center py-16 text-muted-foreground"><p className="text-sm">Report not found.</p></div>
  )

  const { report, chatHistory, priorReports, moderationActions, distinctReporterCount, reporterFiledCount } = data

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
      {/* Profile modal */}
      <AnimatePresence>
        {profileModalId && <UserProfileModal userId={profileModalId} onClose={() => setProfileModalId(null)} />}
      </AnimatePresence>
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Report Detail</p>
          <h2 className="text-base font-bold text-foreground">{report.reason_category}</h2>
        </div>
        <div className="ml-auto"><StatusBadge status={report.status} /></div>
      </div>

      {/* Auto-flag banner */}
      {distinctReporterCount >= 3 && (
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-destructive/5 border border-destructive/20">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-sm text-destructive font-semibold">
            {distinctReporterCount} distinct reporters — review recommended
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Reporter */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Reporter</p>
          <UserChip profile={report.reporter} onClick={() => setProfileModalId(report.reporter_id || null)} />
          <div className="grid grid-cols-2 gap-2 mt-2">
            {[
              { label: "Joined", value: fmtDate(report.reporter?.created_at) },
              { label: "Reports filed", value: reporterFiledCount },
              { label: "Warnings", value: report.reporter?.warning_count ?? 0 },
              { label: "Status", value: report.reporter?.status || "active" },
            ].map(i => (
              <div key={i.label} className="bg-secondary/30 rounded-xl p-2.5">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{i.label}</p>
                <p className="text-xs font-semibold text-foreground mt-0.5 capitalize">{i.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Reported user */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Reported User</p>
          <UserChip profile={report.reported} flagCount={distinctReporterCount} onClick={() => setProfileModalId(report.reported_user_id || null)} />
          <div className="grid grid-cols-2 gap-2 mt-2">
            {[
              { label: "Joined", value: fmtDate(report.reported?.created_at) },
              { label: "Total reports", value: distinctReporterCount },
              { label: "Warnings", value: report.reported?.warning_count ?? 0 },
              { label: "Status", value: report.reported?.status || "active" },
            ].map(i => (
              <div key={i.label} className={`rounded-xl p-2.5 ${i.label === "Status" && report.reported?.status !== "active" ? "bg-destructive/10" : "bg-secondary/30"}`}>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{i.label}</p>
                <p className={`text-xs font-semibold mt-0.5 capitalize ${i.label === "Status" && report.reported?.status !== "active" ? "text-destructive" : "text-foreground"}`}>{i.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Description</p>
        <p className="text-sm text-foreground/90 leading-relaxed">{report.description}</p>
        <p className="text-[10px] text-muted-foreground mt-3">Filed {fmtDate(report.created_at)}</p>
      </div>

      {/* Chat history */}
      {chatHistory.length > 0 ? (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Chat History</p>
            <span className="ml-auto text-xs text-muted-foreground">{chatHistory.length} messages</span>
            <button onClick={() => setShowChat(s => !s)}
              className="text-xs font-bold text-primary hover:underline ml-2">
              {showChat ? 'Collapse' : 'Expand'}
            </button>
          </div>
          {showChat && (
            <div className="max-h-64 overflow-y-auto p-4 space-y-2">
              {chatHistory.map((msg: ChatMsg) => {
                const isEvidence = msg.id && report.evidence_message_ids?.includes(msg.id)
                return (
                  <div key={msg.id || msg.content} className={`px-3 py-2 rounded-xl text-xs ${isEvidence ? 'bg-destructive/10 border border-destructive/30' : 'bg-secondary/30'}`}>
                    <span className={`font-bold mr-2 ${isEvidence ? 'text-destructive' : 'text-primary'}`}>
                      {msg.sender_name || 'User'}{isEvidence && ' 🚩'}
                    </span>
                    <span className="text-foreground/80">{msg.content}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : report.chat_room_id ? (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-secondary/30 border border-border">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No chat messages found for this room.</p>
        </div>
      ) : null}

      {/* Prior reports */}
      {priorReports.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
            Prior Reports Against This User ({priorReports.length})
          </p>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {priorReports.map((r: PriorReport) => (
              <div key={r.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-secondary/30">
                <span className="text-xs text-foreground font-medium">{r.reason_category}</span>
                <div className="flex items-center gap-2">
                  <StatusBadge status={r.status} />
                  <span className="text-[10px] text-muted-foreground">{fmtDate(r.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Moderation history */}
      {moderationActions.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Moderation History</p>
          <div className="space-y-2">
            {moderationActions.map((a: ModerationAction) => (
              <div key={a.id} className="px-3 py-2 rounded-xl bg-secondary/30 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground capitalize">{a.action_type.replace("_", " ")}</span>
                  {a.duration_days && <span className="text-[10px] text-muted-foreground">— {a.duration_days} days</span>}
                  <span className="ml-auto text-[10px] text-muted-foreground">{fmtDate(a.created_at)}</span>
                </div>
                <p className="text-[11px] text-muted-foreground italic">"{a.admin_note}"</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action panel */}
      {report.status === "pending" || report.status === "under_review" ? (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Take Action</p>

          <div className="grid grid-cols-2 gap-2">
            {ACTION_CONFIGS.map(cfg => (
              <button key={cfg.type}
                onClick={() => setActionType(t => t === cfg.type ? "" : cfg.type)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all
                  ${actionType === cfg.type ? "ring-2 ring-offset-1 ring-primary " : ""}${cfg.cls}`}
              >
                <cfg.icon className="h-3.5 w-3.5 shrink-0" />
                {cfg.label}
              </button>
            ))}
          </div>

          {actionType === "temp_ban" && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Duration</label>
              <div className="flex gap-2">
                {[1, 7, 30].map(d => (
                  <button key={d}
                    onClick={() => setDurationDays(d)}
                    className={`flex-1 py-2 rounded-xl border text-xs font-bold transition-all
                      ${durationDays === d ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
                  >
                    {d} {d === 1 ? "day" : "days"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {actionType && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Admin Note <span className="text-destructive">*</span>
              </label>
              <textarea
                value={adminNote}
                onChange={e => setAdminNote(e.target.value)}
                placeholder="Required — describe the reason for this action for the audit log…"
                className="w-full h-20 bg-secondary/30 border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary resize-none"
              />
            </div>
          )}

          {actionMsg && (
            <div className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium
              ${actionMsg.ok ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" : "bg-destructive/5 border-destructive/20 text-destructive"}`}>
              {actionMsg.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              {actionMsg.text}
            </div>
          )}

          <button
            onClick={submitAction}
            disabled={!actionType || !adminNote.trim() || submitting}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {submitting ? "Submitting…" : "Confirm Action"}
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-secondary/30 border border-border">
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">This report has already been <span className="font-semibold text-foreground capitalize">{report.status}</span>.</p>
        </div>
      )}
    </motion.div>
  )
}

// ── Main Reports Panel ────────────────────────────────────────────────────────
export default function ReportsPanel({ globalSearch = "" }: { globalSearch?: string }) {
  const [reports, setReports] = useState<ReportEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState("")
  const [reasonFilter, setReasonFilter] = useState("")
  const [search] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [profileModalId, setProfileModalId] = useState<string | null>(null)

  const adminSession = (() => {
    try { return JSON.parse(localStorage.getItem("admin_session") || "{}") } catch { return {} }
  })()

  const loadReports = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set("status", statusFilter)
      if (reasonFilter) params.set("reason_category", reasonFilter)
      if (dateFrom) params.set("date_from", dateFrom)
      if (dateTo) params.set("date_to", dateTo)
      const r = await fetch(`${API}/api/admin/reports?${params.toString()}`)
      if (r.ok) setReports(await r.json())
    } finally { setLoading(false) }
  }, [statusFilter, reasonFilter, dateFrom, dateTo])

  useEffect(() => { loadReports() }, [loadReports])

  const filtered = reports.filter(r => {
    const activeSearch = globalSearch || search
    if (!activeSearch) return true
    const q = activeSearch.toLowerCase()
    return (
      r.reporter?.name?.toLowerCase().includes(q) ||
      r.reported?.name?.toLowerCase().includes(q) ||
      r.reason_category?.toLowerCase().includes(q)
    )
  })

  if (selectedId) return (
    <ReportDetail
      reportId={selectedId}
      adminSession={adminSession}
      onBack={() => setSelectedId(null)}
      onActionDone={loadReports}
    />
  )

  return (
    <div className="space-y-5">
      {/* Profile modal */}
      <AnimatePresence>
        {profileModalId && <UserProfileModal userId={profileModalId} onClose={() => setProfileModalId(null)} />}
      </AnimatePresence>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary mb-0.5">Moderation</p>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{filtered.length} report{filtered.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowFilters(s => !s)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors
              ${showFilters ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-secondary"}`}>
            <Filter className="h-3.5 w-3.5" /> Filters
            {(statusFilter || reasonFilter || dateFrom || dateTo) && (
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            )}
          </button>
          <button onClick={loadReports}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border border-border text-muted-foreground hover:bg-secondary transition-colors">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>


      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pb-1">
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-secondary/50 border border-border rounded-xl text-sm text-foreground outline-none appearance-none cursor-pointer">
                <option value="">All Statuses</option>
                {["pending", "under_review", "resolved", "dismissed"].map(s => (
                  <option key={s} value={s}>{s.replace("_", " ")}</option>
                ))}
              </select>
              <select value={reasonFilter} onChange={e => setReasonFilter(e.target.value)}
                className="px-3 py-2 bg-secondary/50 border border-border rounded-xl text-sm text-foreground outline-none appearance-none cursor-pointer">
                <option value="">All Reasons</option>
                {["Harassment / Hate speech", "Spam or scam", "Inappropriate content", "Impersonation", "Sharing personal info", "Threatening behavior", "Other"].map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <div className="flex items-center gap-2 bg-secondary/50 border border-border rounded-xl px-3 py-2">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  className="bg-transparent text-sm text-foreground outline-none flex-1 min-w-0" />
              </div>
              <div className="flex items-center gap-2 bg-secondary/50 border border-border rounded-xl px-3 py-2">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  className="bg-transparent text-sm text-foreground outline-none flex-1 min-w-0" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /><span className="text-sm">Loading reports…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
            <Flag className="h-8 w-8 opacity-30" />
            <p className="text-sm font-medium">No reports yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/20">
                  {["Reporter", "Reported User", "Reason", "Date", "Reports", "Status", "Action"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((report, i) => (
                  <motion.tr key={report.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                    className={`border-b border-border/50 hover:bg-secondary/20 transition-colors
                      ${(report.distinct_reporter_count ?? 0) >= 3 ? "bg-destructive/[0.02]" : ""}`}>
                    <td className="px-4 py-3"><UserChip profile={report.reporter} onClick={() => setProfileModalId(report.reporter_id || null)} /></td>
                    <td className="px-4 py-3">
                      <UserChip profile={report.reported} flagCount={report.distinct_reporter_count} onClick={() => setProfileModalId(report.reported_user_id || null)} /></td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-foreground font-medium">{report.reason_category}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{fmtDate(report.created_at)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold ${(report.distinct_reporter_count ?? 0) >= 3 ? "text-destructive" : "text-muted-foreground"}`}>
                        {report.distinct_reporter_count ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={report.status} /></td>
                    <td className="px-4 py-3">
                      <button onClick={() => setSelectedId(report.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-colors">
                        <Eye className="h-3.5 w-3.5" /> Review
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

