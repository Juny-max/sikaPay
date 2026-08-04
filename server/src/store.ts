import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { config } from "./config.js";
import type { Invoice, Payment } from "./types.js";

export class MemoryStore {
  private readonly invoices = new Map<string, Invoice>();
  private readonly payments = new Map<string, Payment>();

  createInvoice(invoice: Invoice): Invoice {
    this.invoices.set(invoice.reference, invoice);
    return invoice;
  }

  getInvoice(reference: string): Invoice | undefined {
    return this.invoices.get(reference);
  }

  saveInvoice(invoice: Invoice): Invoice {
    this.invoices.set(invoice.reference, invoice);
    return invoice;
  }

  listInvoices(merchantId?: string): Invoice[] {
    return [...this.invoices.values()]
      .filter((invoice) => !merchantId || invoice.merchantId === merchantId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  savePayment(payment: Payment): Payment {
    this.payments.set(payment.txHash.toLowerCase(), payment);
    return payment;
  }

  getPayment(txHash: string): Payment | undefined {
    return this.payments.get(txHash.toLowerCase());
  }

  getPaymentById(id: string): Payment | undefined {
    return [...this.payments.values()].find((payment) => payment.id === id);
  }

  listPayments(merchantId?: string): Payment[] {
    const allowed = merchantId
      ? new Set(this.listInvoices(merchantId).map((invoice) => invoice.reference))
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

  override createInvoice(invoice: Invoice): Invoice {
    const saved = super.createInvoice(invoice);
    this.persist();
    return saved;
  }

  override saveInvoice(invoice: Invoice): Invoice {
    const saved = super.saveInvoice(invoice);
    this.persist();
    return saved;
  }

  override savePayment(payment: Payment): Payment {
    const saved = super.savePayment(payment);
    this.persist();
    return saved;
  }

  private persist(): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.tmp`;
    writeFileSync(temporaryPath, JSON.stringify({
      invoices: this.listInvoices(),
      payments: this.listPayments()
    }, null, 2));
    renameSync(temporaryPath, this.filePath);
  }
}

export const store = config.NODE_ENV === "test"
  ? new MemoryStore()
  : new JsonFileStore(config.DATA_FILE);
