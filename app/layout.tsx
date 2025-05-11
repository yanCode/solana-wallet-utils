import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { SolanaWalletProvider } from "@/components/wallet-provider"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Solana DApp",
  description: "Utils on solana"
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider attribute="class" >
          <SolanaWalletProvider>{children}</SolanaWalletProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
