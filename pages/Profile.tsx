import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { motion } from "framer-motion"
import {
  Star, Edit3, MapPin, Award, Trophy, Briefcase, Zap, Search, Plus, Trash2, X, Flag, CheckCircle2, MessageSquare, Link2, Globe, ExternalLink
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
import type { Review } from "@/types"

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
  linkedin: string | null
  portfolio: string | null
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

  const [showAddSkill, setShowAddSkill] = useState(false)
  const [newSkill, setNewSkill] = useState("")
  const [addingSkill, setAddingSkill] = useState(false)
  const [skillType, setSkillType] = useState<'offering' | 'wanting'>('offering')

  const isOwnProfile = !searchParams.get("id") || searchParams.get("id") === authUser?.id

  const [reviews, setReviews] = useState<Review[]>([])
  const [flagInfo, setFlagInfo] = useState<{ level: number; color: string; label: string } | null>(null)

  const loadProfile = useCallback(async (silent = false) => {
    if (!viewUserId) return
    if (!silent) setLoading(true)
    try {
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('id, name, email, role, profile_pic, created_at, updated_at')
        .eq('id', viewUserId)
        .single()

      if (profileRow) {
        setProfile({
          id: profileRow.id,
          name: profileRow.name || authUser?.name || 'User',
          email: profileRow.email || authUser?.email || '',
          avatar_url: profileRow.profile_pic || null,
          bio: '',
          location: '',
          title: '',
          offering: '',
          wanting: '',
          linkedin: null,
          portfolio: null,
          rating: 0,
          points: 0,
          completed_count: 0,
          created_at: profileRow.created_at || profileRow.updated_at || new Date().toISOString(),
        })
      } else {
        setProfile({
          id: viewUserId,
          name: authUser?.name || 'User',
          email: authUser?.email || '',
          avatar_url: authUser?.profilePic || null,
          bio: '',
          location: '',
          title: '',
          offering: '',
          wanting: '',
          linkedin: null,
          portfolio: null,
          rating: 0,
          points: 0,
          completed_count: 0,
          created_at: new Date().toISOString(),
        })
      }

      try {
        const aiRes = await fetch(`http://localhost:5000/api/user/${viewUserId}/profile`)
        const aiData = await aiRes.json()
        if (aiData?.id) {
          setProfile(prev => prev ? {
            ...prev,
            title: aiData.title || prev.title,
            location: aiData.location || prev.location,
            bio: aiData.bio || prev.bio,
            avatar_url: aiData.avatar_url || prev.avatar_url,
            linkedin: aiData.linkedin || prev.linkedin,
            portfolio: aiData.portfolio || prev.portfolio,
            points: aiData.points ?? prev.points,
            completed_count: aiData.completed_count ?? prev.completed_count,
            rating: aiData.rating ?? prev.rating,
          } : null)
        }
      } catch { /* server may be offline */ }

      try {
        const reviewsRes = await fetch(`http://localhost:5000/api/user/${viewUserId}/reviews`)
        const reviewsData = await reviewsRes.json()
        if (Array.isArray(reviewsData)) setReviews(reviewsData)
      } catch { /* server may be offline */ }

      let skillsFetched = false
      try {
        const skillRes = await fetch(`http://localhost:5000/api/user/${viewUserId}/skills`)
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
      fetch(`http://localhost:5000/api/users/${viewUserId}/flag-status`)
        .then(r => r.json())
        .then(d => { if (d.level > 0) setFlagInfo(d) })
        .catch(() => { })
    }
  }, [viewUserId, loadProfile])

  const handleAddSkill = async () => {
    if (!newSkill.trim() || !authUser?.id) return
    setAddingSkill(true)
    try {
      const res = await fetch(`http://localhost:5000/api/user/${authUser.id}/skills`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skill_name: newSkill.trim(), skill_type: skillType })
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
      const res = await fetch(`http://localhost:5000/api/skills/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete skill")
      loadProfile(true)
    } catch (err) { console.error(err) }
  }

  const memberSince = profile
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : 'â€”'

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : profile?.rating ? profile.rating.toFixed(1) : 'â€”'

  if (loading) return (
    <div className="h-screen flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto" />
        <p className="text-sm font-semibold text-muted-foreground tracking-wide">Loading profile...</p>
      </div>
    </div>
  )
  if (!profile) return <div className="h-screen flex items-center justify-center font-bold text-2xl">User not found.</div>

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-10 mt-16 space-y-6">

        {/* â”€â”€ PROFILE CARD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm"
        >
          {/* Cover banner */}
          <div className="h-28 md:h-36 bg-gradient-to-br from-primary/20 via-primary/10 to-background relative">
            <div className="absolute inset-0 opacity-30"
              style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, hsl(var(--primary)) 0%, transparent 60%)' }} />
          </div>

          <div className="px-6 md:px-8 pb-8">
            {/* Avatar + name row */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 -mt-14 md:-mt-16 mb-5">
              <div className="flex items-end gap-4">
                <div className="relative shrink-0">
                  <div className="h-24 w-24 md:h-28 md:w-28 rounded-2xl overflow-hidden border-4 border-card bg-secondary shadow-md flex items-center justify-center">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} className="h-full w-full object-cover" alt={profile.name} />
                    ) : (
                      <span className="text-4xl md:text-5xl font-black text-primary">{profile.name[0]}</span>
                    )}
                  </div>
                  <div className="absolute -bottom-1.5 -right-1.5 h-7 w-7 rounded-lg bg-primary flex items-center justify-center border-2 border-card shadow">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary-foreground" />
                  </div>
                </div>
                <div className="pb-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight leading-none">{profile.name}</h1>
                    {flagInfo && flagInfo.level > 0 && (
                      <span
                        title={flagInfo.label}
                        className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border",
                          flagInfo.color === 'red'
                            ? "bg-destructive/10 border-destructive/30 text-destructive"
                            : flagInfo.color === 'orange'
                              ? "bg-orange-500/10 border-orange-500/30 text-orange-500"
                              : "bg-yellow-500/10 border-yellow-500/30 text-yellow-600"
                        )}
                      >
                        <Flag className="h-3 w-3" /> {flagInfo.label}
                      </span>
                    )}
                  </div>
                  {profile.title && (
                    <p className="text-sm text-muted-foreground font-medium flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5 shrink-0" /> {profile.title}
                    </p>
                  )}
                </div>
              </div>

              {isOwnProfile && (
                <Button
                  onClick={() => navigate('/onboarding')}
                  variant="outline"
                  className="h-9 px-4 rounded-xl text-xs font-semibold gap-2 self-start md:self-auto"
                >
                  <Edit3 className="h-3.5 w-3.5" /> Edit Profile
                </Button>
              )}
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="text-sm text-muted-foreground leading-relaxed mb-5 max-w-2xl">
                {profile.bio}
              </p>
            )}

            {/* Meta row â€” location, member since, linkedin, portfolio */}
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground mb-6">
              {profile.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0" /> {profile.location}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5 shrink-0" /> Member since {memberSince}
              </span>
              {profile.linkedin && (
                <a
                  href={profile.linkedin.startsWith('http') ? profile.linkedin : `https://${profile.linkedin}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[#0A66C2] hover:underline font-medium"
                >
                  <Link2 className="h-3.5 w-3.5 shrink-0" /> LinkedIn
                  <ExternalLink className="h-3 w-3 opacity-60" />
                </a>
              )}
              {profile.portfolio && (
                <a
                  href={profile.portfolio.startsWith('http') ? profile.portfolio : `https://${profile.portfolio}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-primary hover:underline font-medium"
                >
                  <Globe className="h-3.5 w-3.5 shrink-0" /> Portfolio
                  <ExternalLink className="h-3 w-3 opacity-60" />
                </a>
              )}
            </div>

            {/* Stats bar */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-border bg-background px-4 py-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                  <span className="text-lg font-bold">{avgRating}</span>
                </div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Rating</p>
              </div>
              <div className="rounded-xl border border-border bg-background px-4 py-3 text-center">
                <div className="text-lg font-bold mb-1">{profile.completed_count || 0}</div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Exchanges</p>
              </div>
              <div className="rounded-xl border border-border bg-background px-4 py-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Trophy className="h-3.5 w-3.5 text-primary" />
                  <span className="text-lg font-bold">{profile.points || 0}</span>
                </div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Credits</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* â”€â”€ SKILLS GRID â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Offering */}
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-border bg-card p-6 shadow-sm"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold flex items-center gap-2">
                <span className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Zap className="h-3.5 w-3.5 text-primary" />
                </span>
                Offering
              </h2>
              {isOwnProfile && (
                <Dialog open={showAddSkill && skillType === 'offering'} onOpenChange={(o) => { if (!o) setShowAddSkill(false) }}>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setSkillType('offering'); setShowAddSkill(true) }}
                      className="h-8 w-8 p-0 rounded-lg bg-primary/8 text-primary hover:bg-primary/15"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="rounded-2xl max-w-sm">
                    <DialogHeader>
                      <DialogTitle className="text-lg font-bold">Add Offering Skill</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                      <Input
                        value={newSkill}
                        onChange={(e) => setNewSkill(e.target.value)}
                        placeholder="e.g. Graphic Design, Python..."
                        className="h-11 rounded-xl"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
                      />
                      <div className="flex gap-2">
                        <Button onClick={handleAddSkill} disabled={addingSkill || !newSkill.trim()} className="flex-1 h-11 rounded-xl">
                          {addingSkill ? "Adding..." : "Add Skill"}
                        </Button>
                        <Button variant="ghost" onClick={() => setShowAddSkill(false)} className="h-11 w-11 p-0 rounded-xl">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {offeringSkills.map(s => (
                <div key={s.id} className="group relative">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold border border-primary/15">
                    {s.skill_name}
                    {isOwnProfile && (
                      <button onClick={() => handleDeleteSkill(s.id)} className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive ml-0.5">
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </span>
                </div>
              ))}
              {profile.offering && profile.offering.split(', ').map((skill, i) => {
                if (offeringSkills.some(s => s.skill_name.toLowerCase() === skill.toLowerCase())) return null
                return (
                  <span key={`task-${i}`} className="px-3 py-1.5 rounded-lg bg-secondary/40 text-muted-foreground text-xs font-medium border border-border/50 italic">
                    {skill}
                  </span>
                )
              })}
              {!profile.offering && offeringSkills.length === 0 && (
                <span className="text-xs text-muted-foreground/50 italic">No skills listed yet</span>
              )}
            </div>
          </motion.div>

          {/* Looking For */}
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl border border-border bg-card p-6 shadow-sm"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold flex items-center gap-2">
                <span className="h-7 w-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Search className="h-3.5 w-3.5 text-amber-600" />
                </span>
                Looking For
              </h2>
              {isOwnProfile && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setSkillType('wanting'); setShowAddSkill(true) }}
                  className="h-8 w-8 p-0 rounded-lg bg-amber-500/8 text-amber-600 hover:bg-amber-500/15"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Reuse the same dialog for wanting */}
            <Dialog open={showAddSkill && skillType === 'wanting'} onOpenChange={(o) => { if (!o) setShowAddSkill(false) }}>
              <DialogContent className="rounded-2xl max-w-sm">
                <DialogHeader>
                  <DialogTitle className="text-lg font-bold">Add Skill You're Looking For</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <Input
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    placeholder="e.g. Video Editing, Marketing..."
                    className="h-11 rounded-xl"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleAddSkill} disabled={addingSkill || !newSkill.trim()} className="flex-1 h-11 rounded-xl">
                      {addingSkill ? "Adding..." : "Add Skill"}
                    </Button>
                    <Button variant="ghost" onClick={() => setShowAddSkill(false)} className="h-11 w-11 p-0 rounded-xl">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <div className="flex flex-wrap gap-2">
              {wantingSkills.map(s => (
                <div key={s.id} className="group relative">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-semibold border border-amber-500/15">
                    {s.skill_name}
                    {isOwnProfile && (
                      <button onClick={() => handleDeleteSkill(s.id)} className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive ml-0.5">
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </span>
                </div>
              ))}
              {profile.wanting && profile.wanting.split(', ').map((skill, i) => {
                if (wantingSkills.some(s => s.skill_name.toLowerCase() === skill.toLowerCase())) return null
                return (
                  <span key={`task-want-${i}`} className="px-3 py-1.5 rounded-lg bg-secondary/40 text-muted-foreground text-xs font-medium border border-border/50 italic">
                    {skill}
                  </span>
                )
              })}
              {!profile.wanting && wantingSkills.length === 0 && (
                <span className="text-xs text-muted-foreground/50 italic">No skills listed yet</span>
              )}
            </div>
          </motion.div>
        </div>

        {/* â”€â”€ REVIEWS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden"
        >
          <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-bold">Reviews</h2>
            {reviews.length > 0 && (
              <span className="ml-auto text-xs text-muted-foreground font-medium">
                {reviews.length} review{reviews.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {reviews.length === 0 ? (
            <div className="py-14 text-center">
              <Star className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No reviews yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Complete an exchange to receive feedback</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {reviews.map((rev, i) => (
                <li key={i} className="px-6 py-5 hover:bg-muted/30 transition-colors">
                  <div className="flex gap-4">
                    {/* Avatar */}
                    <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">
                      {(rev.reviewer_name || rev.reviewer_id || 'P')[0].toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Reviewer name + date */}
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-sm font-semibold">{rev.reviewer_name || 'Peer Reviewer'}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          {Array.from({ length: 5 }).map((_, star) => (
                            <Star
                              key={star}
                              className={cn(
                                "h-3 w-3",
                                star < rev.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"
                              )}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Comment */}
                      <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                        {rev.comment || "Great exchange!"}
                      </p>

                      {/* Tags + exchange label */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {rev.skill_level && (
                          <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md bg-primary/8 text-primary border border-primary/10">
                            {rev.skill_level}
                          </span>
                        )}
                        {rev.tags && rev.tags.map((tag: string) => (
                          <span key={tag} className="text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-md bg-secondary text-muted-foreground">
                            {tag}
                          </span>
                        ))}
                        {rev.task_title && (
                          <span className="text-[10px] text-muted-foreground/50 ml-auto">
                            {rev.task_title}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </motion.div>

      </main>
    </div>
  )
}
