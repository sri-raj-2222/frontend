import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { motion } from "framer-motion"
import { 
  Star, Edit3, MapPin, Award, Trophy, Briefcase, Zap, Search, Plus, Trash2, X, Sparkles, Flag
} from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/auth-context"
import { useNavigate, useSearchParams } from "react-router-dom"
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import type { Review, AiAnalysis } from "@/types"

interface ProfileData {
  id: string
  name: string
  email: string
  avatar_url: string | null
  bio: string | null
  location: string | null
  title: string | null
  offering: string | null
  wanting: string | null
  rating: number
  points: number
  completed_count: number
  created_at: string
}

interface UserSkill {
  id: string
  skill_name: string
  skill_type: 'offering' | 'wanting'
}

export default function Profile() {
  const { user: authUser } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const viewUserId = searchParams.get("id") || authUser?.id

  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [offeringSkills, setOfferingSkills] = useState<UserSkill[]>([])
  const [wantingSkills, setWantingSkills] = useState<UserSkill[]>([])
  const [loading, setLoading] = useState(true)

  // Skill Add State
  const [showAddSkill, setShowAddSkill] = useState(false)
  const [newSkill, setNewSkill] = useState("")
  const [addingSkill, setAddingSkill] = useState(false)
  const [skillType, setSkillType] = useState<'offering' | 'wanting'>('offering')

  const isOwnProfile = !searchParams.get("id") || searchParams.get("id") === authUser?.id

  const [aiAnalysis, setAiAnalysis] = useState<AiAnalysis | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [flagInfo, setFlagInfo] = useState<{ level: number; color: string; label: string } | null>(null)

  const loadProfile = useCallback(async (silent = false) => {
    if (!viewUserId) return
    if (!silent) setLoading(true)
    try {
      // ── 1. Supabase: profiles table (authoritative name/bio/avatar) ───────
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('id, name, email, role, profile_pic, updated_at')
        .eq('id', viewUserId)
        .single()

      if (profileRow) {
        setProfile({
          id:              profileRow.id,
          name:            profileRow.name       || authUser?.name  || 'User',
          email:           profileRow.email      || authUser?.email || '',
          avatar_url:      profileRow.profile_pic || null,
          bio:             '',
          location:        'Global',
          title:           'Elite Member',
          offering:        '',
          wanting:         '',
          rating:          0,
          points:          0,
          completed_count: 0,
          created_at:      profileRow.updated_at  || new Date().toISOString(),
        })
      } else {
        // Fallback: use auth session data
        setProfile({
          id:              viewUserId,
          name:            authUser?.name       || 'User',
          email:           authUser?.email      || '',
          avatar_url:      authUser?.profilePic || null,
          bio:             '',
          location:        'Global',
          title:           'Elite Member',
          offering:        '',
          wanting:         '',
          rating:          0,
          points:          0,
          completed_count: 0,
          created_at:      new Date().toISOString(),
        })
      }

      // ── 2. Local API: AI analysis & points ───────────────────────────────
      try {
        const aiRes = await fetch(`https://backend-a41z.onrender.com/api/user/${viewUserId}/profile`)
        const aiData = await aiRes.json()
        if (aiData?.analysis) setAiAnalysis(aiData.analysis)
        if (aiData?.points !== undefined) {
          setProfile(prev => prev ? { ...prev, points: aiData.points } : null)
        }
      } catch { /* server may be offline */ }

      // ── 3. Local API: Reviews ────────────────────────────────────────────
      try {
        const statusRes = await fetch(`https://backend-a41z.onrender.com/api/user/${viewUserId}/reviews`)
        const reviewsData = await statusRes.json()
        if (Array.isArray(reviewsData)) setReviews(reviewsData)
      } catch { /* server may be offline */ }

      // ── 4. Skills: local API first, fallback to Supabase ─────────────────
      let skillsFetched = false
      try {
        const skillRes = await fetch(`https://backend-a41z.onrender.com/api/user/${viewUserId}/skills`)
        const skillData = await skillRes.json()
        if (Array.isArray(skillData) && skillData.length > 0) {
          setOfferingSkills(skillData.filter((s: UserSkill) => s.skill_type === 'offering'))
          setWantingSkills(skillData.filter((s: UserSkill) => s.skill_type === 'wanting'))
          skillsFetched = true
        }
      } catch { /* try supabase below */ }

      if (!skillsFetched) {
        const { data: supSkills } = await supabase
          .from('user_skills')
          .select('id, skill_name, skill_type')
          .eq('user_id', viewUserId)
        if (supSkills) {
          setOfferingSkills(supSkills.filter(s => s.skill_type === 'offering') as UserSkill[])
          setWantingSkills(supSkills.filter(s => s.skill_type === 'wanting') as UserSkill[])
        }
      }

    } catch (err) {
      console.error('Profile Error:', err)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [viewUserId, authUser])

  useEffect(() => {
    if (viewUserId) {
      loadProfile()
      // Fetch flag status for this user
      fetch(`https://backend-a41z.onrender.com/api/users/${viewUserId}/flag-status`)
        .then(r => r.json())
        .then(d => { if (d.level > 0) setFlagInfo(d) })
        .catch(() => {})
    }
  }, [viewUserId, loadProfile])

  const handleAddSkill = async () => {
    if (!newSkill.trim() || !authUser?.id) {
      console.warn("Skill add blocked: No skill name or no user ID", { newSkill, authUser });
      return
    }
    setAddingSkill(true)
    try {
      const url = `https://backend-a41z.onrender.com/api/user/${authUser.id}/skills`;
      console.log("Adding skill to:", url);
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skill_name: newSkill.trim(),
          skill_type: skillType
        })
      })
      if (!res.ok) throw new Error("Failed to add skill")
      setNewSkill("")
      setShowAddSkill(false)
      loadProfile(true)
    } catch (err) {
      console.error(err)
    } finally {
      setAddingSkill(false)
    }
  }

  const handleDeleteSkill = async (id: string) => {
    try {
      const res = await fetch(`https://backend-a41z.onrender.com/api/skills/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete skill")
      loadProfile(true)
    } catch (err) { console.error(err) }
  }

  if (loading) return <div className="h-screen flex items-center justify-center font-bold text-2xl animate-pulse">Accessing the Sphere...</div>
  if (!profile) return <div className="h-screen flex items-center justify-center font-bold text-2xl">User not found.</div>

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 py-10 mt-16 space-y-8">
        {/* HERO SECTION */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[32px] border border-border bg-card p-8 md:p-10 shadow-xl"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Zap className="h-32 w-32 text-primary" />
          </div>

          <div className="relative flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
            <div className="relative shrink-0">
              <div className="h-32 w-32 rounded-3xl overflow-hidden border-4 border-background bg-secondary shadow-lg flex items-center justify-center group">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} className="h-full w-full object-cover transition-transform group-hover:scale-110" alt={profile.name} />
                ) : (
                  <span className="text-5xl font-black text-primary">{profile.name[0]}</span>
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground h-10 w-10 rounded-xl flex items-center justify-center shadow-lg border-2 border-background">
                <Star className="h-4 w-4 fill-primary-foreground" />
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <div className="flex flex-wrap items-center justify-center md:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-4xl font-bold tracking-tight">{profile.name}</h1>
                    {flagInfo && flagInfo.level > 0 && (
                      <span title={flagInfo.label} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border ${
                        flagInfo.color === 'red'    ? 'bg-destructive/10 border-destructive/20 text-destructive' :
                        flagInfo.color === 'orange' ? 'bg-orange-500/10 border-orange-500/20 text-orange-500' :
                                                     'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'}`}>
                        <Flag className="h-3 w-3" />{flagInfo.label}
                      </span>
                    )}
                  </div>
                  <p className="text-lg font-bold text-muted-foreground flex items-center justify-center md:justify-start gap-2">
                    <Briefcase className="h-4 w-4" /> {profile.title || "Elite Barter Member"}
                  </p>
                </div>
                {isOwnProfile && (
                  <Button onClick={() => navigate('/onboarding')} className="h-11 px-6 rounded-xl bg-primary text-primary-foreground font-bold uppercase text-[10px] tracking-widest gap-2 shadow-lg hover:scale-105 transition-all">
                    <Edit3 className="h-3 w-3" /> Edit Profile
                  </Button>
                )}
              </div>

              <p className="text-base font-medium text-muted-foreground leading-relaxed max-w-2xl">
                {profile.bio || "Passionate about skill sharing and community growth. Let's exchange value!"}
              </p>

              <div className="flex flex-wrap justify-center md:justify-start gap-5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                <span className="flex items-center gap-2"><MapPin className="h-3 w-3" /> {profile.location || "Global"}</span>
                <span className="flex items-center gap-2"><Award className="h-3 w-3" /> Joined {new Date(profile.created_at || new Date()).toLocaleDateString()}</span>
                <span className="flex items-center gap-2 text-primary font-bold"><Trophy className="h-3 w-3" /> {profile.points || 0} Credits</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* SKILLS GRID */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Offering */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-8 rounded-[32px] border border-border bg-card shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                <Zap className="h-6 w-6 text-primary fill-primary" /> I'm Offering
              </h2>
              {isOwnProfile && (
                <Dialog open={showAddSkill} onOpenChange={setShowAddSkill}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      onClick={() => { setSkillType('offering'); setShowAddSkill(true); }}
                      className="h-10 w-10 p-0 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-all"
                    >
                      <Plus className="h-5 w-5" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="rounded-[32px] p-8 max-w-sm">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-black mb-4">Add a Skill to {skillType === 'offering' ? 'Offering' : 'Looking For'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Skill Name</label>
                        <Input 
                          value={newSkill}
                          onChange={(e) => setNewSkill(e.target.value)}
                          placeholder="e.g. Graphic Design, Java..."
                          className="h-14 rounded-2xl border-border bg-secondary/20 font-bold"
                          autoFocus
                          onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
                        />
                      </div>
                      <div className="flex gap-3">
                        <Button onClick={handleAddSkill} disabled={addingSkill || !newSkill.trim()} className="flex-1 h-14 rounded-2xl bg-primary text-primary-foreground font-black uppercase text-xs">
                          {addingSkill ? "Adding..." : "Add Skill"}
                        </Button>
                        <Button variant="ghost" onClick={() => setShowAddSkill(false)} className="h-14 w-14 rounded-2xl bg-secondary flex items-center justify-center">
                          <X className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            
            <div className="flex flex-wrap gap-3">
              {/* Manually added skills */}
              {offeringSkills.map(s => (
                <div key={s.id} className="group relative">
                  <span className="px-6 py-3 rounded-2xl bg-primary/10 text-primary text-xs font-black uppercase tracking-widest border border-primary/20 flex items-center gap-2 shadow-sm hover:shadow-md transition-all">
                    {s.skill_name}
                    {isOwnProfile && (
                      <button onClick={() => handleDeleteSkill(s.id)} className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                </div>
              ))}
              
              {/* Skills from tasks (if any and not already in manual list) */}
              {profile.offering && profile.offering.split(', ').map((skill, i) => {
                const isManual = offeringSkills.some(s => s.skill_name.toLowerCase() === skill.toLowerCase());
                if (isManual) return null;
                return (
                  <span key={`task-${i}`} className="px-6 py-3 rounded-2xl bg-secondary/30 text-muted-foreground text-xs font-black uppercase tracking-widest border border-border/50 italic opacity-80">
                    {skill}
                  </span>
                );
              })}

              {!profile.offering && offeringSkills.length === 0 && (
                <span className="px-6 py-3 rounded-2xl bg-secondary/20 text-muted-foreground/40 text-[10px] font-black uppercase tracking-widest italic">
                  No skills listed yet
                </span>
              )}
            </div>
          </motion.div>

          {/* Wanting */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-8 rounded-[32px] border border-border bg-card shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                <Search className="h-6 w-6 text-amber-500" /> I'm Looking For
              </h2>
              {isOwnProfile && (
                <Button 
                  variant="ghost" 
                  onClick={() => { setSkillType('wanting'); setShowAddSkill(true); }}
                  className="h-10 w-10 p-0 rounded-xl bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 transition-all"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              {/* Manually added skills */}
              {wantingSkills.map(s => (
                <div key={s.id} className="group relative">
                  <span className="px-6 py-3 rounded-2xl bg-amber-500/10 text-amber-600 text-xs font-black uppercase tracking-widest border border-amber-500/20 flex items-center gap-2 shadow-sm hover:shadow-md transition-all">
                    {s.skill_name}
                    {isOwnProfile && (
                      <button onClick={() => handleDeleteSkill(s.id)} className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                </div>
              ))}

              {/* Derived from tasks */}
              {profile.wanting && profile.wanting.split(', ').map((skill, i) => {
                const isManual = wantingSkills.some(s => s.skill_name.toLowerCase() === skill.toLowerCase());
                if (isManual) return null;
                return (
                  <span key={`task-want-${i}`} className="px-6 py-3 rounded-2xl bg-secondary/30 text-muted-foreground text-xs font-black uppercase tracking-widest border border-border/50 italic opacity-80">
                    {skill}
                  </span>
                );
              })}

              {!profile.wanting && wantingSkills.length === 0 && (
                <span className="px-6 py-3 rounded-2xl bg-secondary/20 text-muted-foreground/40 text-[10px] font-black uppercase tracking-widest italic">
                  No skills listed yet
                </span>
              )}
            </div>
          </motion.div>
        </div>

        {/* AI INSIGHTS SECTION */}
        {aiAnalysis && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-[32px] border border-primary/20 bg-primary/5 p-8 md:p-10"
          >
            <div className="relative space-y-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                    <Sparkles className="h-6 w-6 text-primary fill-primary" /> AI Insights
                  </h2>
                </div>
                <div className="flex gap-3">
                  <div className="bg-background rounded-2xl p-4 border border-border shadow-sm text-center min-w-[100px]">
                    <p className="text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-widest">Score</p>
                    <p className="text-2xl font-black text-primary">{aiAnalysis.suggested_rating || "N/A"}</p>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <p className="text-base font-bold leading-relaxed">{aiAnalysis.summary}</p>
                  <p className="text-sm font-medium text-muted-foreground leading-relaxed">{aiAnalysis.overall_feedback}</p>
                </div>
                <div className="bg-background/50 rounded-2xl p-6 border border-border shadow-sm">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-3 flex items-center gap-2">
                    <Zap className="h-3 w-3 fill-amber-600" /> Focus
                  </h4>
                  <p className="text-md font-bold">{aiAnalysis.growth_areas}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* FEEDBACK SECTION */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Award className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-black tracking-tight">Recent Feedback</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {reviews.length > 0 ? reviews.map((rev, i) => (
              <div key={i} className="p-8 rounded-[32px] border border-border bg-card/50 flex gap-6 hover:shadow-md transition-all">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-lg shrink-0">
                  {(rev.reviewer_name || rev.reviewer_id || 'P')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-sm font-black">{rev.reviewer_name || 'Peer Reviewer'}</p>
                    {rev.skill_level && (
                      <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-primary/10 text-primary shrink-0">
                        {rev.skill_level}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1 mb-2">
                    {Array.from({ length: 5 }).map((_, star) => (
                      <Star key={star} className={cn("h-3 w-3", star < rev.rating ? "fill-amber-500 text-amber-500" : "text-muted-foreground/20")} />
                    ))}
                  </div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">"{rev.comment}"</p>
                  {rev.tags && rev.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {rev.tags.map((tag: string) => (
                        <span key={tag} className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-secondary/60 text-muted-foreground">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {rev.task_title && (
                    <p className="text-[9px] font-black uppercase tracking-widest text-primary/60">
                      Exchange: {rev.task_title}
                    </p>
                  )}
                </div>
              </div>
            )) : (
              <div className="col-span-2 p-12 text-center border-2 border-dashed border-border rounded-[48px] text-muted-foreground font-bold">
                No reviews yet. Complete your first exchange to see feedback here!
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
