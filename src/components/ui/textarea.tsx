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
            className="block text-[13px] font-medium text-foreground select-none"
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
            "min-h-[88px] w-full min-w-0 rounded-xl border border-border-subtle bg-surface px-3.5 py-2.5 text-base sm:text-sm leading-relaxed text-foreground shadow-xs transition-[border-color,box-shadow] duration-150 outline-none resize-y placeholder:text-text-tertiary/80 hover:border-border-strong focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-danger focus-visible:border-danger focus-visible:ring-danger/20",
            className
          )}
          {...props}
        />
        {error && typeof error === "string" && (
          <p id={errorId} role="alert" className="text-xs text-danger font-medium">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={helperId} className="text-xs text-text-tertiary">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
