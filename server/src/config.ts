import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

const moduleDir = __dirname;
const serverEnv = resolve(moduleDir, "../.env");
const cwdEnv = resolve(process.cwd(), ".env");
const parentEnv = resolve(process.cwd(), "../.env");
dotenv.config({ path: [serverEnv, cwdEnv, parentEnv].find((path) => existsSync(path)) });

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default("0.0.0.0"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  FRONTEND_ORIGIN: z.string().default("http://localhost:5173"),
  PAYMENT_MODE: z.enum(["simulation", "rpc"]).default("simulation"),
  GHS_PER_ETH: z.coerce.number().positive().default(65000),
  GHS_PER_USDC: z.coerce.number().positive().default(15.5),
  SEPOLIA_RPC_URL: z.string().optional(),
  SIKAPAY_CONTRACT_ADDRESS: z.string().optional(),
  SEPOLIA_PRIVATE_KEY: z.string().trim().regex(/^(0x)?[0-9a-fA-F]{64}$/, "SEPOLIA_PRIVATE_KEY must be a 32-byte hex key").transform((value) => value.startsWith("0x") ? value : `0x${value}`).optional(),
  USDC_CONTRACT_ADDRESS: z.string().optional(),
  DATA_FILE: z.string().default("./data/sikapay.json"),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
  SUPABASE_SECRET_KEY: z.string().optional()
});

const parsedConfig = schema.parse(process.env);

export const config = {
  ...parsedConfig,
  PAYMENT_MODE: parsedConfig.NODE_ENV === "test" ? "simulation" as const : parsedConfig.PAYMENT_MODE
};
