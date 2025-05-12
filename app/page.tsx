"use client"; // Ensure this is at the top if not already

import { WalletMultiButton } from "@/components/wallet-multi-button"
import { AccountInfo } from "@/components/account-info"
import { SendTransaction } from "@/components/send-transaction"
import { TransactionHistory } from "@/components/transaction-history"
import { SendToMany } from "@/components/send-to-many"
import { CloseAccount } from "@/components/close-account"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ThemeToggle } from "@/components/theme-toggle"
import { NetworkSwitcher } from "@/app/ui/network.switcher"
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center  bg-gradient-to-b from-purple-900/10 to-teal-900/10">
      <div className="flex justify-between items-center w-full p-4 md:p-15">
        <div className="text-sm text-muted-foreground">
          {/* <NetworkSwitcherMinimalDisplay /> Could be a component to show current network if dropdown is too much */}
        </div>
        <div className="flex items-center space-x-2">
          <ThemeToggle />
          {/* <NetworkSwitcher /> Now it will be below the title */}
        </div>
      </div>
      <div className="z-10 max-w-5xl w-full flex flex-col items-center">
        <h1 className="text-4xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-teal-400">
          Solana Utils
        </h1>

        <div className="w-full max-w-md">
          <NetworkSwitcher />
        </div>

        <div className="w-full max-w-md flex flex-col gap-8 justify">
          <div className="flex justify-end">
            <WalletMultiButton />
          </div>

          <Tabs defaultValue="account" className="w-full">
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger value="account">Account</TabsTrigger>
              <TabsTrigger value="send">Send</TabsTrigger>
              <TabsTrigger value="batch">Batch Send</TabsTrigger>
              <TabsTrigger value="close">Close</TabsTrigger>
            </TabsList>
            <TabsContent value="account">
              <AccountInfo />
              <div className="h-4"></div>
              <TransactionHistory />
            </TabsContent>
            <TabsContent value="send">
              <SendTransaction />
            </TabsContent>
            <TabsContent value="batch">
              <SendToMany />
            </TabsContent>
            <TabsContent value="close">
              <CloseAccount />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main>
  )
}
