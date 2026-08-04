import "dotenv/config";
import { Contract, JsonRpcProvider, Wallet, getAddress } from "ethers";
import { createClient } from "@supabase/supabase-js";

async function main() {
const required = [
  "SEPOLIA_RPC_URL",
  "SEPOLIA_PRIVATE_KEY",
  "SETTLEMENT_WALLET",
  "USDC_CONTRACT_ADDRESS",
  "SIKAPAY_CONTRACT_ADDRESS",
  "SUPABASE_URL",
  "SUPABASE_SECRET_KEY"
] as const;

for (const name of required) {
  if (!process.env[name]) throw new Error(`${name} is missing`);
}

const provider = new JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const network = await provider.getNetwork();
if (network.chainId !== 11155111n) throw new Error(`Expected Sepolia chain 11155111, got ${network.chainId}`);

const deployer = new Wallet(process.env.SEPOLIA_PRIVATE_KEY!, provider);
const contractAddress = getAddress(process.env.SIKAPAY_CONTRACT_ADDRESS!);
const settlementAddress = getAddress(process.env.SETTLEMENT_WALLET!);
const usdcAddress = getAddress(process.env.USDC_CONTRACT_ADDRESS!);

const [contractCode, usdcCode, balance] = await Promise.all([
  provider.getCode(contractAddress),
  provider.getCode(usdcAddress),
  provider.getBalance(deployer.address)
]);
if (contractCode === "0x") throw new Error("No contract bytecode at SIKAPAY_CONTRACT_ADDRESS");
if (usdcCode === "0x") throw new Error("No token bytecode at USDC_CONTRACT_ADDRESS");

const sikaPay = new Contract(contractAddress, [
  "function operator() view returns (address)",
  "function settlementWallet() view returns (address)"
], provider);
const [operator, onchainSettlement] = await Promise.all([
  sikaPay.operator() as Promise<string>,
  sikaPay.settlementWallet() as Promise<string>
]);
if (getAddress(onchainSettlement) !== settlementAddress) {
  throw new Error("SETTLEMENT_WALLET does not match the deployed contract");
}
if (getAddress(operator) !== deployer.address) {
  throw new Error("SEPOLIA_PRIVATE_KEY is not the deployed contract operator");
}

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false }
});
const tables = ["profiles", "merchants", "wallets", "invoices", "payments", "payouts"];
for (const table of tables) {
  const { error } = await supabase.from(table).select("*", { count: "exact", head: true });
  if (error) throw new Error(`Supabase table '${table}' unavailable: ${error.message}`);
}

console.log(JSON.stringify({
  network: "Ethereum Sepolia",
  chainId: Number(network.chainId),
  contract: "verified",
  contractAddress,
  settlementWallet: "verified",
  usdcContract: "verified",
  deployerFunded: balance > 0n,
  supabaseSchema: "verified",
  paymentMode: process.env.PAYMENT_MODE
}, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Setup verification failed");
  process.exitCode = 1;
});
