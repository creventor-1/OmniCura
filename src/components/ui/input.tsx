import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "cn"

export interface InputProps extends React.ComponentProps<"input"> {
  error?: boolean | string
  helperText?: string
  label?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, helperText, label, id, ...props }, ref) => {
    const generatedId = React.useId()
    const inputId = id || (label ? generatedId : undefined)
    const errorId = error && typeof error === "string" ? `${inputId}-error` : undefined
    const helperId = helperText ? `${inputId}-helper` : undefined

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-foreground tracking-tight select-none"
          >
            {label}
          </label>
        )}
        <InputPrimitive
          ref={ref}
          id={inputId}
          type={type}
          data-slot="input"
          aria-invalid={!!error}
          aria-describedby={errorId || helperId}
          className={cn(
            "h-11 sm:h-9 w-full min-w-0 rounded-lg border border-border-subtle bg-surface px-3 py-1.5 text-base sm:text-sm text-foreground transition-all duration-120 outline-none placeholder:text-text-tertiary focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-danger focus-visible:border-danger focus-visible:ring-danger/30 text-danger",
            className
          )}
          {...props}
        />
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
Input.displayName = "Input"

export { Input }
