import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const alertVariants = cva(
  "group/alert relative flex w-full items-start gap-3 rounded-xl border p-4 text-left text-sm",
  {
    variants: {
      variant: {
        default:
          "border-border bg-card text-foreground",
        info:
          "border-accent/30 bg-accent/5 text-foreground",
        success:
          "border-emerald-500/30 bg-emerald-500/5 text-emerald-950 dark:text-emerald-100",
        warning:
          "border-amber-500/30 bg-amber-500/5 text-amber-950 dark:text-amber-100",
        destructive:
          "border-destructive/30 bg-destructive/5 text-destructive-foreground dark:text-destructive",
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
      className={cn(
        "text-xs leading-relaxed text-muted-foreground mt-1",
        className
      )}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription }
