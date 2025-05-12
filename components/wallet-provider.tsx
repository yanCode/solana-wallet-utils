"use client"

import { WalletAdapterNetwork } from "@solana/wallet-adapter-base"
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react"
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui"
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  CoinbaseWalletAdapter,

  // BraveWalletAdapter,
} from "@solana/wallet-adapter-wallets"
// import { clusterApiUrl } from "@solana/web3.js"; // No longer needed directly here
import { type ReactNode, useMemo } from "react"
import { useNetworkConfiguration } from "@/contexts/network-context"; // Import the hook

// Import wallet adapter CSS
import "@solana/wallet-adapter-react-ui/styles.css"

export function SolanaWalletProvider({ children }: { children: ReactNode }) {
  const { getRpcEndpoint } = useNetworkConfiguration(); // Use the hook

  // The network can be set to 'devnet', 'testnet', or 'mainnet-beta' or custom RPC
  // const network = WalletAdapterNetwork.Devnet; // Removed

  // You can also provide a custom RPC endpoint
  const endpoint = useMemo(() => getRpcEndpoint(), [getRpcEndpoint]); // Get endpoint from context

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new CoinbaseWalletAdapter(),
      // If you want Coinbase, uncomment its import and add: new CoinbaseWalletAdapter(),
      // Only wallets explicitly instantiated and included here will be shown.
    ],
    []
  )

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
