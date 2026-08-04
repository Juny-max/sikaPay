import type { Invoice } from '../types';
import { request } from './client';

type BackendInvoice = {
  id: string; reference: string; onchainId: `0x${string}`; merchantId: string;
  merchantName: string; merchantPhone: string; amountGhs: number;
  status: 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED'; expiresAt: string;
};

const mapInvoice = (value: BackendInvoice): Invoice => ({
  ...value,
  network: 'MTN',
  description: `Payment to ${value.merchantName}`,
  status: value.status === 'PAID' ? 'COMPLETED' : value.status === 'PROCESSING' ? 'PROCESSING_MOMO' : value.status === 'FAILED' ? 'FAILED' : 'AWAITING_PAYMENT',
  paymentUrl: `${window.location.origin}/pay/${value.reference}`
});

export async function createInvoice(data: { amountGhs: number }) {
  const response = await request<{ data: BackendInvoice }>('/invoices', { method: 'POST', body: JSON.stringify(data) });
  return mapInvoice(response.data);
}
export async function getInvoice(reference: string) {
  const response = await request<{ data: BackendInvoice }>(`/invoices/${encodeURIComponent(reference)}`);
  return mapInvoice(response.data);
}
export async function getInvoices() {
  const response = await request<{ data: BackendInvoice[] }>('/invoices');
  return response.data.map(mapInvoice);
}
