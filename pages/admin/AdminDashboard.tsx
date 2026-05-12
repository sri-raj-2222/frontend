import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useNavigate } from "react-router-dom"
import {
  LayoutDashboard, Users, Briefcase, CreditCard, Flag,
  BookOpen, Settings, LogOut, Bell, Search, Menu, X,
  Shield, Loader2, RefreshCw, ChevronDown
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import UserManagement from "./UserManagement"
import ReportsPanel from "./ReportsPanel"

const API = "https://backend-a41z.onrender.com"

// ── Status badge colours ──────────────────────────────────────────────────────
const badge: Record<string, string> = {
  open: "text-blue-600 dark:text-blue-400 bg-blue-500/10",
  active: "text-primary bg-primary/10",
  matched: "text-primary bg-primary/10",
  completed: "text-muted-foreground bg-muted",
  done: "text-muted-foreground bg-muted",
  pending: "text-yellow-600 dark:text-yellow-400 bg-yellow-500/10",
  declined: "text-destructive bg-destructive/10",
  resolved: "text-primary bg-primary/10",
  disputed: "text-destructive bg-destructive/10",
  high: "text-destructive font-semibold",
  medium: "text-yellow-600 dark:text-yellow-400 font-semibold",
  low: "text-muted-foreground font-semibold",
  user: "text-blue-600 dark:text-blue-400 bg-blue-500/10",
  admin: "text-primary bg-primary/10",
}

function Badge({ v }: { v: string }) {
  const cls = badge[v?.toLowerCase()] ?? "text-foreground bg-secondary"
  return <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${cls}`}>{v}</span>
}

function Empty({ label }: { label: string }) {
  return (
    <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
      <BookOpen className="h-8 w-8 opacity-30" />
      <p className="text-sm font-medium">No {label} yet</p>
    </div>
  )
}

// ── Sidebar items ─────────────────────────────────────────────────────────────
const sidebarItems = [
  { icon: LayoutDashboard, label: "Overview", id: "overview" },
  { icon: Users, label: "Users", id: "users" },
  { icon: Briefcase, label: "Projects", id: "projects" },
  { icon: CreditCard, label: "Payments", id: "payments" },
  { icon: Flag, label: "Reports", id: "reports" },
  { icon: BookOpen, label: "Sessions", id: "sessions" },
  { icon: Settings, label: "Settings", id: "settings" },
]

// ── Main component ─────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate()
  const [sidebar, setSidebar] = useState(true)
  const [active, setActive] = useState("overview")
  const [loading, setLoading] = useState(true)
  const [refresh, setRefresh] = useState(0)

  // ── Real data states ───────────────────────────────────────────────────────
  const [stats, setStats] = useState<Record<string, number>>({})
  const [users, setUsers] = useState<Record<string, unknown>[]>([])
  const [tasks, setTasks] = useState<Record<string, unknown>[]>([])
  const [sessions, setSessions] = useState<Record<string, unknown>[]>([])
  const [, setDisputes] = useState<Record<string, unknown>[]>([])
  const [reviews, setReviews] = useState<Record<string, unknown>[]>([])

  const adminSession = (() => {
    try { return JSON.parse(localStorage.getItem("admin_session") || "{}") } catch { return {} }
  })()
  const adminName: string = adminSession.name || "Admin"

  const handleLogout = () => {
    localStorage.removeItem("admin_session")
    navigate("/", { replace: true })
  }

  // ── Fetch all data ─────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        // Express endpoints
        const [statsR, tasksR, sessR, dispR, revR] = await Promise.allSettled([
          fetch(`${API}/api/admin/data/stats`).then(r => r.json()),
          fetch(`${API}/api/admin/data/tasks`).then(r => r.json()),
          fetch(`${API}/api/admin/data/sessions`).then(r => r.json()),
          fetch(`${API}/api/admin/data/disputes`).then(r => r.json()),
          fetch(`${API}/api/admin/data/reviews`).then(r => r.json()),
        ])

        if (statsR.status === "fulfilled") setStats(statsR.value)
        if (tasksR.status === "fulfilled") setTasks(Array.isArray(tasksR.value) ? tasksR.value : [])
        if (sessR.status === "fulfilled") setSessions(Array.isArray(sessR.value) ? sessR.value : [])
        if (dispR.status === "fulfilled") setDisputes(Array.isArray(dispR.value) ? dispR.value : [])
        if (revR.status === "fulfilled") setReviews(Array.isArray(revR.value) ? revR.value : [])

        // Supabase: users/profiles
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name, email, role, profile_pic, updated_at")
          .order("updated_at", { ascending: false })
        setUsers(profiles || [])

      } catch (e) { console.error("Admin data fetch error:", e) }
      finally { setLoading(false) }
    }
    load()
  }, [refresh])

  // ── Stat cards ─────────────────────────────────────────────────────────────
  const cards = [
    { label: "Total Users", value: users.length, icon: Users },
    { label: "Total Tasks", value: stats.totalTasks ?? 0, icon: Briefcase },
    { label: "Active Tasks", value: stats.activeTasks ?? 0, icon: Briefcase },
    { label: "Live Sessions", value: stats.activeRooms ?? 0, icon: BookOpen },
    { label: "Reports", value: stats.totalDisputes ?? 0, icon: Flag },
    { label: "Reviews", value: stats.totalReviews ?? 0, icon: CreditCard },
  ]

  // ── Table renderer ─────────────────────────────────────────────────────────
  const renderTable = () => {
    if (active === "users") return (
      <Table
        title="All Users"
        headers={["Name", "Email", "Role", "Last Updated"]}
        rows={users.map(u => [
          (u.name as string) || "—",
          (u.email as string) || "—",
          <Badge v={(u.role as string) || "user"} />,
          u.updated_at ? new Date(u.updated_at as string).toLocaleDateString() : "—",
        ]) as (string | number | React.ReactNode)[][]}
        empty="users"
      />
    )

    if (active === "projects") return (
      <Table
        title="All Tasks / Projects"
        headers={["Title", "Type", "Offering", "Wanting", "Status", "Posted By"]}
        rows={tasks.map(t => [
          (t.title as string) || "—",
          (t.type as string) || "—",
          (t.offering as string) || "—",
          (t.wanting as string) || "—",
          <Badge v={t.status as string} />,
          (t.user_name as string) || "—",
        ]) as (string | number | React.ReactNode)[][]}
        empty="tasks"
      />
    )

    if (active === "sessions") return (
      <Table
        title="All Sessions"
        headers={["Session", "Participants", "Messages", "Status", "Created"]}
        rows={sessions.map(s => [
          (s.task_title as string) || (s.id as string),
          ((s.participants as any[])?.length ?? 0),
          (s.message_count as number) ?? 0,
          <Badge v={s.status as string} />,
          s.created_at ? new Date(s.created_at as string).toLocaleDateString() : "—",
        ]) as (string | number | React.ReactNode)[][]}
        empty="sessions"
      />
    )

    if (active === "reports") return <ReportsPanel />

    if (active === "payments") return (
      <Table
        title="Reviews & Payments"
        headers={["Reviewer", "Reviewed", "Rating", "Comment", "Date"]}
        rows={reviews.map(r => [
          r.reviewer as string,
          r.reviewed as string,
          r.rating ? `${"★".repeat(r.rating as number)}${"☆".repeat(5 - (r.rating as number))}` : "—",
          (r.comment as string) || "—",
          r.created_at ? new Date(r.created_at as string).toLocaleDateString() : "—",
        ]) as (string | number | React.ReactNode)[][]}
        empty="reviews"
      />
    )

    return null
  }

  // Profile dropdown state
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const pageTitle = sidebarItems.find(i => i.id === active)?.label ?? 'Overview'

  return (
    <div className="min-h-screen bg-background text-foreground flex">

      {/* ════════════════════════════════════════════
          SIDEBAR
      ════════════════════════════════════════════ */}
      <motion.aside
        initial={false}
        animate={{ width: sidebar ? 220 : 0, opacity: sidebar ? 1 : 0 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className="shrink-0 border-r border-border bg-card flex flex-col sticky top-0 h-screen overflow-hidden z-40"
      >
        <div className="w-[220px]">
          {/* Brand */}
          <div className="flex items-center gap-2.5 px-5 h-16 border-b border-border">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20">
              <Shield className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground leading-tight">ShareSphere</p>
              <p className="text-[10px] font-semibold text-primary uppercase tracking-widest leading-tight">Admin</p>
            </div>
          </div>

          {/* Nav */}
          <nav className="px-3 py-4 space-y-0.5">
            {sidebarItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActive(item.id)}
                className="relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors group"
              >
                {/* Sliding active pill */}
                {active === item.id && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-xl bg-primary/10"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}
                <item.icon className={`relative h-4 w-4 shrink-0 transition-colors ${active === item.id ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                  }`} />
                <span className={`relative transition-colors ${active === item.id ? 'text-primary font-semibold' : 'text-muted-foreground group-hover:text-foreground'
                  }`}>{item.label}</span>
                {/* Active left stripe */}
                {active === item.id && (
                  <motion.div
                    layoutId="sidebar-stripe"
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-full bg-primary"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}
              </button>
            ))}
          </nav>

          {/* Bottom: admin info */}
          <div className="absolute bottom-0 left-0 right-0 border-t border-border p-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0">
                {adminName[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{adminName}</p>
                <p className="text-[10px] text-muted-foreground truncate capitalize">{adminSession.role || 'admin'}</p>
              </div>
              <button onClick={handleLogout}
                title="Sign out"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* ════════════════════════════════════════════
          MAIN COLUMN
      ════════════════════════════════════════════ */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">

        {/* ── Top bar ─────────────────────────────────────────── */}
        <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/95 backdrop-blur-sm flex items-center gap-4 px-6">

          {/* Hamburger */}
          <motion.button
            onClick={() => setSidebar(s => !s)}
            whileTap={{ scale: 0.9 }}
            className="p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <AnimatePresence mode="wait" initial={false}>
              {sidebar ? (
                <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                  <X className="h-4 w-4" />
                </motion.span>
              ) : (
                <motion.span key="m" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                  <Menu className="h-4 w-4" />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>

          {/* Page title */}
          <AnimatePresence mode="wait">
            <motion.h1
              key={pageTitle}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="text-base font-bold text-foreground"
            >
              {pageTitle}
            </motion.h1>
          </AnimatePresence>

          {/* Search */}
          <div className="flex items-center gap-2 bg-secondary border border-border rounded-xl px-3 py-2 flex-1 max-w-xs ml-4">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              placeholder="Search anything…"
              className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none flex-1 min-w-0"
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Refresh */}
            <motion.button
              whileTap={{ rotate: 180 }}
              transition={{ duration: 0.35 }}
              onClick={() => setRefresh(r => r + 1)}
              className="p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </motion.button>

            {/* Bell */}
            <button className="relative p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
              <Bell className="h-4 w-4" />
            </button>

            {/* Divider */}
            <div className="h-6 w-px bg-border mx-1" />

            {/* Profile dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(o => !o)}
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-secondary transition-colors"
              >
                <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                  {adminName[0]?.toUpperCase()}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-semibold text-foreground leading-tight">{adminName}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight capitalize">{adminSession.role || 'Admin'}</p>
                </div>
                <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.97 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute right-0 top-full mt-2 w-52 bg-card border border-border rounded-2xl shadow-xl overflow-hidden z-50"
                  >
                    <div className="px-4 py-3 border-b border-border">
                      <p className="text-sm font-semibold text-foreground">{adminName}</p>
                      <p className="text-xs text-muted-foreground truncate">{adminSession.email}</p>
                    </div>
                    <div className="p-2">
                      <button
                        onClick={() => { setActive('settings'); setProfileOpen(false) }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      >
                        <Settings className="h-4 w-4" /> Settings
                      </button>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <LogOut className="h-4 w-4" /> Sign out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-24 gap-3 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Loading real data…</span>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div key={active} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

                  {/* Overview */}
                  {active === "overview" && (
                    <div>
                      <div className="mb-6">
                        <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Live Data</p>
                        <h1 className="text-2xl font-bold text-foreground">Platform Overview</h1>
                        <p className="text-sm text-muted-foreground mt-1">Welcome back, {adminName}</p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
                        {cards.map((c, i) => (
                          <motion.div key={c.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }} whileHover={{ y: -2 }}
                            className="bg-card border border-border rounded-2xl p-4 hover:shadow-md transition-all">
                            <div className="p-1.5 rounded-lg bg-primary/10 w-fit mb-3">
                              <c.icon className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <p className="text-2xl font-bold text-foreground">{c.value}</p>
                            <p className="text-[10px] text-muted-foreground font-medium mt-0.5 truncate">{c.label}</p>
                          </motion.div>
                        ))}
                      </div>

                      {/* Quick access tiles */}
                      <p className="text-sm font-semibold text-muted-foreground mb-4">Quick Access</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                        {[
                          { id: "users", label: "Users", Icon: Users },
                          { id: "projects", label: "Tasks", Icon: Briefcase },
                          { id: "payments", label: "Reviews", Icon: CreditCard },
                          { id: "reports", label: "Reports", Icon: Flag },
                          { id: "sessions", label: "Sessions", Icon: BookOpen },
                        ].map(({ id, label, Icon }) => (
                          <motion.button key={id} whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }}
                            onClick={() => setActive(id)}
                            className="p-4 rounded-2xl bg-card border border-border hover:border-primary/50 hover:shadow-md text-left transition-all group">
                            <div className="p-2 rounded-xl bg-primary/10 w-fit mb-3 group-hover:bg-primary/20 transition-colors">
                              <Icon className="h-4 w-4 text-primary" />
                            </div>
                            <p className="text-sm font-semibold text-foreground">{label}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">View →</p>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* User Management (rich) */}
                  {active === "users" && <UserManagement />}

                  {/* Other data tables */}
                  {active !== "overview" && active !== "settings" && active !== "users" && renderTable()}

                  {/* Settings */}
                  {active === "settings" && (
                    <div className="max-w-lg">
                      <h1 className="text-2xl font-bold mb-6">Settings</h1>
                      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                        <div>
                          <p className="text-sm font-semibold text-foreground">Admin Account</p>
                          <p className="text-xs text-muted-foreground mt-1">{adminSession.email}</p>
                        </div>
                        <div className="h-px bg-border" />
                        <div>
                          <p className="text-sm font-semibold text-foreground">Role</p>
                          <Badge v={adminSession.role || "admin"} />
                        </div>
                        <div className="h-px bg-border" />
                        <div>
                          <p className="text-sm font-semibold text-foreground">Department</p>
                          <p className="text-xs text-muted-foreground mt-1">{adminSession.department || "—"}</p>
                        </div>
                        <div className="h-px bg-border" />
                        <button onClick={handleLogout}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-destructive border border-destructive/30 hover:bg-destructive/10 transition-colors">
                          <LogOut className="h-4 w-4" /> Sign out
                        </button>
                      </div>
                    </div>
                  )}

                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

// ── Reusable Table ─────────────────────────────────────────────────────────────
function Table({ title, headers, rows, empty }: {
  title: string
  headers: string[]
  rows: (string | number | React.ReactNode)[][]
  empty: string
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-border flex items-center gap-3">
        <div className="h-2 w-2 rounded-full bg-primary" />
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <span className="ml-auto text-xs text-muted-foreground">{rows.length} records</span>
      </div>
      {rows.length === 0 ? (
        <Empty label={empty} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                {headers.map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  {row.map((cell, j) => (
                    <td key={j} className="px-6 py-3.5 text-sm text-foreground">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  )
}

