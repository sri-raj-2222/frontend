import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { Shield, Mail, Lock, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react"

const API = "https://backend-a41z.onrender.com"

export default function AdminLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await fetch(`${API}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Invalid email or password.")
        return
      }

      // Store session in localStorage
      localStorage.setItem("admin_session", JSON.stringify(data.admin))

      // ✅ Land directly on admin dashboard
      navigate("/admin", { replace: true })

    } catch {
      setError("Cannot connect to server. Make sure the backend is running.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">

          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 14, delay: 0.1 }}
              className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center mb-4 shadow-lg"
            >
              <Shield className="h-7 w-7 text-primary-foreground" />
            </motion.div>
            <h1 className="text-xl font-bold text-foreground">Admin Portal</h1>
            <p className="text-sm text-muted-foreground mt-1">ShareSphere — Restricted Access</p>
          </div>

          {/* Error banner */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 mb-5"
            >
              <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Email
              </label>
              <div className="flex items-center gap-2 bg-secondary border border-border rounded-xl px-3 py-2.5 focus-within:border-primary transition-colors">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@sharesphere.com"
                  required
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Password
              </label>
              <div className="flex items-center gap-2 bg-secondary border border-border rounded-xl px-3 py-2.5 focus-within:border-primary transition-colors">
                <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <motion.button
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading
                ? <><Loader2 className="h-4 w-4 animate-spin" />Verifying...</>
                : <><Shield className="h-4 w-4" />Sign in to Admin Panel</>
              }
            </motion.button>
          </form>

          {/* Default credentials hint */}
          <div className="mt-5 p-3 bg-secondary rounded-xl border border-border">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
              Default Credentials
            </p>
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Email:</span> admin@sharesphere.com
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              <span className="font-medium text-foreground">Password:</span> Admin@123
            </p>
          </div>

          {/* Back link */}
          <p className="text-center mt-5">
            <a href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              ← Return to ShareSphere
            </a>
          </p>
        </div>
      </motion.div>
    </div>
  )
}

