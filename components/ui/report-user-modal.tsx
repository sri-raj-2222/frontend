import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Flag, X, ChevronRight, ChevronLeft, AlertTriangle,
  CheckCircle2, Loader2, MessageSquare,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/contexts/auth-context'
import type { Message } from '@/types'

const API = 'https://backend-a41z.onrender.com'

const REASON_CATEGORIES = [
  'Harassment / Hate speech',
  'Spam or scam',
  'Inappropriate content',
  'Impersonation',
  'Sharing personal info',
  'Threatening behavior',
  'Other',
] as const

type ReasonCategory = typeof REASON_CATEGORIES[number]

interface ReportUserModalProps {
  open: boolean
  onClose: () => void
  reportedUserId: string
  reportedUserName: string
  chatRoomId?: string
  messages?: Message[]
  isSbRoom?: boolean
}

// -- Inline Toast --------------------------------------------------------------
interface ToastMsg { id: string; text: string; type: 'success' | 'error' }

function Toast({ toasts, remove }: { toasts: ToastMsg[]; remove: (id: string) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-[300] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div key={t.id}
            initial={{ opacity: 0, x: 60, scale: 0.92 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.96 }}
            className={`pointer-events-auto flex items-start gap-3 p-4 pr-3 rounded-2xl border shadow-2xl max-w-sm
              ${t.type === 'success'
                ? 'bg-card border-emerald-500/30 text-foreground'
                : 'bg-card border-destructive/30 text-foreground'}`}
          >
            {t.type === 'success'
              ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              : <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />}
            <p className="text-sm font-medium flex-1">{t.text}</p>
            <button onClick={() => remove(t.id)}
              className="text-muted-foreground hover:text-foreground shrink-0">
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

// -- Main Modal ----------------------------------------------------------------
export default function ReportUserModal({
  open, onClose, reportedUserId, reportedUserName, chatRoomId, messages = [], isSbRoom,
}: ReportUserModalProps) {
  const { user } = useAuth()
  const [step, setStep] = useState<1 | 2>(1)
  const [reason, setReason] = useState<ReasonCategory | ''>('')
  const [description, setDescription] = useState('')
  const [selectedMsgIds, setSelectedMsgIds] = useState<string[]>([])
  const [selectMode, setSelectMode] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [toasts, setToasts] = useState<ToastMsg[]>([])

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep(1); setReason(''); setDescription('')
      setSelectedMsgIds([]); setSelectMode(false); setSubmitted(false)
    }
  }, [open])

  function addToast(text: string, type: 'success' | 'error') {
    const id = Date.now().toString()
    setToasts(prev => [...prev, { id, text, type }])
    setTimeout(() => removeToast(id), 6000)
  }
  function removeToast(id: string) { setToasts(prev => prev.filter(t => t.id !== id)) }

  function toggleMsg(id: string) {
    setSelectedMsgIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  async function handleSubmit() {
    if (!user) return
    if (!reason) { addToast('Please select a reason.', 'error'); return }
    if (description.trim().length < 20) {
      addToast('Description must be at least 20 characters.', 'error'); return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`${API}/api/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reporter_id: user.id,
          reported_user_id: reportedUserId,
          chat_room_id: isSbRoom ? chatRoomId : null,
          reason_category: reason,
          description: description.trim(),
          evidence_message_ids: selectedMsgIds,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 429) {
          addToast(data.error || 'You have already reported this user recently.', 'error')
        } else {
          addToast(data.error || 'Failed to submit report. Please try again.', 'error')
        }
        return
      }

      setSubmitted(true)
    } catch {
      addToast('Network error. Please check your connection.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const charCount = description.length
  const charOk = charCount >= 20 && charCount <= 1000

  // Visible chat messages (exclude system/AI messages)
  const visibleMsgs = messages.filter(m =>
    m.sender_id !== 'system' && m.sender_id !== 'ai-assistant'
  ).slice(-50) // last 50 messages

  if (!open) return <Toast toasts={toasts} remove={removeToast} />

  return (
    <>
      <Toast toasts={toasts} remove={removeToast} />
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          className="bg-card border border-border rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-border">
            <div className="h-9 w-9 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
              <Flag className="h-4 w-4 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold text-foreground">Report User</h2>
              <p className="text-xs text-muted-foreground truncate">
                Reporting <span className="font-semibold text-foreground">{reportedUserName}</span>
              </p>
            </div>
            <button onClick={onClose}
              className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Step indicator */}
          {!submitted && (
            <div className="flex items-center gap-2 px-6 pt-4">
              {[1, 2].map(s => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors
                    ${step >= s ? 'bg-destructive text-white' : 'bg-secondary text-muted-foreground'}`}>
                    {s}
                  </div>
                  <span className={`text-xs font-medium transition-colors ${step >= s ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {s === 1 ? 'Choose reason' : 'Describe'}
                  </span>
                  {s < 2 && <div className={`h-px w-8 ${step >= 2 ? 'bg-destructive' : 'bg-border'} transition-colors`} />}
                </div>
              ))}
            </div>
          )}

          {/* Body */}
          <div className="px-6 py-5 min-h-[220px]">
            <AnimatePresence mode="wait">

              {/* -- Submitted -- */}
              {submitted && (
                <motion.div key="done"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center text-center py-6 gap-4"
                >
                  <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-base">Report submitted</p>
                    <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                      Our team will review it. Thank you for helping keep ShareSphere safe.
                    </p>
                  </div>
                  <Button onClick={onClose} className="rounded-xl h-9 px-6 text-xs font-bold uppercase tracking-widest">
                    Done
                  </Button>
                </motion.div>
              )}

              {/* -- Step 1: Reason -- */}
              {!submitted && step === 1 && (
                <motion.div key="step1"
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="space-y-2"
                >
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Select a reason
                  </p>
                  {REASON_CATEGORIES.map(cat => (
                    <button key={cat}
                      onClick={() => setReason(cat)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border text-sm font-medium text-left transition-all
                        ${reason === cat
                          ? 'border-destructive bg-destructive/5 text-destructive'
                          : 'border-border hover:border-destructive/40 hover:bg-destructive/5 text-foreground'}`}
                    >
                      {cat}
                      {reason === cat && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                    </button>
                  ))}
                </motion.div>
              )}

              {/* -- Step 2: Description + Evidence -- */}
              {!submitted && step === 2 && (
                <motion.div key="step2"
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                  className="space-y-4"
                >
                  {/* Selected reason chip */}
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-destructive/5 border border-destructive/20 w-fit">
                    <Flag className="h-3 w-3 text-destructive" />
                    <span className="text-xs font-semibold text-destructive">{reason}</span>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                      What happened? <span className="text-destructive">*</span>
                    </label>
                    <Textarea
                      value={description}
                      onChange={e => setDescription(e.target.value.slice(0, 1000))}
                      placeholder="Please describe the specific behavior that violates our community guidelines..."
                      className="resize-none rounded-2xl h-28 text-sm border-border focus:border-primary"
                    />
                    <div className="flex justify-between mt-1.5">
                      <span className={`text-[10px] font-medium ${charOk ? 'text-muted-foreground' : charCount < 20 ? 'text-amber-500' : 'text-destructive'}`}>
                        {charCount < 20 ? `${20 - charCount} more chars needed` : ''}
                      </span>
                      <span className={`text-[10px] font-mono ${charCount > 900 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                        {charCount}/1000
                      </span>
                    </div>
                  </div>

                  {/* Message evidence (only if there are messages) */}
                  {visibleMsgs.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Evidence messages
                          <span className="text-muted-foreground/60 ml-1 normal-case font-normal">(optional)</span>
                        </label>
                        <button
                          onClick={() => { setSelectMode(s => !s); setSelectedMsgIds([]) }}
                          className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline"
                        >
                          {selectMode ? 'Cancel' : 'Select messages'}
                        </button>
                      </div>

                      {selectMode && (
                        <div className="border border-border rounded-2xl overflow-hidden max-h-40 overflow-y-auto">
                          {visibleMsgs.map(msg => (
                            <button key={msg.id}
                              onClick={() => toggleMsg(msg.id)}
                              className={`w-full flex items-start gap-3 px-3 py-2 text-left border-b border-border/50 last:border-0 transition-colors
                                ${selectedMsgIds.includes(msg.id) ? 'bg-primary/5' : 'hover:bg-secondary/50'}`}
                            >
                              <div className={`h-4 w-4 rounded border mt-0.5 shrink-0 flex items-center justify-center transition-colors
                                ${selectedMsgIds.includes(msg.id) ? 'bg-primary border-primary' : 'border-border'}`}>
                                {selectedMsgIds.includes(msg.id) && (
                                  <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 12 12" fill="none">
                                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="text-[10px] font-bold text-primary">{msg.sender_name || 'User'}</span>
                                <p className="text-xs text-foreground/80 truncate">{msg.content}</p>
                              </div>
                              <MessageSquare className="h-3 w-3 text-muted-foreground/40 shrink-0 mt-1" />
                            </button>
                          ))}
                        </div>
                      )}

                      {selectedMsgIds.length > 0 && (
                        <p className="text-[10px] text-primary font-semibold mt-1.5">
                          {selectedMsgIds.length} message{selectedMsgIds.length > 1 ? 's' : ''} selected as evidence
                        </p>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* Footer */}
          {!submitted && (
            <div className="px-6 pb-6 flex items-center justify-between gap-3">
              <button
                onClick={() => step === 1 ? onClose() : setStep(1)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                {step === 1 ? 'Cancel' : 'Back'}
              </button>

              {step === 1 ? (
                <Button
                  onClick={() => setStep(2)}
                  disabled={!reason}
                  className="rounded-xl h-9 px-6 text-xs font-bold uppercase tracking-widest flex items-center gap-1.5"
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !charOk}
                  className="rounded-xl h-9 px-6 text-xs font-bold uppercase tracking-widest bg-destructive hover:bg-destructive/90 flex items-center gap-1.5"
                >
                  {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Flag className="h-3.5 w-3.5" />}
                  {submitting ? 'Submitting…' : 'Submit Report'}
                </Button>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </>
  )
}

