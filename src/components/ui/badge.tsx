import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default:
          "border-brand/20 bg-brand/10 text-brand dark:text-brand-hover",
        secondary:
          "border-border-subtle bg-secondary text-foreground",
        destructive:
          "border-danger/30 bg-danger-muted text-danger font-semibold",
        danger:
          "border-danger/30 bg-danger-muted text-danger font-semibold",
        success:
          "border-success/30 bg-success-muted text-success font-semibold",
        warning:
          "border-warning/30 bg-warning-muted text-warning-text font-semibold",
        accent:
          "border-accent/30 bg-accent/10 text-accent font-semibold",
        outline:
          "border-border-subtle text-foreground bg-transparent",
        ghost:
          "border-transparent bg-muted text-text-secondary",
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
