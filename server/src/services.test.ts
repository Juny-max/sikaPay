import { beforeEach, describe, expect, it } from "vitest";
import { InvoiceService, PaymentService } from "./services.js";
import { MemoryStore } from "./store.js";

describe("SikaPay payment flow", () => {
  let database: MemoryStore;

  beforeEach(() => {
    database = new MemoryStore();
  });

  it("creates an invoice and completes its payout", async () => {
    const invoice = await new InvoiceService(database).create({
      merchantId: "kojo-store",
      merchantName: "Kojo Store",
      merchantPhone: "+233241234567",
      amountGhs: 20
    });
    const payment = await new PaymentService(database).process({
      invoiceReference: invoice.reference,
      txHash: `0x${"a".repeat(64)}`,
      senderAddress: `0x${"b".repeat(40)}`,
      asset: "USDC",
      cryptoAmount: "1.30"
    });

    expect(payment.payout.status).toBe("SUCCESS");
    expect(database.getInvoice(invoice.reference)?.status).toBe("PAID");
  });

  it("rejects an underpayment", async () => {
    const invoice = await new InvoiceService(database).create({
      merchantId: "kojo-store",
      merchantName: "Kojo Store",
      merchantPhone: "+233241234567",
      amountGhs: 20
    });
    await expect(new PaymentService(database).process({
      invoiceReference: invoice.reference,
      txHash: `0x${"c".repeat(64)}`,
      senderAddress: `0x${"d".repeat(40)}`,
      asset: "USDC",
      cryptoAmount: "1"
    })).rejects.toThrow("UNDERPAYMENT");
  });
});
