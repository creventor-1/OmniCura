"use client"

import * as React from "react"
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react"
import { cn } from "cn"

export type ToastSeverity = "info" | "success" | "warning" | "danger"

export interface ToastMessage {
  id: string
  title: string
  description?: string
  severity?: ToastSeverity
}

interface ToastContextType {
  toasts: ToastMessage[]
  toast: (message: Omit<ToastMessage, "id">) => void
  dismiss: (id: string) => void
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([])

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = React.useCallback((message: Omit<ToastMessage, "id">) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast: ToastMessage = { ...message, id }
    setToasts((prev) => [...prev.slice(-3), newToast])

    setTimeout(() => {
      dismiss(id)
    }, 4500)
  }, [dismiss])

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none p-2"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    return {
      toast: (msg: Omit<ToastMessage, "id">) => console.log("[TOAST]", msg),
      dismiss: () => {},
      toasts: [],
    }
  }
  return context
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastMessage
  onDismiss: () => void
}) {
  const severity = toast.severity || "info"

  const iconConfig = {
    info: <Info className="size-4 text-accent shrink-0" />,
    success: <CheckCircle2 className="size-4 text-success shrink-0" />,
    warning: <AlertTriangle className="size-4 text-warning-text shrink-0" />,
    danger: <AlertCircle className="size-4 text-danger shrink-0" />,
  }[severity]

  const borderConfig = {
    info: "border-accent/30",
    success: "border-success/30",
    warning: "border-warning/30",
    danger: "border-danger/30",
  }[severity]

  return (
    <div
      role="status"
      className={cn(
        "pointer-events-auto flex items-start gap-3 rounded-xl glass-overlay border p-3.5 shadow-overlay animate-in slide-in-from-bottom-2 fade-in-50 duration-180",
        borderConfig
      )}
    >
      <div className="mt-0.5">{iconConfig}</div>
      <div className="flex-1 space-y-0.5 text-left">
        <h5 className="text-xs font-semibold text-foreground">{toast.title}</h5>
        {toast.description && (
          <p className="text-xs text-text-secondary leading-relaxed">{toast.description}</p>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="text-text-tertiary hover:text-foreground p-0.5 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        aria-label="Dismiss toast"
      >
        <X className="size-3.5" />
      </button>
    </div>
  )
}
