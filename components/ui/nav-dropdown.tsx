
import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface NavDropdownProps {
  label: string
  items: { 
    label: string; 
    description?: string; 
    icon?: LucideIcon; 
    href?: string; 
    onClick?: () => void 
  }[]
  isMega?: boolean
}

export function NavDropdown({ label, items, isMega = false }: NavDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-1 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors",
          isOpen && "text-foreground"
        )}
      >
        {label}
        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={cn(
              "absolute left-0 mt-2 rounded-2xl border-slim border-border bg-card p-2 shadow-sm z-50",
              isMega ? "w-[400px]" : "w-48"
            )}
          >
            <div className="grid gap-1">
              {items.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    item.onClick?.()
                    setIsOpen(false)
                  }}
                  className={cn(
                    "w-full text-left rounded-xl transition-all group",
                    isMega ? "p-4 flex gap-4 items-start" : "px-3 py-2"
                  )}
                >
                  <div className="w-full">
                    <a href={item.href || "#"} className="flex gap-4 items-start w-full">
                      {isMega && item.icon && (
                        <div className="mt-1 shrink-0 h-10 w-10 rounded-lg bg-secondary flex items-center justify-center border-slim border-border group-hover:border-primary/50 group-hover:bg-primary/5 transition-colors">
                          <item.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      )}
                      <div>
                        <p className={cn(
                          "text-sm font-bold transition-colors",
                          isMega ? "text-foreground group-hover:text-primary mb-1" : "text-muted-foreground group-hover:text-foreground"
                        )}>
                          {item.label}
                        </p>
                        {isMega && item.description && (
                          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </a>
                  </div>
                </button>
              ))}
            </div>
            
            {isMega && (
              <div className="mt-2 pt-2 border-t border-slim border-border px-4 py-2">
                <a href="#" className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                  View all opportunities <ChevronDown className="-rotate-90 h-3 w-3" />
                </a>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
