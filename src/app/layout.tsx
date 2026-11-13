import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/features/authentication/context/auth-context";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0284c7" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export const metadata: Metadata = {
  title: "TriageAI • Clinical Emergency & First-Aid Intelligence",
  description:
    "Intelligent emergency triage, deterministic safety screening, symptom vision analysis, and verified hospital locator. Educational guidance and supportive care.",
  keywords: [
    "triage",
    "emergency medicine",
    "first aid",
    "hospital locator",
    "symptom checker",
    "healthcare AI",
    "clinical triage",
  ],
  authors: [{ name: "TriageAI Team" }],
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    title: "TriageAI • Clinical Emergency & First-Aid Intelligence",
    description:
      "Deterministic emergency screening, adaptive clinical follow-ups, and verified hospital locator with real-time directions.",
    url: "https://triage-ai-flame.vercel.app",
    siteName: "TriageAI",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "TriageAI • Clinical Emergency & First-Aid Intelligence",
    description:
      "Intelligent emergency triage, deterministic safety screening, and hospital discovery.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground selection:bg-primary/20 selection:text-primary">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
