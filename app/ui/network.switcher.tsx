import { useNetworkConfiguration, CustomRPC, NetworkConfiguration } from "@/contexts/network-context" // Import context hook and type
import React, { useState, useEffect } from "react" // Import React hooks
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

// NetworkSwitcher Component
export function NetworkSwitcher() {
  const {
    availableNetworks,
    selectedNetwork,
    selectNetwork,
    addCustomRpc,
    updateCustomRpc,
    deleteCustomRpc,
  } = useNetworkConfiguration();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRpc, setEditingRpc] = useState<CustomRPC | null>(null);
  const [rpcName, setRpcName] = useState("");
  const [rpcUrl, setRpcUrl] = useState("");

  const customRpcs = availableNetworks.filter(n => n.isCustom);
  const hasAddedRpc = customRpcs.length > 0;

  const handleSaveRpc = () => {
    if (!rpcName || !rpcUrl) {
      alert("RPC Name and URL cannot be empty.");
      return;
    }
    if (!isValidHttpUrl(rpcUrl)) {
      alert("Please enter a valid HTTP/HTTPS URL for the RPC endpoint.");
      return;
    }

    if (editingRpc) {
      updateCustomRpc(editingRpc.name, { name: rpcName, url: rpcUrl });
    } else {
      addCustomRpc({ name: rpcName, url: rpcUrl });
    }
    setIsModalOpen(false);
  };


  const prepareForNewRpc = () => {
    const rpc = customRpcs?.[0];
    if (!rpc) {
      setEditingRpc(null);
      setRpcName("");
      setRpcUrl("");
      return;
    }
    setEditingRpc({ name: rpc.name, url: rpc.endpoint });
    setRpcName(rpc.name);
    setRpcUrl(rpc.endpoint);
  };


  const handleDeleteRpcInForm = () => {
    if (editingRpc && window.confirm(`Are you sure you want to delete RPC: ${editingRpc.name}?`)) {
      deleteCustomRpc(editingRpc.name);
      prepareForNewRpc(); // Clear form after deletion
      setIsModalOpen(false);
    }
  };

  const handleDeleteRpcFromList = (name: string) => {
    if (window.confirm(`Are you sure you want to delete RPC: ${name}?`)) {
      deleteCustomRpc(name);
      // If the deleted RPC was the one being edited, clear the form
      if (editingRpc && editingRpc.name === name) {
        prepareForNewRpc();
      }
    }
  };

  const isValidHttpUrl = (string: string) => {
    let url;
    try {
      url = new URL(string);
    } catch (_) {
      return false;
    }
    return url.protocol === "http:" || url.protocol === "https:";
  };

  return (
    <div className="space-y-2 my-4 p-4 border rounded-lg bg-card text-card-foreground">
      <Label htmlFor="network-select">Network</Label>
      <div className="flex items-center space-x-2">
        <Select
          value={selectedNetwork.id}
          onValueChange={(value) => selectNetwork(value)}
        >
          <SelectTrigger id="network-select" className="flex-grow">
            <SelectValue placeholder="Select network" />
          </SelectTrigger>
          <SelectContent>
            {availableNetworks.map((network) => (
              <SelectItem key={network.id} value={network.id}>
                {network.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => { prepareForNewRpc(); setIsModalOpen(true); }} variant="outline">Manage RPC</Button>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>{hasAddedRpc ? "Edit Custom RPC" : "Add Custom RPC"}</DialogTitle>
          </DialogHeader>

          {hasAddedRpc && (
            <div className="mt-4">

              <div className="max-h-40 overflow-y-auto pr-2 space-y-2">
                {customRpcs.map(rpc => (
                  <div key={rpc.id} className="flex justify-between items-center p-2 border rounded bg-background">
                    <div>
                      <p className="font-medium text-sm">{rpc.name}</p>
                      <p className="text-xs text-muted-foreground">{rpc.endpoint}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3 py-4 border-t mt-4 pt-4">

            <div>
              <Label htmlFor="rpc-name" className="text-sm">Name</Label>
              <Input
                id="rpc-name"
                value={rpcName}
                onChange={(e) => setRpcName(e.target.value)}
                placeholder="My Custom RPC"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="rpc-url" className="text-sm">URL</Label>
              <Input
                id="rpc-url"
                value={rpcUrl}
                onChange={(e) => setRpcUrl(e.target.value)}
                placeholder="https://api.mainnet-beta.solana.com"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter className="mt-2">

            <div className="flex items-center space-x-2">
              {editingRpc && (
                <Button variant="destructive" onClick={handleDeleteRpcInForm}>
                  Delete This RPC
                </Button>
              )}
              <Button onClick={handleSaveRpc}>{editingRpc ? "Save Changes" : "Add RPC"}</Button>
            </div>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
