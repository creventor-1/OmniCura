import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const badgeVariants = cva(
  "group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full border px-2.5 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&>svg]:pointer-events-none [&>svg]:size-3.5",
  {
    variants: {
      variant: {
        default: "border-brand/15 bg-brand-muted text-accent-text",
        secondary: "border-border-subtle bg-muted text-text-secondary",
        destructive: "border-danger/20 bg-danger-muted text-danger",
        danger: "border-danger/20 bg-danger-muted text-danger",
        success: "border-success/20 bg-success-muted text-success",
        warning: "border-warning/25 bg-warning-muted text-warning-text",
        info: "border-info/20 bg-info-muted text-info",
        accent: "border-brand/15 bg-brand-muted text-accent-text",
        outline: "border-border-subtle text-text-secondary bg-surface",
        ghost: "border-transparent bg-muted text-text-secondary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends useRender.ComponentProps<"span">,
    VariantProps<typeof badgeVariants> {}

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: BadgeProps) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
