"use client"

import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { LAMPORTS_PER_SOL } from "@solana/web3.js"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowDownUp, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"

type TransactionType = "incoming" | "outgoing" | "other"

interface TransactionItem {
  signature: string
  timestamp: number
  type: TransactionType
  amount: number | null
  counterparty: string | null
}

export function TransactionHistory() {
  const { connection } = useConnection()
  const { publicKey } = useWallet()
  const [transactions, setTransactions] = useState<TransactionItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!publicKey) {
      setTransactions([])
      return
    }

    const fetchTransactions = async () => {
      try {
        setLoading(true)

        // Get recent transaction signatures
        const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 10 })

        if (signatures.length === 0) {
          setTransactions([])
          return
        }

        // Get transaction details
        const transactionDetails = await Promise.all(
          signatures.map(async (sig) => {
            const tx = await connection.getParsedTransaction(sig.signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 })
            return { signature: sig, tx }
          }),
        )

        // Process transactions
        const processedTxs = transactionDetails
          .filter(({ tx }) => tx !== null)
          .map(({ signature, tx }) => {
            const { blockTime } = signature

            if (!tx || !blockTime) return null

            // Determine transaction type and extract details
            let type: TransactionType = "other"
            let amount: number | null = null
            let counterparty: string | null = null

            // Look for SOL transfers
            if (tx.transaction.message.instructions.length > 0) {
              // Iterate through all instructions to find transfer
              for (const instruction of tx.transaction.message.instructions) {
                if ("parsed" in instruction && instruction.parsed?.type === "transfer") {
                  const { info } = instruction.parsed

                  if (info.source === publicKey.toString()) {
                    type = "outgoing"
                    amount = info.lamports / LAMPORTS_PER_SOL
                    counterparty = info.destination
                    break // Found the transfer instruction, no need to continue
                  } else if (info.destination === publicKey.toString()) {
                    type = "incoming"
                    amount = info.lamports / LAMPORTS_PER_SOL
                    counterparty = info.source
                    break // Found the transfer instruction, no need to continue
                  }
                }
              }
            }

            return {
              signature: signature.signature,
              timestamp: blockTime * 1000, // Convert to milliseconds
              type,
              amount,
              counterparty,
            }
          })
          .filter((tx): tx is TransactionItem => tx !== null)

        setTransactions(processedTxs)
      } catch (error) {
        console.error("Error fetching transactions:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchTransactions()
  }, [connection, publicKey])

  const openExplorer = (signature: string) => {
    const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`
    window.open(explorerUrl, "_blank")
  }

  if (!publicKey) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
        <CardDescription>Your recent Solana transactions</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">No transactions found</div>
        ) : (
          <div className="space-y-4">
            {transactions.map((tx) => (
              <div key={tx.signature} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50">
                <div
                  className={`p-2 rounded-full ${tx.type === "incoming"
                    ? "bg-green-500/20 text-green-500"
                    : tx.type === "outgoing"
                      ? "bg-red-500/20 text-red-500"
                      : "bg-gray-500/20 text-gray-500"
                    }`}
                >
                  <ArrowDownUp className="h-4 w-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">
                        {tx.type === "incoming" ? "Received" : tx.type === "outgoing" ? "Sent" : "Transaction"}
                      </div>
                      {tx.counterparty && (
                        <div className="text-xs text-muted-foreground font-mono truncate max-w-[180px]">
                          {tx.type === "incoming" ? "From: " : "To: "}
                          {tx.counterparty.slice(0, 4)}...{tx.counterparty.slice(-4)}
                        </div>
                      )}
                    </div>

                    {tx.amount !== null && (
                      <div
                        className={`font-medium ${tx.type === "incoming" ? "text-green-500" : tx.type === "outgoing" ? "text-red-500" : ""
                          }`}
                      >
                        {tx.type === "incoming" ? "+" : "-"}
                        {tx.amount.toFixed(4)} SOL
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center mt-1">
                    <div className="text-xs text-muted-foreground">{new Date(tx.timestamp).toLocaleString()}</div>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openExplorer(tx.signature)}>
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
