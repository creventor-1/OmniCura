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
    group: "CLINICAL ASSESSMENT",
    items: [
      { id: "triage", label: "Symptom Assessment", icon: Activity },
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
  triage: { section: "Clinical", title: "Symptom Assessment" },
  vision: { section: "Clinical", title: "Symptom Vision" },
  medication: { section: "Clinical", title: "Medication Scan" },
  hospitals: { section: "Facilities", title: "Hospitals" },
  history: { section: "Records", title: "History" },
  profile: { section: "Records", title: "Profile" },
  contacts: { section: "Safety", title: "Contacts" },
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
        localStorage.getItem("omnicura_sidebar_collapsed") === "true";

  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = React.useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = React.useState(false);

  const emergencyNumber =
    process.env.NEXT_PUBLIC_DEFAULT_EMERGENCY_NUMBER || "112";

  const toggleCollapsed = () => {
    const next = !isCollapsed;
    setInternalCollapsed(next);
    try {
      localStorage.setItem("omnicura_sidebar_collapsed", String(next));
    } catch {
      // ignore in environments without localStorage
    }
  };

  const handleNavClick = (section: NavSection) => {
    onNavigate(section);
    setIsMobileDrawerOpen(false);
  };

  // Keyboard navigation for mobile drawer
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
    <div className="flex min-h-screen bg-app text-foreground selection:bg-accent/15 selection:text-accent font-sans antialiased">
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* 1. Desktop & Tablet Left Sidebar */}
      <aside
        className={`hidden md:flex flex-col border-r border-border-subtle glass-chrome shrink-0 transition-all duration-180 ease-out z-30 select-none ${
          isCollapsed ? "w-16" : "w-60"
        }`}
      >
        {/* Brand Header */}
        <div className="h-14 border-b border-border-subtle flex items-center justify-between px-3.5">
          <button
            type="button"
            onClick={() => handleNavClick("home")}
            className="flex items-center gap-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg overflow-hidden cursor-pointer"
            title="Omnicura Home"
          >
            <OmnicuraLogo size="sm" showWordmark={!isCollapsed} />
          </button>

          {!isCollapsed && (
            <button
              type="button"
              onClick={toggleCollapsed}
              className="size-7 rounded-lg text-text-secondary hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
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
                <div className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
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
                      className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-all duration-120 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring relative cursor-pointer ${
                        isActive
                          ? "bg-accent/10 text-foreground font-semibold"
                          : "text-text-secondary hover:text-foreground hover:bg-muted/60"
                      } ${isCollapsed ? "justify-center px-0" : ""}`}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-accent" />
                      )}
                      <Icon
                        className={`size-4 shrink-0 stroke-[1.75] ${
                          isActive ? "text-accent" : "text-text-secondary"
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
        <div className="p-2 border-t border-border-subtle space-y-1.5">
          {/* Emergency Hotline Button */}
          <a
            href={`tel:${emergencyNumber}`}
            className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-danger border border-danger/25 bg-danger-muted hover:opacity-90 transition-opacity ${
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
              className={`flex items-center gap-2 p-1.5 rounded-lg border border-border-subtle bg-surface ${
                isCollapsed ? "justify-center" : "justify-between"
              }`}
            >
              {!isCollapsed && (
                <div className="flex items-center gap-2 min-w-0 pr-1">
                  <div className="size-6 rounded-md bg-secondary text-text-secondary flex items-center justify-center shrink-0 text-xs font-medium border border-border-subtle">
                    <UserIcon className="size-3.5" />
                  </div>
                  <span className="text-xs text-text-secondary truncate max-w-[110px]">
                    {user.email}
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={() => signOut()}
                className="size-7 rounded-md text-text-secondary hover:text-foreground hover:bg-muted flex items-center justify-center shrink-0 cursor-pointer"
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
                className="size-9 rounded-lg text-text-secondary hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors border border-border-subtle cursor-pointer"
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
        <header className="sticky top-0 z-20 h-14 border-b border-border-subtle glass-chrome px-4 sm:px-6 flex items-center justify-between gap-3">
          {/* Breadcrumbs & Mobile Trigger */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              className="md:hidden size-9 rounded-lg border border-border-subtle flex items-center justify-center text-text-secondary hover:text-foreground cursor-pointer"
              aria-label="Open navigation drawer"
            >
              <Menu className="size-4" />
            </button>

            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-text-secondary min-w-0">
              <span className="font-semibold text-foreground hidden sm:inline">
                Omnicura
              </span>
              <span className="hidden sm:inline text-text-tertiary">/</span>
              <span className="text-text-secondary truncate">
                {currentCrumb.section}
              </span>
              <span className="text-text-tertiary">/</span>
              <span className="font-medium text-foreground truncate">
                {currentCrumb.title}
              </span>
            </div>
          </div>

          {/* Top Actions: Medical Disclaimer, SOS Dial, Theme, User */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Restrained Clinical Disclaimer Chip */}
            <div className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border-subtle bg-surface text-[11px] text-text-secondary">
              <span className="size-1.5 rounded-full bg-success" />
              <span>Clinical Decision Support • Non-Diagnostic</span>
            </div>

            {/* Discrete SOS Dial (Reachable in one tap) */}
            <a
              href={`tel:${emergencyNumber}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-danger/30 bg-danger-muted text-danger text-xs font-semibold hover:opacity-90 transition-opacity"
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

        {/* Page Content Body with faint radial teal glow behind header */}
        <main className="flex-1 relative p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto pb-20 md:pb-8">
          <div
            className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-radial from-accent/5 to-transparent blur-2xl -z-10"
            aria-hidden="true"
          />
          {children}
        </main>

        {/* 3. Mobile Bottom Tab Bar (< md) - Max 5 Items */}
        <nav
          aria-label="Mobile quick tabs"
          className="md:hidden fixed bottom-0 left-0 right-0 z-30 h-14 glass-chrome border-t border-border-subtle grid grid-cols-5 items-center px-1 text-[11px] pb-safe"
        >
          <button
            type="button"
            onClick={() => handleNavClick("home")}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 cursor-pointer ${
              activeSection === "home" ? "text-accent font-semibold" : "text-text-secondary"
            }`}
          >
            <LayoutDashboard className="size-4" />
            <span>Home</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavClick("triage")}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 cursor-pointer ${
              activeSection === "triage" ? "text-accent font-semibold" : "text-text-secondary"
            }`}
          >
            <Activity className="size-4" />
            <span>Assess</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavClick("vision")}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 cursor-pointer ${
              activeSection === "vision" ? "text-accent font-semibold" : "text-text-secondary"
            }`}
          >
            <Camera className="size-4" />
            <span>Vision</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavClick("hospitals")}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 cursor-pointer ${
              activeSection === "hospitals" ? "text-accent font-semibold" : "text-text-secondary"
            }`}
          >
            <MapPin className="size-4" />
            <span>Hospitals</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavClick("history")}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 cursor-pointer ${
              activeSection === "history" ? "text-accent font-semibold" : "text-text-secondary"
            }`}
          >
            <History className="size-4" />
            <span>History</span>
          </button>
        </nav>
      </div>

      {/* 4. Mobile Drawer Overlay */}
      {isMobileDrawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Navigation Menu"
          className="md:hidden fixed inset-0 z-50 flex"
        >
          <div
            className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-180"
            onClick={() => setIsMobileDrawerOpen(false)}
          />

          <div
            className="relative flex flex-col w-4/5 max-w-xs h-full bg-surface border-r border-border-subtle p-4 space-y-4 shadow-overlay z-10 animate-in slide-in-from-left duration-240"
          >
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
              <OmnicuraLogo size="sm" showWordmark />
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="size-8 rounded-lg text-text-secondary hover:text-foreground flex items-center justify-center cursor-pointer"
                aria-label="Close menu"
              >
                <ChevronLeft className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4">
              {navGroups.map((group, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                    {group.group}
                  </div>
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeSection === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleNavClick(item.id)}
                          className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-left transition-colors cursor-pointer ${
                            isActive
                              ? "bg-accent/10 text-foreground font-semibold"
                              : "text-text-secondary hover:bg-muted"
                          }`}
                        >
                          <Icon className={`size-4.5 ${isActive ? "text-accent" : "text-text-secondary"}`} />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-border-subtle space-y-2">
              <a
                href={`tel:${emergencyNumber}`}
                className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold text-danger border border-danger/30 bg-danger-muted"
              >
                <PhoneCall className="size-4" />
                <span>Call Emergency ({emergencyNumber})</span>
              </a>

              {!user ? (
                <Button
                  className="w-full text-xs h-9"
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    setIsAuthModalOpen(true);
                  }}
                >
                  Sign In / Register
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="w-full text-xs h-9 gap-1.5"
                  onClick={() => {
                    signOut();
                    setIsMobileDrawerOpen(false);
                  }}
                >
                  <LogOut className="size-3.5" />
                  <span>Sign Out ({user.email})</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
