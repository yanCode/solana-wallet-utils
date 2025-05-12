"use client"

import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { LAMPORTS_PER_SOL } from "@solana/web3.js"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import EmptyAccountInfo from "@/app/ui/empty.account.info"

export function AccountInfo() {
  const { connection } = useConnection()
  const { publicKey } = useWallet()
  const [balance, setBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    let isMounted = true

    const fetchBalance = async () => {
      if (!publicKey) {
        setBalance(null)
        return
      }

      try {
        setLoading(true)
        const balance = await connection.getBalance(publicKey)
        if (isMounted) {
          setBalance(balance / LAMPORTS_PER_SOL)
        }
      } catch (error) {
        console.error("Error fetching balance:", error)
        if (isMounted) {
          setBalance(null)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchBalance()

    // Set up balance refresh every 15 seconds
    const intervalId = setInterval(fetchBalance, 15000)

    return () => {
      isMounted = false
      clearInterval(intervalId)
    }
  }, [connection, publicKey])

  const copyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toString())
      toast({
        title: "Address copied",
        description: "Wallet address copied to clipboard",
      })
    }
  }

  if (!publicKey) {
    return <EmptyAccountInfo />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Information</CardTitle>
        <CardDescription>Your Solana wallet details</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-1">Wallet Address</div>
            <div className="flex items-center gap-2">
              <div className="text-sm font-mono bg-muted p-2 rounded-md overflow-hidden text-ellipsis">
                {publicKey.toString()}
              </div>
              <Button variant="ghost" size="icon" onClick={copyAddress}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div>
            <div className="text-sm font-medium text-muted-foreground mb-1">SOL Balance</div>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">{balance !== null ? balance.toFixed(4) : "0"} SOL</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
