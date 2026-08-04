import { existsSync } from "node:fs";
import { resolve } from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

const localEnv = resolve(process.cwd(), ".env");
const parentEnv = resolve(process.cwd(), "../.env");
dotenv.config({ path: existsSync(localEnv) ? localEnv : parentEnv });

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  FRONTEND_ORIGIN: z.string().default("http://localhost:5173"),
  PAYMENT_MODE: z.enum(["simulation", "rpc"]).default("simulation"),
  GHS_PER_ETH: z.coerce.number().positive().default(65000),
  GHS_PER_USDC: z.coerce.number().positive().default(15.5),
  SEPOLIA_RPC_URL: z.string().optional(),
  SIKAPAY_CONTRACT_ADDRESS: z.string().optional(),
  SEPOLIA_PRIVATE_KEY: z.string().optional(),
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
