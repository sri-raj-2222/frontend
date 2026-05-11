import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Clock, CheckCircle2, XCircle, 
  Inbox, Send, MessageSquare
} from "lucide-react"
import { Navbar } from "@/components/navbar"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"

const API = "https://backend-a41z.onrender.com"

interface Request {
  id: string
  task_id: string
  requested_by: string
  message: string
  status: 'pending' | 'accepted' | 'declined'
  type: 'direct' | 'broadcast'
  created_at: string
  requester?: {
    name: string
    avatar_url: string | null
  }
  task: {
    title: string
    posted_by?: string
    offering?: string
    wanting?: string
  }
}

export default function Requests() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming')
  const [requests, setRequests] = useState<{ incoming: Request[], outgoing: Request[] }>({ incoming: [], outgoing: [] })
  const [loading, setLoading] = useState(true)

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/user/${user?.id}/requests`)
      if (!res.ok) throw new Error("Failed to fetch requests")
      const data = await res.json()
      setRequests(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (user) fetchRequests()
  }, [user, fetchRequests])

  const handleAction = async (requestId: string, taskId: string, status: 'accepted' | 'declined', type: 'direct' | 'broadcast') => {
    try {
      const endpoint = type === 'broadcast' 
        ? `${API}/api/broadcast_requests/${requestId}`
        : `${API}/api/tasks/${taskId}/requests/${requestId}`;

      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      })

      if (res.ok) {
        const data = await res.json()
        fetchRequests() // Refresh list
        if (status === 'accepted' && data.room?.id) {
          navigate(`/chat?room=${data.room.id}`)
        }
      }
    } catch (err) {
      console.error("Error updating request:", err)
    }
  }

  const currentRequests = requests[activeTab]

  return (
    <div className="min-h-screen w-full bg-background transition-colors duration-300 overflow-x-hidden">
      <Navbar />
      
      <main className="relative pb-32">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[10%] -right-[5%] w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
          <div className="absolute bottom-[20%] -left-[5%] w-[500px] h-[500px] rounded-full bg-secondary/30 blur-[100px]" />
        </div>

        {/* Header Section */}
        <section className="relative px-6 pt-20 pb-12 md:pt-32 md:pb-16 max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-start mb-12"
          >
            <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4 text-foreground leading-[1.1]">
              Activity <span className="text-muted-foreground">& Requests.</span>
            </h1>
            <p className="text-muted-foreground font-medium max-w-2xl">
              Track your pending connections, manage incoming interests, and follow up on your skill exchange requests.
            </p>
          </motion.div>

          {/* Tab Switcher */}
          <div className="flex p-1.5 bg-secondary/30 border border-border/50 rounded-[28px] w-full max-w-md mb-12 backdrop-blur-xl">
            <button
              onClick={() => setActiveTab('incoming')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[22px] text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === 'incoming' 
                  ? "bg-card text-primary shadow-xl border border-border/50" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Inbox className="h-4 w-4" /> 
              Incoming
              {requests.incoming.filter(r => r.status === 'pending').length > 0 && (
                <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] ml-1">
                  {requests.incoming.filter(r => r.status === 'pending').length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('outgoing')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[22px] text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === 'outgoing' 
                  ? "bg-card text-primary shadow-xl border border-border/50" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Send className="h-4 w-4" /> 
              Outgoing
            </button>
          </div>
        </section>

        {/* Requests List */}
        <section className="relative px-6 max-w-7xl mx-auto">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 rounded-[32px] bg-secondary/40 animate-pulse border border-border" />
              ))}
            </div>
          ) : currentRequests.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-32 text-center rounded-[48px] border border-dashed border-border bg-card/30"
            >
              <div className="h-20 w-20 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-6">
                {activeTab === 'incoming' ? <Inbox className="h-10 w-10 text-muted-foreground opacity-30" /> : <Send className="h-10 w-10 text-muted-foreground opacity-30" />}
              </div>
              <h3 className="text-xl font-black mb-2 uppercase tracking-tighter">No {activeTab} requests</h3>
              <p className="text-muted-foreground text-sm font-medium">
                {activeTab === 'incoming' 
                  ? "When others want to learn from you, their requests will show up here." 
                  : "Go to the discovery page to find skills you want to learn!"}
              </p>
              {activeTab === 'outgoing' && (
                <Button onClick={() => navigate("/tasks/direct")} className="mt-8 rounded-full h-12 px-8 font-black uppercase text-[10px] tracking-widest">
                  Explore Tasks
                </Button>
              )}
            </motion.div>
          ) : (
            <div className="grid gap-6">
              <AnimatePresence mode="popLayout">
                {currentRequests.map((req, i) => (
                  <motion.div
                    key={req.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: i * 0.05 }}
                    className="group relative flex flex-col md:flex-row md:items-center p-6 md:p-8 rounded-[40px] border border-border bg-card/50 backdrop-blur-xl hover:border-primary/40 hover:shadow-2xl transition-all duration-500 overflow-hidden"
                  >
                    {/* Status Indicator */}
                    <div className="flex items-center gap-4 mb-6 md:mb-0 md:w-1/3">
                      <div className="relative">
                        <div className="h-14 w-14 rounded-2xl bg-secondary flex items-center justify-center font-black text-xl text-primary border border-border group-hover:scale-110 transition-transform">
                          {activeTab === 'incoming' ? (req.requester?.name?.[0] || '?') : (req.task.posted_by?.[0] || 'T')}
                        </div>
                        <div className={`absolute -bottom-1 -right-1 h-6 w-6 rounded-lg flex items-center justify-center border-2 border-card ${
                          req.status === 'accepted' ? "bg-primary text-primary-foreground" : 
                          req.status === 'declined' ? "bg-destructive text-destructive-foreground" : "bg-yellow-500 text-white"
                        }`}>
                          {req.status === 'accepted' ? <CheckCircle2 className="h-3 w-3" /> : 
                           req.status === 'declined' ? <XCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                        </div>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                          {activeTab === 'incoming' ? "Requested by" : "To Mentor"}
                        </span>
                        <h4 className="font-black text-lg truncate leading-none">
                          {activeTab === 'incoming' ? req.requester?.name : "Expert Member"}
                        </h4>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 mb-6 md:mb-0 md:px-8">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                          req.type === 'broadcast' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : "bg-primary/10 text-primary border-primary/20"
                        }`}>
                          {req.type === 'broadcast' ? "Cohort" : "Direct Swap"}
                        </div>
                        <span className="text-[10px] font-black text-muted-foreground uppercase opacity-40">
                          {new Date(req.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="text-xl font-black tracking-tight mb-1 truncate">
                        {req.task.title}
                      </h3>
                      {req.type === 'direct' && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {req.task.offering && (
                            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[8px] font-black uppercase">Giving: {req.task.offering}</span>
                          )}
                          {req.task.wanting && (
                            <span className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground text-[8px] font-black uppercase">Seeking: {req.task.wanting}</span>
                          )}
                        </div>
                      )}
                      <p className="text-sm text-muted-foreground font-medium truncate italic opacity-80">
                        "{req.message || "No message provided"}"
                      </p>
                    </div>

                    <div className="flex items-center gap-3 md:w-1/4 justify-end">
                      {activeTab === 'incoming' && req.status === 'pending' ? (
                        <>
                          <Button 
                            onClick={() => handleAction(req.id, req.task_id, 'accepted', req.type)}
                            className="h-12 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-none"
                          >
                            Accept
                          </Button>
                          <Button 
                            variant="ghost"
                            onClick={() => handleAction(req.id, req.task_id, 'declined', req.type)}
                            className="h-12 px-6 rounded-2xl bg-secondary/50 font-black text-[10px] uppercase tracking-widest hover:bg-destructive/10 hover:text-destructive transition-colors"
                          >
                            Decline
                          </Button>
                        </>
                      ) : (
                        <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl border ${
                          req.status === 'accepted' ? "border-primary/20 bg-primary/5 text-primary" : 
                          req.status === 'declined' ? "border-destructive/20 bg-destructive/5 text-destructive" : "border-border bg-secondary/30 text-muted-foreground"
                        }`}>
                          <span className="text-[10px] font-black uppercase tracking-widest">
                            {req.status === 'accepted' ? "Accepted" : req.status === 'declined' ? "Declined" : "Still Pending"}
                          </span>
                          {req.status === 'accepted' && (
                            <Button 
                              onClick={() => navigate('/chat')}
                              variant="ghost" 
                              className="h-8 w-8 p-0 rounded-lg hover:bg-primary/20"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Gradient highlight on hover */}
                    <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
