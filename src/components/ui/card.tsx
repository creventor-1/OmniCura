import * as React from "react"
import { cn } from "cn"

export interface CardProps extends React.ComponentProps<"div"> {
  size?: "default" | "sm" | "none"
  isInteractive?: boolean
}

function Card({
  className,
  size = "default",
  isInteractive = false,
  ...props
}: CardProps) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        "group/card relative flex flex-col rounded-2xl bg-surface border border-border-subtle text-sm text-foreground shadow-xs",
        "p-6 data-[size=sm]:p-4 data-[size=none]:p-0",
        "transition-[border-color,box-shadow,transform] duration-200 ease-out",
        isInteractive &&
          "cursor-pointer hover:border-border-strong hover:shadow-card-hover hover:-translate-y-px focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex flex-col gap-1 pb-4", className)}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-heading text-[15px] font-semibold text-foreground leading-snug tracking-[-0.01em]",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-[13px] text-text-secondary leading-relaxed", className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("flex-1", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center pt-4 border-t border-border-subtle", className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
}
