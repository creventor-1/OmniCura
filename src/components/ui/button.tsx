import * as React from "react"
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Loader2 } from "lucide-react"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all duration-120 outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/30 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-brand-hover shadow-xs active:opacity-95",
        outline:
          "border-border-subtle bg-surface text-foreground hover:bg-muted hover:border-border-strong hover:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-muted active:opacity-95",
        ghost:
          "text-muted-foreground hover:bg-muted hover:text-foreground",
        destructive:
          "bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 focus-visible:ring-destructive",
        danger:
          "bg-danger text-white hover:opacity-90 focus-visible:ring-danger shadow-xs",
        link: "text-accent underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 min-h-[36px] gap-2 px-3.5 text-sm", // 36px default
        sm: "h-8 min-h-[32px] gap-1.5 px-3 text-xs",      // 32px sm
        lg: "h-11 min-h-[44px] gap-2 px-5 text-sm font-medium", // 44px lg (mobile touch target minimum)
        icon: "size-9 min-size-[36px] rounded-lg",
        "icon-sm": "size-8 min-size-[32px] rounded-lg",
        "icon-lg": "size-11 min-size-[44px] rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends ButtonPrimitive.Props,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean
}

function Button({
  className,
  variant = "default",
  size = "default",
  isLoading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      className={cn(buttonVariants({ variant, size, className }), isLoading && "cursor-wait")}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="size-4 animate-spin shrink-0" aria-hidden="true" />
          <span className="inline-flex items-center gap-2">{children}</span>
        </>
      ) : (
        children
      )}
    </ButtonPrimitive>
  )
}

export { Button, buttonVariants }
