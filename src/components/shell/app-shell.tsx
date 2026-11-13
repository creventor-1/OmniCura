"use client";

import * as React from "react";
import {
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  LogIn,
  PhoneCall,
  Plus,
  Search,
  X,
  ChevronsUpDown,
  ShieldCheck,
  UserRound,
  LayoutGrid,
  Activity,
  MapPinned,
  History,
  Ellipsis,
} from "lucide-react";
import { cn } from "cn";
import { ThemeToggle } from "@/components/theme-toggle";
import { OmnicuraLogo } from "@/components/shared/brand-logo";
import { useAuth } from "@/features/authentication/context/auth-context";
import { AuthModal } from "@/features/authentication/components/auth-modal";
import type { NavSection } from "@/components/shared/navbar";
import {
  NAV_GROUPS,
  NAV_ITEMS,
  SECTION_GROUP_LABEL,
  OPEN_AUTH_EVENT,
  NAVIGATE_EVENT,
} from "./nav-config";
import { CommandPalette } from "./command-palette";
import { Kbd } from "@/components/system/icon-tile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AppShellProps {
  activeSection: NavSection;
  onNavigate: (section: NavSection) => void;
  children: React.ReactNode;
}

const emptySubscribe = () => () => {};

function getInitials(email?: string | null) {
  if (!email) return "G";
  const name = email.split("@")[0] ?? "";
  const parts = name.split(/[._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || name.slice(0, 2).toUpperCase();
}

export function AppShell({ activeSection, onNavigate, children }: AppShellProps) {
  const { user, signOut } = useAuth();
  const isClient = React.useSyncExternalStore(emptySubscribe, () => true, () => false);

  const [internalCollapsed, setInternalCollapsed] = React.useState<boolean | null>(null);
  const isCollapsed =
    internalCollapsed !== null
      ? internalCollapsed
      : isClient && localStorage.getItem("omnicura_sidebar_collapsed") === "true";

  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = React.useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = React.useState(false);
  const [authMode, setAuthMode] = React.useState<"signin" | "signup">("signin");
  const [isPaletteOpen, setIsPaletteOpen] = React.useState(false);
  const [isMac, setIsMac] = React.useState(false);

  const emergencyNumber = process.env.NEXT_PUBLIC_DEFAULT_EMERGENCY_NUMBER || "112";

  const toggleCollapsed = () => {
    const next = !isCollapsed;
    setInternalCollapsed(next);
    try {
      localStorage.setItem("omnicura_sidebar_collapsed", String(next));
    } catch {
      // ignore in environments without localStorage
    }
  };

  const handleNavClick = React.useCallback(
    (section: NavSection) => {
      onNavigate(section);
      setIsMobileDrawerOpen(false);
    },
    [onNavigate]
  );

  const openAuth = React.useCallback((mode: "signin" | "signup" = "signin") => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  }, []);

  // Global keyboard shortcuts + cross-component events
  React.useEffect(() => {
    const t = setTimeout(() => setIsMac(/Mac|iPhone|iPad/.test(navigator.platform)), 0);

    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsPaletteOpen((o) => !o);
      }
      if (e.key === "Escape") setIsMobileDrawerOpen(false);
    };
    const onAuth = (e: Event) => {
      const mode = (e as CustomEvent<{ mode?: "signin" | "signup" }>).detail?.mode ?? "signin";
      openAuth(mode);
    };
    const onNav = (e: Event) => {
      const section = (e as CustomEvent<{ section?: NavSection }>).detail?.section;
      if (section) handleNavClick(section);
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_AUTH_EVENT, onAuth);
    window.addEventListener(NAVIGATE_EVENT, onNav);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_AUTH_EVENT, onAuth);
      window.removeEventListener(NAVIGATE_EVENT, onNav);
    };
  }, [openAuth, handleNavClick]);

  // Lock body scroll while mobile drawer is open
  React.useEffect(() => {
    if (!isMobileDrawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isMobileDrawerOpen]);

  const activeItem = NAV_ITEMS[activeSection] ?? NAV_ITEMS.home;
  const initials = getInitials(user?.email);

  /* Labels are shown on xl+ when expanded; md–lg always shows the icon rail. */
  const labelVis = isCollapsed ? "hidden" : "hidden xl:inline";
  const blockVis = isCollapsed ? "hidden" : "hidden xl:block";
  const flexVis = isCollapsed ? "hidden" : "hidden xl:flex";

  const mobileTabs: { id: NavSection | "more"; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "home", label: "Home", icon: LayoutGrid },
    { id: "triage", label: "Assess", icon: Activity },
    { id: "hospitals", label: "Care", icon: MapPinned },
    { id: "history", label: "History", icon: History },
    { id: "more", label: "More", icon: Ellipsis },
  ];

  return (
    <div className="flex min-h-dvh bg-app text-foreground antialiased">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-overlay"
      >
        Skip to content
      </a>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultMode={authMode}
      />

      <CommandPalette
        open={isPaletteOpen}
        onOpenChange={setIsPaletteOpen}
        onNavigate={handleNavClick}
        onSignIn={() => openAuth("signin")}
        isSignedIn={!!user}
        emergencyNumber={emergencyNumber}
      />

      {/* ============ Desktop / tablet sidebar ============ */}
      <aside
        aria-label="Primary"
        className={cn(
          "hidden md:flex sticky top-0 h-dvh flex-col shrink-0 border-r border-sidebar-border bg-sidebar z-30 transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          isCollapsed ? "w-[76px]" : "w-[76px] xl:w-[268px]"
        )}
      >
        {/* Brand */}
        <div className="flex h-16 items-center justify-between gap-2 px-4">
          <button
            type="button"
            onClick={() => handleNavClick("home")}
            className="flex items-center gap-2.5 rounded-xl p-1 -m-1 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 cursor-pointer"
            aria-label="Omnicura overview"
          >
            <OmnicuraLogo size="md" />
            <span className={cn("flex-col text-left leading-none", flexVis)}>
              <span className="font-heading text-[16px] font-bold tracking-[-0.02em] text-foreground">Omnicura</span>
              <span className="mt-1 text-[11px] font-medium text-text-tertiary">Clinical decision support</span>
            </span>
          </button>
        </div>

        {/* Primary CTA */}
        <div className="px-3 pt-1 pb-3">
          <button
            type="button"
            onClick={() => handleNavClick("triage")}
            className={cn(
              "group flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-[inset_0_1px_0_rgb(255_255_255/0.14),var(--elev-xs)] transition-all hover:bg-brand-hover hover:shadow-brand active:scale-[0.98] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35 cursor-pointer",
              !isCollapsed && "xl:justify-start xl:px-3.5"
            )}
            title="New assessment"
          >
            <Plus className="size-4 stroke-[2.5] transition-transform group-hover:rotate-90" />
            <span className={labelVis}>New assessment</span>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 pb-3 space-y-5" aria-label="Main navigation">
          {NAV_GROUPS.map((group) => (
            <div key={group.id} className="space-y-1">
              {group.label && (
                <div className={cn("px-3 pb-1 type-overline text-text-tertiary/90", blockVis)}>
                  {group.label}
                </div>
              )}
              {group.label && (
                <div className={cn("mx-auto my-2 h-px w-6 bg-border-subtle", isCollapsed ? "block" : "block xl:hidden")} />
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => handleNavClick(item.id)}
                        title={item.label}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "group relative flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30",
                          "justify-center",
                          !isCollapsed && "xl:justify-start",
                          isActive
                            ? "bg-brand-muted text-foreground font-semibold"
                            : "text-text-secondary font-medium hover:bg-muted hover:text-foreground"
                        )}
                      >
                        {isActive && (
                          <span className="absolute -left-3 top-2 bottom-2 w-[3px] rounded-r-full bg-brand" aria-hidden="true" />
                        )}
                        <Icon
                          className={cn(
                            "size-[18px] shrink-0 stroke-[1.85] transition-colors",
                            isActive ? "text-accent" : "text-text-tertiary group-hover:text-text-secondary"
                          )}
                        />
                        <span className={cn("truncate", labelVis)}>{item.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="space-y-2 border-t border-sidebar-border p-3">
          {/* Emergency card */}
          <a
            href={`tel:${emergencyNumber}`}
            className={cn(
              "group flex items-center gap-3 rounded-xl border border-danger/20 bg-danger-muted p-2.5 transition-colors hover:border-danger/40 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-danger/30",
              "justify-center",
              !isCollapsed && "xl:justify-start"
            )}
            title={`Call emergency services ${emergencyNumber}`}
          >
            <span className="relative flex size-8 shrink-0 items-center justify-center rounded-lg bg-danger text-white dark:text-[#2a0605]">
              <PhoneCall className="size-4" />
            </span>
            <span className={cn("min-w-0 flex-col leading-tight", flexVis)}>
              <span className="text-[13px] font-semibold text-danger">Emergency? Call {emergencyNumber}</span>
              <span className="text-[11px] text-text-secondary">Life-threatening symptoms</span>
            </span>
          </a>

          {/* Account */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl p-2 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 cursor-pointer",
                  "justify-center",
                  !isCollapsed && "xl:justify-start"
                )}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[12px] font-bold text-accent-text">
                  {initials}
                </span>
                <span className={cn("min-w-0 flex-1 flex-col leading-tight", flexVis)}>
                  <span className="truncate text-[13px] font-semibold text-foreground">{user.email?.split("@")[0]}</span>
                  <span className="truncate text-[11px] text-text-tertiary">{user.email}</span>
                </span>
                <ChevronsUpDown className={cn("size-4 text-text-tertiary shrink-0", labelVis)} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" sideOffset={8} className="w-60">
                <DropdownMenuLabel className="font-normal">
                  <div className="text-[13px] font-semibold text-foreground truncate">{user.email}</div>
                  <div className="text-[11px] text-text-tertiary">Signed in · records synced</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleNavClick("profile")}>
                  <UserRound className="size-4 text-text-tertiary" /> Health profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleNavClick("history")}>
                  <History className="size-4 text-text-tertiary" /> Assessment history
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()}>
                  <LogOut className="size-4 text-text-tertiary" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button
              type="button"
              onClick={() => openAuth("signin")}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-xl border border-border-subtle bg-surface p-2 text-left shadow-xs transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 cursor-pointer",
                "justify-center",
                !isCollapsed && "xl:justify-start"
              )}
              title="Sign in to sync your records"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-text-secondary">
                <LogIn className="size-4" />
              </span>
              <span className={cn("min-w-0 flex-col leading-tight", flexVis)}>
                <span className="text-[13px] font-semibold text-foreground">Sign in</span>
                <span className="text-[11px] text-text-tertiary">Sync records across devices</span>
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={toggleCollapsed}
            className="hidden xl:flex h-8 w-full items-center justify-center gap-2 rounded-lg text-xs font-medium text-text-tertiary transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 cursor-pointer"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            <span className={labelVis}>Collapse</span>
          </button>
        </div>
      </aside>

      {/* ============ Main column ============ */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border-subtle glass-chrome px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(true)}
            className="md:hidden flex size-10 items-center justify-center rounded-xl text-text-secondary hover:bg-muted hover:text-foreground cursor-pointer"
            aria-label="Open navigation menu"
          >
            <Menu className="size-5" />
          </button>

          <div className="md:hidden">
            <OmnicuraLogo size="sm" showWordmark />
          </div>

          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="hidden md:flex min-w-0 items-center gap-2 text-sm">
            <span className="text-text-tertiary">{SECTION_GROUP_LABEL[activeSection]}</span>
            <span className="text-border-strong" aria-hidden="true">/</span>
            <span className="truncate font-semibold text-foreground" aria-current="page">
              {activeItem.label}
            </span>
          </nav>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            {/* Search / command */}
            <button
              type="button"
              onClick={() => setIsPaletteOpen(true)}
              className="hidden lg:flex h-9 w-60 xl:w-64 items-center gap-2.5 rounded-[10px] border border-border-subtle bg-surface px-3 text-[13px] text-text-tertiary shadow-xs transition-colors hover:border-border-strong hover:text-text-secondary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 cursor-pointer"
              aria-label="Search and jump to (Command K)"
            >
              <Search className="size-4 shrink-0" />
              <span className="flex-1 text-left">Search or jump to…</span>
              <span className="flex items-center gap-0.5">
                <Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd>
                <Kbd>K</Kbd>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setIsPaletteOpen(true)}
              className="lg:hidden flex size-10 items-center justify-center rounded-xl text-text-secondary hover:bg-muted cursor-pointer"
              aria-label="Search"
            >
              <Search className="size-[18px]" />
            </button>

            <div className="hidden xl:flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface px-3 h-9 text-xs font-medium text-text-secondary">
              <ShieldCheck className="size-3.5 text-accent" />
              <span>Non-diagnostic guidance</span>
            </div>

            <ThemeToggle />

            <a
              href={`tel:${emergencyNumber}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-danger px-3 text-[13px] font-semibold text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.16),var(--elev-xs)] transition-colors hover:bg-danger-strong focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-danger/35 dark:text-[#2a0605]"
              title={`Call emergency services ${emergencyNumber}`}
            >
              <PhoneCall className="size-3.5" />
              <span>SOS<span className="hidden sm:inline"> {emergencyNumber}</span></span>
            </a>
          </div>
        </header>

        <main
          id="main-content"
          tabIndex={-1}
          className="relative flex-1 w-full mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10 pt-6 sm:pt-8 pb-28 md:pb-12 outline-none"
        >
          {children}
        </main>
      </div>

      {/* ============ Mobile bottom tab bar ============ */}
      <nav
        aria-label="Quick navigation"
        className="md:hidden fixed inset-x-0 bottom-0 z-30 border-t border-border-subtle glass-chrome pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid h-16 grid-cols-5">
          {mobileTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.id === activeSection || (tab.id === "more" && isMobileDrawerOpen);
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => (tab.id === "more" ? setIsMobileDrawerOpen(true) : handleNavClick(tab.id))}
                aria-current={tab.id === activeSection ? "page" : undefined}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors cursor-pointer",
                  isActive ? "text-accent" : "text-text-tertiary"
                )}
              >
                {isActive && tab.id !== "more" && (
                  <span className="absolute top-0 h-[3px] w-8 rounded-b-full bg-brand" aria-hidden="true" />
                )}
                <Icon className={cn("size-5", isActive ? "stroke-[2.25]" : "stroke-[1.85]")} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ============ Mobile drawer ============ */}
      {isMobileDrawerOpen && (
        <div role="dialog" aria-modal="true" aria-label="Navigation menu" className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-[#0b1422]/45 dark:bg-black/65 backdrop-blur-[3px] animate-in fade-in-0 duration-200"
            onClick={() => setIsMobileDrawerOpen(false)}
          />
          <div className="relative z-10 flex h-full w-[86%] max-w-sm flex-col bg-sidebar shadow-overlay animate-in slide-in-from-left duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]">
            <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
              <OmnicuraLogo size="md" showWordmark showTagline />
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="flex size-10 items-center justify-center rounded-xl text-text-secondary hover:bg-muted cursor-pointer"
                aria-label="Close menu"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="p-4 pb-2">
              <button
                type="button"
                onClick={() => handleNavClick("triage")}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground text-[15px] font-semibold shadow-brand cursor-pointer"
              >
                <Plus className="size-4 stroke-[2.5]" />
                New assessment
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-5" aria-label="Main navigation">
              {NAV_GROUPS.map((group) => (
                <div key={group.id} className="space-y-1">
                  {group.label && <div className="px-3 pb-1 type-overline text-text-tertiary">{group.label}</div>}
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeSection === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleNavClick(item.id)}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[15px] transition-colors cursor-pointer",
                          isActive ? "bg-brand-muted font-semibold text-foreground" : "font-medium text-text-secondary hover:bg-muted"
                        )}
                      >
                        <Icon className={cn("size-5", isActive ? "text-accent" : "text-text-tertiary")} />
                        <span className="flex-1">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </nav>

            <div className="space-y-2 border-t border-sidebar-border p-4">
              <a
                href={`tel:${emergencyNumber}`}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-danger text-[15px] font-semibold text-white dark:text-[#2a0605]"
              >
                <PhoneCall className="size-4" />
                Call emergency ({emergencyNumber})
              </a>
              {user ? (
                <button
                  type="button"
                  onClick={() => {
                    signOut();
                    setIsMobileDrawerOpen(false);
                  }}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border-subtle bg-surface text-sm font-medium text-foreground cursor-pointer"
                >
                  <LogOut className="size-4" />
                  <span className="truncate">Sign out · {user.email}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    openAuth("signin");
                  }}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border-subtle bg-surface text-sm font-semibold text-foreground cursor-pointer"
                >
                  <LogIn className="size-4" />
                  Sign in / Create account
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
