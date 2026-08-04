import { createClient } from "@supabase/supabase-js";
import type { NextFunction, Request, Response } from "express";
import { config } from "./config.js";
import type { Merchant } from "./types.js";

export interface AuthenticatedRequest extends Request {
  authUser: { id: string; email?: string };
}

function credentials() {
  if (!config.SUPABASE_URL || !config.SUPABASE_SECRET_KEY) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }
  return { url: config.SUPABASE_URL, key: config.SUPABASE_SECRET_KEY };
}

export function supabaseAdmin() {
  const { url, key } = credentials();
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function requireAuth(request: Request, response: Response, next: NextFunction) {
  const header = request.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) {
    response.status(401).json({ error: { code: "AUTH_REQUIRED", message: "Bearer token required" } });
    return;
  }
  try {
    const { data, error } = await supabaseAdmin().auth.getUser(token);
    if (error || !data.user) throw new Error("INVALID_TOKEN");
    (request as AuthenticatedRequest).authUser = { id: data.user.id, email: data.user.email };
    next();
  } catch (error) {
    next(error);
  }
}

export async function getMerchantForUser(userId: string): Promise<Merchant | undefined> {
  const { data, error } = await supabaseAdmin()
    .from("merchants")
    .select("id,user_id,business_name,momo_phone,momo_network,created_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return undefined;
  return {
    id: data.id,
    userId: data.user_id,
    businessName: data.business_name,
    momoPhone: data.momo_phone,
    momoNetwork: data.momo_network,
    createdAt: data.created_at
  };
}

export async function upsertMerchant(userId: string, input: {
  businessName: string;
  momoPhone: string;
}): Promise<Merchant> {
  const { data, error } = await supabaseAdmin()
    .from("merchants")
    .upsert({
      user_id: userId,
      business_name: input.businessName,
      momo_phone: input.momoPhone,
      momo_network: "MTN",
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id" })
    .select("id,user_id,business_name,momo_phone,momo_network,created_at")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    userId: data.user_id,
    businessName: data.business_name,
    momoPhone: data.momo_phone,
    momoNetwork: data.momo_network,
    createdAt: data.created_at
  };
}
