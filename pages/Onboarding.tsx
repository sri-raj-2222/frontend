import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  Upload, 
  FileText, 
  Link2, 
  Globe, 
  Search,
  X,
  MapPin,
  Briefcase
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import ProfilePicSelector from "@/components/ui/profile-pic-selector"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"

const STEPS = [
  { id: 1, title: "Account" },
  { id: 2, title: "Profile" },
  { id: 3, title: "Resume" },
  { id: 4, title: "Skills" },
]

const SKILLS_LIST = [
  "React", "Node.js", "TypeScript", "Python", "UI Design", 
  "UX Research", "Graphic Design", "Content Writing", "SEO",
  "Digital Marketing", "Project Management", "Data Analysis",
  "Machine Learning", "Cloud Computing", "DevOps", "Docker",
  "Kubernetes", "Next.js", "Tailwind CSS", "Figma"
]

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(2) // Start at step 2 as requested
  const [formData, setFormData] = useState({
    profile: {
      photo: null as string | null,
      title: "",
      location: "",
      bio: ""
    },
    resume: {
      file: null as File | null,
      linkedin: "",
      portfolio: ""
    },
    skills: [] as string[]
  })
  
  const [skillSearch, setSkillSearch] = useState("")
  const { user } = useAuth()
  const navigate = useNavigate()

  const handleComplete = async () => {
    if (!user?.id) return
    try {
      // 1. Update Profile
      const profRes = await fetch(`https://backend-a41z.onrender.com/api/user/${user.id}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          avatar_url: formData.profile.photo,
          title: formData.profile.title,
          location: formData.profile.location,
          bio: formData.profile.bio,
        })
      })
      
      if (!profRes.ok) throw new Error("Failed to update profile")

      // 2. Save Skills
      if (formData.skills.length > 0) {
        // We'll just add them for now. In a real app we might clear old ones first.
        // For simplicity during onboarding, we just POST them.
        await Promise.all(formData.skills.map(skill => 
          fetch(`https://backend-a41z.onrender.com/api/user/${user.id}/skills`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              skill_name: skill,
              skill_type: 'offering'
            })
          })
        ))
      }

      navigate("/dashboard")
    } catch (err) {
      console.error("Onboarding Save Error:", err)
      alert("Failed to save profile. Please try again.")
    }
  }

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 5))
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 2))
  const skipStep = () => nextStep()

  const handleSkillToggle = (skill: string) => {
    setFormData(prev => {
      const skills = prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : prev.skills.length < 10 ? [...prev.skills, skill] : prev.skills
      return { ...prev, skills }
    })
  }

  const filteredSkills = SKILLS_LIST.filter(s => 
    s.toLowerCase().includes(skillSearch.toLowerCase()) && !formData.skills.includes(s)
  )

  return (
    <div className="min-h-screen bg-background flex flex-col items-center py-12 px-6">
      {/* Progress Indicator */}
      <div className="w-full max-w-2xl mb-12">
        <div className="relative flex justify-between">
          {/* Connector Line */}
          <div className="absolute top-5 left-0 w-full h-0.5 bg-muted -z-10" />
          <motion.div 
            className="absolute top-5 left-0 h-0.5 bg-primary -z-10"
            initial={{ width: "0%" }}
            animate={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
          
          {STEPS.map((step) => {
            const isCompleted = currentStep > step.id || currentStep === 5
            const isCurrent = currentStep === step.id
            
            return (
              <div key={step.id} className="flex flex-col items-center">
                <motion.div 
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors duration-300 bg-background",
                    isCompleted ? "border-primary bg-primary text-primary-foreground" : 
                    isCurrent ? "border-primary text-primary" : "border-muted text-muted-foreground"
                  )}
                  animate={isCurrent ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ repeat: isCurrent ? Infinity : 0, duration: 2 }}
                >
                  {isCompleted ? <Check className="w-6 h-6" /> : <span>{step.id}</span>}
                </motion.div>
                <span className={cn(
                  "mt-2 text-xs font-medium uppercase tracking-wider",
                  isCompleted ? "text-primary" : isCurrent ? "text-primary" : "text-muted-foreground"
                )}>
                  {step.title}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="w-full max-w-xl bg-card border border-border rounded-3xl p-8 shadow-xl relative overflow-hidden">
        <AnimatePresence mode="wait">
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2 mb-8">
                <h2 className="text-3xl font-bold">Your Profile</h2>
                <p className="text-muted-foreground">Tell us a bit about who you are.</p>
              </div>

              <div className="space-y-6">
                <ProfilePicSelector 
                  selectedImage={formData.profile.photo} 
                  onImageSelect={(img) => setFormData(p => ({ ...p, profile: { ...p.profile, photo: img } }))} 
                />

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Professional Title</Label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input 
                        id="title" 
                        className="pl-10" 
                        placeholder="e.g. Senior Frontend Developer" 
                        value={formData.profile.title}
                        onChange={(e) => setFormData(p => ({ ...p, profile: { ...p.profile, title: e.target.value } }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input 
                        id="location" 
                        className="pl-10" 
                        placeholder="e.g. San Francisco, CA" 
                        value={formData.profile.location}
                        onChange={(e) => setFormData(p => ({ ...p, profile: { ...p.profile, location: e.target.value } }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Short Bio</Label>
                    <Textarea 
                      id="bio" 
                      placeholder="Share a brief overview of your experience and what you're looking for..." 
                      className="min-h-[100px] resize-none"
                      value={formData.profile.bio}
                      onChange={(e) => setFormData(p => ({ ...p, profile: { ...p.profile, bio: e.target.value } }))}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 flex flex-col gap-4">
                <Button onClick={nextStep} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 rounded-xl text-lg font-semibold">
                  Continue
                </Button>
                <button onClick={skipStep} className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4">
                  Skip this step
                </button>
              </div>
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2 mb-8">
                <h2 className="text-3xl font-bold">Resume & Links</h2>
                <p className="text-muted-foreground">Upload your resume and share your professional profiles.</p>
              </div>

              <div className="space-y-6">
                <div 
                  className={cn(
                    "border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-colors text-center cursor-pointer",
                    formData.resume.file ? "border-primary/50 bg-primary/5" : "border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5"
                  )}
                  onClick={() => document.getElementById("resume-upload")?.click()}
                >
                  <input 
                    type="file" 
                    id="resume-upload" 
                    className="hidden" 
                    accept=".pdf,.docx"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file && file.size <= 5 * 1024 * 1024) {
                        setFormData(p => ({ ...p, resume: { ...p.resume, file } }))
                      }
                    }}
                  />
                  {formData.resume.file ? (
                    <div className="space-y-2">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                        <FileText className="w-6 h-6 text-primary" />
                      </div>
                      <p className="font-medium">{formData.resume.file.name}</p>
                      <p className="text-xs text-muted-foreground">{(formData.resume.file.size / (1024 * 1024)).toFixed(2)} MB • Click to replace</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                        <Upload className="w-6 h-6 text-primary" />
                      </div>
                      <p className="font-medium">Click or drag to upload resume</p>
                      <p className="text-xs text-muted-foreground">PDF or DOCX (Max 5MB)</p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="linkedin">LinkedIn Profile URL</Label>
                    <div className="relative">
                      <Link2 className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input 
                        id="linkedin" 
                        className="pl-10" 
                        placeholder="linkedin.com/in/username" 
                        value={formData.resume.linkedin}
                        onChange={(e) => setFormData(p => ({ ...p, resume: { ...p.resume, linkedin: e.target.value } }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="portfolio">Portfolio / Website URL</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input 
                        id="portfolio" 
                        className="pl-10" 
                        placeholder="yourportfolio.com" 
                        value={formData.resume.portfolio}
                        onChange={(e) => setFormData(p => ({ ...p, resume: { ...p.resume, portfolio: e.target.value } }))}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 flex flex-col gap-4">
                <div className="flex gap-4">
                  <Button variant="outline" onClick={prevStep} className="flex-1 h-12 rounded-xl">
                    <ChevronLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                  <Button onClick={nextStep} className="flex-[2] bg-primary hover:bg-primary/90 text-primary-foreground h-12 rounded-xl text-lg font-semibold">
                    Continue <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
                <button onClick={skipStep} className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4 text-center">
                  Skip this step
                </button>
              </div>
            </motion.div>
          )}

          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2 mb-8">
                <h2 className="text-3xl font-bold">Skills</h2>
                <p className="text-muted-foreground">Select up to 10 skills that define your expertise.</p>
              </div>

              <div className="space-y-6">
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search skills..." 
                    className="pl-10 rounded-xl"
                    value={skillSearch}
                    onChange={(e) => setSkillSearch(e.target.value)}
                  />
                </div>

                <div className="space-y-4">
                  {formData.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-4 bg-muted/30 rounded-2xl border border-border/50">
                      {formData.skills.map(skill => (
                        <motion.button
                          layoutId={skill}
                          key={skill}
                          onClick={() => handleSkillToggle(skill)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:bg-primary/90 transition-colors"
                        >
                          {skill} <X className="w-3.5 h-3.5" />
                        </motion.button>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto pr-2 scrollbar-hide">
                    {filteredSkills.map(skill => (
                      <motion.button
                        layoutId={skill}
                        key={skill}
                        onClick={() => handleSkillToggle(skill)}
                        className="px-3 py-1.5 bg-background border border-border rounded-full text-sm font-medium hover:border-primary/50 hover:bg-primary/5 transition-all"
                      >
                        {skill}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    {formData.skills.length}/10 skills selected
                  </p>
                </div>
              </div>

              <div className="pt-6 flex flex-col gap-4">
                <div className="flex gap-4">
                  <Button variant="outline" onClick={prevStep} className="flex-1 h-12 rounded-xl">
                    <ChevronLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                  <Button onClick={nextStep} className="flex-[2] bg-primary hover:bg-primary/90 text-primary-foreground h-12 rounded-xl text-lg font-semibold">
                    Complete Registration <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
                <button onClick={skipStep} className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4 text-center">
                  Skip this step
                </button>
              </div>
            </motion.div>
          )}

          {currentStep === 5 && (
            <motion.div
              key="success"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center space-y-8 py-4"
            >
              <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10 text-primary-foreground" />
              </div>

              <div className="space-y-4">
                <h2 className="text-4xl font-extrabold tracking-tight">Success!</h2>
                <p className="text-xl text-muted-foreground">
                  Welcome to the sphere, <span className="text-foreground font-bold">{user?.name || "Member"}</span>!
                </p>
              </div>

              <div className="bg-muted/30 rounded-3xl p-6 text-left space-y-4 border border-border/50">
                <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground">Onboarding Summary</h3>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <div className={cn("w-5 h-5 rounded-full flex items-center justify-center", formData.profile.title ? "bg-primary/20" : "bg-muted-foreground/20")}>
                      {formData.profile.title ? <Check className="w-3 h-3 text-primary" /> : <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />}
                    </div>
                    <span className="text-sm">Profile Information: <span className="font-medium">{formData.profile.title || "Skipped"}</span></span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className={cn("w-5 h-5 rounded-full flex items-center justify-center", formData.resume.file ? "bg-primary/20" : "bg-muted-foreground/20")}>
                      {formData.resume.file ? <Check className="w-3 h-3 text-primary" /> : <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />}
                    </div>
                    <span className="text-sm">Resume Upload: <span className="font-medium">{formData.resume.file ? "Uploaded" : "Skipped"}</span></span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className={cn("w-5 h-5 rounded-full flex items-center justify-center", formData.skills.length > 0 ? "bg-primary/20" : "bg-muted-foreground/20")}>
                      {formData.skills.length > 0 ? <Check className="w-3 h-3 text-primary" /> : <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />}
                    </div>
                    <span className="text-sm">Skills Added: <span className="font-medium">{formData.skills.length || "Skipped"}</span></span>
                  </li>
                </ul>
              </div>

              <p className="text-sm text-muted-foreground">
                You can always complete or update these sections later from your dashboard settings.
              </p>

              <Button onClick={handleComplete} className="w-full bg-foreground text-background hover:bg-foreground/90 h-14 rounded-2xl text-lg font-bold shadow-lg shadow-foreground/10 transition-all hover:scale-[1.02] active:scale-95">
                Go to Dashboard
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
