import * as React from "react"
import { cn } from "cn"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn(
        "rounded-md bg-muted/70 relative overflow-hidden animate-pulse duration-1000",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
