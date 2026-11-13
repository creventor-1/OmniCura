import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const alertVariants = cva(
  "group/alert relative flex w-full items-start gap-3 rounded-xl border p-4 text-left text-sm transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-border-subtle bg-surface text-foreground",
        info:
          "border-accent/30 bg-accent/10 text-foreground",
        success:
          "border-success/30 bg-success-muted text-success",
        warning:
          "border-warning/30 bg-warning-muted text-warning-text",
        destructive:
          "border-danger/30 bg-danger-muted text-danger",
        danger:
          "border-danger/30 bg-danger-muted text-danger",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "font-semibold text-sm leading-tight text-foreground",
        className
      )}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn("text-xs leading-relaxed text-text-secondary mt-1", className)}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription, alertVariants }
