import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Star, Trophy, MessageSquare, CheckCircle2 } from "lucide-react"
import { Button } from "./button"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
  taskId: string
  partnerId: string
  onComplete: () => void
}

export default function FeedbackModal({ isOpen, onClose, taskId, partnerId, onComplete }: FeedbackModalProps) {
  const [stars, setStars] = useState(0)
  const [hoverStar, setHoverStar] = useState(0)
  const [comment, setComment] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [pointsEarned, setPointsEarned] = useState(0)

  const handleSubmit = async () => {
    if (stars === 0) return
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // 1. Insert into ratings
      const { error: rateErr } = await supabase
        .from('ratings')
        .insert({
          from_user: session.user.id,
          to_user: partnerId,
          task_id: taskId,
          stars,
          comment
        })
      if (rateErr) throw rateErr

      // 2. Recalculate partner average rating
      const { data: partnerRatings } = await supabase
        .from('ratings')
        .select('stars')
        .eq('to_user', partnerId)
      
      if (partnerRatings) {
        const avg = partnerRatings.reduce((acc, r) => acc + r.stars, 0) / partnerRatings.length
        await supabase.from('users').update({ rating: avg }).eq('id', partnerId)
      }

      // 3. Award points
      let points = 10
      if (stars === 5) points += 5
      setPointsEarned(points)

      // Fetch current points
      const { data: profile } = await supabase.from('users').select('points, completed_count').eq('id', session.user.id).single()
      const newPoints = (profile?.points || 0) + points
      const newCount = (profile?.completed_count || 0) + 1

      await supabase.from('users').update({ 
        points: newPoints, 
        completed_count: newCount 
      }).eq('id', session.user.id)

      setSuccess(true)
      setTimeout(() => {
        onComplete()
      }, 3000)
    } catch (err) {
      console.error("Feedback Error:", err)
      alert("Failed to submit feedback.")
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          onClick={onClose} 
          className="absolute inset-0 bg-background/90 backdrop-blur-xl" 
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }} 
          animate={{ opacity: 1, scale: 1, y: 0 }} 
          exit={{ opacity: 0, scale: 0.9, y: 20 }} 
          className="relative w-full max-w-lg bg-card border border-border rounded-[48px] shadow-2xl p-12 overflow-hidden"
        >
          {success ? (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }}
              className="text-center py-8"
            >
              <div className="h-24 w-24 rounded-[32px] bg-green-500/10 flex items-center justify-center mx-auto mb-8 shadow-inner">
                <Trophy className="h-12 w-12 text-green-500" />
              </div>
              <h3 className="text-3xl font-black mb-4">Exchange Complete!</h3>
              <p className="text-muted-foreground font-medium text-lg leading-relaxed mb-8">
                You've earned <span className="text-primary font-black">+{pointsEarned} points</span>.
                Your profile has been updated!
              </p>
              <div className="flex items-center justify-center gap-2 text-green-600 font-black uppercase tracking-widest text-xs">
                <CheckCircle2 className="h-4 w-4" /> Finalizing...
              </div>
            </motion.div>
          ) : (
            <>
              <header className="text-center mb-10">
                <div className="h-16 w-16 rounded-[24px] bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <Star className="h-8 w-8 text-primary fill-primary" />
                </div>
                <h2 className="text-3xl font-black tracking-tight mb-2">How was it?</h2>
                <p className="text-muted-foreground font-medium">Rate your exchange experience to complete the task.</p>
              </header>

              <div className="space-y-10">
                <div className="flex justify-center gap-4">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      onMouseEnter={() => setHoverStar(s)}
                      onMouseLeave={() => setHoverStar(0)}
                      onClick={() => setStars(s)}
                      className="group transition-all hover:scale-125 active:scale-90"
                    >
                      <Star 
                        className={cn(
                          "h-12 w-12 transition-all duration-300",
                          s <= (hoverStar || stars) 
                            ? "fill-primary text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.4)]" 
                            : "text-border fill-secondary/50"
                        )} 
                      />
                    </button>
                  ))}
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">
                    Share your thoughts (optional)
                  </label>
                  <div className="relative">
                    <MessageSquare className="absolute left-6 top-6 h-5 w-5 text-muted-foreground opacity-30" />
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value.slice(0, 300))}
                      placeholder="Tell us what made this exchange great..."
                      className="w-full min-h-[140px] rounded-[32px] border border-border bg-secondary/20 p-8 pl-16 text-sm font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none transition-all"
                    />
                  </div>
                  <div className="flex justify-end px-4">
                    <span className="text-[10px] font-black text-muted-foreground/40">{comment.length}/300</span>
                  </div>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={stars === 0 || loading}
                  className="w-full h-16 rounded-[24px] bg-foreground text-background font-black text-lg shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-20"
                >
                  {loading ? "Submitting..." : "Submit & Earn Points"}
                </Button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
