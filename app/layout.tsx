import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import Header from "@/components/header"
import { Toaster } from "@/components/ui/toaster"
import { initClientEnv } from "@/lib/env"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Serenity - Virtual AI Therapist",
  description: "An emotionally aware AI therapist for mental wellness",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Initialize client environment variables
  if (typeof window !== "undefined") {
    initClientEnv()
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <Header />
          <main className="min-h-screen bg-gradient-to-b from-background to-secondary/10">{children}</main>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
