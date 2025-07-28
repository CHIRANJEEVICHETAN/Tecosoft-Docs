import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/contexts/theme-provider";
import { ConditionalNavbar } from "@/components/conditional-navbar";
import { Space_Mono, Space_Grotesk } from "next/font/google";
import { ConditionalFooter } from "@/components/conditional-footer";
import { ConditionalMain } from "@/components/conditional-main";
import { clerkAppearance } from "@/lib/clerk-config";
import "@/styles/globals.css";

const sansFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
  weight: "400",
});

const monoFont = Space_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
  weight: "400",
});

export const metadata: Metadata = {
  title: "Docify.ai Pro - AI-Powered Documentation Platform",
  metadataBase: new URL("https://Docify.ai.pro/"),
  description:
    "Transform your documentation with AI-powered intelligence. Docify.ai Pro combines multi-tenant architecture, role-based access control, and intelligent content creation for modern teams.",
  keywords: [
    "documentation",
    "AI-powered",
    "multi-tenant",
    "collaboration",
    "team documentation",
    "knowledge management",
    "technical writing"
  ],
  authors: [{ name: "Docify.ai Pro Team" }],
  openGraph: {
    title: "Docify.ai Pro - AI-Powered Documentation Platform",
    description: "Transform your documentation with AI-powered intelligence",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Docify.ai Pro - AI-Powered Documentation Platform",
    description: "Transform your documentation with AI-powered intelligence",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          type="text/css"
          href="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/devicon.min.css"
        />
      </head>
      <body
        className={`${sansFont.variable} ${monoFont.variable} font-regular antialiased tracking-wide`}
        suppressHydrationWarning
      >
        <ClerkProvider
          appearance={clerkAppearance}
          signInFallbackRedirectUrl="/dashboard"
          signUpFallbackRedirectUrl="/dashboard"
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <ConditionalNavbar />
            <ConditionalMain>
              {children}
            </ConditionalMain>
            <ConditionalFooter />
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
