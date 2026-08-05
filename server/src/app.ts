import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import helmet from "helmet";
import { z } from "zod";
import { config } from "./config.js";
import { getMerchantForUser, requireAuth, upsertMerchant, type AuthenticatedRequest } from "./auth.js";
import { InvoiceService, merchantEvents, PaymentService } from "./services.js";
import { store } from "./store.js";

const invoiceService = new InvoiceService();
const paymentService = new PaymentService();

const invoiceSchema = z.object({
  merchantId: z.string().trim().min(1).max(80),
  merchantName: z.string().trim().min(2).max(120),
  merchantPhone: z.string().regex(/^\+?233\d{9}$/, "Use a Ghana number such as +233241234567"),
  amountGhs: z.coerce.number().positive().max(100_000)
});

const paymentSchema = z.object({
  invoiceReference: z.string().trim().min(1),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).transform((value) => value as `0x${string}`),
  senderAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).transform((value) => value as `0x${string}`),
  asset: z.enum(["ETH", "USDC"]),
  cryptoAmount: z.string().regex(/^\d+(\.\d+)?$/)
});

const quoteSchema = z.object({
  invoiceReference: z.string().trim().min(1),
  asset: z.enum(["ETH", "USDC"])
});

const merchantSchema = z.object({
  businessName: z.string().trim().min(2).max(120),
  momoPhone: z.string().regex(/^\+?233\d{9}$/, "Use a Ghana number such as +233241234567")
});

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: config.FRONTEND_ORIGIN.split(",").map((value) => value.trim()) }));
  app.use(express.json({ limit: "32kb" }));

  app.get("/", (_request, response) => {
    response.json({
      service: "SikaPay API",
      status: "running",
      mode: config.PAYMENT_MODE,
      frontend: config.FRONTEND_ORIGIN.split(",")[0],
      endpoints: {
        health: "/health",
        currentUser: "/api/me",
        merchantProfile: "/api/merchants/me",
        invoices: "/api/invoices",
        payments: "/api/payments"
      }
    });
  });

  app.get("/health", (_request, response) => {
    response.json({ status: "ok", service: "sikapay-api", mode: config.PAYMENT_MODE });
  });

  app.get("/api/me", requireAuth, async (request, response) => {
    const user = (request as AuthenticatedRequest).authUser;
    response.json({ data: { user, merchant: await getMerchantForUser(user.id) } });
  });

  app.put("/api/merchants/me", requireAuth, async (request, response) => {
    const input = merchantSchema.parse(request.body);
    const user = (request as AuthenticatedRequest).authUser;
    response.json({ data: await upsertMerchant(user.id, input) });
  });

  app.post("/api/invoices", requireAuth, async (request, response) => {
    const { amountGhs } = invoiceSchema.pick({ amountGhs: true }).parse(request.body);
    const user = (request as AuthenticatedRequest).authUser;
    const merchant = await getMerchantForUser(user.id);
    if (!merchant) throw new Error("MERCHANT_PROFILE_REQUIRED");
    response.status(201).json({ data: await invoiceService.create({
      merchantId: merchant.id,
      merchantName: merchant.businessName,
      merchantPhone: merchant.momoPhone,
      amountGhs
    }) });
  });

  app.get("/api/invoices", requireAuth, async (request, response) => {
    const user = (request as AuthenticatedRequest).authUser;
    const merchant = await getMerchantForUser(user.id);
    if (!merchant) throw new Error("MERCHANT_PROFILE_REQUIRED");
    response.json({ data: await store.listInvoices(merchant.id) });
  });

  app.get("/api/invoices/:reference", async (request, response) => {
    const invoice = await store.getInvoice(request.params.reference);
    if (!invoice) return response.status(404).json({ error: { code: "INVOICE_NOT_FOUND", message: "Invoice not found" } });
    return response.json({ data: invoice });
  });

  app.post("/api/payments", async (request, response) => {
    const input = paymentSchema.parse(request.body);
    const payment = await paymentService.process(input);
    response.status(201).json({ data: payment });
  });

  app.post("/api/payments/quote", async (request, response) => {
    const input = quoteSchema.parse(request.body);
    response.json({ data: await paymentService.quote(input.invoiceReference, input.asset) });
  });

  app.post("/api/payments/reconcile", async (request, response) => {
    const { invoiceReference } = z.object({ invoiceReference: z.string().trim().min(1) }).parse(request.body);
    response.json({ data: await paymentService.reconcile(invoiceReference) });
  });

  app.get("/api/payments/:id", async (request, response) => {
    const payment = await store.getPaymentById(request.params.id);
    if (!payment) return response.status(404).json({ error: { code: "PAYMENT_NOT_FOUND", message: "Payment not found" } });
    return response.json({ data: payment });
  });

  app.get("/api/payments", requireAuth, async (request, response) => {
    const user = (request as AuthenticatedRequest).authUser;
    const merchant = await getMerchantForUser(user.id);
    if (!merchant) throw new Error("MERCHANT_PROFILE_REQUIRED");
    response.json({ data: await store.listPayments(merchant.id) });
  });

  app.get("/api/events/merchants/:merchantId", (request, response) => {
    response.setHeader("Content-Type", "text/event-stream");
    response.setHeader("Cache-Control", "no-cache");
    response.setHeader("Connection", "keep-alive");
    response.flushHeaders();
    response.write(`event: connected\ndata: ${JSON.stringify({ merchantId: request.params.merchantId })}\n\n`);
    const unsubscribe = merchantEvents.subscribe(request.params.merchantId, ({ type, data }) => {
      response.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
    });
    const heartbeat = setInterval(() => response.write(": heartbeat\n\n"), 20_000);
    request.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  });

  app.use((_request, response) => response.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } }));

  const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
    if (error instanceof z.ZodError) {
      response.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid request", details: error.flatten() } });
      return;
    }
    const statusByCode: Record<string, number> = {
      INVOICE_NOT_FOUND: 404,
      INVOICE_EXPIRED: 410,
      INVOICE_ALREADY_PAID: 409,
      UNDERPAYMENT: 422,
      RPC_NOT_CONFIGURED: 503,
      TRANSACTION_REVERTED: 422,
      PAYMENT_EVENT_NOT_FOUND: 422,
      UNSUPPORTED_PAYMENT_TOKEN: 422,
      INVOICE_CHAIN_CREATION_FAILED: 502,
      SUPABASE_NOT_CONFIGURED: 503,
      INVALID_TOKEN: 401,
      MERCHANT_PROFILE_REQUIRED: 409
    };
    const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
    if (statusByCode[code] === undefined) console.error("Unhandled API error", error);
    response.status(statusByCode[code] ?? 500).json({ error: { code, message: code.replaceAll("_", " ").toLowerCase() } });
  };
  app.use(errorHandler);
  return app;
}
