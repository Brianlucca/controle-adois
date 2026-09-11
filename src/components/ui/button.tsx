import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const variants = {
      default:
        "bg-[#635bff] text-white hover:bg-[#544ce0] shadow-[0_10px_24px_-14px_#635bff]",
      destructive:
        "border border-[#f0cbc5] bg-[#fff1ee] text-[#c85145] hover:bg-[#ffe7e2]",
      outline:
        "border border-[#dedce1] bg-white text-[#45474f] hover:border-[#c9c6ce] hover:bg-[#faf9fb]",
      ghost: "text-[#656871] hover:bg-[#f0eff3] hover:text-[#282a30]",
      link: "text-[#635bff] underline-offset-4 hover:text-[#5048d8] hover:underline",
    };

    const sizes = {
      default: "h-11 px-4 py-2",
      sm: "h-10 rounded-lg px-3",
      lg: "h-12 rounded-lg px-8",
      icon: "h-11 w-11",
    };

    return (
      <button
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#635bff]/30 disabled:pointer-events-none disabled:opacity-50",
          variants[variant],
          sizes[size],
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button };
