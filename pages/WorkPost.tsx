import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  ChevronLeft, ChevronRight, Plus, Trash2, Trophy, AlertCircle,
  Check, Loader2, Briefcase, Users, Workflow
} from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"

const API = "http://localhost:5000"

interface Role {
  id: string
  name: string
  skills: string
  credits: number
}

const STEP_LABELS = ["Project Details", "Define Roles", "Review & Post"]

export default function WorkPost() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [balance, setBalance] = useState(0)
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [deadline, setDeadline] = useState("")
  const [minTeam, setMinTeam] = useState(3)
  const [roles, setRoles] = useState<Role[]>([
    { id: crypto.randomUUID(), name: "", skills: "", credits: 50 }
  ])

  useEffect(() => {
    if (!user) return
    fetch(`${API}/api/user/${user.id}/profile`)
      .then(r => r.json())
      .then(d => setBalance(d.points || 0))
      .catch(() => { })
  }, [user])

  const totalCredits = roles.reduce((s, r) => s + (Number(r.credits) || 0), 0)

  const addRole = () => {
    if (roles.length >= 6) return
    setRoles(prev => [...prev, { id: crypto.randomUUID(), name: "", skills: "", credits: 50 }])
  }

  const removeRole = (id: string) => {
    if (roles.length <= 1) return
    setRoles(prev => prev.filter(r => r.id !== id))
  }

  const updateRole = (id: string, field: keyof Role, value: string | number) => {
    setRoles(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  const canStep1 = title.trim().length >= 3 && description.trim().length >= 10
  const canStep2 = roles.every(r => r.name.trim() && Number(r.credits) > 0) && roles.length >= 1
  const canPost = totalCredits <= balance && totalCredits > 0

  const handlePost = async () => {
    if (!user || !canPost) return
    setPosting(true)
    setError(null)
    try {
      const res = await fetch(`${API}/api/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          roles: roles.map(r => ({
            id: r.id,
            name: r.name.trim(),
            skills: r.skills.split(",").map(s => s.trim()).filter(Boolean),
            credits: Number(r.credits)
          })),
          min_team_size: minTeam,
          total_credits: totalCredits,
          deadline: deadline || null,
          owner_id: user.id,
          owner_name: user.name,
          owner_avatar: user.profilePic || null
        })
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed to post") }
      navigate("/tasks/project")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to post project")
    } finally { setPosting(false) }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-10 mt-16">

        {/* Header */}
        <div className="mb-8">
          <button onClick={() => navigate('/tasks/project')} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ChevronLeft className="h-3.5 w-3.5" /> Back to Projects
          </button>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <Workflow className="h-6 w-6 text-primary" /> Post a Project
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Build a team, get work done</p>
        </div>

        {/* Step progress */}
        <div className="flex items-center gap-2 mb-8">
          {STEP_LABELS.map((label, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={cn(
                "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all shrink-0",
                i < step ? "bg-primary border-primary text-primary-foreground"
                  : i === step ? "border-primary text-primary"
                    : "border-muted text-muted-foreground"
              )}>
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={cn("text-xs font-semibold hidden sm:block", i === step ? "text-foreground" : "text-muted-foreground")}>{label}</span>
              {i < STEP_LABELS.length - 1 && <div className={cn("flex-1 h-px", i < step ? "bg-primary" : "bg-border")} />}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm">
          <AnimatePresence mode="wait">

            {/* Step 0: Project Details */}
            {step === 0 && (
              <motion.div key="s0" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-5">
                <div>
                  <h2 className="text-lg font-bold mb-1">Project Details</h2>
                  <p className="text-xs text-muted-foreground">Describe what you want to build</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Project Title *</label>
                    <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Build a Portfolio Website"
                      className="h-11 rounded-xl" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Description *</label>
                    <textarea
                      value={description} onChange={e => setDescription(e.target.value)}
                      placeholder="Describe the project scope, goals, and what contributors will be working on..."
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary min-h-[120px]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Deadline (optional)</label>
                      <Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
                        min={new Date().toISOString().split('T')[0]} className="h-11 rounded-xl" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Min Team Size</label>
                      <Input type="number" min={1} max={6} value={minTeam} onChange={e => setMinTeam(Number(e.target.value))}
                        className="h-11 rounded-xl" />
                    </div>
                  </div>
                </div>
                <Button onClick={() => setStep(1)} disabled={!canStep1} className="w-full h-11 rounded-xl font-semibold gap-2">
                  Continue <ChevronRight className="h-4 w-4" />
                </Button>
              </motion.div>
            )}

            {/* Step 1: Define Roles */}
            {step === 1 && (
              <motion.div key="s1" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-5">
                <div>
                  <h2 className="text-lg font-bold mb-1">Define Roles</h2>
                  <p className="text-xs text-muted-foreground">Specify what contributors you need and what each role pays</p>
                </div>

                <div className="space-y-3">
                  {roles.map((role, i) => (
                    <div key={role.id} className="p-4 rounded-xl border border-border bg-secondary/20 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Role {i + 1}</span>
                        {roles.length > 1 && (
                          <button onClick={() => removeRole(role.id)} className="h-7 w-7 rounded-lg hover:bg-destructive/10 hover:text-destructive flex items-center justify-center transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Role Name *</label>
                          <Input value={role.name} onChange={e => updateRole(role.id, 'name', e.target.value)}
                            placeholder="e.g. Frontend Dev" className="h-9 rounded-lg text-sm" />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Contributor Earns (cr) *</label>
                          <Input type="number" min={1} value={role.credits} onChange={e => updateRole(role.id, 'credits', Number(e.target.value))}
                            className="h-9 rounded-lg text-sm" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Skills (comma-separated)</label>
                        <Input value={role.skills} onChange={e => updateRole(role.id, 'skills', e.target.value)}
                          placeholder="e.g. React, TypeScript, Tailwind" className="h-9 rounded-lg text-sm" />
                      </div>
                    </div>
                  ))}
                </div>

                {roles.length < 6 && (
                  <button onClick={addRole} className="w-full py-2.5 rounded-xl border border-dashed border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors flex items-center justify-center gap-2">
                    <Plus className="h-3.5 w-3.5" /> Add Another Role
                  </button>
                )}

                <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-primary/5 border border-primary/15">
                  <span className="text-sm font-semibold">Total Credits to Escrow</span>
                  <span className="text-lg font-bold text-primary">{totalCredits} cr</span>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(0)} className="flex-1 h-11 rounded-xl gap-2">
                    <ChevronLeft className="h-4 w-4" /> Back
                  </Button>
                  <Button onClick={() => setStep(2)} disabled={!canStep2} className="flex-[2] h-11 rounded-xl font-semibold gap-2">
                    Review <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Review & Post */}
            {step === 2 && (
              <motion.div key="s2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-5">
                <div>
                  <h2 className="text-lg font-bold mb-1">Review & Post</h2>
                  <p className="text-xs text-muted-foreground">Your credits are held in escrow â€” released to each contributor when the project completes</p>
                </div>

                <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
                  <div className="px-4 py-3 bg-secondary/20">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-0.5">Project</p>
                    <p className="font-semibold">{title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{description}</p>
                  </div>
                  <div className="px-4 py-3 bg-secondary/20">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Roles</p>
                    <div className="space-y-1">
                      {roles.map(r => (
                        <div key={r.id} className="flex items-center justify-between text-sm">
                          <div>
                            <span className="font-semibold">{r.name}</span>
                            {r.skills && <span className="text-muted-foreground ml-2 text-xs">{r.skills}</span>}
                          </div>
                          <span className="font-bold text-primary">{r.credits} cr</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Min {minTeam} members</span>
                      {deadline && <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" /> Due {new Date(deadline).toLocaleDateString()}</span>}
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-bold text-primary">{totalCredits}</span>
                      <span className="text-xs text-muted-foreground ml-1">cr total</span>
                    </div>
                  </div>
                </div>

                {/* Balance check */}
                <div className={cn(
                  "flex items-center justify-between px-4 py-3 rounded-xl border text-sm",
                  canPost ? "bg-emerald-500/5 border-emerald-500/20" : "bg-destructive/5 border-destructive/20"
                )}>
                  <div className="flex items-center gap-2">
                    {canPost ? <Check className="h-4 w-4 text-emerald-500" /> : <AlertCircle className="h-4 w-4 text-destructive" />}
                    <span className="font-medium">{canPost ? "Sufficient balance" : "Insufficient balance"}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold flex items-center gap-1 justify-end"><Trophy className="h-3.5 w-3.5 text-primary" /> {balance} available</p>
                    {!canPost && <p className="text-xs text-destructive">Need {totalCredits - balance} more credits</p>}
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" /> {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-11 rounded-xl gap-2">
                    <ChevronLeft className="h-4 w-4" /> Back
                  </Button>
                  <Button onClick={handlePost} disabled={!canPost || posting} className="flex-[2] h-11 rounded-xl font-semibold gap-2">
                    {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Workflow className="h-4 w-4" />}
                    {posting ? "Postingâ€¦" : `Post & Escrow ${totalCredits} Credits`}
                  </Button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
