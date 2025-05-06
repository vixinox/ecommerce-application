import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Toaster } from "sonner"

import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/components/auth-provider"
import "./globals.css"

const inter = Inter({subsets: ["latin"]})

export const metadata: Metadata = {
  title: "电商平台",
  description: "现代化电商平台",
}

export default function RootLayout({children}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
    <body className={inter.className}>
    <ThemeProvider attribute="class" defaultTheme="system" storageKey="e-commerce-theme">
      <AuthProvider>
        {children}
        <Toaster position="bottom-right"/>
      </AuthProvider>
    </ThemeProvider>
    </body>
    </html>
  )
}
