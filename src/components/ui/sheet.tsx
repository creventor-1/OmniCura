"use client"

import * as React from "react"
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer"
import { cn } from "cn"
import { XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

function Sheet({ ...props }: DrawerPrimitive.Root.Props) {
  return <DrawerPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({ ...props }: DrawerPrimitive.Trigger.Props) {
  return <DrawerPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({ ...props }: DrawerPrimitive.Close.Props) {
  return <DrawerPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({ children }: { children: React.ReactNode }) {
  return <DrawerPrimitive.Portal>{children}</DrawerPrimitive.Portal>
}

function SheetOverlay({ className, ...props }: DrawerPrimitive.Backdrop.Props) {
  return (
    <DrawerPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/40 dark:bg-black/60 backdrop-blur-xs duration-180 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: DrawerPrimitive.Popup.Props & {
  side?: "top" | "bottom" | "left" | "right"
  showCloseButton?: boolean
}) {
  const sideClasses = {
    top: "inset-x-0 top-0 border-b data-open:slide-in-from-top data-closed:slide-out-to-top",
    bottom:
      "inset-x-0 bottom-0 rounded-t-2xl border-t data-open:slide-in-from-bottom data-closed:slide-out-to-bottom max-h-[85vh]",
    left: "inset-y-0 left-0 h-full w-3/4 sm:max-w-sm border-r data-open:slide-in-from-left data-closed:slide-out-to-left",
    right:
      "inset-y-0 right-0 h-full w-3/4 sm:max-w-sm border-l data-open:slide-in-from-right data-closed:slide-out-to-right",
  }[side]

  return (
    <SheetPortal>
      <SheetOverlay />
      <DrawerPrimitive.Popup
        data-slot="sheet-content"
        className={cn(
          "fixed z-50 gap-4 glass-overlay border-border-subtle p-6 shadow-overlay duration-240 outline-none overflow-y-auto data-open:animate-in data-closed:animate-out",
          sideClasses,
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DrawerPrimitive.Close
            data-slot="sheet-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-4 right-4 text-text-tertiary hover:text-foreground"
                size="icon-sm"
              />
            }
          >
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </DrawerPrimitive.Close>
        )}
      </DrawerPrimitive.Popup>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5 text-left mb-4", className)}
      {...props}
    />
  )
}

function SheetTitle({ className, ...props }: DrawerPrimitive.Title.Props) {
  return (
    <DrawerPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-base font-semibold text-foreground tracking-tight", className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: DrawerPrimitive.Description.Props) {
  return (
    <DrawerPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-xs text-text-secondary leading-relaxed", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetOverlay,
}
