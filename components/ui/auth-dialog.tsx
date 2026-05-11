import { useState, useId } from "react"
import { useNavigate } from "react-router-dom"
import { useGoogleLogin } from "@react-oauth/google"
import { Button } from "@/components/ui/button"
import { GetStartedButton } from "@/components/ui/get-started-button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import AssistedEmailInput from "@/components/ui/assisted-email-input"
import PasswordConfirmInput from "@/components/ui/assisted-password-confirmation"
import ProfilePicSelector from "@/components/ui/profile-pic-selector"
import { supabase } from "@/lib/supabase"

export default function AuthDialog({ 
  trigger, 
  initialMode = "signup" 
}: { 
  trigger?: React.ReactNode;
  initialMode?: "signup" | "login";
}) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<"signup" | "login">(initialMode)
  const [showPassword, setShowPassword] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [avatar, setAvatar] = useState<string | null>(null)
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const id = useId()
  const navigate = useNavigate()
  
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      console.log("Google Login Success:", tokenResponse);
      setIsLoading(true);
      try {
        // Here we would normally send the token to our backend
        // For now, let's simulate a successful login by redirecting to onboarding
        setOpen(false);
        navigate('/onboarding');
      } catch {
        setError("Google authentication failed. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    onError: () => {
      setError("Google Login Failed");
    }
  });

  const toggleMode = () => {
    setMode(mode === "signup" ? "login" : "signup")
    setError(null)
  }
  const togglePassword = () => setShowPassword(!showPassword)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (mode === 'signup' && password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setIsLoading(true)

    try {
      if (mode === 'signup') {
        // ── Regular user sign up via Supabase ──────────────────────────────
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name, profilePic: avatar } }
        })
        if (error) throw error
        if (data.user && data.session === null) {
          setError("Please check your email for a confirmation link.")
          setIsLoading(false)
          return
        }
        setOpen(false)
        navigate('/onboarding')
        return

      } else {
        // ── LOGIN: Try admin first, then regular user ──────────────────────

        // Step 1: Check if email + password matches an admin account
        try {
          const adminRes = await fetch('http://localhost:5000/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.trim().toLowerCase(), password })
          })

          if (adminRes.ok) {
            const adminData = await adminRes.json()
            // ✅ Admin credentials matched — set session and go to admin panel
            localStorage.setItem('admin_session', JSON.stringify(adminData.admin))
            setOpen(false)
            navigate('/admin', { replace: true })
            return
          }
          // If adminRes is 401 (wrong creds for admin), fall through to user login
        } catch {
          // Server might not be running — silently fall through to Supabase login
        }

        // Step 2: Regular Supabase user login
        const { data: loginData, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error

        // ── Ban check: verify the user isn't banned before letting them in ──
        const userId = loginData.user?.id
        if (userId) {
          try {
            const banRes = await fetch(`http://localhost:5000/api/users/${userId}/ban-status`)
            const banData = await banRes.json()
            if (banData.banned) {
              // Sign them back out immediately so the session is not persisted
              await supabase.auth.signOut()
              const banMsg = banData.type === 'permanent'
                ? '🚫 Your account has been permanently suspended. Contact support@sharesphere.app to appeal.'
                : `🚫 Your account is temporarily suspended. It lifts on ${new Date(banData.ban_expires_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.`
              setError(banMsg)
              setIsLoading(false)
              return
            }
          } catch {
            // Server offline — fail open (don't block login if server unreachable)
          }
        }

        setOpen(false)
        navigate('/dashboard')
      }

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid email or password")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => {
      setOpen(val);
      if (val) setMode(initialMode);
    }}>
      <DialogTrigger asChild>
        {trigger || <div><GetStartedButton /></div>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md !rounded-2xl">
        <div className="flex flex-col items-center gap-2">
          <DialogHeader>
            <DialogTitle className="sm:text-center">
              {mode === "signup" ? "Sign Up" : "Login"}
            </DialogTitle>
            <DialogDescription className="sm:text-center">
              {mode === "signup"
                ? "We just need a few details to get you started."
                : "Enter your credentials to log in."}
            </DialogDescription>
          </DialogHeader>
        </div>

        {error && (
          <div className="p-3 rounded-md bg-destructive/15 text-destructive text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div className="space-y-4">
              <ProfilePicSelector selectedImage={avatar} onImageSelect={setAvatar} />
              <div className="*:not-first:mt-2">
                <Label htmlFor={`${id}-name`}>Full name</Label>
                <Input
                  id={`${id}-name`}
                  placeholder="Enter Username"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="rounded-lg"
                />
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="*:not-first:mt-2">
              <AssistedEmailInput 
                value={email} 
                onChange={setEmail} 
                inputPlaceholder="hi@yourcompany.com" 
              />
            </div>
            
            {mode === "signup" ? (
              <PasswordConfirmInput
                password={password}
                confirmPassword={confirmPassword}
                onPasswordChange={setPassword}
                onConfirmChange={setConfirmPassword}
              />
            ) : (
              <div className="relative">
                <Label htmlFor={`${id}-password`}>Password</Label>
                <Input
                  id={`${id}-password`}
                  placeholder="Enter your password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="rounded-lg pr-10"
                />
                <button
                  type="button"
                  onClick={togglePassword}
                  className="absolute right-3 top-[38px] text-muted-foreground"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            )}
          </div>

          <Button type="submit" disabled={isLoading} className="w-full transition-colors duration-300 rounded-lg bg-secondary text-secondary-foreground hover:bg-foreground hover:text-background flex justify-center">
            {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : (mode === "signup" ? "Sign Up" : "Login")}
          </Button>
        </form>

        <div className="mt-2 text-center text-sm text-muted-foreground">
          {mode === "signup" ? (
            <>
              Already have an account?{" "}
              <button className="underline" onClick={toggleMode} type="button">
                Login
              </button>
            </>
          ) : (
            <>
              Don't have an account?{" "}
              <button className="underline" onClick={toggleMode} type="button">
                Sign Up
              </button>
            </>
          )}
        </div>

        {mode === "signup" && (
          <>
            <div className="before:bg-border after:bg-border flex items-center gap-3 before:h-px before:flex-1 after:h-px after:flex-1 my-4">
              <span className="text-muted-foreground text-xs">Or</span>
            </div>
            <Button 
              variant="outline" 
              type="button" 
              onClick={() => googleLogin()}
              className="w-full transition-colors duration-300 rounded-lg hover:bg-foreground hover:text-background flex items-center justify-center gap-2"
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
              Continue with Google
            </Button>
            <p className="text-muted-foreground text-center text-xs mt-2">
              By signing up you agree to our{" "}
              <a className="underline hover:no-underline" href="#">
                Terms
              </a>
              .
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
