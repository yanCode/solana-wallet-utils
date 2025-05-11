"use client"

import type React from "react"

import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js"
import { useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Check, Loader2 } from "lucide-react"
import { Progress } from "@/components/ui/progress"

interface Recipient {
  address: string
  amount: number
  valid: boolean
  error?: string
}

export function SendToMany() {
  const { connection } = useConnection()
  const { publicKey, sendTransaction } = useWallet()
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [manualInput, setManualInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<{ success: number; failed: number }>({ success: 0, failed: 0 })
  const [showResults, setShowResults] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const parseCSV = (content: string): Recipient[] => {
    const lines = content.split(/\r?\n/).filter((line) => line.trim() !== "")

    return lines.map((line) => {
      const [addressStr, amountStr] = line.split(",").map((item) => item.trim())
      const amount = Number.parseFloat(amountStr)

      let valid = true
      let error = undefined

      // Validate address
      const address = addressStr
      try {
        new PublicKey(addressStr)
      } catch (e) {
        valid = false
        error = "Invalid address"
      }

      // Validate amount
      if (isNaN(amount) || amount <= 0) {
        valid = false
        error = error ? `${error}, Invalid amount` : "Invalid amount"
      }

      return { address, amount, valid, error }
    })
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      const parsed = parseCSV(content)
      setRecipients(parsed)

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
    reader.readAsText(file)
  }

  const handleManualInputParse = () => {
    setIsLoading(true)
    try {
      const parsed = parseCSV(manualInput)
      setRecipients(parsed)
    } catch (error) {
      toast({
        title: "Error parsing input",
        description: "Please check your format: address,amount on each line",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendToMany = async () => {
    if (!publicKey || recipients.length === 0) return

    const validRecipients = recipients.filter((r) => r.valid)
    if (validRecipients.length === 0) {
      toast({
        title: "No valid recipients",
        description: "Please fix the errors in your recipient list",
        variant: "destructive",
      })
      return
    }

    setIsSending(true)
    setProgress(0)
    setResults({ success: 0, failed: 0 })
    setShowResults(true)

    let successCount = 0
    let failedCount = 0

    for (let i = 0; i < validRecipients.length; i++) {
      const { address, amount } = validRecipients[i]

      try {
        // Create transaction
        const recipientPubkey = new PublicKey(address)
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: recipientPubkey,
            lamports: amount * LAMPORTS_PER_SOL,
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

        successCount++
      } catch (error) {
        console.error(`Error sending to ${address}:`, error)
        failedCount++
      }

      // Update progress
      const currentProgress = Math.round(((i + 1) / validRecipients.length) * 100)
      setProgress(currentProgress)
      setResults({ success: successCount, failed: failedCount })
    }

    toast({
      title: "Batch transactions completed",
      description: `Successfully sent to ${successCount} recipients. Failed: ${failedCount}`,
      variant: successCount > 0 ? "default" : "destructive",
    })

    setIsSending(false)
  }

  const clearAll = () => {
    setRecipients([])
    setManualInput("")
    setShowResults(false)
  }

  const getTotalAmount = () => {
    return recipients.filter((r) => r.valid).reduce((sum, recipient) => sum + recipient.amount, 0)
  }

  if (!publicKey) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Send to Many</CardTitle>
        <CardDescription>Send SOL to multiple wallet addresses at once</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="manual">Manual Input</TabsTrigger>
            <TabsTrigger value="csv">CSV Upload</TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="manual-input">Enter addresses and amounts (one per line)</Label>
              <Textarea
                id="manual-input"
                placeholder="address,amount
address2,amount2
e.g. 7KqpU9VEZNVVoJBPbNYKtJnbNJFzCxpK1J5vCJpmwb4p,0.1"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                rows={6}
              />
              <p className="text-xs text-muted-foreground">Format: address,amount (one per line)</p>
            </div>
            <Button onClick={handleManualInputParse} disabled={isLoading || manualInput.trim() === ""}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Parse Input
            </Button>
          </TabsContent>

          <TabsContent value="csv" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="csv-upload">Upload CSV file</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="csv-upload"
                  type="file"
                  accept=".csv,.txt"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">CSV format: address,amount (one per line)</p>
            </div>
          </TabsContent>
        </Tabs>

        {recipients.length > 0 && (
          <div className="space-y-4 mt-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Recipients ({recipients.length})</h3>
              <Button variant="outline" size="sm" onClick={clearAll}>
                Clear All
              </Button>
            </div>

            <div className="border rounded-md">
              <div className="grid grid-cols-12 gap-2 p-3 border-b font-medium text-sm">
                <div className="col-span-6">Address</div>
                <div className="col-span-3">Amount (SOL)</div>
                <div className="col-span-3">Status</div>
              </div>
              <div className="max-h-[200px] overflow-y-auto">
                {recipients.map((recipient, index) => (
                  <div
                    key={index}
                    className={`grid grid-cols-12 gap-2 p-3 text-sm ${index !== recipients.length - 1 ? "border-b" : ""} ${!recipient.valid ? "bg-destructive/10" : ""}`}
                  >
                    <div className="col-span-6 font-mono truncate">{recipient.address}</div>
                    <div className="col-span-3">{recipient.amount}</div>
                    <div className="col-span-3">
                      {recipient.valid ? (
                        <span className="text-green-500 flex items-center gap-1">
                          <Check className="h-3 w-3" /> Valid
                        </span>
                      ) : (
                        <span className="text-destructive text-xs">{recipient.error}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Summary</AlertTitle>
              <AlertDescription>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between">
                    <span>Valid recipients:</span>
                    <span>{recipients.filter((r) => r.valid).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total SOL to send:</span>
                    <span>{getTotalAmount().toFixed(4)} SOL</span>
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            {showResults && (
              <div className="space-y-2">
                <Progress value={progress} className="h-2" />
                <div className="flex justify-between text-sm">
                  <span>Progress: {progress}%</span>
                  <span>
                    Success: {results.success} / Failed: {results.failed}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {recipients.length > 0 && recipients.some((r) => r.valid) && (
        <CardFooter>
          <Button
            className="w-full"
            onClick={handleSendToMany}
            disabled={isSending || !recipients.some((r) => r.valid)}
          >
            {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isSending ? "Sending..." : `Send to ${recipients.filter((r) => r.valid).length} Recipients`}
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
