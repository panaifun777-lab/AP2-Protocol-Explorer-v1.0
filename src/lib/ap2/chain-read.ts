import { createPublicClient, http, parseAbi } from "viem";

export const baseSepoliaClient = createPublicClient({
  chain: {
    id: 84532,
    name: "Base Sepolia",
    nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: {
      default: {
        http: [process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org"],
      },
    },
  },
  transport: http(process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org"),
});

export const escrowReadAbi = parseAbi([
  "function nextTaskId() view returns (uint256)",
  "function tasks(uint256) view returns (address payer,address payee,uint256 baseAmount,uint256 optionAmount,uint256 startTime,uint256 duration,uint256 withdrawn,bytes32 targetHash,bytes32 scopeHash,uint8 status)",
]);

export const tdpoReadAbi = parseAbi([
  "function hashDeposits(bytes32) view returns (uint256)",
  "function isVetoed(bytes32) view returns (bool)",
  "function challengeEndTimes(bytes32) view returns (uint256)",
  "function locks(bytes32) view returns (address creator,uint256 lockTime,uint256 unlockTime,uint256 evolutionFactor,bool claimed)",
]);
