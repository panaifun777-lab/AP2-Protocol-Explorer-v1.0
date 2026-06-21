"use client";

export type AP2Mode = "simulation" | "base-sepolia";

export interface Eip1193Provider {
  request<T = unknown>(args: { method: string; params?: unknown[] }): Promise<T>;
  on?(event: string, listener: (...args: unknown[]) => void): void;
  removeListener?(event: string, listener: (...args: unknown[]) => void): void;
}

export interface Eip1193Log {
  address: string;
  topics: `0x${string}`[];
  data: `0x${string}`;
}

export interface Eip1193Receipt {
  status?: `0x${string}`;
  logs?: Eip1193Log[];
}

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

export const BASE_SEPOLIA_CHAIN_ID = 84532;
export const BASE_SEPOLIA_CHAIN_HEX = "0x14a34";

export function getInjectedProvider(): Eip1193Provider | null {
  if (typeof window === "undefined") return null;
  return window.ethereum ?? null;
}

export async function connectWallet(provider: Eip1193Provider) {
  const accounts = await provider.request<string[]>({
    method: "eth_requestAccounts",
  });
  return accounts[0] ?? "";
}

export async function getWalletChainId(provider: Eip1193Provider) {
  return provider.request<string>({ method: "eth_chainId" });
}

export async function ensureBaseSepolia(provider: Eip1193Provider) {
  const current = await getWalletChainId(provider);
  if (current.toLowerCase() === BASE_SEPOLIA_CHAIN_HEX) return;

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BASE_SEPOLIA_CHAIN_HEX }],
    });
  } catch (error) {
    const code = (error as { code?: number }).code;
    if (code !== 4902) throw error;
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: BASE_SEPOLIA_CHAIN_HEX,
          chainName: "Base Sepolia",
          nativeCurrency: {
            name: "Sepolia Ether",
            symbol: "ETH",
            decimals: 18,
          },
          rpcUrls: ["https://sepolia.base.org"],
          blockExplorerUrls: ["https://sepolia.basescan.org"],
        },
      ],
    });
  }
}

export function shortAddress(address: string) {
  if (!address) return "";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function readStoredMode(): AP2Mode {
  if (typeof window === "undefined") return "simulation";
  return window.localStorage.getItem("ap2-mode") === "base-sepolia"
    ? "base-sepolia"
    : "simulation";
}

export function storeMode(mode: AP2Mode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("ap2-mode", mode);
  window.dispatchEvent(new CustomEvent("ap2-mode-change", { detail: mode }));
}

export async function waitForTransactionReceipt(
  provider: Eip1193Provider,
  hash: string,
  timeoutMs = 120_000,
) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const receipt = await provider.request<Eip1193Receipt | null>({
      method: "eth_getTransactionReceipt",
      params: [hash],
    });
    if (receipt) return receipt;
    await new Promise((resolve) => setTimeout(resolve, 2_500));
  }
  throw new Error(`Timed out waiting for ${shortAddress(hash)}`);
}
