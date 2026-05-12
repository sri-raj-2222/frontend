import { motion } from "framer-motion"
import { 
  Zap, 
  Shield, 
  MessageSquare, 
  Send,
  Workflow,
  FileText,
  Mic,
} from "lucide-react"
import { 
  GitHubLogoIcon, 
  TwitterLogoIcon, 
  LinkedInLogoIcon 
} from "@radix-ui/react-icons"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import AuthDialog from "@/components/ui/auth-dialog"

export default function Home() {
  return (
    <div className="min-h-screen w-full bg-background selection:bg-primary/20 selection:text-primary transition-colors duration-300">
      <Navbar />
      
      <main>
        {/* Hero Section */}
        <section className="px-6 min-h-[calc(100vh-64px)] max-w-7xl mx-auto flex flex-col items-center justify-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border-slim border-border bg-secondary/50 text-xs font-semibold text-primary mb-8"
          >
            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
            Introducing Share Sphere 2.0
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-8xl font-black tracking-tighter mb-8 text-foreground leading-[0.9]"
          >
            Show up. Swap up.
          </motion.h1>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center gap-3 mb-12"
          >
            <p className="text-2xl md:text-3xl font-semibold text-foreground tracking-tight max-w-xl leading-snug">
              <span className="text-primary font-black">"</span>
              You know more than you think.
              <span className="text-primary font-black">"</span>
            </p>
            <p className="text-sm md:text-base text-muted-foreground font-medium tracking-wide max-w-sm">
              Every skill you have is worth something to someone.
            </p>
          </motion.div>

          
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
          >
            <AuthDialog 
              initialMode="login"
              trigger={
                <Button className="h-16 px-12 rounded-full text-xl font-black bg-primary text-primary-foreground hover:opacity-90 shadow-none transition-all hover:scale-105 active:scale-95">
                  Explore
                </Button>
              } 
            />
          </motion.div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="px-6 py-24 border-t border-slim border-border bg-background">
          <div className="max-w-7xl mx-auto">
            <div className="mb-16 text-center md:text-left">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-primary">How it works</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { step: "01", title: "Post what you need", desc: "Share your requirements and what you offer in return.", icon: Send },
                { step: "02", title: "AI matches you", desc: "Our algorithm finds the perfect skill exchange instantly.", icon: Zap },
                { step: "03", title: "Chat and exchange", desc: "Schedule a session and start trading knowledge.", icon: MessageSquare }
              ].map((item, idx) => (
                <div key={idx} className="p-8 rounded-2xl border-slim border-border bg-card hover:border-primary transition-all duration-300 group hover:translate-y-[-4px]">
                  <div className="flex justify-between items-start mb-6">
                    <item.icon className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-2xl font-black text-muted-foreground/20 italic">{item.step}</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-foreground">{item.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why Share Sphere */}
        <section id="features" className="px-6 py-24 border-t border-slim border-border bg-background/50">
          <div className="max-w-7xl mx-auto">
            <div className="mb-20 text-center">
              <h2 className="text-4xl font-black tracking-tight mb-4">Why Share Sphere?</h2>
              <p className="text-muted-foreground">The tools you need to move faster.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-16">
              {[
                { title: "Smart trade loops", desc: "AI identifies complex multi-user exchange opportunities you might miss.", icon: Workflow },
                { title: "Verified skill badges", desc: "Get endorsed by partners and display verified expertise on your profile.", icon: Shield },
                { title: "Skill passport PDF", desc: "Export your exchange history as a professional knowledge resume.", icon: FileText },
                { title: "AI session transcription", desc: "Automatically record and transcribe every session for easy review.", icon: Mic }
              ].map((feature, idx) => (
                <div key={idx} className="flex gap-6 items-start">
                  <div className="shrink-0 h-12 w-12 rounded-xl bg-secondary flex items-center justify-center border-slim border-border">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-foreground">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed text-sm">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="px-6 py-20 border-t border-slim border-border bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-6 group">
                <div className="h-10 w-10 flex items-center justify-center">
                  <img src="/logo.png" alt="ShareSphere" className="h-full w-auto object-contain dark:invert transition-all" />
                </div>
                <span className="font-black text-xl tracking-tighter">ShareSphere</span>
              </div>
              <p className="text-muted-foreground max-w-xs leading-relaxed font-medium">
                The world's first decentralized peer-to-peer skill exchange platform.
              </p>
            </div>
            
            <div>
              <h4 className="font-black text-xs uppercase tracking-widest mb-6 text-primary">Product</h4>
              <ul className="space-y-4 text-sm text-muted-foreground font-bold">
                <li><a href="#" className="hover:text-primary transition-colors">About</a></li>
                <li><a href="#how-it-works" className="hover:text-primary transition-colors">How it works</a></li>
                <li><a href="#features" className="hover:text-primary transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Blog</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-black text-xs uppercase tracking-widest mb-6 text-primary">Connect</h4>
              <div className="flex gap-4">
                <a href="#" className="h-10 w-10 rounded-full border-slim border-border flex items-center justify-center hover:border-primary transition-all hover:bg-secondary">
                  <TwitterLogoIcon className="h-5 w-5" />
                </a>
                <a href="#" className="h-10 w-10 rounded-full border-slim border-border flex items-center justify-center hover:border-primary transition-all hover:bg-secondary">
                  <GitHubLogoIcon className="h-5 w-5" />
                </a>
                <a href="#" className="h-10 w-10 rounded-full border-slim border-border flex items-center justify-center hover:border-primary transition-all hover:bg-secondary">
                  <LinkedInLogoIcon className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>

          <div className="pt-12 border-t border-slim border-border flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">
            <p>Â© 2024 ShareSphere Inc. All rights reserved.</p>
            <div className="flex gap-8">
              <a href="#" className="hover:text-primary transition-colors">Privacy</a>
              <a href="#" className="hover:text-primary transition-colors">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
