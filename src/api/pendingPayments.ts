import type {SupportedToken} from '../types';

const key=(invoiceReference:string)=>`sikapay_pending_payment_${invoiceReference}`;
const maxAgeMs=45*60*1000;

export type PendingPaymentStage='wallet_opened'|'tx_submitted'|'verifying';

export interface PendingPayment{
  invoiceReference:string;
  token:SupportedToken;
  amountCrypto:string;
  senderAddress:`0x${string}`;
  txHash?:`0x${string}`;
  stage:PendingPaymentStage;
  createdAt:string;
  updatedAt:string;
}

export function readPendingPayment(invoiceReference:string):PendingPayment|undefined{
  try{
    const pending=JSON.parse(localStorage.getItem(key(invoiceReference))||'null') as PendingPayment|null;
    if(!pending)return undefined;
    if(Date.now()-new Date(pending.updatedAt).getTime()>maxAgeMs){
      clearPendingPayment(invoiceReference);
      return undefined;
    }
    return pending;
  }catch{
    return undefined;
  }
}

export function savePendingPayment(input:Omit<PendingPayment,'createdAt'|'updatedAt'> & Partial<Pick<PendingPayment,'createdAt'>>):PendingPayment{
  const now=new Date().toISOString();
  const pending={...input,createdAt:input.createdAt||now,updatedAt:now};
  localStorage.setItem(key(input.invoiceReference),JSON.stringify(pending));
  return pending;
}

export function clearPendingPayment(invoiceReference:string):void{
  localStorage.removeItem(key(invoiceReference));
}
