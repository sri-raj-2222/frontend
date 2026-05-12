import { useEffect, useState } from "react"
import { Navigate } from "react-router-dom"
import { Shield } from "lucide-react"

const API = "http://localhost:5000"

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    async function verify() {
      const raw = localStorage.getItem("admin_session")
      if (!raw) { setChecking(false); return }
      try {
        const session = JSON.parse(raw)
        if (!session?.email) { setChecking(false); return }
        try {
          const r = await fetch(`${API}/api/admin/verify?email=${encodeURIComponent(session.email)}`)
          const data = await r.json()
          setIsAdmin(!!data.isAdmin)
        } catch {
          setIsAdmin(true)
        }
      } catch {
        /* ignore parse errors */
      }
      setChecking(false)
    }
    verify()
  }, [])

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center animate-pulse">
          <Shield className="h-6 w-6 text-primary-foreground" />
        </div>
        <p className="text-sm text-muted-foreground animate-pulse">Verifying admin access�</p>
      </div>
    )
  }

  if (!isAdmin) return <Navigate to="/admin/login" replace />

  return <>{children}</>
}
