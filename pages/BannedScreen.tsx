import { useState } from "react"
import { motion } from "framer-motion"
import { ShieldX, Clock, Mail, LogOut } from "lucide-react"

interface BannedScreenProps {
  type: "temp" | "permanent"
  banExpiresAt?: string | null
  onLogout: () => void
}

function fmtDate(d: string) {
  return new Date(d).toLocaleString("en-US", {
    month: "long", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

function TimeLeft({ expiresAt }: { expiresAt: string }) {
  const [now] = useState(Date.now)
  const ms = new Date(expiresAt).getTime() - now
  if (ms <= 0) return <span>shortly</span>
  const days = Math.floor(ms / (1000 * 60 * 60 * 24))
  const hrs  = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  if (days > 0) return <span>{days} day{days !== 1 ? "s" : ""} and {hrs} hour{hrs !== 1 ? "s" : ""}</span>
  return <span>{hrs} hour{hrs !== 1 ? "s" : ""}</span>
}

export default function BannedScreen({ type, banExpiresAt, onLogout }: BannedScreenProps) {
  const isPermanent = type === "permanent"

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="w-full max-w-md"
      >
        {/* Card */}
        <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-2xl">
          {/* Red top stripe */}
          <div className={`h-1.5 w-full ${isPermanent ? "bg-destructive" : "bg-orange-500"}`} />

          <div className="p-8 space-y-6">
            {/* Icon */}
            <div className="flex justify-center">
              <div className={`h-20 w-20 rounded-3xl flex items-center justify-center
                ${isPermanent ? "bg-destructive/10" : "bg-orange-500/10"}`}>
                {isPermanent
                  ? <ShieldX className="h-10 w-10 text-destructive" />
                  : <Clock className="h-10 w-10 text-orange-500" />}
              </div>
            </div>

            {/* Title */}
            <div className="text-center space-y-2">
              <h1 className="text-xl font-bold text-foreground">
                {isPermanent ? "Account Permanently Suspended" : "Account Temporarily Suspended"}
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {isPermanent
                  ? "Your ShareSphere account has been permanently suspended due to repeated or severe violations of our community guidelines."
                  : "Your ShareSphere account has been temporarily suspended due to a violation of our community guidelines."}
              </p>
            </div>

            {/* Duration info */}
            {!isPermanent && banExpiresAt && (
              <div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-4 space-y-1">
                <p className="text-xs font-bold uppercase tracking-widest text-orange-500">Suspension ends in</p>
                <p className="text-sm font-semibold text-foreground">
                  <TimeLeft expiresAt={banExpiresAt} />
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Lifts on {fmtDate(banExpiresAt)}
                </p>
              </div>
            )}

            {/* Appeal info */}
            <div className="bg-secondary/40 border border-border rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary shrink-0" />
                <p className="text-xs font-bold uppercase tracking-widest text-primary">Appeal this decision</p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                If you believe this suspension was made in error, you may contact our moderation team at{" "}
                <a href="mailto:support@sharesphere.app"
                  className="text-primary font-semibold hover:underline">
                  support@sharesphere.app
                </a>
                . Include your account email and any relevant context.
              </p>
            </div>

            {/* Sign out */}
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>

        <p className="text-center text-[11px] text-muted-foreground/60 mt-4">
          ShareSphere Â· Community Guidelines Enforcement
        </p>
      </motion.div>
    </div>
  )
}
