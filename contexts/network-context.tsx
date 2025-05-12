"use client"

import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { clusterApiUrl } from "@solana/web3.js";
import { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from "react";

export interface CustomRPC {
  name: string;
  url: string;
}

export interface NetworkConfiguration {
  id: string; // 'devnet', 'testnet', 'mainnet-beta', or custom RPC URL
  name: string; // User-friendly name
  endpoint: string;
  isCustom?: boolean;
}

interface NetworkContextState {
  availableNetworks: NetworkConfiguration[];
  selectedNetwork: NetworkConfiguration;
  selectNetwork: (networkId: string) => void;
  addCustomRpc: (rpc: CustomRPC) => void;
  updateCustomRpc: (name: string, rpc: CustomRPC) => void;
  deleteCustomRpc: (name: string) => void;
  getRpcEndpoint: () => string;
}

const defaultNetworks: NetworkConfiguration[] = [
  { id: WalletAdapterNetwork.Devnet, name: "Devnet", endpoint: clusterApiUrl(WalletAdapterNetwork.Devnet) },
  { id: WalletAdapterNetwork.Testnet, name: "Testnet", endpoint: clusterApiUrl(WalletAdapterNetwork.Testnet) },
  { id: WalletAdapterNetwork.Mainnet, name: "Mainnet Beta", endpoint: clusterApiUrl(WalletAdapterNetwork.Mainnet) },
];

const NetworkContext = createContext<NetworkContextState | undefined>(undefined);

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [customRpcs, setCustomRpcs] = useState<CustomRPC[]>([]);
  const [selectedNetworkId, setSelectedNetworkId] = useState<string>(WalletAdapterNetwork.Devnet);

  useEffect(() => {
    const storedRpcs = localStorage.getItem("customRpcs");
    if (storedRpcs) {
      try {
        const parsedRpcs = JSON.parse(storedRpcs);
        if (Array.isArray(parsedRpcs)) {
          setCustomRpcs(parsedRpcs);
        }
      } catch (error) {
        console.error("Failed to parse custom RPCs from localStorage:", error);
        setCustomRpcs([]); // Fallback to empty array on error
      }
    }
  }, []);

  const availableNetworks = useMemo(() => {
    const customNetworkConfigs: NetworkConfiguration[] = customRpcs.map(rpc => ({
      id: rpc.url, // Use URL as ID for custom RPCs
      name: rpc.name,
      endpoint: rpc.url,
      isCustom: true,
    }));
    return [...defaultNetworks, ...customNetworkConfigs];
  }, [customRpcs]);

  const selectedNetwork = useMemo(() => {
    return availableNetworks.find(n => n.id === selectedNetworkId) || defaultNetworks[0];
  }, [selectedNetworkId, availableNetworks]);

  const selectNetwork = useCallback((networkId: string) => {
    const networkExists = availableNetworks.some(n => n.id === networkId);
    if (networkExists) {
      setSelectedNetworkId(networkId);
    } else {
      console.warn(`Network with id "${networkId}" not found. Defaulting to Devnet.`);
      setSelectedNetworkId(WalletAdapterNetwork.Devnet);
    }
  }, [availableNetworks]);

  const addCustomRpc = useCallback((rpc: CustomRPC) => {
    if (customRpcs.some(existingRpc => existingRpc.name === rpc.name || existingRpc.url === rpc.url)) {
      alert("An RPC with this name or URL already exists.");
      return;
    }
    const newCustomRpcs = [...customRpcs, rpc];
    setCustomRpcs(newCustomRpcs);
    localStorage.setItem("customRpcs", JSON.stringify(newCustomRpcs));
  }, [customRpcs]);

  const updateCustomRpc = useCallback((originalName: string, updatedRpc: CustomRPC) => {
    // Check if the new name or URL conflicts with another existing RPC (excluding the one being updated)
    if (customRpcs.some(existingRpc =>
      existingRpc.name !== originalName &&
      (existingRpc.name === updatedRpc.name || existingRpc.url === updatedRpc.url)
    )) {
      alert("Another RPC with this name or URL already exists.");
      return;
    }

    const newCustomRpcs = customRpcs.map(rpc =>
      rpc.name === originalName ? { ...rpc, ...updatedRpc } : rpc
    );
    setCustomRpcs(newCustomRpcs);
    localStorage.setItem("customRpcs", JSON.stringify(newCustomRpcs));
  }, [customRpcs]);

  const deleteCustomRpc = useCallback((name: string) => {
    const newCustomRpcs = customRpcs.filter(rpc => rpc.name !== name);
    setCustomRpcs(newCustomRpcs);
    localStorage.setItem("customRpcs", JSON.stringify(newCustomRpcs));
    // If the deleted RPC was the selected one, default to Devnet
    if (selectedNetwork.isCustom && selectedNetwork.name === name) {
      setSelectedNetworkId(WalletAdapterNetwork.Devnet);
    }
  }, [customRpcs, selectedNetwork]);

  const getRpcEndpoint = useCallback(() => {
    return selectedNetwork.endpoint;
  }, [selectedNetwork]);

  const contextValue = useMemo(() => ({
    availableNetworks,
    selectedNetwork,
    selectNetwork,
    addCustomRpc,
    updateCustomRpc,
    deleteCustomRpc,
    getRpcEndpoint,
  }), [availableNetworks, selectedNetwork, selectNetwork, addCustomRpc, updateCustomRpc, deleteCustomRpc, getRpcEndpoint]);

  return (
    <NetworkContext.Provider value={contextValue}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetworkConfiguration() {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error("useNetworkConfiguration must be used within a NetworkProvider");
  }
  return context;
} 
