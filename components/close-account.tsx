"use client"

import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { LAMPORTS_PER_SOL, type PublicKey, Transaction, SystemProgram } from "@solana/web3.js"
import { TOKEN_PROGRAM_ID, createCloseAccountInstruction } from "@solana/spl-token"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Loader2, RefreshCw, Trash2 } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { InfoIcon } from "lucide-react"

interface AccountInfo {
  pubkey: PublicKey
  type: "token" | "program" | "system" | "unknown"
  balance: number
  mint?: string
  tokenName?: string
  rentExempt: number
  selected: boolean
}

export function CloseAccount() {
  const { connection } = useConnection()
  const { publicKey, sendTransaction } = useWallet()
  const [accounts, setAccounts] = useState<AccountInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [closing, setClosing] = useState(false)
  const { toast } = useToast()

  const fetchAccounts = async () => {
    if (!publicKey) return

    setLoading(true)
    try {
      // Get all token accounts owned by the wallet
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, { programId: TOKEN_PROGRAM_ID })
      // Process token accounts
      const tokenAccountsInfo: AccountInfo[] = await Promise.all(
        tokenAccounts.value.map(async (account) => {
          const accountInfo = account.account
          const parsedInfo = accountInfo.data.parsed.info
          const tokenBalance = parsedInfo.tokenAmount.uiAmount
          const mintAddress = parsedInfo.mint

          // Get rent exempt amount
          const rentExempt = await connection.getMinimumBalanceForRentExemption(accountInfo.data.space)

          return {
            pubkey: account.pubkey,
            type: "token",
            balance: tokenBalance,
            mint: mintAddress,
            tokenName: `Token (${mintAddress.slice(0, 4)}...${mintAddress.slice(-4)})`,
            rentExempt: rentExempt / LAMPORTS_PER_SOL,
            selected: tokenBalance === 0, // Auto-select empty token accounts
          }
        }),
      )


      setAccounts([...tokenAccountsInfo])
    } catch (error) {
      console.error("Error fetching accounts:", error)
      toast({
        title: "Error fetching accounts",
        description: "There was an error fetching your accounts",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (publicKey) {
      fetchAccounts()
    } else {
      setAccounts([])
    }
  }, [publicKey, connection])

  const toggleAccountSelection = (pubkey: string) => {
    setAccounts(
      accounts.map((account) =>
        account.pubkey.toString() === pubkey ? { ...account, selected: !account.selected } : account,
      ),
    )
  }

  const selectAllEmptyTokenAccounts = () => {
    setAccounts(
      accounts.map((account) =>
        account.type === "token" && account.balance === 0 ? { ...account, selected: true } : account,
      ),
    )
  }

  const getTotalRentToReclaim = () => {
    return accounts.filter((account) => account.selected).reduce((sum, account) => sum + account.rentExempt, 0)
  }

  const closeSelectedAccounts = async () => {
    if (!publicKey) return

    const selectedAccounts = accounts.filter((account) => account.selected)
    if (selectedAccounts.length === 0) return

    setClosing(true)
    let successCount = 0

    try {
      // Process token accounts first
      const tokenAccounts = selectedAccounts.filter((account) => account.type === "token")

      for (const account of tokenAccounts) {
        try {
          // Create transaction to close token account
          const transaction = new Transaction()

          transaction.add(
            createCloseAccountInstruction(
              account.pubkey,
              publicKey, // Destination for rent SOL
              publicKey, // Authority
              [],
            ),
          )

          // Get latest blockhash
          const { blockhash } = await connection.getLatestBlockhash()
          transaction.recentBlockhash = blockhash
          transaction.feePayer = publicKey

          // Send transaction
          const signature = await sendTransaction(transaction, connection)

          const latestBlockhash = await connection.getLatestBlockhash()
          // Wait for confirmation
          const confirmation = await connection.confirmTransaction({ signature, ...latestBlockhash }, "confirmed")

          if (confirmation.value.err) {
            throw new Error("Transaction failed")
          }

          successCount++
        } catch (error) {
          console.error(`Error closing account ${account.pubkey.toString()}:`, error)
        }
      }

      toast({
        title: "Accounts closed",
        description: `Successfully closed ${successCount} accounts and reclaimed rent`,
      })

      // Refresh accounts list
      fetchAccounts()
    } catch (error) {
      console.error("Error closing accounts:", error)
      toast({
        title: "Error closing accounts",
        description: "There was an error closing the selected accounts",
        variant: "destructive",
      })
    } finally {
      setClosing(false)
    }
  }

  if (!publicKey) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Close Token Accounts</CardTitle>
        <CardDescription>Reclaim rent from token accounts</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <Button variant="outline" size="sm" onClick={fetchAccounts} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={selectAllEmptyTokenAccounts}
            disabled={loading || accounts.filter((a) => a.type === "token" && a.balance === 0).length === 0}
          >
            Select All Empty Token Accounts
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-4" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">No closable accounts found</div>
        ) : (
          <div className="space-y-4">
            <Alert>
              <InfoIcon className="h-4 w-4" />
              <AlertTitle>Reclaim Rent</AlertTitle>
              <AlertDescription>
                Closing accounts will reclaim the SOL used for rent. Only close accounts you no longer need.
              </AlertDescription>
            </Alert>

            <div className="border rounded-md overflow-hidden">
              <div className="grid grid-cols-12 gap-1 p-3 border-b font-medium text-sm">
                <div className="col-span-1"></div>
                <div className="col-span-5">Account</div>
                <div className="col-span-2">Type</div>
                <div className="col-span-4">Rent (SOL)</div>
              </div>
              <div className="max-h-[300px] overflow-y-auto overflow-x-hidden">
                {accounts.map((account) => (
                  <div
                    key={account.pubkey.toString()}
                    className={`grid grid-cols-12 gap-2 p-3 text-sm items-center ${account.type === "token" && account.balance > 0 ? "bg-amber-500/10" : ""
                      }`}
                  >
                    <div className="col-span-1">
                      <Checkbox
                        checked={account.selected}
                        onCheckedChange={() => toggleAccountSelection(account.pubkey.toString())}
                        disabled={account.type === "token" && account.balance > 0}
                      />
                    </div>
                    <div className="col-span-5 font-mono truncate" title={account.pubkey.toString()}>
                      {account.pubkey.toString().slice(0, 8)}...{account.pubkey.toString().slice(-8)}
                      {account.tokenName && <div className="text-xs text-muted-foreground">{account.tokenName}</div>}
                    </div>
                    <div className="col-span-2">
                      {account.type === "token" ? (
                        <span className="px-2 py-1 rounded-full bg-purple-500/20 text-purple-500 text-xs">Token</span>
                      ) : account.type === "system" ? (
                        <span className="px-2 py-1 rounded-full bg-blue-500/20 text-blue-500 text-xs">System</span>
                      ) : (
                        <span className="px-2 py-1 rounded-full bg-gray-500/20 text-gray-500 text-xs">
                          {account.type}
                        </span>
                      )}
                    </div>
                    <div className="col-span-4 flex items-center justify-between">
                      <span>{account.rentExempt.toFixed(6)}</span>
                      {account.type === "token" && account.balance > 0 && (
                        <div className="pl-2 text-xs text-amber-500">Has ~{account.balance.toFixed(2)} tokens</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {accounts.some((account) => account.selected) && (
              <Alert variant="default" className="bg-green-500/10 border-green-500/20">
                <AlertTitle className="flex items-center justify-between">
                  <span>Total SOL to reclaim</span>
                  <span>{getTotalRentToReclaim().toFixed(6)} SOL</span>
                </AlertTitle>
                <AlertDescription className="text-xs mt-2">
                  You've selected {accounts.filter((a) => a.selected).length} accounts to close
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>

      {accounts.some((account) => account.selected) && (
        <CardFooter>
          <Button
            className="w-full"
            onClick={closeSelectedAccounts}
            disabled={closing || !accounts.some((account) => account.selected)}
            variant="destructive"
          >
            {closing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            {closing ? "Closing Accounts..." : `Close ${accounts.filter((a) => a.selected).length} Accounts`}
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
