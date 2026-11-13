import * as React from "react"
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Loader2 } from "lucide-react"

const buttonVariants = cva(
  [
    "group/button relative inline-flex shrink-0 items-center justify-center whitespace-nowrap select-none cursor-pointer",
    "rounded-[10px] border border-transparent bg-clip-padding text-sm font-semibold tracking-[-0.005em]",
    "transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out",
    "outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35 focus-visible:outline-none",
    "active:not-aria-[haspopup]:scale-[0.98]",
    "disabled:pointer-events-none disabled:opacity-45",
    "aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/30",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.14),var(--elev-xs)] hover:bg-brand-hover hover:shadow-brand",
        outline:
          "border-border-subtle bg-surface text-foreground shadow-xs hover:bg-subtle hover:border-border-strong",
        secondary:
          "bg-brand-muted text-accent-text hover:bg-brand-soft",
        ghost:
          "text-text-secondary hover:bg-muted hover:text-foreground",
        destructive:
          "bg-danger-muted text-danger border-danger/20 hover:bg-danger/15 focus-visible:ring-danger/35",
        danger:
          "bg-danger text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.16),var(--elev-xs)] hover:bg-danger-strong focus-visible:ring-danger/40 dark:text-[#2a0605]",
        inverse:
          "bg-inverse text-app hover:opacity-90",
        link: "text-accent-text underline-offset-4 hover:underline px-0 h-auto",
      },
      size: {
        default: "h-10 gap-2 px-4",
        sm: "h-8 gap-1.5 px-3 text-[13px] rounded-lg",
        lg: "h-11 gap-2 px-5 text-[15px]",
        xl: "h-12 gap-2.5 px-6 text-[15px] rounded-xl",
        icon: "size-10",
        "icon-sm": "size-8 rounded-lg",
        "icon-lg": "size-11",
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
