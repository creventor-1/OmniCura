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
    { media: "(prefers-color-scheme: light)", color: "#F6F8FA" },
    { media: "(prefers-color-scheme: dark)", color: "#0A1120" },
  ],
};

export const metadata: Metadata = {
  title: "Omnicura • Clinical Decision Support & Emergency Care Intelligence",
  description:
    "Clinical-grade autonomous health assessment platform featuring deterministic red-flag emergency screening, multimodal symptom vision, medication analysis, and verified hospital routing.",
  keywords: [
    "Omnicura",
    "clinical assessment",
    "emergency medicine",
    "symptom consultation",
    "clinical decision support",
    "hospital locator",
    "first aid guidance",
    "healthcare AI",
    "medical guidance",
  ],
  authors: [{ name: "Omnicura Clinical Intelligence Team" }],
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "Omnicura • Clinical Decision Support & Emergency Care Intelligence",
    description:
      "Deterministic emergency screening, adaptive clinical follow-ups, and verified hospital locator with real-time routing.",
    url: "https://omnicura-health.vercel.app",
    siteName: "Omnicura",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Omnicura • Clinical Decision Support & Emergency Care Intelligence",
    description:
      "Clinical-grade autonomous health assessment platform with deterministic safety screening and hospital discovery.",
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
