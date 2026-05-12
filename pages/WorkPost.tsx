import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, Check, Loader2, Workflow } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { useAuth } from "@/contexts/auth-context"

const API = "https://backend-a41z.onrender.com"
interface Role { id: string; name: string; skills: string; credits: number }
const mkRole = (): Role => ({ id: crypto.randomUUID(), name: "", skills: "", credits: 50 })

/* ─────────────────────────────────────────────────────────────
   EXACT MATCH TO THE PROVIDED IMAGE:
   • Card: White, extremely large rounded corners (44px)
   • Inputs: 12px rounding, dark defined borders (1.5px)
   • Colors: Green labels, mint green button
   • Layout: Centered, clean, no background pop-up/modal feel but a solid card
───────────────────────────────────────────────────────────── */

const Label = ({ t }: { t: string }) => (
  <p style={{ color: "#22c55e", fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8, marginTop: 0 }}>{t}</p>
)

const InputBox = (p: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...p}
    style={{
      width: "100%", height: 52, padding: "0 16px", boxSizing: "border-box",
      border: "2px solid #1a1a1a", borderRadius: 4, background: "#fff",
      fontSize: 14, fontWeight: 500, color: "#1a1a1a",
      outline: "none", fontFamily: "inherit", transition: "all 0.2s",
      ...p.style
    }}
    onFocus={e => (e.currentTarget.style.borderColor = "#22c55e")}
    onBlur={e => (e.currentTarget.style.borderColor = "#475569")}
  />
)

const TextAreaBox = (p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...p}
    style={{
      width: "100%", minHeight: 120, padding: "14px 16px", boxSizing: "border-box",
      border: "2px solid #1a1a1a", borderRadius: 4, background: "#fff",
      fontSize: 14, fontWeight: 500, color: "#1a1a1a",
      outline: "none", resize: "none", fontFamily: "inherit", 
      transition: "all 0.2s", ...p.style
    }}
    onFocus={e => (e.currentTarget.style.borderColor = "#22c55e")}
    onBlur={e => (e.currentTarget.style.borderColor = "#475569")}
  />
)

const ActionBtn = ({ label, onClick, disabled }: { label: React.ReactNode; onClick: () => void; disabled?: boolean }) => (
  <button onClick={onClick} disabled={disabled} style={{
    width: "100%", height: 60, borderRadius: 4,
    background: disabled ? "#bbf7d0" : "#86efac",
    color: "#1a1a1a", fontWeight: 900, fontSize: 14,
    letterSpacing: "0.1em", textTransform: "uppercase",
    border: "2px solid #1a1a1a", cursor: disabled ? "not-allowed" : "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
    transition: "all 0.2s",
    boxShadow: disabled ? "none" : "0 4px 0 #1a1a1a"
  }}
    onMouseEnter={e => { if (!disabled) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 0 #1a1a1a" } }}
    onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 0 #1a1a1a" }}
  >{label}</button>
)

export default function WorkPost() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [balance, setBalance] = useState(0)
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeRole, setActiveRole] = useState(0)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [numRoles, setNumRoles] = useState(1)
  const [totalCreditsGoal, setTotalCreditsGoal] = useState(50)
  const [roles, setRoles] = useState<Role[]>([mkRole()])

  useEffect(() => {
    if (!user) return
    fetch(`${API}/api/user/${user.id}/profile`)
      .then(r => r.json()).then(d => setBalance(d.points || 0)).catch(() => {})
  }, [user])

  useEffect(() => {
    setRoles(prev => {
      const n = Math.max(1, Math.min(6, numRoles))
      if (prev.length === n) return prev
      return prev.length < n
        ? [...prev, ...Array.from({ length: n - prev.length }, mkRole)]
        : prev.slice(0, n)
    })
  }, [numRoles])

  const totalCredits = roles.reduce((s, r) => s + (Number(r.credits) || 0), 0)
  const cur = roles[activeRole]
  const upd = (f: keyof Role, v: string | number) =>
    setRoles(p => p.map((r, i) => i === activeRole ? { ...r, [f]: v } : r))

  const ok0 = title.trim().length >= 3 && description.trim().length >= 10
  const ok1 = roles.every(r => r.name.trim() && Number(r.credits) > 0)
  const okPost = totalCredits <= balance && totalCredits > 0

  const post = async () => {
    if (!user || !okPost) return
    setPosting(true); setError(null)
    try {
      const res = await fetch(`${API}/api/projects`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(), description: description.trim(),
          roles: roles.map(r => ({ id: r.id, name: r.name.trim(), skills: r.skills.split(",").map(s => s.trim()).filter(Boolean), credits: Number(r.credits) })),
          min_team_size: numRoles, total_credits: totalCredits,
          owner_id: user.id, owner_name: user.name, owner_avatar: user.profilePic || null
        })
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed") }
      navigate("/tasks/project")
    } catch (e) { setError(e instanceof Error ? e.message : "Failed") }
    finally { setPosting(false) }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <Navbar />
      <main style={{ maxWidth: 540, margin: "0 auto", padding: "80px 20px 60px" }}>

        <button onClick={() => navigate('/tasks/project')} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#94a3b8", background: "none", border: "none", cursor: "pointer", marginBottom: 24 }}>
          <ChevronLeft size={14} /> Back to Projects
        </button>

        <AnimatePresence mode="wait">
          {/* STEP 0: OVERVIEW */}
          {step === 0 && (
            <motion.div key="s0" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.22 }}
              style={{ background: "#fff", borderRadius: 44, padding: "48px 40px", boxShadow: "0 4px 32px rgba(0,0,0,0.04)" }}>

              {/* Icon */}
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
                <div style={{ height: 72, width: 72, borderRadius: 20, background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Workflow size={32} color="#22c55e" strokeWidth={1.8} />
                </div>
              </div>

              {/* Title */}
              <div style={{ textAlign: "center", marginBottom: 40 }}>
                <h1 style={{ fontSize: 38, fontWeight: 900, color: "#1a1a1a", margin: "0 0 8px", letterSpacing: "-0.01em" }}>Post a Project</h1>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", color: "#94a3b8", textTransform: "uppercase" }}>Step 1: Project Overview</p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <div>
                  <Label t="Title *" />
                  <InputBox value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Build a Portfolio Website" />
                </div>

                <div>
                  <Label t="Description *" />
                  <TextAreaBox value={description} onChange={e => setDescription(e.target.value)} placeholder="What's this project about?" />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <div>
                    <Label t="Number of Roles *" />
                    <InputBox type="number" min={1} max={6} value={numRoles}
                      onChange={e => setNumRoles(Math.max(1, Math.min(6, Number(e.target.value))))} />
                  </div>
                  <div>
                    <Label t="Total Credits *" />
                    <InputBox type="number" min={1} value={totalCreditsGoal}
                      onChange={e => setTotalCreditsGoal(Number(e.target.value))} />
                  </div>
                </div>

                <div style={{ marginTop: 8 }}>
                  <ActionBtn label={<>DEFINE ROLES →</>} onClick={() => setStep(1)} disabled={!ok0} />
                  <button onClick={() => navigate('/tasks/project')} style={{ width: "100%", marginTop: 16, fontSize: 12, fontWeight: 700, color: "#94a3b8", background: "none", border: "none", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.05em" }}>Cancel Posting</button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 1: DEFINE ROLES */}
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.22 }}
              style={{ background: "#fff", borderRadius: 44, padding: "48px 40px", boxShadow: "0 4px 32px rgba(0,0,0,0.04)" }}>

              <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
                <div style={{ height: 72, width: 72, borderRadius: 20, background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Workflow size={32} color="#22c55e" strokeWidth={1.8} />
                </div>
              </div>

              <div style={{ textAlign: "center", marginBottom: 32 }}>
                <h1 style={{ fontSize: 38, fontWeight: 900, color: "#1a1a1a", margin: "0 0 8px" }}>Define Roles</h1>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", color: "#94a3b8", textTransform: "uppercase" }}>Step 2: Role Details</p>
              </div>

              {/* Roles chain */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 32 }}>
                {roles.map((r, i) => {
                  const filled = r.name.trim() && Number(r.credits) > 0
                  const active = activeRole === i
                  return (
                    <div key={r.id} style={{ display: "flex", alignItems: "center" }}>
                      <button onClick={() => setActiveRole(i)} style={{
                        height: 48, width: 48, borderRadius: 4,
                        background: active ? "#86efac" : filled ? "#dcfce7" : "#f1f5f9",
                        border: "2px solid #1a1a1a",
                        color: active ? "#1a1a1a" : filled ? "#16a34a" : "#94a3b8",
                        fontWeight: 900, fontSize: 16, cursor: "pointer",
                        transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center"
                      }}>
                        {filled && !active ? <Check size={18} /> : i + 1}
                      </button>
                      {i < roles.length - 1 && (
                        <div style={{ width: 32, height: 2, background: i < activeRole ? "#86efac" : "#e2e8f0", margin: "0 4px" }} />
                      )}
                    </div>
                  )
                })}
              </div>

              <AnimatePresence mode="wait">
                <motion.div key={activeRole} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 28 }}>
                    <div>
                      <Label t="Role Name *" />
                      <InputBox value={cur?.name || ""} onChange={e => upd('name', e.target.value)} placeholder="e.g. Frontend Developer" />
                    </div>
                    <div>
                      <Label t="Contributor Earns (credits) *" />
                      <InputBox type="number" min={1} value={cur?.credits || 50} onChange={e => upd('credits', Number(e.target.value))} />
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              <div style={{ display: "flex", gap: 12 }}>
                {activeRole > 0 && (
                  <button onClick={() => setActiveRole(activeRole - 1)} style={{
                    flex: 1, height: 60, borderRadius: 4, border: "2px solid #1a1a1a",
                    background: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer", color: "#1a1a1a"
                  }}>← PREV</button>
                )}
                {activeRole < roles.length - 1
                  ? <ActionBtn label="NEXT ROLE →" onClick={() => setActiveRole(activeRole + 1)} />
                  : <ActionBtn label="REVIEW & POST →" onClick={() => setStep(2)} disabled={!ok1} />
                }
              </div>
            </motion.div>
          )}

          {/* STEP 2: REVIEW */}
          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.22 }}
              style={{ background: "#fff", borderRadius: 44, padding: "48px 40px", boxShadow: "0 4px 32px rgba(0,0,0,0.04)" }}>

              <div style={{ textAlign: "center", marginBottom: 32 }}>
                <h1 style={{ fontSize: 32, fontWeight: 900, color: "#1a1a1a", margin: "0 0 8px" }}>Confirm Post</h1>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", color: "#94a3b8", textTransform: "uppercase" }}>Step 3: Summary</p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 32 }}>
                <div style={{ padding: "20px", borderRadius: 16, border: "1.5px solid #e2e8f0", background: "#f8fafc" }}>
                  <Label t="Project" />
                  <p style={{ fontWeight: 800, fontSize: 16, margin: "0 0 4px" }}>{title}</p>
                  <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>{description}</p>
                </div>

                <div style={{ padding: "20px", borderRadius: 16, border: "1.5px solid #e2e8f0", background: "#f8fafc" }}>
                  <Label t="Total Escrow" />
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 24, fontWeight: 900, color: "#16a34a" }}>{totalCredits} credits</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8" }}>{roles.length} Roles</span>
                  </div>
                </div>

                {error && <div style={{ color: "#ef4444", fontSize: 13, fontWeight: 600, textAlign: "center" }}>{error}</div>}
              </div>

              <ActionBtn
                label={posting ? <Loader2 className="animate-spin" /> : <>POST PROJECT & ESCROW {totalCredits} CR</>}
                onClick={post} disabled={!okPost || posting}
              />
              <button onClick={() => setStep(1)} style={{ width: "100%", marginTop: 16, fontSize: 12, fontWeight: 700, color: "#94a3b8", background: "none", border: "none", cursor: "pointer" }}>← BACK TO ROLES</button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
