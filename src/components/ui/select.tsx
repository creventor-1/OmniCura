import * as React from "react"
import { cn } from "cn"
import { ChevronDown } from "lucide-react"

export interface SelectProps extends React.ComponentProps<"select"> {
  error?: boolean | string
  helperText?: string
  label?: string
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, helperText, label, id, children, ...props }, ref) => {
    const generatedId = React.useId()
    const selectId = id || (label ? generatedId : undefined)
    const errorId = error && typeof error === "string" ? `${selectId}-error` : undefined
    const helperId = helperText ? `${selectId}-helper` : undefined

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold text-foreground tracking-tight select-none"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            data-slot="select"
            aria-invalid={!!error}
            aria-describedby={errorId || helperId}
            className={cn(
              "h-11 sm:h-9 w-full appearance-none rounded-lg border border-border-subtle bg-surface px-3 pr-8 py-1.5 text-base sm:text-sm text-foreground transition-all duration-120 outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
              error && "border-danger focus-visible:border-danger focus-visible:ring-danger/30 text-danger",
              className
            )}
            {...props}
          >
            {children}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-text-tertiary" />
        </div>
        {error && typeof error === "string" && (
          <p id={errorId} role="alert" className="text-xs text-danger font-medium leading-none">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={helperId} className="text-xs text-text-secondary leading-none">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)
Select.displayName = "Select"

export { Select }
