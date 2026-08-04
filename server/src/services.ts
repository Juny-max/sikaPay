import { randomUUID } from "node:crypto";
import { config } from "./config.js";
import { createInvoiceOnchain, invoiceOnchainId, verifyPaymentReceipt } from "./contract.js";
import { store, type MemoryStore } from "./store.js";
import type { Asset, Invoice, Payment } from "./types.js";

type EventListener = (event: { type: string; data: unknown }) => void;

export class MerchantEvents {
  private readonly listeners = new Map<string, Set<EventListener>>();

  subscribe(merchantId: string, listener: EventListener): () => void {
    const listeners = this.listeners.get(merchantId) ?? new Set<EventListener>();
    listeners.add(listener);
    this.listeners.set(merchantId, listeners);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) this.listeners.delete(merchantId);
    };
  }

  publish(merchantId: string, type: string, data: unknown): void {
    this.listeners.get(merchantId)?.forEach((listener) => listener({ type, data }));
  }
}

export const merchantEvents = new MerchantEvents();

const roundMoney = (value: number) => Math.round(value * 100) / 100;
const makeReference = (prefix: string) =>
  `${prefix}-${randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`;

export class InvoiceService {
  constructor(private readonly database: MemoryStore = store) {}

  async create(input: {
    merchantId: string;
    merchantName: string;
    merchantPhone: string;
    amountGhs: number;
  }): Promise<Invoice> {
    const reference = makeReference("SP");
    const createdAt = new Date();
    const invoice: Invoice = {
      id: randomUUID(),
      reference,
      onchainId: invoiceOnchainId(reference),
      ...input,
      amountGhs: roundMoney(input.amountGhs),
      status: "PENDING",
      qrPayload: `sikapay://pay?reference=${encodeURIComponent(reference)}`,
      createdAt: createdAt.toISOString(),
      expiresAt: new Date(createdAt.getTime() + 15 * 60_000).toISOString()
    };
    if (config.PAYMENT_MODE === "rpc") {
      invoice.onchainCreationTxHash = await createInvoiceOnchain(reference, input.merchantId);
    }
    this.database.createInvoice(invoice);
    merchantEvents.publish(invoice.merchantId, "invoice.created", invoice);
    return invoice;
  }
}

export class PaymentService {
  constructor(private readonly database: MemoryStore = store) {}

  quote(invoiceReference: string, asset: Asset): { cryptoAmount: string; exchangeRate: number } {
    const invoice = this.database.getInvoice(invoiceReference);
    if (!invoice) throw new Error("INVOICE_NOT_FOUND");
    if (new Date(invoice.expiresAt) < new Date()) throw new Error("INVOICE_EXPIRED");
    if (invoice.status === "PAID") throw new Error("INVOICE_ALREADY_PAID");
    const exchangeRate = asset === "ETH" ? config.GHS_PER_ETH : config.GHS_PER_USDC;
    const decimals = asset === "ETH" ? 8 : 6;
    return { cryptoAmount: (invoice.amountGhs / exchangeRate).toFixed(decimals), exchangeRate };
  }

  async process(input: {
    invoiceReference: string;
    txHash: `0x${string}`;
    senderAddress: `0x${string}`;
    asset: Asset;
    cryptoAmount: string;
  }): Promise<Payment> {
    const existing = this.database.getPayment(input.txHash);
    if (existing) return existing;

    const invoice = this.database.getInvoice(input.invoiceReference);
    if (!invoice) throw new Error("INVOICE_NOT_FOUND");
    if (new Date(invoice.expiresAt) < new Date()) throw new Error("INVOICE_EXPIRED");
    if (invoice.status === "PAID") throw new Error("INVOICE_ALREADY_PAID");

    invoice.status = "PROCESSING";
    this.database.saveInvoice(invoice);
    merchantEvents.publish(invoice.merchantId, "payment.processing", invoice);

    let verifiedInput = input;
    let confirmedAt = new Date().toISOString();
    if (config.PAYMENT_MODE === "rpc") {
      try {
        const verified = await verifyPaymentReceipt(input.txHash, invoice.reference);
        verifiedInput = { ...input, ...verified };
        confirmedAt = verified.confirmedAt;
      } catch (error) {
        invoice.status = "FAILED";
        this.database.saveInvoice(invoice);
        throw error;
      }
    }

    const exchangeRate = verifiedInput.asset === "ETH" ? config.GHS_PER_ETH : config.GHS_PER_USDC;
    const calculatedGhs = Number(verifiedInput.cryptoAmount) * exchangeRate;
    if (!Number.isFinite(calculatedGhs) || calculatedGhs + 0.01 < invoice.amountGhs) {
      invoice.status = "FAILED";
      this.database.saveInvoice(invoice);
      throw new Error("UNDERPAYMENT");
    }

    const payment: Payment = {
      id: randomUUID(),
      ...verifiedInput,
      amountGhs: invoice.amountGhs,
      exchangeRate,
      chainId: 11155111,
      confirmedAt,
      payout: {
        status: "SUCCESS",
        network: "MTN Mobile Money",
        reference: makeReference("SPMOMO"),
        completedAt: new Date().toISOString()
      }
    };

    invoice.status = "PAID";
    invoice.payment = payment;
    this.database.savePayment(payment);
    this.database.saveInvoice(invoice);
    merchantEvents.publish(invoice.merchantId, "payment.completed", invoice);
    return payment;
  }
}
