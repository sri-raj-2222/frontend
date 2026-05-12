import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeftRight, RefreshCcw, AlertCircle, ChevronRight, Search, MessageSquare } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { useSocket } from "@/contexts/socket-context"
import { useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import type { MatchResult, SkillProfile } from "@/types"

export default function AvailableMatches() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { socket, addNotification } = useSocket()
  const userId = user?.id || ""

  const [currentUser, setCurrentUser] = useState<SkillProfile | null>(null)
  const [matches, setMatches] = useState<MatchResult[]>([])
  const [loading, setLoading] = useState(true)
  const [strengthFilter, setStrengthFilter] = useState<'all' | 'strong' | 'moderate' | 'partial'>('all')
  const [sortBy, setSortBy] = useState<'score' | 'rating'>('score')
  const [requestedTasks, setRequestedTasks] = useState<string[]>([])

  const loadMatches = useCallback(async (silent = false) => {
    if (!userId) return
    if (!silent) setLoading(true)
    try {
      const res = await fetch(`http://localhost:5000/api/matches/${userId}`)
      const data = await res.json()
      setCurrentUser(data.currentUser)

      setMatches(prev => {
        const newMatches = data.matches || []
        return newMatches.map((m: MatchResult) => {
          const existing = prev.find(p => p.peer.id === m.peer.id)
          return existing?.requestStatus ? { ...m, requestStatus: existing.requestStatus } : m
        })
      })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadMatches()
    if (user?.id) {
      supabase
        .from('task_requests')
        .select('task_id')
        .eq('requester_id', user.id)
        .in('status', ['pending', 'accepted'])
        .then(({ data }) => {
          if (data) setRequestedTasks(data.map(r => r.task_id))
        })
    }
  }, [loadMatches, user?.id])

  useEffect(() => {
    if (socket) {
      socket.on('task:removed', ({ taskId, peerId, partnerId }) => {
        setMatches(prev => prev.filter(m => {
          if (taskId && m.task?.id === taskId) return false
          if (peerId && partnerId) {
            const involvesBoth = (m.peer.id === peerId || m.peer.id === partnerId)
            if (involvesBoth) return false
          }
          return true
        }))
      })
      return () => { socket.off('task:removed') }
    }
  }, [socket])

  const getStrength = (score: number): 'strong' | 'moderate' | 'partial' =>
    score >= 80 ? 'strong' : score >= 50 ? 'moderate' : 'partial'

  const filteredMatches = matches
    .filter(m => strengthFilter === 'all' || getStrength(m.matchScore) === strengthFilter)
    .sort((a, b) => {
      if (sortBy === 'rating') return (b.peer.avg_rating || 0) - (a.peer.avg_rating || 0)
      return b.matchScore - a.matchScore
    })

  const handleRequest = async (match: MatchResult) => {
    if (requestedTasks.includes(match.task?.id || match.peer.id)) return

    const targetId = match.task?.id || match.peer.id
    setRequestedTasks(prev => [...prev, targetId])

    try {
      const offeringSkills = match.iOfferWhatTheyNeed.join(', ')
      const notificationMsg = `${user?.name || 'Someone'} wants to exchange ${offeringSkills} for your ${match.task?.title || 'task'}`

      // 0 ï¿½ Ensure current user exists in `users` table (FK: task_requests.requester_id ? users.id)
      await supabase
        .from('users')
        .upsert(
          { id: user?.id, name: user?.name || 'User', email: user?.email || '' },
          { onConflict: 'id' }
        )

      // 1 ï¿½ Check if a request already exists (prevent duplicate 409)
      let requestId: string | null = null
      const { data: existing } = await supabase
        .from('task_requests')
        .select('id, status')
        .eq('requester_id', user?.id ?? '')
        .eq('owner_id', match.peer.id)
        .maybeSingle()

      if (existing) {
        requestId = existing.id
        // Request already sent ï¿½ just notify sender and return
        addNotification(`Request already sent to ${match.peer.name}!`, 'success')
        return
      }

      // 2 ï¿½ No duplicate ? safely insert
      const { data: newReq, error: insertErr } = await supabase
        .from('task_requests')
        .insert({
          task_id: match.task?.id || null,
          requester_id: user?.id,
          owner_id: match.peer.id,
          status: 'pending',
        })
        .select('id')
        .single()

      if (insertErr) {
        // Still got a conflict (race condition) ï¿½ fetch the existing row
        if (insertErr.code === '23505' || (insertErr as { status?: number }).status === 409) {
          const { data: fallback } = await supabase
            .from('task_requests')
            .select('id')
            .eq('requester_id', user?.id ?? '')
            .eq('owner_id', match.peer.id)
            .maybeSingle()
          requestId = fallback?.id ?? null
        } else {
          throw insertErr
        }
      } else {
        requestId = newReq?.id ?? null
      }

      // 3 ï¿½ Supabase notification (non-blocking)
      if (requestId) {
        supabase
          .from('notifications')
          .insert({
            user_id: match.peer.id,
            type: 'task_request',
            title: 'New Connection Request',
            message: notificationMsg,
            data: {
              task_id: match.task?.id ?? null,
              request_id: requestId,
              requester_id: user?.id,
              requester_name: user?.name,
              offering: offeringSkills,
            },
            is_read: false,
          })
          .then(({ error }) => {
            if (error) console.warn('[handleRequest] notification insert:', error.message)
          })
      }

      // 4 ï¿½ Ping Express server ? emits socket event to owner's room immediately
      fetch('http://localhost:5000/api/tasks/null/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requested_by: user?.id,
          requesterName: user?.name || 'Someone',
          requesterAvatar: user?.profilePic || null,
          target_user_id: match.peer.id,
          task_title: match.task?.title || 'Skill Exchange',
          task_offering: offeringSkills,
          task_wanting: match.theyOfferWhatINeed.join(', '),
          owner_name: match.peer.name,
          owner_avatar: null,
          message: notificationMsg,
          supabase_request_id: requestId,
        }),
      }).catch(() => { }) // fire-and-forget

      addNotification(`Request sent to ${match.peer.name}!`, 'success')

    } catch (err) {
      console.error('[Connect Now] Error:', err)
      setRequestedTasks(prev => prev.filter(id => id !== targetId))
      addNotification('Failed to send request. Please try again.', 'info')
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      <div className="h-[80vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto animate-pulse">
            <ArrowLeftRight className="h-6 w-6 text-primary" />
          </div>
          <p className="font-bold text-sm uppercase tracking-widest text-muted-foreground animate-pulse">Finding your matches...</p>
        </div>
      </div>
    </div>
  )

  const noSkills = !currentUser?.offering_skills?.length || !currentUser?.wanting_skills?.length

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto px-6 pt-24 pb-24">

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2">Available Matches</h1>
            <p className="text-muted-foreground font-medium">Verified bidirectional skill handshakes powered by Gemini AI.</p>
          </div>
          <Button variant="ghost" onClick={() => navigate('/profile')} className="h-12 px-6 rounded-2xl bg-white dark:bg-card border border-border shadow-sm font-bold uppercase text-[10px] tracking-widest gap-2">
            Update My Skills <ChevronRight className="h-3 w-3" />
          </Button>
        </div>

        {noSkills ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg mx-auto mt-20 text-center space-y-6">
            <div className="h-20 w-20 rounded-[32px] bg-amber-500/10 flex items-center justify-center mx-auto">
              <AlertCircle className="h-10 w-10 text-amber-500" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">Complete Your Profile</h2>
            <p className="text-muted-foreground font-medium text-sm">Add skills to your profile to find mutual matches.</p>
            <Button onClick={() => navigate('/profile')} className="h-12 px-8 rounded-xl bg-primary text-primary-foreground font-semibold uppercase text-[10px] tracking-widest">
              Add Skills Now
            </Button>
          </motion.div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-4 mb-10">
              <div className="flex items-center gap-1 bg-white dark:bg-card border border-border rounded-2xl p-1 shadow-sm">
                {(['all', 'strong', 'moderate', 'partial'] as const).map(f => (
                  <button key={f} onClick={() => setStrengthFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-semibold uppercase tracking-wider transition-all ${strengthFilter === f ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'text-muted-foreground hover:text-foreground'}`}
                  >{f === 'all' ? 'All Matches' : f}</button>
                ))}
              </div>
              <div className="flex items-center gap-1 bg-white dark:bg-card border border-border rounded-2xl p-1 shadow-sm">
                {([['score', 'Best Match'], ['rating', 'Top Rated']] as const).map(([val, label]) => (
                  <button key={val} onClick={() => setSortBy(val as typeof sortBy)}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-semibold uppercase tracking-wider transition-all ${sortBy === val ? 'bg-neutral-900 text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
                  >{label}</button>
                ))}
              </div>
              <Button variant="ghost" size="sm" onClick={() => loadMatches()} className="ml-auto h-10 w-10 rounded-lg bg-white dark:bg-card border border-border shadow-sm">
                <RefreshCcw className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>

            {filteredMatches.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-card border border-border border-dashed rounded-[48px]">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                <h2 className="text-xl font-semibold">No Handshakes Found</h2>
                <p className="text-muted-foreground text-sm mt-1">Try adding more skills to your profile.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                <AnimatePresence mode="popLayout">
                  {filteredMatches.map((match, idx) => {
                    const isRequested = match.requestStatus === 'pending' || match.requestStatus === 'accepted' || requestedTasks.includes(match.task?.id || match.peer.id)

                    return (
                      <motion.div
                        key={match.peer.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: idx * 0.05 }}
                        className="bg-white dark:bg-card border border-border rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col h-full group relative overflow-hidden"
                      >
                        <div className="flex items-center gap-4 mb-8">
                          <div className="h-14 w-14 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center font-semibold text-emerald-600 border border-emerald-100 dark:border-emerald-500/20 text-lg">
                            {match.peer.name.charAt(0)}
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm tracking-tight leading-none mb-1">{match.peer.name}</h3>
                            <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                              JUST NOW ï¿½ <span className="text-emerald-500">{match.matchScore}% Match</span>
                            </p>
                          </div>
                        </div>

                        <div className="mb-5">
                          <h4 className="text-lg font-semibold tracking-tight leading-tight mb-2.5 group-hover:text-primary transition-colors">
                            {match.task?.title || `Offers ${match.theyOfferWhatINeed[0] || 'Skill'}`}
                          </h4>
                          <p className="text-xs font-medium text-muted-foreground/80 leading-relaxed line-clamp-3">
                            {match.task?.ai_metadata?.analysis || match.task?.description || `${match.peer.name} is a verified peer offering high-quality exchange.`}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-6 mt-auto">
                          {match.theyOfferWhatINeed.map(s => (
                            <div key={s} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50/80 dark:bg-emerald-500/10 text-emerald-600 border border-emerald-100/50 dark:border-emerald-500/20 font-semibold text-[9px] uppercase tracking-wider">
                              <span className="opacity-40">HAS:</span> {s}
                            </div>
                          ))}
                          {match.iOfferWhatTheyNeed.map(s => (
                            <div key={s} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50/80 dark:bg-teal-500/10 text-teal-600 border border-teal-100/50 dark:border-teal-500/20 font-semibold text-[9px] uppercase tracking-wider">
                              <span className="opacity-40">NEEDS:</span> {s}
                            </div>
                          ))}
                        </div>

                        <div className="mt-2">
                          {match.requestStatus === 'accepted' ? (
                            <Button onClick={() => navigate(`/chat?room=${match.roomId}`)} className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold uppercase text-[10px] tracking-widest gap-2 shadow-lg shadow-emerald-500/20">
                              <MessageSquare className="h-3.5 w-3.5" /> Open Messenger
                            </Button>
                          ) : (
                            <Button
                              onClick={() => handleRequest(match)}
                              disabled={isRequested}
                              style={{
                                opacity: isRequested ? 0.5 : 1,
                                cursor: isRequested ? 'not-allowed' : 'pointer',
                                background: isRequested ? '#888' : undefined
                              }}
                              className={cn(
                                "w-full h-12 rounded-2xl font-bold flex items-center justify-center gap-2",
                                isRequested ? "" : "bg-primary text-primary-foreground hover:bg-primary/90"
                              )}
                            >
                              {isRequested ? "Request Sent" : "Connect Now"}
                              {!isRequested && <ArrowLeftRight className="h-4 w-4" />}
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
