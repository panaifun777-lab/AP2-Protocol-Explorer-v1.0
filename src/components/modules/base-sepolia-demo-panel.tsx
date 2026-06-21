"use client";

import * as React from "react";
import { CheckCircle2, ExternalLink, Play, RefreshCw, Send, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PanelCard } from "./panel-shell";
import { useToast } from "@/hooks/use-toast";
import {
  ensureBaseSepolia,
  getInjectedProvider,
  readStoredMode,
  shortAddress,
} from "@/lib/ap2/wallet";

type TxStep =
  | "mint-safc"
  | "set-policy"
  | "set-scope"
  | "approve"
  | "create-task"
  | "withdraw"
  | "settle"
  | "lock-contrarian"
  | "inject-factor"
  | "veto";

interface TxHistoryItem {
  step: TxStep;
  hash: string;
}

interface ChainTaskState {
  taskId?: string;
  status?: string;
  withdrawn?: string;
  nextTaskId?: string;
}

interface TDPOState {
  cognitiveHash?: string;
  deposit?: string;
  isVetoed?: boolean;
  lock?: {
    creator: string;
    evolutionFactor: string;
    claimed: boolean;
  };
}

const DEFAULT_ACCOUNT = "0x10687368eF1be3f178de0fCCf5EdfF49e1C258B1";

export function BaseSepoliaDemoPanel() {
  const { toast } = useToast();
  const [runningStep, setRunningStep] = React.useState<TxStep | "all" | null>(null);
  const [account, setAccount] = React.useState("");
  const [taskId, setTaskId] = React.useState("");
  const [target, setTarget] = React.useState(() => `XDP_Protocol_Genesis_Clean_${Date.now()}`);
  const [taskState, setTaskState] = React.useState<ChainTaskState | null>(null);
  const [tdpoState, setTdpoState] = React.useState<TDPOState | null>(null);
  const [history, setHistory] = React.useState<TxHistoryItem[]>([]);

  const sendStep = React.useCallback(
    async (step: TxStep) => {
      const provider = getInjectedProvider();
      if (!provider) throw new Error("No injected wallet found");
      if (readStoredMode() !== "base-sepolia") {
        throw new Error("Switch the top-right mode to Base Sepolia first");
      }
      await ensureBaseSepolia(provider);
      const accounts = await provider.request<string[]>({ method: "eth_requestAccounts" });
      const from = accounts[0];
      if (!from) throw new Error("Wallet returned no account");
      setAccount(from);

      const endpoint =
        step === "mint-safc"
          ? "/api/v1/admin/mint-safc"
          : step === "set-policy"
            ? "/api/v1/admin/set-policy"
            : step === "set-scope"
              ? "/api/v1/admin/set-scope"
              : step === "approve"
          ? "/api/v1/escrow/approve"
          : step === "create-task"
            ? "/api/v1/escrow/create-task"
            : step === "withdraw"
              ? "/api/v1/escrow/withdraw"
              : step === "settle"
                ? "/api/v1/escrow/settle"
                : step === "lock-contrarian"
                  ? "/api/v1/tdpo/lock-contrarian"
                  : step === "inject-factor"
                    ? "/api/v1/tdpo/inject-factor"
                    : "/api/v1/tdpo/veto";

      const body =
        step === "mint-safc"
          ? { mode: "base-sepolia", to: from, amount: "1000000000000000000000" }
          : step === "set-policy"
            ? {
                mode: "base-sepolia",
                payer: from,
                dailyCap: "1000000000000000000000",
              }
            : step === "set-scope"
              ? { mode: "base-sepolia", payer: from, scope: "legal" }
              : step === "approve"
          ? { mode: "base-sepolia", amount: "110000000000000000000" }
          : step === "create-task"
            ? {
                mode: "base-sepolia",
                payee: from,
                baseAmount: "100000000000000000000",
                optionAmount: "10000000000000000000",
                durationSeconds: "1",
                target,
                scope: "legal",
              }
            : step === "withdraw"
              ? { mode: "base-sepolia", taskId }
              : step === "settle"
                ? { mode: "base-sepolia", taskId, qualityScore: "90" }
                : step === "lock-contrarian"
                  ? { mode: "base-sepolia", target, durationSeconds: "2592000" }
                  : step === "inject-factor"
                    ? { mode: "base-sepolia", target, factor: "10" }
                    : { mode: "base-sepolia", target };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);

      const hash = await provider.request<string>({
        method: "eth_sendTransaction",
        params: [{ from, ...json.data.txRequest }],
      });
      setHistory((items) => [{ step, hash }, ...items].slice(0, 12));
      toast({
        title: `${step} sent`,
        description: shortAddress(hash),
      });
      return hash;
    },
    [target, taskId, toast],
  );

  const runStep = React.useCallback(
    async (step: TxStep) => {
      setRunningStep(step);
      try {
        await sendStep(step);
      } catch (error) {
        toast({
          title: `${step} failed`,
          description: (error as Error).message,
          variant: "destructive",
        });
      } finally {
        setRunningStep(null);
      }
    },
    [sendStep, toast],
  );

  const runAll = React.useCallback(async () => {
    setRunningStep("all");
    try {
      await sendStep("approve");
      const createHash = await sendStep("create-task");
      toast({
        title: "Create task submitted",
        description: `Set taskId after confirmation. Tx ${shortAddress(createHash)}`,
      });
    } catch (error) {
      toast({
        title: "Demo run paused",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setRunningStep(null);
    }
  }, [sendStep, toast]);

  const configureCleanEnv = React.useCallback(async () => {
    setRunningStep("all");
    try {
      await sendStep("mint-safc");
      await sendStep("set-policy");
      await sendStep("set-scope");
      toast({
        title: "Clean env configured",
        description: "sAFC minted, BudgetFence policy and legal scope enabled.",
      });
    } catch (error) {
      toast({
        title: "Configuration paused",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setRunningStep(null);
    }
  }, [sendStep, toast]);

  const refreshState = React.useCallback(async () => {
    try {
      const taskUrl = taskId
        ? `/api/v1/escrow/status?taskId=${encodeURIComponent(taskId)}`
        : "/api/v1/escrow/status";
      const [taskRes, tdpoRes] = await Promise.all([
        fetch(taskUrl),
        fetch(`/api/v1/tdpo/status?target=${encodeURIComponent(target)}`),
      ]);
      const taskJson = await taskRes.json();
      const tdpoJson = await tdpoRes.json();
      if (!taskJson.ok) throw new Error(taskJson.error);
      if (!tdpoJson.ok) throw new Error(tdpoJson.error);
      setTaskState(taskJson.data);
      setTdpoState(tdpoJson.data);
    } catch (error) {
      toast({
        title: "State refresh failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  }, [target, taskId, toast]);

  const stepButton = (step: TxStep, label: string) => (
    <Button
      variant="outline"
      size="sm"
      className="h-8 gap-1 font-mono text-[10px]"
      disabled={runningStep !== null}
      onClick={() => void runStep(step)}
    >
      <Send className="h-3 w-3" />
      {runningStep === step ? "Sending" : label}
    </Button>
  );

  return (
    <PanelCard
      title="Base Sepolia Demo Run"
      icon={Play}
      action={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1 font-mono text-[10px]"
            disabled={runningStep !== null}
            onClick={() => void configureCleanEnv()}
          >
            <CheckCircle2 className="h-3 w-3" />
            Configure
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1 font-mono text-[10px]"
            disabled={runningStep !== null}
            onClick={() => void runAll()}
          >
            <Play className="h-3 w-3" />
            {runningStep === "all" ? "Running" : "One-click Start"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-2 md:grid-cols-3">
          <div className="space-y-1 md:col-span-2">
            <div className="text-[10px] font-mono uppercase text-muted-foreground">
              Target
            </div>
            <Input
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              className="h-8 font-mono text-[11px]"
            />
          </div>
          <div className="space-y-1">
            <div className="text-[10px] font-mono uppercase text-muted-foreground">
              Task ID
            </div>
            <Input
              value={taskId}
              onChange={(event) => setTaskId(event.target.value)}
              placeholder="0"
              className="h-8 font-mono text-[11px]"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {stepButton("mint-safc", "Mint")}
          {stepButton("set-policy", "Policy")}
          {stepButton("set-scope", "Scope")}
          {stepButton("approve", "Approve")}
          {stepButton("create-task", "Create")}
          {stepButton("withdraw", "Withdraw")}
          {stepButton("settle", "Settle")}
          {stepButton("lock-contrarian", "Lock")}
          {stepButton("inject-factor", "Inject")}
          {stepButton("veto", "Veto")}
          <Button
            variant="secondary"
            size="sm"
            className="h-8 gap-1 font-mono text-[10px]"
            onClick={() => void refreshState()}
          >
            <RefreshCw className="h-3 w-3" />
            Read State
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-md border border-border/60 bg-card/40 p-3">
            <div className="mb-2 flex items-center gap-1 font-mono text-[10px] uppercase text-muted-foreground">
              <CheckCircle2 className="h-3 w-3" />
              Wallet
            </div>
            <div className="font-mono text-xs">{account || DEFAULT_ACCOUNT}</div>
          </div>
          <div className="rounded-md border border-border/60 bg-card/40 p-3">
            <div className="mb-2 font-mono text-[10px] uppercase text-muted-foreground">
              Escrow
            </div>
            <div className="space-y-1 font-mono text-[11px]">
              <div>nextTaskId: {taskState?.nextTaskId ?? "-"}</div>
              <div>status: {taskState?.status ?? "-"}</div>
              <div>withdrawn: {taskState?.withdrawn ?? "-"}</div>
            </div>
          </div>
          <div className="rounded-md border border-border/60 bg-card/40 p-3">
            <div className="mb-2 flex items-center gap-1 font-mono text-[10px] uppercase text-muted-foreground">
              <ShieldX className="h-3 w-3" />
              TDPO
            </div>
            <div className="space-y-1 font-mono text-[11px]">
              <div>deposit: {tdpoState?.deposit ?? "-"}</div>
              <div>vetoed: {tdpoState ? String(tdpoState.isVetoed) : "-"}</div>
              <div>factor: {tdpoState?.lock?.evolutionFactor ?? "-"}</div>
            </div>
          </div>
        </div>

        <div className="rounded-md border border-border/60 bg-card/30 p-3">
          <div className="mb-2 font-mono text-[10px] uppercase text-muted-foreground">
            Transaction History
          </div>
          {history.length === 0 ? (
            <div className="font-mono text-[11px] text-muted-foreground">
              No wallet-submitted transactions in this browser session.
            </div>
          ) : (
            <div className="space-y-1">
              {history.map((item) => (
                <a
                  key={`${item.step}-${item.hash}`}
                  href={`https://sepolia.basescan.org/tx/${item.hash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded border border-border/40 px-2 py-1 font-mono text-[11px] hover:bg-muted/50"
                >
                  <span>{item.step}</span>
                  <span className="inline-flex items-center gap-1 text-cyan-600 dark:text-cyan-400">
                    {shortAddress(item.hash)}
                    <ExternalLink className="h-3 w-3" />
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </PanelCard>
  );
}
