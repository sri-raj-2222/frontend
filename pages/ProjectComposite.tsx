import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import {
  Plus, Users, Trophy, Loader2, Workflow, Briefcase,
  CheckCircle2, XCircle, Clock, ChevronRight, Hourglass,
  Star, TrendingUp
} from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"

const API = "https://backend-a41z.onrender.com"

interface ProjectRole {
  id: string
  name: string
  skills: string[]
  credits: number
  filled: boolean
}

interface Project {
  id: string
  title: string
  description: string
  roles: ProjectRole[]
  min_team_size: number
  total_credits: number
  owner_id: string
  owner_name: string
  deadline: string | null
  status: string
  members: { user_id: string; role_name: string; user_name: string }[]
  created_at: string
}

interface ProjectRequest {
  id: string
  project_id: string
  role_id: string
  role_name: string
  status: string
  project: Project | null
}

const STATUS_BADGE: Record<string, string> = {
  open: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  in_progress: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  completed: "bg-primary/10 text-primary border-primary/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
}

export default function ProjectComposite() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState<{ owned: Project[]; member: Project[]; requests: ProjectRequest[] } | null>(null)
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const [myRes, profRes] = await Promise.all([
        fetch(`${API}/api/user/${user.id}/projects`),
        fetch(`${API}/api/user/${user.id}/profile`),
      ])
      if (myRes.ok) setData(await myRes.json())
      if (profRes.ok) { const d = await profRes.json(); setBalance(d.points || 0) }
    } catch { /* offline */ }
    finally { setLoading(false) }
  }, [user])

  useEffect(() => { load() }, [load])

  const owned = data?.owned ?? []
  const applications = data?.requests ?? []
  const contributing = data?.member ?? []

  const pendingRequests = applications.filter(r => r.status === 'pending').length
  const activeProjects = owned.filter(p => p.status === 'open' || p.status === 'in_progress').length

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 md:px-6 py-10 mt-16">

        {/* Header */}
        <div className="flex items-start justify-between mb-10 gap-4">
          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">Owner Portal</p>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-none flex items-center gap-3">
              <Workflow className="h-8 w-8 text-primary" /> Project Composite
            </h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-md">
              Post projects, define roles, and build your team. Credits are escrowed until the project completes.
            </p>
          </div>
          <div className="flex flex-col items-end gap-3 shrink-0">
            <div className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-primary/10 border border-primary/15 text-primary text-sm font-bold">
              <Trophy className="h-4 w-4" /> {balance} <span className="font-normal text-xs text-primary/70">credits</span>
            </div>
            <Button onClick={() => navigate('/tasks/project/post')} className="h-9 px-4 rounded-xl text-xs font-semibold gap-2">
              <Plus className="h-3.5 w-3.5" /> Post a Project
            </Button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-3 mb-10">
          {[
            { label: "Active Projects", value: activeProjects, icon: Workflow, color: "text-primary bg-primary/10" },
            { label: "Pending Requests", value: pendingRequests, icon: Hourglass, color: "text-amber-600 bg-amber-500/10" },
            { label: "Contributing To", value: contributing.length, icon: TrendingUp, color: "text-emerald-600 bg-emerald-500/10" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
              <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", color)}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xl font-bold leading-none">{value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-10">

            {/* My Posted Projects */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Briefcase className="h-4 w-4" /> My Posted Projects
                </h2>
                <Button size="sm" variant="outline" onClick={() => navigate('/tasks/project/post')}
                  className="h-7 px-3 rounded-lg text-[11px] gap-1">
                  <Plus className="h-3 w-3" /> New
                </Button>
              </div>

              {owned.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-border p-10 text-center">
                  <Workflow className="h-10 w-10 mx-auto mb-4 text-muted-foreground opacity-20" />
                  <p className="text-sm font-semibold text-muted-foreground">No projects posted yet</p>
                  <p className="text-xs text-muted-foreground/60 mt-1 mb-5">Post a project to start building your team</p>
                  <Button onClick={() => navigate('/tasks/project/post')} size="sm" className="gap-2">
                    <Plus className="h-3.5 w-3.5" /> Post Your First Project
                  </Button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-3">
                  {owned.map((p, i) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => navigate(`/tasks/project/${p.id}`)}
                      className="rounded-2xl border border-border bg-card p-5 cursor-pointer hover:shadow-md transition-all group"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-sm group-hover:text-primary transition-colors truncate">{p.title}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{p.description}</p>
                        </div>
                        <span className={cn("text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border shrink-0", STATUS_BADGE[p.status] || STATUS_BADGE.open)}>
                          {p.status === 'open' ? 'Hiring' : p.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                        <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {p.members.length}/{p.roles.length} filled</span>
                        <span className="flex items-center gap-1"><Trophy className="h-3.5 w-3.5 text-primary" /> {p.total_credits} cr escrowed</span>
                        {p.deadline && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {new Date(p.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>}
                      </div>

                      {/* Role fill progress */}
                      <div className="w-full bg-secondary rounded-full h-1.5 mb-3">
                        <div
                          className="bg-primary h-1.5 rounded-full transition-all"
                          style={{ width: `${p.roles.length ? (p.members.length / p.roles.length) * 100 : 0}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">{p.roles.length - p.members.length} role{p.roles.length - p.members.length !== 1 ? 's' : ''} open</span>
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-primary group-hover:gap-2 transition-all">
                          Manage <ChevronRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </section>

            {/* My Applications */}
            <section>
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 mb-4">
                <Star className="h-4 w-4" /> My Applications
                {pendingRequests > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-bold border border-amber-500/20">
                    {pendingRequests} pending
                  </span>
                )}
              </h2>

              {applications.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center">
                  <p className="text-sm text-muted-foreground">No applications sent yet.</p>
                  <button onClick={() => navigate('/tasks/project')} className="mt-2 text-xs text-primary underline">Browse open projects</button>
                </div>
              ) : (
                <div className="space-y-2">
                  {applications.map((r, i) => (
                    <motion.div
                      key={r.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => r.project && navigate(`/tasks/project/${r.project_id}`)}
                      className="rounded-xl border border-border bg-card px-4 py-3 cursor-pointer hover:shadow-sm transition-all flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {r.status === 'accepted'
                          ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                          : r.status === 'rejected'
                            ? <XCircle className="h-4 w-4 text-destructive shrink-0" />
                            : <Hourglass className="h-4 w-4 text-amber-500 shrink-0" />}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{r.project?.title || 'Project'}</p>
                          <p className="text-xs text-muted-foreground">Applied for: {r.role_name}</p>
                        </div>
                      </div>
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border shrink-0",
                        r.status === 'accepted' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                          : r.status === 'rejected' ? "bg-destructive/10 text-destructive border-destructive/20"
                            : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                      )}>
                        {r.status}
                      </span>
                    </motion.div>
                  ))}
                </div>
              )}
            </section>

            {/* Contributing To */}
            {contributing.length > 0 && (
              <section>
                <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 mb-4">
                  <Users className="h-4 w-4" /> Contributing To
                </h2>
                <div className="grid md:grid-cols-2 gap-3">
                  {contributing.map((p, i) => {
                    const myRole = p.members.find(m => m.user_id === user?.id)
                    return (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        onClick={() => navigate(`/tasks/project/${p.id}`)}
                        className="rounded-xl border border-border bg-card px-4 py-3 cursor-pointer hover:shadow-sm transition-all flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{p.title}</p>
                          <p className="text-xs text-muted-foreground">{myRole?.role_name || 'Contributor'} · {p.total_credits} cr pool</p>
                        </div>
                        <span className={cn("text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border shrink-0", STATUS_BADGE[p.status] || STATUS_BADGE.open)}>
                          {p.status}
                        </span>
                      </motion.div>
                    )
                  })}
                </div>
              </section>
            )}

          </div>
        )}
      </main>
    </div>
  )
}
