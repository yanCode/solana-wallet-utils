"use client"

import { useWallet } from "@solana/wallet-adapter-react"
import { WalletMultiButton as WalletMultiButtonUI } from "@solana/wallet-adapter-react-ui"


export function WalletMultiButton() {
  return <WalletMultiButtonUI className="wallet-adapter-button-custom" />
}
