import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { supabaseAdmin } from "./auth.js";
import { config } from "./config.js";
import type { Invoice, Payment } from "./types.js";

export class MemoryStore {
  private readonly invoices = new Map<string, Invoice>();
  private readonly payments = new Map<string, Payment>();

  async createInvoice(invoice: Invoice): Promise<Invoice> {
    this.invoices.set(invoice.reference, invoice);
    return invoice;
  }

  async getInvoice(reference: string): Promise<Invoice | undefined> {
    return this.invoices.get(reference);
  }

  async saveInvoice(invoice: Invoice): Promise<Invoice> {
    this.invoices.set(invoice.reference, invoice);
    return invoice;
  }

  async listInvoices(merchantId?: string): Promise<Invoice[]> {
    return [...this.invoices.values()]
      .filter((invoice) => !merchantId || invoice.merchantId === merchantId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async savePayment(payment: Payment): Promise<Payment> {
    this.payments.set(payment.txHash.toLowerCase(), payment);
    return payment;
  }

  async getPayment(txHash: string): Promise<Payment | undefined> {
    return this.payments.get(txHash.toLowerCase());
  }

  async getPaymentById(id: string): Promise<Payment | undefined> {
    return [...this.payments.values()].find((payment) => payment.id === id);
  }

  async listPayments(merchantId?: string): Promise<Payment[]> {
    const allowed = merchantId
      ? new Set((await this.listInvoices(merchantId)).map((invoice) => invoice.reference))
      : undefined;
    return [...this.payments.values()]
      .filter((payment) => !allowed || allowed.has(payment.invoiceReference))
      .sort((a, b) => b.confirmedAt.localeCompare(a.confirmedAt));
  }
}

export class JsonFileStore extends MemoryStore {
  private readonly filePath: string;

  constructor(filePath: string) {
    super();
    this.filePath = resolve(filePath);
    if (!existsSync(this.filePath)) return;
    const saved = JSON.parse(readFileSync(this.filePath, "utf8")) as {
      invoices?: Invoice[];
      payments?: Payment[];
    };
    saved.invoices?.forEach((invoice) => super.saveInvoice(invoice));
    saved.payments?.forEach((payment) => super.savePayment(payment));
  }

  override async createInvoice(invoice: Invoice): Promise<Invoice> {
    const saved = await super.createInvoice(invoice);
    await this.persist();
    return saved;
  }

  override async saveInvoice(invoice: Invoice): Promise<Invoice> {
    const saved = await super.saveInvoice(invoice);
    await this.persist();
    return saved;
  }

  override async savePayment(payment: Payment): Promise<Payment> {
    const saved = await super.savePayment(payment);
    await this.persist();
    return saved;
  }

  private async persist(): Promise<void> {
    mkdirSync(dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.tmp`;
    writeFileSync(temporaryPath, JSON.stringify({
      invoices: await this.listInvoices(),
      payments: await this.listPayments()
    }, null, 2));
    renameSync(temporaryPath, this.filePath);
  }
}

type InvoiceRow = {
  id: string;
  reference: string;
  onchain_id: string;
  onchain_creation_tx_hash?: string | null;
  merchant_id: string;
  amount_ghs: number | string;
  status: Invoice["status"];
  qr_payload: string;
  created_at: string;
  expires_at: string;
  merchants?: { business_name: string; momo_phone: string } | { business_name: string; momo_phone: string }[] | null;
};

type PaymentRow = {
  id: string;
  invoice_reference: string;
  tx_hash: string;
  sender_address: string;
  asset: Payment["asset"];
  crypto_amount: number | string;
  amount_ghs: number | string;
  exchange_rate: number | string;
  chain_id: number;
  confirmed_at: string;
  payouts?: {
    status: Payment["payout"]["status"];
    network: Payment["payout"]["network"];
    reference?: string | null;
    completed_at?: string | null;
    failure_reason?: string | null;
  } | {
    status: Payment["payout"]["status"];
    network: Payment["payout"]["network"];
    reference?: string | null;
    completed_at?: string | null;
    failure_reason?: string | null;
  }[] | null;
};

const mapInvoiceRow = (row: InvoiceRow, payment?: Payment): Invoice => ({
  id: row.id,
  reference: row.reference,
  onchainId: row.onchain_id as `0x${string}`,
  onchainCreationTxHash: row.onchain_creation_tx_hash as `0x${string}` | undefined,
  merchantId: row.merchant_id,
  merchantName: (Array.isArray(row.merchants) ? row.merchants[0] : row.merchants)?.business_name ?? "SikaPay merchant",
  merchantPhone: (Array.isArray(row.merchants) ? row.merchants[0] : row.merchants)?.momo_phone ?? "+233000000000",
  amountGhs: Number(row.amount_ghs),
  status: row.status,
  qrPayload: row.qr_payload,
  createdAt: row.created_at,
  expiresAt: row.expires_at,
  payment
});

const mapPaymentRow = (row: PaymentRow): Payment => {
  const payout = Array.isArray(row.payouts) ? row.payouts[0] : row.payouts;
  return {
    id: row.id,
    invoiceReference: row.invoice_reference,
    txHash: row.tx_hash as `0x${string}`,
    senderAddress: row.sender_address as `0x${string}`,
    asset: row.asset,
    cryptoAmount: String(row.crypto_amount),
    amountGhs: Number(row.amount_ghs),
    exchangeRate: Number(row.exchange_rate),
    chainId: row.chain_id,
    confirmedAt: row.confirmed_at,
    payout: {
      status: payout?.status ?? "NOT_STARTED",
      network: payout?.network ?? "MTN Mobile Money",
      reference: payout?.reference ?? undefined,
      completedAt: payout?.completed_at ?? undefined,
      failureReason: payout?.failure_reason ?? undefined
    }
  };
};

export class SupabaseStore extends MemoryStore {
  private client() {
    return supabaseAdmin();
  }

  override async createInvoice(invoice: Invoice): Promise<Invoice> {
    return this.saveInvoice(invoice);
  }

  override async getInvoice(reference: string): Promise<Invoice | undefined> {
    const { data, error } = await this.client()
      .from("invoices")
      .select("id,reference,onchain_id,onchain_creation_tx_hash,merchant_id,amount_ghs,status,qr_payload,created_at,expires_at,merchants(business_name,momo_phone)")
      .eq("reference", reference)
      .maybeSingle();
    if (error) throw error;
    if (!data) return undefined;
    const payment = await this.getPaymentForInvoice(reference);
    return mapInvoiceRow(data as unknown as InvoiceRow, payment);
  }

  override async saveInvoice(invoice: Invoice): Promise<Invoice> {
    const { error } = await this.client()
      .from("invoices")
      .upsert({
        id: invoice.id,
        reference: invoice.reference,
        onchain_id: invoice.onchainId,
        onchain_creation_tx_hash: invoice.onchainCreationTxHash ?? null,
        merchant_id: invoice.merchantId,
        amount_ghs: invoice.amountGhs,
        status: invoice.status,
        qr_payload: invoice.qrPayload,
        created_at: invoice.createdAt,
        expires_at: invoice.expiresAt
      }, { onConflict: "reference" });
    if (error) throw error;
    return invoice;
  }

  override async listInvoices(merchantId?: string): Promise<Invoice[]> {
    let query = this.client()
      .from("invoices")
      .select("id,reference,onchain_id,onchain_creation_tx_hash,merchant_id,amount_ghs,status,qr_payload,created_at,expires_at,merchants(business_name,momo_phone)")
      .order("created_at", { ascending: false });
    if (merchantId) query = query.eq("merchant_id", merchantId);
    const { data, error } = await query;
    if (error) throw error;
    return ((data as unknown as InvoiceRow[] | null) ?? []).map((row) => mapInvoiceRow(row));
  }

  override async savePayment(payment: Payment): Promise<Payment> {
    const client = this.client();
    const { error: paymentError } = await client
      .from("payments")
      .upsert({
        id: payment.id,
        invoice_reference: payment.invoiceReference,
        tx_hash: payment.txHash.toLowerCase(),
        sender_address: payment.senderAddress,
        asset: payment.asset,
        crypto_amount: payment.cryptoAmount,
        amount_ghs: payment.amountGhs,
        exchange_rate: payment.exchangeRate,
        chain_id: payment.chainId,
        confirmed_at: payment.confirmedAt
      }, { onConflict: "tx_hash" });
    if (paymentError) throw paymentError;
    const { error: payoutError } = await client
      .from("payouts")
      .upsert({
        payment_id: payment.id,
        status: payment.payout.status,
        network: payment.payout.network,
        reference: payment.payout.reference ?? null,
        completed_at: payment.payout.completedAt ?? null,
        failure_reason: payment.payout.failureReason ?? null
      }, { onConflict: "payment_id" });
    if (payoutError) throw payoutError;
    return payment;
  }

  override async getPayment(txHash: string): Promise<Payment | undefined> {
    const { data, error } = await this.client()
      .from("payments")
      .select("id,invoice_reference,tx_hash,sender_address,asset,crypto_amount,amount_ghs,exchange_rate,chain_id,confirmed_at,payouts(status,network,reference,completed_at,failure_reason)")
      .eq("tx_hash", txHash.toLowerCase())
      .maybeSingle();
    if (error) throw error;
    return data ? mapPaymentRow(data as PaymentRow) : undefined;
  }

  override async getPaymentById(id: string): Promise<Payment | undefined> {
    const { data, error } = await this.client()
      .from("payments")
      .select("id,invoice_reference,tx_hash,sender_address,asset,crypto_amount,amount_ghs,exchange_rate,chain_id,confirmed_at,payouts(status,network,reference,completed_at,failure_reason)")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? mapPaymentRow(data as PaymentRow) : undefined;
  }

  override async listPayments(merchantId?: string): Promise<Payment[]> {
    let references: string[] | undefined;
    if (merchantId) references = (await this.listInvoices(merchantId)).map((invoice) => invoice.reference);
    if (references && references.length === 0) return [];
    let query = this.client()
      .from("payments")
      .select("id,invoice_reference,tx_hash,sender_address,asset,crypto_amount,amount_ghs,exchange_rate,chain_id,confirmed_at,payouts(status,network,reference,completed_at,failure_reason)")
      .order("confirmed_at", { ascending: false });
    if (references) query = query.in("invoice_reference", references);
    const { data, error } = await query;
    if (error) throw error;
    return (data as PaymentRow[] | null ?? []).map(mapPaymentRow);
  }

  private async getPaymentForInvoice(invoiceReference: string): Promise<Payment | undefined> {
    const { data, error } = await this.client()
      .from("payments")
      .select("id,invoice_reference,tx_hash,sender_address,asset,crypto_amount,amount_ghs,exchange_rate,chain_id,confirmed_at,payouts(status,network,reference,completed_at,failure_reason)")
      .eq("invoice_reference", invoiceReference)
      .maybeSingle();
    if (error) throw error;
    return data ? mapPaymentRow(data as PaymentRow) : undefined;
  }
}

export const store = config.NODE_ENV === "test"
  ? new MemoryStore()
  : config.SUPABASE_URL && config.SUPABASE_SECRET_KEY
    ? new SupabaseStore()
  : new JsonFileStore(config.DATA_FILE);
