"use client";

import * as React from "react";
import {
  Activity,
  Camera,
  Pill,
  MapPin,
  History,
  UserCheck,
  PhoneCall,
  LayoutDashboard,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  LogOut,
  LogIn,
  User as UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { OmnicuraLogo } from "@/components/shared/brand-logo";
import { useAuth } from "@/features/authentication/context/auth-context";
import { AuthModal } from "@/features/authentication/components/auth-modal";
import { NavSection } from "@/components/shared/navbar";

interface AppShellProps {
  activeSection: NavSection;
  onNavigate: (section: NavSection) => void;
  children: React.ReactNode;
}

interface NavItem {
  id: NavSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navGroups: { group: string; items: NavItem[] }[] = [
  {
    group: "WORKSPACE",
    items: [
      { id: "home", label: "Overview", icon: LayoutDashboard },
    ],
  },
  {
    group: "CLINICAL TRIAGE",
    items: [
      { id: "triage", label: "Triage Chat", icon: Activity },
      { id: "vision", label: "Symptom Vision", icon: Camera },
      { id: "medication", label: "Medication Scan", icon: Pill },
    ],
  },
  {
    group: "CARE & RECORDS",
    items: [
      { id: "hospitals", label: "Hospital Locator", icon: MapPin },
      { id: "history", label: "Assessment History", icon: History },
      { id: "profile", label: "Health Profile", icon: UserCheck },
      { id: "contacts", label: "Emergency Contacts", icon: PhoneCall },
    ],
  },
];

const sectionBreadcrumbs: Record<NavSection, { section: string; title: string }> = {
  home: { section: "Workspace", title: "Overview" },
  triage: { section: "Clinical Triage", title: "Interactive Triage Chat" },
  vision: { section: "Clinical Triage", title: "Symptom Vision Analysis" },
  medication: { section: "Clinical Triage", title: "Medication Scanner" },
  hospitals: { section: "Care & Records", title: "Hospital Locator" },
  history: { section: "Care & Records", title: "Assessment Timeline" },
  profile: { section: "Care & Records", title: "Health Profile" },
  contacts: { section: "Care & Records", title: "Designated Emergency Contacts" },
};

const emptySubscribe = () => () => {};

export function AppShell({ activeSection, onNavigate, children }: AppShellProps) {
  const { user, signOut } = useAuth();
  const [internalCollapsed, setInternalCollapsed] = React.useState<boolean | null>(null);
  const isClient = React.useSyncExternalStore(emptySubscribe, () => true, () => false);
  const isCollapsed =
    internalCollapsed !== null
      ? internalCollapsed
      : isClient &&
        typeof window !== "undefined" &&
        localStorage.getItem("triage_sidebar_collapsed") === "true";

  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = React.useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = React.useState(false);
  const drawerRef = React.useRef<HTMLDivElement>(null);

  const emergencyNumber =
    process.env.NEXT_PUBLIC_DEFAULT_EMERGENCY_NUMBER || "112";

  const toggleCollapsed = () => {
    const next = !isCollapsed;
    setInternalCollapsed(next);
    try {
      localStorage.setItem("triage_sidebar_collapsed", String(next));
    } catch {
      // ignore in environments without localStorage
    }
  };

  const handleNavClick = (section: NavSection) => {
    onNavigate(section);
    setIsMobileDrawerOpen(false);
  };

  // Keyboard navigation / Focus trapping for mobile drawer
  React.useEffect(() => {
    if (!isMobileDrawerOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMobileDrawerOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileDrawerOpen]);

  const currentCrumb = sectionBreadcrumbs[activeSection] || sectionBreadcrumbs.home;

  return (
    <div className="flex min-h-screen bg-background text-foreground selection:bg-accent/15 selection:text-accent font-sans antialiased">
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* 1. Desktop & Tablet Left Sidebar */}
      <aside
        className={`hidden md:flex flex-col border-r border-border bg-sidebar shrink-0 transition-all duration-180 ease-out z-30 select-none ${
          isCollapsed ? "w-16" : "w-60"
        }`}
      >
        {/* Brand Header */}
        <div className="h-14 border-b border-border flex items-center justify-between px-3.5">
          <button
            type="button"
            onClick={() => handleNavClick("home")}
            className="flex items-center gap-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg overflow-hidden"
            title="Omnicura Home"
          >
            <OmnicuraLogo size="sm" showWordmark={!isCollapsed} />
          </button>

          {!isCollapsed && (
            <button
              type="button"
              onClick={toggleCollapsed}
              className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              title="Collapse sidebar rail"
              aria-label="Collapse sidebar rail"
            >
              <ChevronLeft className="size-4" />
            </button>
          )}
        </div>

        {/* Grouped Navigation Links */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              {!isCollapsed && (
                <div className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                  {group.group}
                </div>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavClick(item.id)}
                      title={item.label}
                      className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring relative ${
                        isActive
                          ? "bg-muted text-foreground font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      } ${isCollapsed ? "justify-center px-0" : ""}`}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-accent" />
                      )}
                      <Icon
                        className={`size-4 shrink-0 stroke-[1.75] ${
                          isActive ? "text-accent" : "text-muted-foreground"
                        }`}
                      />
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Footer Controls */}
        <div className="p-2 border-t border-border space-y-1.5 bg-sidebar">
          {/* Emergency Hotline Button */}
          <a
            href={`tel:${emergencyNumber}`}
            className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-destructive border border-destructive/25 bg-destructive/5 hover:bg-destructive/10 transition-colors ${
              isCollapsed ? "justify-center px-0" : ""
            }`}
            title={`Direct Emergency Dial ${emergencyNumber}`}
          >
            <PhoneCall className="size-3.5 shrink-0 stroke-[2]" />
            {!isCollapsed && <span>SOS {emergencyNumber}</span>}
          </a>

          {/* User Account Bar */}
          {user ? (
            <div
              className={`flex items-center gap-2 p-1.5 rounded-lg border border-border/60 bg-muted/30 ${
                isCollapsed ? "justify-center" : "justify-between"
              }`}
            >
              {!isCollapsed && (
                <div className="flex items-center gap-2 min-w-0 pr-1">
                  <div className="size-6 rounded-md bg-muted text-muted-foreground flex items-center justify-center shrink-0 text-xs font-medium border border-border">
                    <UserIcon className="size-3.5" />
                  </div>
                  <span className="text-xs text-muted-foreground truncate max-w-[110px]">
                    {user.email}
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={() => signOut()}
                className="size-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center shrink-0"
                title="Sign out of account"
              >
                <LogOut className="size-3.5" />
              </button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAuthModalOpen(true)}
              className={`w-full text-xs h-8 ${isCollapsed ? "px-0 justify-center" : "gap-1.5"}`}
              title="Sign in or create account"
            >
              <LogIn className="size-3.5" />
              {!isCollapsed && <span>Sign In</span>}
            </Button>
          )}

          {/* Theme & Collapse Controls */}
          <div className={`flex items-center gap-1.5 ${isCollapsed ? "justify-center flex-col" : "justify-between"}`}>
            <ThemeToggle />

            {isCollapsed && (
              <button
                type="button"
                onClick={toggleCollapsed}
                className="size-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors border border-border/70"
                title="Expand sidebar"
                aria-label="Expand sidebar"
              >
                <ChevronRight className="size-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* 2. Main Viewport & Layout */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Application Bar */}
        <header className="sticky top-0 z-20 h-14 border-b border-border bg-card/85 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-3">
          {/* Breadcrumbs & Mobile Trigger */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              className="md:hidden size-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground"
              aria-label="Open navigation drawer"
            >
              <Menu className="size-4" />
            </button>

            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground min-w-0">
              <span className="font-semibold text-foreground hidden sm:inline">
                Omnicura
              </span>
              <span className="hidden sm:inline text-muted-foreground/60">/</span>
              <span className="text-muted-foreground truncate">
                {currentCrumb.section}
              </span>
              <span className="text-muted-foreground/60">/</span>
              <span className="font-medium text-foreground truncate">
                {currentCrumb.title}
              </span>
            </div>
          </div>

          {/* Top Actions: Medical Disclaimer, SOS Dial, Theme, User */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Restrained Clinical Disclaimer Chip */}
            <div className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border/80 bg-muted/40 text-[11px] text-muted-foreground">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              <span>Clinical Decision Support • Non-Diagnostic</span>
            </div>

            {/* Discrete SOS 112 Dial */}
            <a
              href={`tel:${emergencyNumber}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive text-xs font-semibold hover:bg-destructive/10 transition-colors"
              title={`Call Emergency Hotline ${emergencyNumber}`}
            >
              <PhoneCall className="size-3" />
              <span>SOS {emergencyNumber}</span>
            </a>

            <div className="md:hidden">
              <ThemeToggle />
            </div>

            {!user && (
              <Button
                variant="default"
                size="sm"
                onClick={() => setIsAuthModalOpen(true)}
                className="h-8 text-xs font-medium px-3 md:hidden"
              >
                Sign In
              </Button>
            )}
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto pb-20 md:pb-8">
          {children}
        </main>

        {/* 3. Mobile Bottom Tab Bar (< md) */}
        <nav
          aria-label="Mobile quick tabs"
          className="md:hidden fixed bottom-0 left-0 right-0 z-30 h-14 bg-card/95 backdrop-blur-md border-t border-border grid grid-cols-5 items-center px-1 text-[11px]"
        >
          <button
            type="button"
            onClick={() => handleNavClick("home")}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 ${
              activeSection === "home" ? "text-accent font-semibold" : "text-muted-foreground"
            }`}
          >
            <LayoutDashboard className="size-4" />
            <span>Home</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavClick("triage")}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 ${
              activeSection === "triage" ? "text-accent font-semibold" : "text-muted-foreground"
            }`}
          >
            <Activity className="size-4" />
            <span>Triage</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavClick("vision")}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 ${
              activeSection === "vision" ? "text-accent font-semibold" : "text-muted-foreground"
            }`}
          >
            <Camera className="size-4" />
            <span>Vision</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavClick("hospitals")}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 ${
              activeSection === "hospitals" ? "text-accent font-semibold" : "text-muted-foreground"
            }`}
          >
            <MapPin className="size-4" />
            <span>Map</span>
          </button>

          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 py-1 text-muted-foreground hover:text-foreground"
          >
            <Menu className="size-4" />
            <span>More</span>
          </button>
        </nav>
      </div>

      {/* 4. Accessible Mobile Drawer Overlay */}
      {isMobileDrawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation"
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex md:hidden animate-in fade-in-50 duration-180"
          onClick={() => setIsMobileDrawerOpen(false)}
        >
          <div
            ref={drawerRef}
            onClick={(e) => e.stopPropagation()}
            className="w-72 max-w-[85%] bg-card h-full border-r border-border p-4 flex flex-col justify-between animate-in slide-in-from-left duration-200"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <OmnicuraLogo size="sm" showWordmark />
                <button
                  type="button"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="size-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground"
                  aria-label="Close navigation drawer"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Navigation groups */}
              <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-180px)] pr-1">
                {navGroups.map((group, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {group.group}
                    </div>
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeSection === item.id;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleNavClick(item.id)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                            isActive
                              ? "bg-accent/10 text-accent font-semibold border border-accent/20"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          }`}
                        >
                          <Icon className="size-4 shrink-0" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Actions in Drawer */}
            <div className="pt-3 border-t border-border space-y-2">
              <a
                href={`tel:${emergencyNumber}`}
                className="w-full flex items-center justify-center gap-1.5 h-9 rounded-lg bg-destructive text-destructive-foreground font-semibold text-xs"
              >
                <PhoneCall className="size-3.5" />
                <span>Call Emergency Hotline ({emergencyNumber})</span>
              </a>

              {user ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    signOut();
                    setIsMobileDrawerOpen(false);
                  }}
                  className="w-full h-9 text-xs"
                >
                  Sign Out ({user.email})
                </Button>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    setIsAuthModalOpen(true);
                    setIsMobileDrawerOpen(false);
                  }}
                  className="w-full h-9 text-xs"
                >
                  Sign In / Register
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
