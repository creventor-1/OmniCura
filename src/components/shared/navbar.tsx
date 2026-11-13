"use client";

import * as React from "react";
import {
  Activity,
  Camera,
  Pill,
  MapPin,
  History,
  UserCheck,
  Menu,
  X,
  PhoneCall,
  LogIn,
  LogOut,
  User as UserIcon,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { TriageAILogo } from "./brand-logo";
import { useAuth } from "@/features/authentication/context/auth-context";
import { AuthModal } from "@/features/authentication/components/auth-modal";

export type NavSection =
  | "home"
  | "triage"
  | "vision"
  | "medication"
  | "hospitals"
  | "history"
  | "profile"
  | "contacts";

interface NavbarProps {
  activeSection: NavSection;
  onNavigate: (section: NavSection) => void;
}

export function Navbar({ activeSection, onNavigate }: NavbarProps) {
  const { user, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = React.useState(false);

  const emergencyNumber =
    process.env.NEXT_PUBLIC_DEFAULT_EMERGENCY_NUMBER || "112";

  const handleNavClick = (section: NavSection) => {
    onNavigate(section);
    setIsMobileMenuOpen(false);
  };

  const navItems: { id: NavSection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "home", label: "Overview", icon: Sparkles },
    { id: "triage", label: "Triage Chat", icon: Activity },
    { id: "vision", label: "Symptom Vision", icon: Camera },
    { id: "medication", label: "Medication Scan", icon: Pill },
    { id: "hospitals", label: "Hospitals", icon: MapPin },
    { id: "history", label: "History", icon: History },
    { id: "profile", label: "Profile", icon: UserCheck },
  ];

  return (
    <>
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70 transition-all">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          {/* Logo & Brand Identity */}
          <button
            type="button"
            onClick={() => handleNavClick("home")}
            className="flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg transition-transform active:scale-95"
            aria-label="TriageAI Home"
          >
            <TriageAILogo size="md" showWordmark />
          </button>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 bg-muted/50 p-1 rounded-xl border border-border/50 text-xs">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all duration-150 ${
                    isActive
                      ? "bg-background text-primary shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                  }`}
                >
                  <Icon className={`size-3.5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Desktop Controls (Emergency, Auth, Theme) */}
          <div className="hidden sm:flex items-center gap-2.5">
            {/* Quick SOS Hotline Dial */}
            <a
              href={`tel:${emergencyNumber}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/25 text-xs font-bold transition-colors"
              title={`Call Emergency Hotline ${emergencyNumber}`}
            >
              <PhoneCall className="size-3" />
              <span>SOS {emergencyNumber}</span>
            </a>

            <ThemeToggle />

            {user ? (
              <div className="flex items-center gap-2 border-l border-border/60 pl-2.5">
                <span className="text-xs font-medium text-muted-foreground hidden xl:inline-flex items-center gap-1 max-w-[140px] truncate">
                  <UserIcon className="size-3" />
                  {user.email}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => signOut()}
                  className="h-8 text-xs gap-1.5 rounded-lg"
                  title="Sign out of account"
                >
                  <LogOut className="size-3" />
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
              </div>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => setIsAuthModalOpen(true)}
                className="h-8 text-xs gap-1.5 rounded-lg shadow-xs"
              >
                <LogIn className="size-3" />
                <span>Sign In</span>
              </Button>
            )}
          </div>

          {/* Mobile Menu Trigger & Theme Toggle */}
          <div className="flex items-center gap-2 lg:hidden">
            <ThemeToggle />

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="size-9 rounded-lg border border-border/70 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Slide-Out Drawer / Dropdown */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-b border-border/60 bg-background/95 backdrop-blur-md animate-in slide-in-from-top-2 duration-200">
            <div className="p-4 space-y-3 max-w-md mx-auto">
              <div className="grid grid-cols-2 gap-2 text-xs">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavClick(item.id)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-left font-medium transition-all ${
                        isActive
                          ? "bg-primary/10 border-primary/30 text-primary font-bold shadow-xs"
                          : "bg-card border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Mobile Auth & Emergency Action Bar */}
              <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-2">
                <a
                  href={`tel:${emergencyNumber}`}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-xl bg-red-600 text-white font-bold text-xs shadow-xs hover:bg-red-700 transition-colors"
                >
                  <PhoneCall className="size-3.5" />
                  <span>Call SOS {emergencyNumber}</span>
                </a>

                {user ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      signOut();
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex-1 h-9 text-xs rounded-xl gap-1.5"
                  >
                    <LogOut className="size-3.5" />
                    <span>Sign Out</span>
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => {
                      setIsAuthModalOpen(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex-1 h-9 text-xs rounded-xl gap-1.5"
                  >
                    <LogIn className="size-3.5" />
                    <span>Sign In / Register</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
