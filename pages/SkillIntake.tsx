import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, CheckCircle2, Check, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"

interface SkillIntakeProps {
  onComplete: (wanting: string, geminiData: { top_matches: unknown[], also_try: unknown[] }) => void
}

// ── Comprehensive skill library ────────────────────────────────────────────────
const SKILL_LIBRARY = [
  // Programming Languages
  "JavaScript", "TypeScript", "Python", "Java", "C", "C++", "C#", "Go", "Rust", "Ruby", "Swift",
  "Kotlin", "Dart", "PHP", "Scala", "Haskell", "Elixir", "R", "MATLAB", "Perl", "Lua", "Bash",
  // Web Frontend
  "React", "Next.js", "Vue.js", "Nuxt.js", "Angular", "Svelte", "SvelteKit", "HTML5", "CSS3",
  "Tailwind CSS", "Bootstrap", "SASS/SCSS", "Webpack", "Vite", "Redux", "Zustand", "Framer Motion",
  // Web Backend
  "Node.js", "Express.js", "NestJS", "Django", "Flask", "FastAPI", "Ruby on Rails", "Laravel",
  "Spring Boot", "ASP.NET", "GraphQL", "REST APIs", "WebSockets", "gRPC",
  // Mobile
  "React Native", "Flutter", "iOS Development", "Android Development", "SwiftUI", "Jetpack Compose",
  // Databases
  "SQL", "PostgreSQL", "MySQL", "SQLite", "MongoDB", "Redis", "Firebase", "Supabase",
  "DynamoDB", "Cassandra", "Elasticsearch",
  // DevOps & Cloud
  "Docker", "Kubernetes", "AWS", "Google Cloud", "Azure", "Terraform", "Ansible", "Helm",
  "CI/CD", "GitHub Actions", "Jenkins", "Linux", "Nginx",
  // AI / ML / Data
  "Machine Learning", "Deep Learning", "Data Science", "Computer Vision", "NLP",
  "TensorFlow", "PyTorch", "Keras", "Scikit-learn", "Pandas", "NumPy",
  "Data Engineering", "Apache Spark", "Kafka", "Power BI", "Tableau", "Excel",
  // Cyber & Blockchain
  "Cybersecurity", "Ethical Hacking", "Penetration Testing", "Network Security",
  "Blockchain", "Solidity", "Web3.js", "Smart Contracts",
  // Design
  "Figma", "Adobe XD", "Sketch", "UI Design", "UX Design", "Graphic Design",
  "Photoshop", "Illustrator", "After Effects", "Premiere Pro", "Canva",
  "Motion Design", "Brand Design", "Typography", "Prototyping", "Wireframing",
  // Creative / Media
  "Video Editing", "DaVinci Resolve", "CapCut", "Final Cut Pro", "Photography",
  "Videography", "Podcast Production", "3D Modelling", "Blender", "Cinema 4D",
  "Unity 3D", "Unreal Engine", "Game Design", "Webflow", "Framer",
  // Marketing & Business
  "Digital Marketing", "SEO", "SEM", "Google Ads", "Meta Ads", "Content Writing",
  "Copywriting", "Email Marketing", "Social Media Marketing", "Brand Strategy",
  "Product Management", "Project Management", "Agile", "Scrum", "Business Analysis",
  "Financial Modeling", "Accounting", "Market Research", "Growth Hacking",
  // Soft / Languages / Other
  "Public Speaking", "Technical Writing", "Teaching", "Mentoring", "Leadership",
  "Communication", "Negotiation", "Career Coaching", "Interview Prep",
  "English", "Spanish", "French", "German", "Japanese", "Mandarin", "Hindi",
  "Music Production", "Guitar", "Piano", "Singing", "Drawing", "Illustration",
  "Yoga", "Fitness Training", "Cooking", "Chess",
]

function getSkillSuggestions(query: string, prioritySkills: string[] = []): string[] {
  if (!query.trim()) return []
  const q = query.toLowerCase().trim()
  const seen = new Set<string>()
  const result: string[] = []

  for (const s of prioritySkills) {
    if (s.toLowerCase().includes(q) && !seen.has(s.toLowerCase())) {
      result.push(s); seen.add(s.toLowerCase())
    }
  }
  for (const s of SKILL_LIBRARY) {
    if (s.toLowerCase().includes(q) && !seen.has(s.toLowerCase())) {
      result.push(s); seen.add(s.toLowerCase())
    }
  }
  return result.slice(0, 25)
}

export default function SkillIntake({ onComplete }: SkillIntakeProps) {
  const { user } = useAuth()

  const [wanting, setWanting]                       = useState("")
  const [wantingConfirmed, setWantingConfirmed]     = useState(false)
  const [wantingSuggestions, setWantingSuggestions] = useState<string[]>([])

  const [offering, setOffering]                       = useState("")
  const [offeringConfirmed, setOfferingConfirmed]     = useState(false)
  const [offeringSuggestions, setOfferingSuggestions] = useState<string[]>([])

  const [profileSkills, setProfileSkills] = useState<string[]>([])
  const [submitting, setSubmitting]       = useState(false)
  const [showSuccess, setShowSuccess]     = useState(false)

  // Load profile skills silently — used as priority hints only, never blocks the form
  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('user_skills')
      .select('skill_name')
      .eq('user_id', user.id)
      .eq('skill_type', 'offering')
      .then(({ data }) => {
        if (data) setProfileSkills(data.map(s => s.skill_name))
      })
  }, [user?.id])

  // Wanting suggestions
  useEffect(() => {
    if (wantingConfirmed) { setWantingSuggestions([]); return }
    setWantingSuggestions(getSkillSuggestions(wanting))
  }, [wanting, wantingConfirmed])

  // Offering suggestions — profile skills come first as hints
  useEffect(() => {
    if (offeringConfirmed) { setOfferingSuggestions([]); return }
    setOfferingSuggestions(getSkillSuggestions(offering, profileSkills))
  }, [offering, offeringConfirmed, profileSkills])

  const canSubmit = wanting.trim().length >= 2 && offering.trim().length >= 2

  const handlePostTask = useCallback(async () => {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    try {
      const wantingVal  = wanting.trim()
      const offeringVal = offering.trim()

      // Use upsert so re-posting the same skill pair doesn't throw a 409 conflict
      const { error: taskErr } = await supabase.from('tasks').upsert(
        {
          user_id:     user?.id,
          title:       `Learning ${wantingVal}`,
          description: `Looking for help with ${wantingVal}. I can offer ${offeringVal} in exchange.`,
          offering:    offeringVal,
          wanting:     wantingVal,
          status:      'open',
          type:        'direct',
        },
        { onConflict: 'user_id,title', ignoreDuplicates: false }
      )
      if (taskErr) console.warn('[SkillIntake] Supabase task upsert warning:', taskErr.message)

      // Mirror to local Express DB (non-blocking — don't throw on failure)
      fetch("https://backend-a41z.onrender.com/api/tasks", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          title:       `Learning ${wantingVal}`,
          description: `Looking for help with ${wantingVal}. I can offer ${offeringVal} in exchange.`,
          offering:    [offeringVal],
          wanting:     [wantingVal],
          posted_by:   user?.id,
          userName:    user?.name,
          userAvatar:  user?.profilePic || null,
        }),
      }).catch(() => {})

      // Save offering skill as a profile hint — ignore if unique constraint already exists
      try {
        await supabase.from('user_skills').upsert(
          { user_id: user?.id, skill_name: offeringVal, skill_type: 'offering' },
          { onConflict: 'user_id,skill_name,skill_type' }
        )
      } catch { /* non-critical — silently skip */ }

      setShowSuccess(true)
      setTimeout(() => onComplete(wantingVal, { top_matches: [], also_try: [] }), 2000)
    } catch (err) {
      console.error(err)
      alert("Could not post task. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }, [wanting, offering, canSubmit, submitting, user, onComplete])


  // ── Reusable skill field ──────────────────────────────────────────────────
  function SkillField({
    label, value, confirmed, suggestions,
    placeholder, onChange, onConfirm, onClear,
  }: {
    label: string
    value: string
    confirmed: boolean
    suggestions: string[]
    placeholder: string
    onChange: (v: string) => void
    onConfirm: (v: string) => void
    onClear: () => void
  }) {
    return (
      <div className="space-y-3 relative">
        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
          {label}
        </label>

        {confirmed ? (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="h-16 rounded-[24px] border border-primary/30 bg-primary/5 px-6 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
              <span className="font-black text-primary text-sm">{value}</span>
            </div>
            <button
              onClick={onClear}
              className="h-8 w-8 rounded-full hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ) : (
          <div className="relative">
            <Input
              autoComplete="off"
              value={value}
              onChange={e => onChange(e.target.value)}
              placeholder={placeholder}
              className="h-16 rounded-[24px] border-border bg-secondary/20 pl-6 pr-12 text-sm font-bold shadow-inner focus:border-primary/40"
            />

            <AnimatePresence>
              {value.trim().length >= 1 && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute z-[200] top-full left-0 right-0 mt-2 bg-card border border-border rounded-[28px] shadow-[0_20px_60px_rgba(0,0,0,0.18)] overflow-hidden py-2"
                >
                  <div className="max-h-[280px] overflow-y-auto">
                    {/* Custom entry if typed text doesn't match any suggestion exactly */}
                    {!suggestions.some(s => s.toLowerCase() === value.toLowerCase().trim()) && (
                      <button
                        onClick={() => onConfirm(value.trim())}
                        className="w-full px-6 py-4 text-left text-sm font-black text-primary bg-primary/5 hover:bg-primary/10 border-b border-border/50 transition-colors flex items-center gap-3"
                      >
                        <Plus className="h-4 w-4 shrink-0" />
                        <span>Use &ldquo;{value.trim()}&rdquo;</span>
                      </button>
                    )}

                    {suggestions.length > 0 ? (
                      suggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => onConfirm(s)}
                          className={cn(
                            "w-full px-6 py-3.5 text-left text-sm font-semibold hover:bg-secondary transition-colors flex items-center justify-between group",
                            profileSkills.includes(s) && "text-primary font-bold"
                          )}
                        >
                          <span className="flex items-center gap-2">
                            {profileSkills.includes(s) && (
                              <span className="text-[8px] uppercase tracking-widest font-black bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                                Yours
                              </span>
                            )}
                            {s}
                          </span>
                          <Check className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-all" />
                        </button>
                      ))
                    ) : (
                      <p className="px-6 py-4 text-xs text-muted-foreground font-medium">
                        No matches — click &quot;Use…&quot; above to add it.
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        )}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[150] bg-background/80 backdrop-blur-sm flex items-center justify-center p-6 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-xl bg-card border border-border rounded-[48px] shadow-2xl p-10 md:p-14 relative"
      >
        <AnimatePresence mode="wait">
          {showSuccess ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-16 text-center"
            >
              <div className="h-24 w-24 rounded-[32px] bg-green-500/10 flex items-center justify-center mx-auto mb-8">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              </div>
              <h2 className="text-3xl font-black mb-3">Task Posted!</h2>
              <p className="text-muted-foreground font-medium max-w-xs mx-auto">
                Your request is live. Finding matches now…
              </p>
            </motion.div>
          ) : (
            <motion.div key="form" exit={{ opacity: 0, y: -20 }} className="space-y-8">
              {/* Header */}
              <div className="text-center">
                <div className="h-14 w-14 rounded-[20px] bg-primary/10 flex items-center justify-center mx-auto mb-5">
                  <Search className="h-7 w-7 text-primary" />
                </div>
                <h2 className="text-3xl font-black tracking-tight mb-2">Post a New Task</h2>
                <p className="text-muted-foreground font-medium">
                  Type any skill — we have 100+ suggestions ready.
                </p>
              </div>

              {/* Want */}
              <SkillField
                label="What do you want to learn?"
                value={wanting}
                confirmed={wantingConfirmed}
                suggestions={wantingSuggestions}
                placeholder="e.g. React, Video Editing, Python…"
                onChange={v => { setWanting(v); setWantingConfirmed(false) }}
                onConfirm={v => { setWanting(v); setWantingConfirmed(true) }}
                onClear={() => { setWanting(""); setWantingConfirmed(false) }}
              />

              {/* Offer */}
              <SkillField
                label="What will you offer in return?"
                value={offering}
                confirmed={offeringConfirmed}
                suggestions={offeringSuggestions}
                placeholder="e.g. UI Design, Django, Photography…"
                onChange={v => { setOffering(v); setOfferingConfirmed(false) }}
                onConfirm={v => { setOffering(v); setOfferingConfirmed(true) }}
                onClear={() => { setOffering(""); setOfferingConfirmed(false) }}
              />

              {/* Submit */}
              <Button
                onClick={handlePostTask}
                disabled={!canSubmit || submitting}
                className="w-full h-16 rounded-[28px] bg-foreground text-background font-black text-base shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30"
              >
                {submitting ? "Posting…" : "Confirm & Post Task →"}
              </Button>

              <button
                onClick={() => onComplete("", { top_matches: [], also_try: [] })}
                className="w-full text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
