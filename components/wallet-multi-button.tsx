"use client"

import { useWallet } from "@solana/wallet-adapter-react"
import { WalletMultiButton as WalletMultiButtonUI } from "@solana/wallet-adapter-react-ui"
import { useEffect, useState } from "react"

export function WalletMultiButton() {
  // We need this to prevent hydration errors
  const [mounted, setMounted] = useState(false)
  const { wallet } = useWallet()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <button className="px-6 py-2 rounded-md bg-purple-600 text-white font-medium">Connect Wallet</button>
  }

  return <WalletMultiButtonUI className="wallet-adapter-button-custom" />
}
