import * as React from "react"
import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

export interface GetStartedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string
  classes?: string
}

export const GetStartedButton = React.forwardRef<HTMLButtonElement, GetStartedButtonProps>(
  ({ label = "Get Started", classes, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "bg-background group relative h-auto w-48 cursor-pointer rounded-full border border-[#1a1a1a]/10 dark:border-white/20 p-1 outline-none transition-colors duration-500",
          classes
        )}
        {...props}
      >
        {/* Expanding circle */}
        <span
          className="circle bg-[#1a1a1a] dark:bg-white m-0 block h-12 w-12 overflow-hidden rounded-full transition-all duration-500 group-hover:w-full"
          aria-hidden="true"
        />

        {/* Arrow icon */}
        <div className="icon absolute top-1/2 left-4 -translate-y-1/2 translate-x-0 transition-all duration-500 z-10 group-hover:translate-x-[0.4rem]">
          <ArrowRight className="text-white dark:text-[#1a1a1a] size-6" />
        </div>

        {/* Label */}
        <span className="button-text text-[#1a1a1a] dark:text-white group-hover:text-white dark:group-hover:text-[#1a1a1a] absolute top-1/2 left-1/2 ml-4 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-center text-base font-medium tracking-tight transition-all duration-500 z-10">
          {label}
        </span>
      </button>
    )
  }
)

GetStartedButton.displayName = "GetStartedButton"
