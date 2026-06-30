"use client";

import * as React from "react";
import { Check, PlugZap, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  connectWallet,
  ensureBaseSepolia,
  getInjectedProvider,
  readStoredMode,
  shortAddress,
  storeMode,
  type AP2Mode,
} from "@/lib/ap2/wallet";

export function WalletControl() {
  const { toast } = useToast();
  const [mode, setMode] = React.useState<AP2Mode>("simulation");
  const [address, setAddress] = React.useState("");
  const [connecting, setConnecting] = React.useState(false);
  const connected = Boolean(address);

  React.useEffect(() => {
    setMode(readStoredMode());
  }, []);

  const onModeChange = React.useCallback((value: AP2Mode) => {
    setMode(value);
    storeMode(value);
  }, []);

  const onConnect = React.useCallback(async () => {
    const provider = getInjectedProvider();
    if (!provider) {
      toast({
        title: "No wallet found",
        description: "Install MetaMask, Rabby, OKX Wallet, or another EIP-1193 wallet.",
        variant: "destructive",
      });
      return;
    }

    setConnecting(true);
    try {
      const account = await connectWallet(provider);
      if (!account) throw new Error("Wallet returned no account");
      await ensureBaseSepolia(provider);
      setAddress(account);
      onModeChange("base-sepolia");
      toast({
        title: "Wallet connected",
        description: `${shortAddress(account)} on Base Sepolia`,
      });
    } catch (error) {
      toast({
        title: "Wallet connection failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setConnecting(false);
    }
  }, [onModeChange, toast]);

  return (
    <div className="flex items-center gap-2">
      <Select value={mode} onValueChange={onModeChange}>
        <SelectTrigger className="h-8 w-[154px] font-mono text-[10px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          <SelectItem value="simulation">Simulation</SelectItem>
          <SelectItem value="base-sepolia">Base Sepolia</SelectItem>
        </SelectContent>
      </Select>

      {connected ? (
        <Badge
          variant="outline"
          className="h-8 gap-1 border-cyan-500/40 px-2 font-mono text-[10px] text-cyan-600 dark:text-cyan-400"
        >
          <Check className="h-3 w-3" />
          {shortAddress(address)}
        </Badge>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1 font-mono text-[10px]"
          onClick={onConnect}
          disabled={connecting}
        >
          {connecting ? (
            <PlugZap className="h-3.5 w-3.5 animate-pulse" />
          ) : (
            <Wallet className="h-3.5 w-3.5" />
          )}
          Wallet
        </Button>
      )}
    </div>
  );
}
