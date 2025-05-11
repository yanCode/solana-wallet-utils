"use client"

import type React from "react"

import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

export function SendTransaction() {
  const { connection } = useConnection()
  const { publicKey, sendTransaction } = useWallet()
  const [recipient, setRecipient] = useState("")
  const [amount, setAmount] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!publicKey) return

    try {
      setIsLoading(true)

      // Validate recipient address
      let recipientPubkey: PublicKey
      try {
        recipientPubkey = new PublicKey(recipient)
      } catch (error) {
        toast({
          title: "Invalid address",
          description: "Please enter a valid Solana address",
          variant: "destructive",
        })
        return
      }

      // Validate amount
      const parsedAmount = Number.parseFloat(amount)
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        toast({
          title: "Invalid amount",
          description: "Please enter a valid amount greater than 0",
          variant: "destructive",
        })
        return
      }

      // Create transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: recipientPubkey,
          lamports: parsedAmount * LAMPORTS_PER_SOL,
        }),
      )

      // Get latest blockhash
      const { blockhash } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = publicKey

      // Send transaction
      const signature = await sendTransaction(transaction, connection)

      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(signature, "confirmed")

      if (confirmation.value.err) {
        throw new Error("Transaction failed")
      }

      toast({
        title: "Transaction successful",
        description: `Sent ${parsedAmount} SOL to ${recipientPubkey.toString().slice(0, 8)}...`,
      })

      // Reset form
      setRecipient("")
      setAmount("")
    } catch (error) {
      console.error("Error sending transaction:", error)
      toast({
        title: "Transaction failed",
        description: "There was an error sending your transaction",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!publicKey) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Send SOL</CardTitle>
        <CardDescription>Send SOL to another wallet address</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recipient">Recipient Address</Label>
            <Input
              id="recipient"
              placeholder="Enter Solana address"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (SOL)</Label>
            <Input
              id="amount"
              type="number"
              step="0.000001"
              min="0.000001"
              placeholder="0.0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Sending..." : "Send SOL"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
