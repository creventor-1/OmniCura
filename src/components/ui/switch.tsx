"use client"

import * as React from "react"
import { Switch as SwitchPrimitive } from "@base-ui/react/switch"
import { cn } from "cn"

export interface SwitchProps extends SwitchPrimitive.Root.Props {
  label?: string
  description?: string
}

function Switch({ className, label, description, id, ...props }: SwitchProps) {
  const generatedId = React.useId()
  const switchId = id || (label ? generatedId : undefined)

  const switchElement = (
    <SwitchPrimitive.Root
      id={switchId}
      data-slot="switch"
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-border-strong transition-colors duration-180 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 data-[checked]:bg-accent",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block size-4 rounded-full bg-white shadow-xs transition-transform duration-180 data-[checked]:translate-x-4 data-[unchecked]:translate-x-0.5" />
    </SwitchPrimitive.Root>
  )

  if (!label) return switchElement

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="space-y-0.5 leading-none">
        <label
          htmlFor={switchId}
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
      {switchElement}
    </div>
  )
}

export { Switch }
