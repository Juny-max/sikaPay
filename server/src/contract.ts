import {
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  formatUnits,
  http,
  keccak256,
  stringToHex,
  zeroAddress,
  type Address,
  type Hex
} from "viem";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { config } from "./config.js";
import type { Asset } from "./types.js";

export const sikaPayAbi = [{
  type: "event",
  name: "PaymentCompleted",
  inputs: [
    { indexed: true, name: "invoiceId", type: "bytes32" },
    { indexed: true, name: "merchantId", type: "bytes32" },
    { indexed: true, name: "payer", type: "address" },
    { indexed: false, name: "token", type: "address" },
    { indexed: false, name: "amount", type: "uint256" },
    { indexed: false, name: "timestamp", type: "uint256" }
  ]
}, {
  type: "function",
  name: "createInvoice",
  stateMutability: "nonpayable",
  inputs: [
    { name: "invoiceId", type: "bytes32" },
    { name: "merchantId", type: "bytes32" }
  ],
  outputs: []
}] as const;

export const invoiceOnchainId = (reference: string): Hex => keccak256(stringToHex(reference));

const publicClient = () => {
  if (!config.SEPOLIA_RPC_URL || !config.SIKAPAY_CONTRACT_ADDRESS) {
    throw new Error("RPC_NOT_CONFIGURED");
  }
  return createPublicClient({ chain: sepolia, transport: http(config.SEPOLIA_RPC_URL) });
};

export async function createInvoiceOnchain(reference: string, merchantId: string): Promise<Hex> {
  if (!config.SEPOLIA_RPC_URL || !config.SIKAPAY_CONTRACT_ADDRESS || !config.SEPOLIA_PRIVATE_KEY) {
    throw new Error("RPC_NOT_CONFIGURED");
  }
  const account = privateKeyToAccount(config.SEPOLIA_PRIVATE_KEY as Hex);
  const transport = http(config.SEPOLIA_RPC_URL);
  const wallet = createWalletClient({ account, chain: sepolia, transport });
  const hash = await wallet.writeContract({
    address: config.SIKAPAY_CONTRACT_ADDRESS as Address,
    abi: sikaPayAbi,
    functionName: "createInvoice",
    args: [invoiceOnchainId(reference), keccak256(stringToHex(merchantId))]
  });
  const client = createPublicClient({ chain: sepolia, transport });
  const receipt = await client.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error("INVOICE_CHAIN_CREATION_FAILED");
  return hash;
}

export interface VerifiedChainPayment {
  senderAddress: Address;
  asset: Asset;
  cryptoAmount: string;
  confirmedAt: string;
}

export async function verifyPaymentReceipt(
  txHash: Hex,
  reference: string
): Promise<VerifiedChainPayment> {
  const client = publicClient();
  const receipt = await client.getTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success") throw new Error("TRANSACTION_REVERTED");

  const contractAddress = (config.SIKAPAY_CONTRACT_ADDRESS as Address).toLowerCase();
  const expectedInvoiceId = invoiceOnchainId(reference).toLowerCase();
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== contractAddress) continue;
    try {
      const decoded = decodeEventLog({ abi: sikaPayAbi, data: log.data, topics: log.topics });
      if (decoded.eventName !== "PaymentCompleted") continue;
      const args = decoded.args;
      if (args.invoiceId.toLowerCase() !== expectedInvoiceId) continue;
      const token = args.token.toLowerCase();
      const isEth = token === zeroAddress;
      if (!isEth && token !== config.USDC_CONTRACT_ADDRESS?.toLowerCase()) {
        throw new Error("UNSUPPORTED_PAYMENT_TOKEN");
      }
      const block = await client.getBlock({ blockHash: receipt.blockHash });
      return {
        senderAddress: args.payer,
        asset: isEth ? "ETH" : "USDC",
        cryptoAmount: formatUnits(args.amount, isEth ? 18 : 6),
        confirmedAt: new Date(Number(block.timestamp) * 1000).toISOString()
      };
    } catch (error) {
      if (error instanceof Error && error.message === "UNSUPPORTED_PAYMENT_TOKEN") throw error;
    }
  }
  throw new Error("PAYMENT_EVENT_NOT_FOUND");
}

export async function getTransactionBlockNumber(txHash: Hex): Promise<bigint> {
  const client = publicClient();
  const receipt = await client.getTransactionReceipt({ hash: txHash });
  return receipt.blockNumber;
}

export async function findPaymentTransactionForInvoice(reference: string, fromBlock = 0n): Promise<Hex | undefined> {
  const client = publicClient();
  const invoiceId = invoiceOnchainId(reference);
  const contractAddress = config.SIKAPAY_CONTRACT_ADDRESS as Address;
  const logs = await client.getLogs({
    address: contractAddress,
    event: sikaPayAbi[0],
    args: { invoiceId },
    fromBlock,
    toBlock: "latest"
  });
  return logs.at(-1)?.transactionHash;
}
