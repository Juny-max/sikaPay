import type {Invoice,Payment,PreparedPayment,SupportedToken} from '../types';
import type {BackendDataResponse,BackendPayment} from '../types/backend';
import {contractAddress,isMockMode} from '../config/blockchain';
import {mockStore} from '../mocks/store';
import {request} from './client';
import {mapPayment} from './mappers';

export async function preparePayment(invoice:Invoice,token:SupportedToken):Promise<PreparedPayment>{
  if(isMockMode)return mockStore.prepare(invoice,token);
  const response=await request<BackendDataResponse<{cryptoAmount:string;exchangeRate:number}>>('/api/payments/quote',{method:'POST',body:JSON.stringify({invoiceReference:invoice.reference||invoice.id,asset:token})});
  return{transactionId:`pending-${invoice.id}`,invoiceId:invoice.id,token,amountCrypto:response.data.cryptoAmount,amountGhs:invoice.amountGhs,exchangeRate:response.data.exchangeRate,contractAddress,recipientAddress:contractAddress};
}
export async function submitPayment(input:{invoiceReference:string;txHash:`0x${string}`;senderAddress:`0x${string}`;asset:SupportedToken;cryptoAmount:string}){
  return mapPayment((await request<BackendDataResponse<BackendPayment>>('/api/payments',{method:'POST',body:JSON.stringify(input)})).data);
}
export async function getPayment(id:string):Promise<Payment|undefined>{
  if(isMockMode)return mockStore.payments().find(payment=>payment.transactionId===id);
  return mapPayment((await request<BackendDataResponse<BackendPayment>>(`/api/payments/${encodeURIComponent(id)}`)).data);
}
