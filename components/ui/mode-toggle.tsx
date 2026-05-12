import { Moon, Sun } from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"

export function ModeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()

  return (
    <Button
      variant="outline"
      size="icon"
      className={`h-10 w-10 text-muted-foreground shadow-none border-0 hover:bg-slate-100 dark:hover:bg-slate-800 ${className || ""}`}
      onClick={() => setTheme(theme === "dark" || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches) ? "light" : "dark")}
    >
      <Sun className="h-5 w-5 dark:hidden block" />
      <Moon className="h-5 w-5 hidden dark:block" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
