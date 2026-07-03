import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const variants = {
      default: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-900/20",
      destructive: "border border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:text-red-100",
      outline: "border border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/10 hover:text-white",
      ghost: "text-slate-300 hover:bg-white/10 hover:text-white",
      link: "text-indigo-300 underline-offset-4 hover:text-indigo-200 hover:underline",
    }
    
    const sizes = {
      default: "h-11 px-4 py-2",
      sm: "h-10 rounded-lg px-3",
      lg: "h-12 rounded-lg px-8",
      icon: "h-11 w-11",
    }

    return (
      <button
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 disabled:pointer-events-none disabled:opacity-50",
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
