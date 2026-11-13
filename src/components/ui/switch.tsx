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
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-border-strong transition-colors duration-200 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 data-[checked]:bg-brand",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block size-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] data-[checked]:translate-x-[22px] data-[unchecked]:translate-x-0.5" />
    </SwitchPrimitive.Root>
  )

  if (!label) return switchElement

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="space-y-1">
        <label
          htmlFor={switchId}
          className="text-sm font-medium text-foreground cursor-pointer select-none"
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
