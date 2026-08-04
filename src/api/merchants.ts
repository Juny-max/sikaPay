import type { Merchant, Payment } from '../types';
import { mapPayment } from './payments';
import { request } from './client';

export async function getMe() {
  const response = await request<{ data: { user: { id: string; email?: string }; merchant?: { id: string; businessName: string; momoPhone: string; momoNetwork: 'MTN' } } }>('/me');
  return { user: response.data.user, merchant: response.data.merchant ? {
    id: response.data.merchant.id,
    name: response.data.merchant.businessName,
    phone: response.data.merchant.momoPhone,
    network: response.data.merchant.momoNetwork
  } satisfies Merchant : undefined };
}

export async function saveMerchant(data: { businessName: string; momoPhone: string }) {
  return (await request<{ data: unknown }>('/merchants/me', { method: 'PUT', body: JSON.stringify(data) })).data;
}

export async function getMerchantPayments() {
  const response = await request<{ data: Parameters<typeof mapPayment>[0][] }>('/payments');
  return response.data.map(mapPayment) as Payment[];
}
