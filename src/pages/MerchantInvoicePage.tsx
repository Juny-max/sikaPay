import {ArrowLeft,ExternalLink,ReceiptText,RefreshCw} from 'lucide-react';
import {useCallback,useEffect,useState} from 'react';
import {Link,useParams} from 'react-router-dom';
import {getInvoice} from '../api/invoices';
import {InvoiceCard} from '../components/InvoiceCard';
import {QRCodeCard} from '../components/QRCodeCard';
import {ErrorState,LoadingState} from '../components/States';
import type {Invoice} from '../types';
import {money,short} from '../utils';

export function MerchantInvoicePage(){
  const {invoiceId}=useParams(),[invoice,setInvoice]=useState<Invoice>(),[error,setError]=useState(''),[refreshing,setRefreshing]=useState(false);
  const load=useCallback(async()=>{
    setRefreshing(true);
    setError('');
    try{setInvoice(await getInvoice(invoiceId||''));}
    catch{setError('This invoice could not be found.');}
    finally{setRefreshing(false);}
  },[invoiceId]);

  useEffect(()=>{
    void load();
    const timer=window.setInterval(()=>void load(),4000);
    return()=>window.clearInterval(timer);
  },[load]);

  if(error)return <div className="shell py-12"><ErrorState message={error}/></div>;
  if(!invoice)return <div className="shell py-12"><LoadingState/></div>;

  const paid=invoice.status==='COMPLETED',payment=invoice.payment;
  return <div className="shell py-10"><Link to="/merchant" className="mb-6 inline-flex items-center gap-2 text-sm font-bold"><ArrowLeft size={17}/>Dashboard</Link><div className="mb-8 flex flex-col justify-between gap-4 text-center sm:flex-row sm:items-end sm:text-left"><div><p className="eyebrow">Live invoice</p><h1 className="mt-2 text-3xl font-extrabold">{paid?'Payment completed':'Ready for payment'}</h1><p className="mt-2 text-[#66766e]">{paid?'This invoice is closed and cannot be reused.':'Share this invoice with one customer. It will close after payment.'}</p></div><button type="button" onClick={()=>void load()} disabled={refreshing} className="btn-secondary mx-auto sm:mx-0"><RefreshCw size={17} className={refreshing?'animate-spin':''}/>Refresh</button></div><div className="mx-auto grid max-w-3xl gap-5 md:grid-cols-2"><InvoiceCard invoice={invoice}/>{paid?<div className="card p-6"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald text-white"><ReceiptText/></span><h2 className="mt-5 text-xl font-extrabold">Invoice closed</h2><p className="mt-2 text-sm leading-6 text-[#66766e]">SikaPay has recorded this payment and removed the reusable customer payment action.</p><div className="my-5 divide-y divide-black/5 rounded-2xl bg-[#f5f7f4] px-4">{[['Received',money(payment?.amountGhs||invoice.amountGhs)],['Crypto paid',payment?`${payment.amountCrypto} ${payment.token}`:'Confirmed'],['Customer',short(payment?.customerWallet)],['Transaction',short(payment?.txHash)]].map(([label,value])=><div key={label} className="flex justify-between gap-3 py-3 text-sm"><span className="text-[#66766e]">{label}</span><span className="text-right font-bold">{value}</span></div>)}</div>{payment&&<Link to={`/transaction/${payment.transactionId}`} className="btn-primary w-full">Open receipt <ExternalLink size={17}/></Link>}</div>:<QRCodeCard value={invoice.paymentUrl}/>}</div>{!paid&&<Link to={`/pay/${invoice.id}`} className="btn-primary mx-auto mt-6 flex w-fit">Open customer view <ExternalLink size={17}/></Link>}</div>;
}
