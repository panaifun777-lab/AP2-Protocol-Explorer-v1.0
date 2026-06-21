import { encodeFunctionData, keccak256, parseAbi, stringToBytes } from "viem";

export type AP2Mode = "simulation" | "base-sepolia";

export interface AP2TxRequest {
  chainId: number;
  to: `0x${string}`;
  data: `0x${string}`;
  value: "0";
}

export interface AP2ActionResponse {
  mode: AP2Mode;
  action: string;
  txRequest?: AP2TxRequest;
  simulation?: {
    legacyRoute: string;
    payload: Record<string, unknown>;
  };
  meta: {
    contracts: typeof baseSepoliaContracts;
    defaults: typeof baseSepoliaDefaults;
  };
}

export const baseSepoliaContracts = {
  ShadowAFC: "0x2dF7a295650e890fe2A48B3aa58BB38d36E89E42",
  BudgetFence: "0xdb970DE65f90C9447a700C9b06ae6F591a9d9a55",
  AP2Escrow: "0xFd553E5989834DF76f6C790021FDDBfEB9dc2972",
  TDPO_Pool: "0x684FF81da3b9ac92D0f75037f7D3E6C7a792EC8f",
} as const;

export const baseSepoliaDefaults = {
  chainId: 84532,
  scope: "legal",
  scopeHash:
    "0x585f0ffac4590ed956ef7d99c1177e00c7f240a28094f8eaffb94c5a559815a3",
  target: "XDP_Protocol_Genesis_Clean",
  targetHash:
    "0x3bfc253b785c17341b8af30129b3dd92e0f4a19d29b9758f2cd387b7ccb9d32c",
  baseAmount: "100000000000000000000",
  optionAmount: "10000000000000000000",
  durationSeconds: 1,
  qualityScore: 90,
  tdpoDurationSeconds: 2592000,
  evolutionFactor: 10,
} as const;

const escrowAbi = parseAbi([
  "function createTask(address payee,uint256 baseAmount,uint256 optionAmount,uint256 duration,bytes32 targetHash,bytes32 scopeHash) returns (uint256)",
  "function withdrawStream(uint256 taskId)",
  "function settleTask(uint256 taskId,uint256 qualityScore)",
]);

const tdpoAbi = parseAbi([
  "function lockContrarianCognition(bytes32 cognitiveHash,uint256 duration)",
  "function injectEvolutionFactor(bytes32 cognitiveHash,uint256 factor)",
  "function vetoEvolution(bytes32 cognitiveHash)",
  "function claimRetroactiveReward(bytes32 cognitiveHash)",
]);

const shadowAfcAbi = parseAbi([
  "function approve(address spender,uint256 amount) returns (bool)",
  "function bridgeMint(address to,uint256 amount)",
]);

const budgetFenceAbi = parseAbi([
  "function setPolicy(address payer,uint256 dailyCap,bool enabled)",
  "function setScope(address payer,bytes32 scopeHash,bool allowed)",
]);

export function readMode(input: unknown): AP2Mode {
  if (input === "base-sepolia") return "base-sepolia";
  return "simulation";
}

export function bytes32FromTextOrHex(value: string | undefined, fallback: string) {
  const raw = (value || fallback).trim();
  if (/^0x[0-9a-fA-F]{64}$/.test(raw)) return raw as `0x${string}`;
  return keccak256(stringToBytes(raw));
}

export function asAddress(value: unknown, field: string): `0x${string}` {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(value)) {
    throw new Error(`${field} must be an EVM address`);
  }
  return value as `0x${string}`;
}

export function asUintString(value: unknown, fallback: string | number, field: string) {
  const raw = value === undefined || value === null || value === "" ? fallback : value;
  const text = String(raw);
  if (!/^[0-9]+$/.test(text)) {
    throw new Error(`${field} must be an unsigned integer string`);
  }
  return text;
}

export function baseTx(to: `0x${string}`, data: `0x${string}`): AP2TxRequest {
  return {
    chainId: baseSepoliaDefaults.chainId,
    to,
    data,
    value: "0",
  };
}

export function envelope(
  mode: AP2Mode,
  action: string,
  body: Record<string, unknown>,
  build: () => AP2TxRequest,
  legacyRoute: string,
): AP2ActionResponse {
  const meta = {
    contracts: baseSepoliaContracts,
    defaults: baseSepoliaDefaults,
  };

  if (mode === "simulation") {
    return {
      mode,
      action,
      simulation: {
        legacyRoute,
        payload: body,
      },
      meta,
    };
  }

  return {
    mode,
    action,
    txRequest: build(),
    meta,
  };
}

export function encodeApprove(amount: string) {
  return encodeFunctionData({
    abi: shadowAfcAbi,
    functionName: "approve",
    args: [baseSepoliaContracts.AP2Escrow, BigInt(amount)],
  });
}

export function encodeBridgeMint(to: `0x${string}`, amount: string) {
  return encodeFunctionData({
    abi: shadowAfcAbi,
    functionName: "bridgeMint",
    args: [to, BigInt(amount)],
  });
}

export function encodeSetPolicy(payer: `0x${string}`, dailyCap: string) {
  return encodeFunctionData({
    abi: budgetFenceAbi,
    functionName: "setPolicy",
    args: [payer, BigInt(dailyCap), true],
  });
}

export function encodeSetScope(payer: `0x${string}`, scopeHash: `0x${string}`) {
  return encodeFunctionData({
    abi: budgetFenceAbi,
    functionName: "setScope",
    args: [payer, scopeHash, true],
  });
}

export function encodeCreateTask(input: {
  payee: `0x${string}`;
  baseAmount: string;
  optionAmount: string;
  durationSeconds: string;
  targetHash: `0x${string}`;
  scopeHash: `0x${string}`;
}) {
  return encodeFunctionData({
    abi: escrowAbi,
    functionName: "createTask",
    args: [
      input.payee,
      BigInt(input.baseAmount),
      BigInt(input.optionAmount),
      BigInt(input.durationSeconds),
      input.targetHash,
      input.scopeHash,
    ],
  });
}

export function encodeWithdraw(taskId: string) {
  return encodeFunctionData({
    abi: escrowAbi,
    functionName: "withdrawStream",
    args: [BigInt(taskId)],
  });
}

export function encodeSettle(taskId: string, qualityScore: string) {
  return encodeFunctionData({
    abi: escrowAbi,
    functionName: "settleTask",
    args: [BigInt(taskId), BigInt(qualityScore)],
  });
}

export function encodeLock(cognitiveHash: `0x${string}`, durationSeconds: string) {
  return encodeFunctionData({
    abi: tdpoAbi,
    functionName: "lockContrarianCognition",
    args: [cognitiveHash, BigInt(durationSeconds)],
  });
}

export function encodeInject(cognitiveHash: `0x${string}`, factor: string) {
  return encodeFunctionData({
    abi: tdpoAbi,
    functionName: "injectEvolutionFactor",
    args: [cognitiveHash, BigInt(factor)],
  });
}

export function encodeVeto(cognitiveHash: `0x${string}`) {
  return encodeFunctionData({
    abi: tdpoAbi,
    functionName: "vetoEvolution",
    args: [cognitiveHash],
  });
}

export function encodeClaim(cognitiveHash: `0x${string}`) {
  return encodeFunctionData({
    abi: tdpoAbi,
    functionName: "claimRetroactiveReward",
    args: [cognitiveHash],
  });
}
