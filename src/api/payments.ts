import type { Invoice, Payment, PreparedPayment, SupportedToken } from '../types';
import { contractAddress } from '../config/blockchain';
import { request } from './client';

type BackendPayment = {
  id: string; invoiceReference: string; txHash: string; senderAddress: string;
  asset: SupportedToken; cryptoAmount: string; amountGhs: number; confirmedAt: string;
  payout: { status: 'NOT_STARTED' | 'PROCESSING' | 'SUCCESS' | 'FAILED'; reference?: string };
};

export const mapPayment = (value: BackendPayment): Payment => ({
  transactionId: value.id,
  invoiceId: value.invoiceReference,
  status: value.payout.status === 'SUCCESS' ? 'COMPLETED' : value.payout.status === 'FAILED' ? 'FAILED' : 'PROCESSING_MOMO',
  blockchainStatus: 'CONFIRMED', payoutStatus: value.payout.status === 'NOT_STARTED' ? 'PENDING' : value.payout.status,
  amountCrypto: value.cryptoAmount, token: value.asset, amountGhs: value.amountGhs,
  txHash: value.txHash, momoReference: value.payout.reference,
  customerWallet: value.senderAddress, createdAt: value.confirmedAt
});

export async function preparePayment(invoice: Invoice, token: SupportedToken): Promise<PreparedPayment> {
  const response = await request<{ data: { cryptoAmount: string; exchangeRate: number } }>('/payments/quote', {
    method: 'POST', body: JSON.stringify({ invoiceReference: invoice.reference, asset: token })
  });
  return { invoiceId: invoice.reference, token, amountGhs: invoice.amountGhs, contractAddress, amountCrypto: response.data.cryptoAmount, exchangeRate: response.data.exchangeRate };
}

export async function confirmPayment(input: { invoiceReference: string; txHash: string; senderAddress: string; asset: SupportedToken; cryptoAmount: string }) {
  const response = await request<{ data: BackendPayment }>('/payments', { method: 'POST', body: JSON.stringify(input) });
  return mapPayment(response.data);
}

export async function getPayment(id: string) {
  const response = await request<{ data: BackendPayment }>(`/payments/${encodeURIComponent(id)}`);
  return mapPayment(response.data);
}
