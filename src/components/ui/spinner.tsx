import * as React from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "default" | "lg"
}

export function Spinner({ size = "default", className, ...props }: SpinnerProps) {
  const sizeClasses = {
    sm: "size-4",
    default: "size-6",
    lg: "size-8",
  }

  return (
    <div role="status" aria-label="Loading" className={cn("inline-flex items-center justify-center", className)} {...props}>
      <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} />
      <span className="sr-only">Loading...</span>
    </div>
  )
}
