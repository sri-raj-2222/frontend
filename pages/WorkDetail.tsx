import { useState, useEffect, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft, Users, Clock, CheckCircle2, XCircle, Loader2,
  AlertCircle, MessageSquare, Workflow, Briefcase, ChevronRight,
  UserCheck, UserX, Hourglass, Send
} from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"

const API = "http://localhost:5000"

interface ProjectRole { id: string; name: string; skills: string[]; credits: number; filled: boolean }
interface ProjectMember { user_id: string; user_name: string; user_avatar: string | null; role_name: string; credits_allocated: number }
interface ProjectRequest {
  id: string; project_id: string; role_id: string; role_name: string
  contributor_id: string; contributor_name: string; contributor_avatar: string | null
  message: string; status: string; created_at: string; skills?: string[]; posts?: string[]
}
interface Project {
  id: string; title: string; description: string; roles: ProjectRole[]
  min_team_size: number; total_credits: number; owner_id: string; owner_name: string
  deadline: string | null; status: string; room_id: string | null
  members: ProjectMember[]; requests: ProjectRequest[]; created_at: string
}

const STATUS_BADGE: Record<string, string> = {
  open: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  in_progress: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  completed: "bg-primary/10 text-primary border-primary/20",
  cancelled: "text-muted-foreground bg-secondary border-border",
}

export default function WorkDetail() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Request modal
  const [requestingRole, setRequestingRole] = useState<ProjectRole | null>(null)
  const [requestMsg, setRequestMsg] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [requestFeedback, setRequestFeedback] = useState<{ ok: boolean; text: string } | null>(null)

  // Owner actions
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const loadProject = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/projects/${projectId}`)
      if (!res.ok) throw new Error("Project not found")
      setProject(await res.json())
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load") }
    finally { setLoading(false) }
  }, [projectId])

  useEffect(() => { loadProject() }, [loadProject])

  const isOwner = project?.owner_id === user?.id
  const isMember = project?.members.some(m => m.user_id === user?.id)
  const myRequest = project?.requests.find(r => r.contributor_id === user?.id)
  const hasWorkspace = !!project?.room_id

  const submitRequest = async () => {
    if (!requestingRole || !user || !projectId) return
    setSubmitting(true)
    try {
      const res = await fetch(`${API}/api/projects/${projectId}/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role_id: requestingRole.id,
          role_name: requestingRole.name,
          contributor_id: user.id,
          contributor_name: user.name,
          contributor_avatar: user.profilePic || null,
          message: requestMsg.trim()
        })
      })
      if (!res.ok) throw new Error((await res.json()).error || "Failed")
      setRequestFeedback({ ok: true, text: `Request sent for "${requestingRole.name}"! The owner will review it.` })
      setRequestingRole(null)
      setRequestMsg("")
      loadProject()
    } catch (e) {
      setRequestFeedback({ ok: false, text: e instanceof Error ? e.message : "Failed to send request" })
    } finally { setSubmitting(false) }
  }

  const handleRequestAction = async (requestId: string, status: 'accepted' | 'rejected') => {
    if (!projectId) return
    setActionLoading(requestId)
    try {
      const res = await fetch(`${API}/api/projects/${projectId}/requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      })
      if (!res.ok) throw new Error("Failed")
      loadProject()
    } catch { /* show nothing */ }
    finally { setActionLoading(null) }
  }

  if (loading) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex items-center justify-center h-[70vh]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    </div>
  )

  if (error || !project) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
        <AlertCircle className="h-10 w-10 text-destructive opacity-50" />
        <p className="font-semibold text-muted-foreground">{error || "Project not found"}</p>
        <Button variant="outline" onClick={() => navigate('/tasks/project')}>Back to Projects</Button>
      </div>
    </div>
  )

  const pendingRequests = project.requests.filter(r => r.status === 'pending')
  const openRoles = project.roles.filter(r => !r.filled)

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Request Modal */}
      <AnimatePresence>
        {requestingRole && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setRequestingRole(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card rounded-2xl border border-border p-6 max-w-sm w-full shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold mb-1">Request to Join</h3>
              <p className="text-sm text-muted-foreground mb-4">Applying for: <span className="font-semibold text-foreground">{requestingRole.name}</span> · {requestingRole.credits} credits</p>
              <textarea
                value={requestMsg} onChange={e => setRequestMsg(e.target.value)}
                placeholder="Tell the owner why you're a great fit for this role… (optional)"
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary min-h-[100px] mb-4"
              />
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setRequestingRole(null)} className="flex-1 h-10 rounded-xl">Cancel</Button>
                <Button onClick={submitRequest} disabled={submitting} className="flex-[2] h-10 rounded-xl gap-2">
                  {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Send Request
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-8 mt-16 space-y-6">

        {/* Back */}
        <button onClick={() => navigate('/tasks/project')} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Projects
        </button>

        {/* Feedback banner */}
        <AnimatePresence>
          {requestFeedback && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className={cn(
                "flex items-start gap-3 p-4 rounded-xl border text-sm",
                requestFeedback.ok ? "bg-emerald-500/8 border-emerald-500/20 text-emerald-700" : "bg-destructive/8 border-destructive/20 text-destructive"
              )}
            >
              {requestFeedback.ok ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" /> : <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />}
              <div className="flex-1">{requestFeedback.text}</div>
              <button onClick={() => setRequestFeedback(null)} className="shrink-0 opacity-60 hover:opacity-100"><XCircle className="h-4 w-4" /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Project Header Card */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={cn("text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border", STATUS_BADGE[project.status] || STATUS_BADGE.open)}>
                  {project.status === 'open' ? 'Hiring' : project.status.replace('_', ' ')}
                </span>
                <span className="text-[10px] text-muted-foreground">Posted {new Date(project.created_at).toLocaleDateString()}</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight mb-2">{project.title}</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">{project.description}</p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-2xl font-bold text-primary">{project.total_credits}</div>
              <div className="text-xs text-muted-foreground">total credits</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-4 border-t border-border">
            <span className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" /> {project.owner_name}</span>
            <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Min {project.min_team_size} members · {project.members.length} accepted</span>
            {project.deadline && <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Due {new Date(project.deadline).toLocaleDateString()}</span>}
          </div>

          {/* CTA buttons */}
          <div className="flex gap-3 mt-5">
            {(isOwner || isMember) && hasWorkspace && (
              <Button onClick={() => navigate(`/tasks/project/${project.id}/room`)} className="h-10 px-5 rounded-xl gap-2 font-semibold">
                <MessageSquare className="h-4 w-4" /> Open Workspace
              </Button>
            )}
            {!isOwner && !isMember && !myRequest && project.status === 'open' && openRoles.length === 0 && (
              <p className="text-sm text-muted-foreground">All roles are filled.</p>
            )}
          </div>
        </div>

        {/* Roles Section */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-base font-bold mb-4 flex items-center gap-2">
            <Workflow className="h-4 w-4 text-primary" /> Roles & Requirements
          </h2>
          <div className="space-y-3">
            {project.roles.map(role => {
              const acceptedMember = project.members.find(m => m.role_name === role.name)
              const myRoleRequest = project.requests.find(r => r.role_id === role.id && r.contributor_id === user?.id)
              const canRequest = !isOwner && !isMember && !myRequest && !role.filled && project.status === 'open'

              return (
                <div key={role.id} className={cn(
                  "rounded-xl border p-4 flex items-center justify-between gap-4",
                  role.filled ? "border-border bg-secondary/10" : "border-primary/15 bg-primary/5"
                )}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {role.filled
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        : <div className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                      <span className="font-semibold text-sm">{role.name}</span>
                    </div>
                    {role.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-1">
                        {role.skills.map(s => <span key={s} className="text-[10px] px-2 py-0.5 rounded-md bg-secondary font-medium">{s}</span>)}
                      </div>
                    )}
                    {acceptedMember && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <UserCheck className="h-3 w-3 text-emerald-500" /> {acceptedMember.user_name}
                      </p>
                    )}
                    {myRoleRequest && !role.filled && (
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md",
                        myRoleRequest.status === 'pending' ? "bg-amber-500/10 text-amber-600"
                          : myRoleRequest.status === 'accepted' ? "bg-emerald-500/10 text-emerald-600"
                            : "bg-destructive/10 text-destructive"
                      )}>
                        {myRoleRequest.status === 'pending' ? '⏳ Request Pending' : myRoleRequest.status}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-base font-bold text-primary">{role.credits} cr</span>
                    {canRequest && (
                      <Button size="sm" onClick={() => setRequestingRole(role)} className="h-8 px-3 rounded-lg text-xs gap-1.5">
                        Apply <ChevronRight className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Team Members */}
        {project.members.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-base font-bold mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Team Members ({project.members.length})
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {project.members.map(m => (
                <div key={m.user_id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-secondary/10">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                    {m.user_name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{m.user_name}</p>
                    <p className="text-xs text-muted-foreground">{m.role_name}</p>
                  </div>
                  <span className="text-xs font-bold text-primary shrink-0">{m.credits_allocated} cr</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Owner: Pending Requests */}
        {isOwner && pendingRequests.length > 0 && (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6">
            <h2 className="text-base font-bold mb-4 flex items-center gap-2">
              <Hourglass className="h-4 w-4 text-amber-500" /> Pending Requests ({pendingRequests.length})
            </h2>
            <div className="space-y-3">
              {pendingRequests.map(req => (
                <div key={req.id} className="rounded-xl border border-border bg-card p-4 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">
                      {req.contributor_name[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{req.contributor_name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        Applying for: <span className="font-semibold text-foreground">{req.role_name}</span>
                        {project.roles.find(r => r.id === req.role_id)?.skills.length ? (
                          <span className="text-[10px] opacity-60">
                            (Needs: {project.roles.find(r => r.id === req.role_id)?.skills.join(", ")})
                          </span>
                        ) : null}
                      </p>
                      {req.message && <p className="text-xs text-muted-foreground mt-1 italic">"{req.message}"</p>}
                      {req.skills && req.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {req.skills.map(s => (
                            <span key={s} className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold border border-primary/20">
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {/* Worker Experience/Posts */}
                      {req.posts && req.posts.length > 0 && (
                        <div className="mt-3 space-y-1.5 pt-3 border-t border-border/50">
                          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Past Experience</p>
                          <div className="space-y-1">
                            {req.posts.map((post, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium bg-secondary/30 px-2 py-1 rounded-md border border-border/30">
                                <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500 shrink-0" />
                                <span className="truncate">{post}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      disabled={actionLoading === req.id}
                      onClick={() => handleRequestAction(req.id, 'rejected')}
                      className="h-8 w-8 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors"
                    >
                      {actionLoading === req.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserX className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      disabled={actionLoading === req.id}
                      onClick={() => handleRequestAction(req.id, 'accepted')}
                      className="h-8 px-3 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 flex items-center gap-1.5 text-xs font-semibold transition-colors"
                    >
                      {actionLoading === req.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserCheck className="h-3.5 w-3.5" />}
                      Accept
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {project.members.length >= project.min_team_size && !hasWorkspace && (
              <p className="text-xs text-amber-600 mt-3 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> Minimum team size reached! Workspace will auto-open on next acceptance.
              </p>
            )}
          </div>
        )}

        {/* Owner: all requests history */}
        {isOwner && project.requests.filter(r => r.status !== 'pending').length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-base font-bold mb-4 text-muted-foreground">Past Requests</h2>
            <div className="space-y-2">
              {project.requests.filter(r => r.status !== 'pending').map(req => (
                <div key={req.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-secondary/20">
                  <div className="flex items-center gap-3">
                    <div className="h-7 w-7 rounded-lg bg-secondary flex items-center justify-center text-xs font-bold">
                      {req.contributor_name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{req.contributor_name}</p>
                      <p className="text-xs text-muted-foreground">{req.role_name}</p>
                    </div>
                  </div>
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md",
                    req.status === 'accepted' ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"
                  )}>{req.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
