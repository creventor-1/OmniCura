"use client"

import * as React from "react"
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"
import { Check } from "lucide-react"
import { cn } from "cn"

export interface CheckboxProps extends CheckboxPrimitive.Root.Props {
  label?: string
  description?: string
}

function Checkbox({ className, label, description, id, ...props }: CheckboxProps) {
  const generatedId = React.useId()
  const checkboxId = id || (label ? generatedId : undefined)

  const checkboxElement = (
    <CheckboxPrimitive.Root
      id={checkboxId}
      data-slot="checkbox"
      className={cn(
        "peer size-4 shrink-0 rounded border border-border-subtle bg-surface transition-all duration-120 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 data-[checked]:border-accent data-[checked]:bg-accent data-[checked]:text-white disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        <Check className="size-3 stroke-[2.5]" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )

  if (!label) return checkboxElement

  return (
    <div className="flex items-start gap-2.5">
      {checkboxElement}
      <div className="space-y-0.5 leading-none">
        <label
          htmlFor={checkboxId}
          className="text-xs sm:text-sm font-medium text-foreground cursor-pointer select-none"
        >
          {label}
        </label>
        {description && (
          <p className="text-xs text-text-secondary leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </div>
  )
}

export { Checkbox }
