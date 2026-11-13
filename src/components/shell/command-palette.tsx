"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Search, CornerDownLeft, PhoneCall, Moon, Sun, LogIn, Plus, ArrowRight } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "cn";
import { NAV_GROUPS, type NavItem } from "./nav-config";
import type { NavSection } from "@/components/shared/navbar";
import { Kbd } from "@/components/system/icon-tile";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (section: NavSection) => void;
  onSignIn?: () => void;
  isSignedIn: boolean;
  emergencyNumber: string;
}

interface CommandItem {
  id: string;
  label: string;
  hint?: string;
  group: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords: string;
  tone?: "danger";
  run: () => void;
}

export function CommandPalette({
  open,
  onOpenChange,
  onNavigate,
  onSignIn,
  isSignedIn,
  emergencyNumber,
}: CommandPaletteProps) {
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const { resolvedTheme, setTheme } = useTheme();
  const listRef = React.useRef<HTMLDivElement>(null);

  const close = React.useCallback(() => onOpenChange(false), [onOpenChange]);

  const items = React.useMemo<CommandItem[]>(() => {
    const nav: CommandItem[] = NAV_GROUPS.flatMap((g) =>
      g.items.map((item: NavItem) => ({
        id: `nav-${item.id}`,
        label: item.label,
        hint: item.description,
        group: "Go to",
        icon: item.icon,
        keywords: `${item.label} ${item.keywords ?? ""}`.toLowerCase(),
        run: () => onNavigate(item.id),
      }))
    );

    const actions: CommandItem[] = [
      {
        id: "action-new",
        label: "Start a new symptom assessment",
        group: "Actions",
        icon: Plus,
        keywords: "new start assessment triage consult",
        run: () => onNavigate("triage"),
      },
      {
        id: "action-sos",
        label: `Call emergency services (${emergencyNumber})`,
        group: "Actions",
        icon: PhoneCall,
        tone: "danger",
        keywords: "sos emergency call ambulance 112 911",
        run: () => {
          window.location.href = `tel:${emergencyNumber}`;
        },
      },
      {
        id: "action-theme",
        label: resolvedTheme === "dark" ? "Switch to light theme" : "Switch to dark theme",
        group: "Actions",
        icon: resolvedTheme === "dark" ? Sun : Moon,
        keywords: "theme dark light mode appearance",
        run: () => setTheme(resolvedTheme === "dark" ? "light" : "dark"),
      },
    ];

    if (!isSignedIn && onSignIn) {
      actions.push({
        id: "action-signin",
        label: "Sign in or create an account",
        group: "Actions",
        icon: LogIn,
        keywords: "login sign in account register",
        run: onSignIn,
      });
    }

    return [...actions, ...nav];
  }, [onNavigate, emergencyNumber, resolvedTheme, setTheme, isSignedIn, onSignIn]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.keywords.includes(q) || i.label.toLowerCase().includes(q));
  }, [items, query]);

  React.useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setQuery("");
        setActiveIndex(0);
      }, 150);
      return () => clearTimeout(t);
    }
  }, [open]);

  React.useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const runItem = (item: CommandItem | undefined) => {
    if (!item) return;
    close();
    setTimeout(item.run, 60);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      runItem(filtered[activeIndex]);
    }
  };

  let lastGroup = "";

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-[#0b1422]/40 dark:bg-black/60 backdrop-blur-[3px] data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 duration-200" />
        <DialogPrimitive.Popup
          className="fixed left-1/2 top-[12vh] z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-[20px] border border-border-subtle bg-raised shadow-overlay outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-[0.97] data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-[0.97] duration-200"
          aria-label="Command palette"
        >
          <DialogPrimitive.Title className="sr-only">Search Omnicura</DialogPrimitive.Title>
          <div className="flex items-center gap-3 border-b border-border-subtle px-4">
            <Search className="size-[18px] text-text-tertiary shrink-0" aria-hidden="true" />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="Search tools, records and actions…"
              className="h-14 flex-1 bg-transparent text-[15px] text-foreground placeholder:text-text-tertiary outline-none"
              aria-label="Search commands"
              role="combobox"
              aria-expanded="true"
              aria-controls="command-list"
              aria-activedescendant={filtered[activeIndex] ? `cmd-${filtered[activeIndex].id}` : undefined}
            />
            <Kbd>Esc</Kbd>
          </div>

          <div ref={listRef} id="command-list" role="listbox" className="max-h-[52vh] overflow-y-auto p-2">
            {filtered.length === 0 && (
              <div className="py-10 text-center text-sm text-text-tertiary">
                No results for “{query}”
              </div>
            )}
            {filtered.map((item, index) => {
              const showGroup = item.group !== lastGroup;
              lastGroup = item.group;
              const Icon = item.icon;
              const isActive = index === activeIndex;
              return (
                <React.Fragment key={item.id}>
                  {showGroup && (
                    <div className="px-3 pt-3 pb-1.5 type-overline text-text-tertiary">{item.group}</div>
                  )}
                  <button
                    id={`cmd-${item.id}`}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    data-index={index}
                    onMouseMove={() => setActiveIndex(index)}
                    onClick={() => runItem(item)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors cursor-pointer",
                      isActive ? "bg-muted" : "bg-transparent"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-8 items-center justify-center rounded-lg border shrink-0",
                        item.tone === "danger"
                          ? "bg-danger-muted text-danger border-danger/15"
                          : "bg-surface text-text-secondary border-border-subtle"
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">{item.label}</span>
                      {item.hint && (
                        <span className="block truncate text-xs text-text-tertiary">{item.hint}</span>
                      )}
                    </span>
                    {isActive ? (
                      <CornerDownLeft className="size-4 text-text-tertiary shrink-0" aria-hidden="true" />
                    ) : (
                      <ArrowRight className="size-4 text-transparent shrink-0" aria-hidden="true" />
                    )}
                  </button>
                </React.Fragment>
              );
            })}
          </div>

          <div className="hidden sm:flex items-center justify-between gap-4 border-t border-border-subtle bg-subtle px-4 py-2.5 text-xs text-text-tertiary">
            <span className="flex items-center gap-1.5">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd>
              <span className="ml-1">Navigate</span>
              <Kbd className="ml-3">↵</Kbd>
              <span className="ml-1">Open</span>
            </span>
            <span>Omnicura · Clinical decision support</span>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
