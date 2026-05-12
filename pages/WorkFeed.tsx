import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import {
  Briefcase, Users, Trophy, Clock, ChevronRight, Loader2,
  CheckCircle2, Workflow, Sparkles, Filter, LayoutGrid, Search
} from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { useSocket } from "@/contexts/socket-context"
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
  owner_avatar: string | null
  deadline: string | null
  status: string
  members: { user_id: string; role_name: string; user_name: string }[]
  created_at: string
}


export default function WorkFeed() {
  const { user } = useAuth()
  const { socket, addNotification } = useSocket()
  const [tab, setTab] = useState<'browse' | 'accepted'>('browse')
  const [projects, setProjects] = useState<Project[]>([])
  const [acceptedProjects, setAcceptedProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [balance, setBalance] = useState(0)
  const [userSkills, setUserSkills] = useState<string[]>([])
  const [filterMatch, setFilterMatch] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const endpoints = [
        fetch(`${API}/api/projects?status=open`),
      ]
      if (user) {
        endpoints.push(fetch(`${API}/api/user/${user.id}/profile`))
        endpoints.push(fetch(`${API}/api/user/${user.id}/projects`))
      }
      
      const results = await Promise.all(endpoints)
      const [projRes, profRes, myProjsRes] = results

      if (projRes.ok) setProjects(await projRes.json())
      if (profRes?.ok) {
        const d = await profRes.json()
        setBalance(d.points || 0)
        setUserSkills((d.skills || []).map((s: { name: string }) => s.name.toLowerCase()))
      }
      if (myProjsRes?.ok) {
        const d = await myProjsRes.json()
        setAcceptedProjects(d.member || [])
      }
    } catch { /* offline */ }
    finally { setLoading(false) }
  }, [user])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!socket) return
    const onProjectPosted = ({ project }: { project: Project }) => {
      if (project.owner_id === user?.id) return
      setProjects(prev => prev.some(p => p.id === project.id) ? prev : [project, ...prev])
      addNotification(`New project posted: "${project.title}"`, 'info')
    }
    socket.on('project:posted', onProjectPosted)
    return () => { socket.off('project:posted', onProjectPosted) }
  }, [socket, user?.id, addNotification])

  const filterProjects = (list: Project[]) => {
    let filtered = list;
    
    // 1. Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(query) || 
        p.description.toLowerCase().includes(query) ||
        p.roles.some(r => r.name.toLowerCase().includes(query))
      );
    }
    
    // 2. Skill match filter
    if (tab === 'browse' && filterMatch && userSkills.length > 0) {
      filtered = filtered.filter(p => p.roles.some(r => !r.filled && r.skills.some(s => userSkills.includes(s.toLowerCase()))))
    }
    
    return filtered;
  }

  const browseProjects = filterProjects(projects);
  const acceptedProjectsFiltered = filterProjects(acceptedProjects);

  const displayedProjects = tab === 'accepted' ? acceptedProjectsFiltered : browseProjects

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-10 mt-16">

        {/* Page header */}
        <div className="flex items-start justify-between mb-8 gap-4">
          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">Project Composite</p>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-none">Work Opportunities</h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-md">
              Find the perfect role. Search by role title, project name, or skills.
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-primary/10 border border-primary/15 text-primary text-sm font-bold shrink-0">
            <Trophy className="h-4 w-4" /> {balance} <span className="font-normal text-xs text-primary/70">credits</span>
          </div>
        </div>

        {/* Enhanced Search Bar */}
        <div className="relative mb-8 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input 
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by role (e.g. Frontend Developer, UI Designer, Backend)..."
            className="w-full h-14 pl-12 pr-6 rounded-2xl border border-border bg-card text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all shadow-sm"
          />
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {[
            { label: "Open Projects", value: projects.length, icon: LayoutGrid },
            { label: "Skill Matches", value: projects.filter(p => p.roles.some(r => !r.filled && r.skills.some(s => userSkills.includes(s.toLowerCase())))).length, icon: Sparkles },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold leading-none">{value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs + filter */}
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div className="flex gap-1 p-1 bg-secondary/40 rounded-xl border border-border w-fit">
            {([
              { id: 'browse', label: 'All Projects' },
              { id: 'accepted', label: `Accepted  •  ${acceptedProjects.length}` },
            ] as const).map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "px-5 py-2 rounded-lg text-xs font-semibold transition-all",
                  tab === t.id
                    ? "bg-card shadow-sm text-foreground border border-border"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'browse' && userSkills.length > 0 && (
            <button
              onClick={() => setFilterMatch(f => !f)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all",
                filterMatch
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-muted-foreground hover:text-foreground"
              )}
            >
              <Filter className="h-3 w-3" />
              {filterMatch ? "Skill match filter on" : "Filter by my skills"}
            </button>
          )}
        </div>

        {/* Project grid */}
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : displayedProjects.length === 0 ? (
          <div className="text-center py-32 border-2 border-dashed border-border rounded-3xl">
            <Workflow className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
            <p className="text-sm font-semibold text-muted-foreground">
              {tab === 'accepted' ? "You haven't been accepted to any projects yet" :
                filterMatch ? "No projects match your skills" : "No open projects yet"}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1 mb-5">
              {tab === 'accepted' ? "Apply for roles and wait for the owner's approval!" :
                filterMatch ? "Try removing the skill filter" : "Check back soon or be the first to post!"}
            </p>
            {filterMatch && (
              <button onClick={() => setFilterMatch(false)} className="text-xs text-primary underline">Show all projects</button>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {displayedProjects.map((project, i) => (
              <ProjectCard
                key={project.id}
                project={project}
                index={i}
                currentUserId={user?.id}
                userSkills={userSkills}
                isAcceptedTab={tab === 'accepted'}
                searchQuery={searchQuery}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function ProjectCard({
  project, index, currentUserId, userSkills, isAcceptedTab, searchQuery
}: {
  project: Project; index: number; currentUserId?: string; userSkills: string[]; isAcceptedTab?: boolean; searchQuery: string
}) {
  const navigate = useNavigate()
  const openRoles = project.roles.filter(r => !r.filled)
  const filledRoles = project.roles.filter(r => r.filled)
  const matchingRoles = openRoles.filter(r => r.skills.some(s => userSkills.includes(s.toLowerCase())))
  const hasMatch = matchingRoles.length > 0 && currentUserId !== project.owner_id
  const [now] = useState(Date.now)
  const daysAgo = Math.floor((now - new Date(project.created_at).getTime()) / 86400000)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={cn(
        "rounded-2xl border bg-card flex flex-col hover:shadow-lg transition-all duration-200 cursor-pointer group overflow-hidden",
        hasMatch ? "border-primary/30 ring-1 ring-primary/10" : "border-border"
      )}
      onClick={() => navigate(isAcceptedTab ? `/tasks/project/${project.id}/room` : `/tasks/project/${project.id}`)}
    >
      {/* Card top accent */}
      {hasMatch && <div className="h-0.5 w-full bg-gradient-to-r from-primary/60 to-primary/10" />}

      <div className="p-5 flex flex-col flex-1 gap-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {hasMatch && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                  <Sparkles className="h-2.5 w-2.5" /> Matches you
                </span>
              )}
              <span className="text-[10px] text-muted-foreground">
                {daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : `${daysAgo}d ago`}
              </span>
            </div>
            <h3 className="font-bold text-base leading-snug group-hover:text-primary transition-colors line-clamp-1">
              {project.title}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
              {project.description}
            </p>
          </div>
          <div className="text-right shrink-0 pt-0.5">
            <div className="text-xl font-bold text-primary leading-none">{project.total_credits}</div>
            <div className="text-[10px] text-muted-foreground font-medium mt-0.5">credits</div>
          </div>
        </div>

        {/* Roles */}
        <div className="space-y-1.5">
          {project.roles.map(role => {
            const roleMatch = !role.filled && role.skills.some(s => userSkills.includes(s.toLowerCase()))
            return (
              <div key={role.id} className={cn(
                "flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors",
                role.filled
                  ? "bg-secondary/40 text-muted-foreground"
                  : roleMatch
                    ? "bg-primary/8 border border-primary/20"
                    : "bg-muted/50 border border-border/60"
              )}>
                <div className="flex items-center gap-2 min-w-0">
                  {role.filled
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    : roleMatch
                      ? <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                      : <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />}
                  <span className={cn("font-semibold truncate", role.filled && "line-through opacity-60")}>
                    {searchQuery.trim() ? (
                      role.name.split(new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')).map((part, i) => (
                        part.toLowerCase() === searchQuery.toLowerCase() 
                          ? <span key={i} className="text-primary bg-primary/10 rounded-sm px-0.5">{part}</span> 
                          : part
                      ))
                    ) : role.name}
                  </span>
                  <div className="flex gap-1 overflow-hidden">
                    {role.skills.slice(0, 2).map(s => (
                      <span key={s} className={cn(
                        "px-1.5 py-0.5 rounded-md text-[10px] shrink-0",
                        userSkills.includes(s.toLowerCase())
                          ? "bg-primary/15 text-primary font-semibold"
                          : "bg-secondary text-muted-foreground"
                      )}>{s}</span>
                    ))}
                  </div>
                </div>
                <span className={cn("font-bold shrink-0 ml-2", role.filled ? "text-muted-foreground" : "text-primary")}>
                  {role.credits} cr
                </span>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto pt-1 border-t border-border/50">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {filledRoles.length}/{project.roles.length}
            </span>
            <span className="flex items-center gap-1 max-w-[80px]">
              <Briefcase className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{project.owner_name}</span>
            </span>
            {project.deadline && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {new Date(project.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
          {currentUserId !== project.owner_id && openRoles.length > 0 && (
            <Button
              size="sm"
              variant={hasMatch ? "default" : "outline"}
              className="h-7 px-3 rounded-lg text-[11px] gap-1 font-semibold shrink-0"
              onClick={e => { 
                e.stopPropagation(); 
                navigate(isAcceptedTab ? `/tasks/project/${project.id}/room` : `/tasks/project/${project.id}`) 
              }}
            >
              {isAcceptedTab ? "Open Workspace" : "Apply"} <ChevronRight className="h-3 w-3" />
            </Button>
          )}
          {currentUserId === project.owner_id && (
            <span className="text-[10px] font-semibold text-muted-foreground bg-secondary px-2 py-1 rounded-lg">Your project</span>
          )}
          {currentUserId !== project.owner_id && project.members.some(m => m.user_id === currentUserId) && (
            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">Joined</span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

