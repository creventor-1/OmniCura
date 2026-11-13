import * as React from "react"
import { cn } from "cn"

export interface TextareaProps extends React.ComponentProps<"textarea"> {
  error?: boolean | string
  helperText?: string
  label?: string
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, helperText, label, id, ...props }, ref) => {
    const generatedId = React.useId()
    const textareaId = id || (label ? generatedId : undefined)
    const errorId = error && typeof error === "string" ? `${textareaId}-error` : undefined
    const helperId = helperText ? `${textareaId}-helper` : undefined

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-xs font-semibold text-foreground tracking-tight select-none"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          data-slot="textarea"
          aria-invalid={!!error}
          aria-describedby={errorId || helperId}
          className={cn(
            "min-h-[80px] w-full min-w-0 rounded-lg border border-border-subtle bg-surface px-3 py-2 text-base sm:text-sm text-foreground transition-all duration-120 outline-none placeholder:text-text-tertiary focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
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
Textarea.displayName = "Textarea"

export { Textarea }
