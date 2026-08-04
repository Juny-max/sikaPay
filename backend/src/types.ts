export type Asset = "ETH" | "USDC";
export type InvoiceStatus = "PENDING" | "PROCESSING" | "PAID" | "FAILED";
export type PayoutStatus = "NOT_STARTED" | "PROCESSING" | "SUCCESS" | "FAILED";

export interface Invoice {
  id: string;
  reference: string;
  onchainId: `0x${string}`;
  onchainCreationTxHash?: `0x${string}`;
  merchantId: string;
  merchantName: string;
  merchantPhone: string;
  amountGhs: number;
  status: InvoiceStatus;
  qrPayload: string;
  createdAt: string;
  expiresAt: string;
  payment?: Payment;
}

export interface Payment {
  id: string;
  invoiceReference: string;
  txHash: `0x${string}`;
  senderAddress: `0x${string}`;
  asset: Asset;
  cryptoAmount: string;
  amountGhs: number;
  exchangeRate: number;
  chainId: number;
  confirmedAt: string;
  payout: Payout;
}

export interface Payout {
  status: PayoutStatus;
  network: "MTN Mobile Money";
  reference?: string;
  completedAt?: string;
  failureReason?: string;
}

export interface Merchant {
  id: string;
  userId: string;
  businessName: string;
  momoPhone: string;
  momoNetwork: "MTN";
  createdAt: string;
}
