import {parseEther,parseUnits,ZeroAddress} from 'ethers';
import {AlertTriangle,ArrowLeft,LockKeyhole,ShieldCheck,Store} from 'lucide-react';
import {useCallback,useEffect,useState} from 'react';
import {Link,useNavigate,useParams} from 'react-router-dom';
import {useAccount,usePublicClient,useWalletClient} from 'wagmi';
import {ApiError} from '../api/client';
import {getInvoice} from '../api/invoices';
import {clearPendingPayment,readPendingPayment,savePendingPayment,type PendingPayment} from '../api/pendingPayments';
import {preparePayment,reconcilePayment,submitPayment} from '../api/payments';
import {ConnectWalletButton} from '../components/ConnectWalletButton';
import {PaymentSummaryCard} from '../components/PaymentSummaryCard';
import {ErrorState,LoadingState} from '../components/States';
import {TokenSelector} from '../components/TokenSelector';
import {chainId,contractAddress,isMockMode,usdcAddress} from '../config/blockchain';
import {sikaPayAbi,usdcAbi} from '../config/contracts';
import {mockStore} from '../mocks/store';
import type {Invoice,Payment,SupportedToken} from '../types';
import {maskPhone,money,networkName,short} from '../utils';

const walletError=(error:unknown)=>{
  if(error instanceof ApiError){
    const messages:Record<string,string>={
      INVOICE_EXPIRED:'This invoice expired before verification completed.',
      INVOICE_ALREADY_PAID:'This invoice has already been paid.',
      UNDERPAYMENT:'The confirmed transaction did not cover the invoice amount.',
      PAYMENT_EVENT_NOT_FOUND:'SikaPay has not found the onchain payment yet. Keep this page open for a moment.',
      TRANSACTION_REVERTED:'The blockchain transaction was reverted.',
      UNSUPPORTED_PAYMENT_TOKEN:'The payment used an unsupported token.',
      RPC_NOT_CONFIGURED:'Backend blockchain verification is not configured.'
    };
    return messages[error.code]||error.message;
  }
  const message=error instanceof Error?error.message:'';
  if(/rejected|denied/i.test(message))return 'Payment was rejected in your wallet. No funds were sent.';
  if(/insufficient/i.test(message))return 'Your wallet does not have enough balance for this payment and network fee.';
  if(/wrong network|switch.*network|chain id|current chain/i.test(message))return 'Please switch your wallet to Ethereum Sepolia and try again.';
  if(message)return message;
  return 'The blockchain transaction failed. No Mobile Money payout was started.';
};

const isRejected=(error:unknown)=>/rejected|denied/i.test(error instanceof Error?error.message:'');
type OnchainInvoiceTuple=readonly [`0x${string}`,boolean,boolean,`0x${string}`,bigint];
type OnchainInvoiceObject={merchantId:`0x${string}`;exists:boolean;paid:boolean;payer:`0x${string}`;paidAt:bigint};
const normalizeOnchainInvoice=(value:unknown):{exists:boolean;paid:boolean}=>{
  if(Array.isArray(value)){const invoice=value as unknown as OnchainInvoiceTuple;return {exists:Boolean(invoice[1]),paid:Boolean(invoice[2])};}
  if(value&&typeof value==='object'){
    const invoice=value as Partial<OnchainInvoiceObject>;
    return {exists:Boolean(invoice.exists),paid:Boolean(invoice.paid)};
  }
  return {exists:false,paid:false};
};
const preflightInvoice=async(publicClient:ReturnType<typeof usePublicClient>,invoiceId:`0x${string}`)=>{
  if(!publicClient)return;
  const result=normalizeOnchainInvoice(await publicClient.readContract({address:contractAddress,abi:sikaPayAbi,functionName:'getInvoice',args:[invoiceId]}));
  if(!result.exists)throw new Error('This invoice was not created onchain. Ask the merchant to generate a new payment request.');
  if(result.paid)throw new Error('This invoice has already been paid onchain. Ask the merchant to refresh their dashboard.');
};

export function PaymentPage(){
  const {invoiceId}=useParams(),navigate=useNavigate(),{address,isConnected,chain}=useAccount(),{data:wallet}=useWalletClient(),publicClient=usePublicClient();
  const [invoice,setInvoice]=useState<Invoice>(),[loading,setLoading]=useState(true),[error,setError]=useState(''),[token,setToken]=useState<SupportedToken>('ETH'),[submitting,setSubmitting]=useState(false),[walletState,setWalletState]=useState(''),[pending,setPending]=useState<PendingPayment>(),[txHashInput,setTxHashInput]=useState(''),[reconcileAttempts,setReconcileAttempts]=useState(0);

  const load=useCallback(()=>{
    setLoading(true);
    setError('');
    getInvoice(invoiceId||'').then((fresh)=>{
      setInvoice(fresh);
      if(fresh.status==='COMPLETED'&&fresh.payment)navigate(`/transaction/${fresh.payment.transactionId}`,{replace:true});
    }).catch(e=>setError(e instanceof Error?e.message:'Invoice unavailable')).finally(()=>setLoading(false));
  },[invoiceId,navigate]);

  useEffect(load,[load]);

  const verifyPending=useCallback(async(payment:PendingPayment)=>{
    if(!payment.txHash)return;
    setSubmitting(true);
    setError('');
    setWalletState('Resuming payment verification');
    try{
      savePendingPayment({...payment,stage:'verifying'});
      if(publicClient){
        const receipt=await publicClient.waitForTransactionReceipt({hash:payment.txHash,confirmations:1});
        if(receipt.status!=='success')throw new Error('Transaction reverted');
      }
      const confirmed=await submitPayment({invoiceReference:payment.invoiceReference,txHash:payment.txHash,senderAddress:payment.senderAddress,asset:payment.token,cryptoAmount:payment.amountCrypto});
      clearPendingPayment(payment.invoiceReference);
      navigate(`/transaction/${confirmed.transactionId}`,{replace:true});
    }catch(e){
      setError(walletError(e));
      setSubmitting(false);
      setWalletState('');
      setPending(readPendingPayment(payment.invoiceReference));
    }
  },[navigate,publicClient]);

  useEffect(()=>{
    const reference=invoice?.reference||invoice?.id;
    if(!reference||isMockMode)return;
    const restored=readPendingPayment(reference);
    setPending(restored);
    if(restored?.txHash)void verifyPending(restored);
  },[invoice,verifyPending]);

  useEffect(()=>{
    const reference=invoice?.reference||invoice?.id;
    if(!reference||isMockMode||!pending||pending.txHash)return;
    let active=true;
    const reconcile=async()=>{
      try{
        setWalletState('Checking for completed wallet payment');
        const confirmed=await reconcilePayment(reference);
        if(!active)return;
        clearPendingPayment(reference);
        navigate(`/transaction/${confirmed.transactionId}`,{replace:true});
      }catch{
        if(active){setReconcileAttempts(count=>count+1);setWalletState('');}
      }
    };
    void reconcile();
    const timer=window.setInterval(reconcile,5000);
    return()=>{active=false;window.clearInterval(timer)};
  },[invoice,navigate,pending]);

  if(loading)return <div className="shell py-12"><LoadingState label="Fetching secure invoice..."/></div>;
  if(error&&!invoice)return <div className="shell py-12"><ErrorState message={error} onRetry={load}/></div>;
  if(!invoice)return <div className="shell py-12"><ErrorState message="This invoice is invalid."/></div>;

  const reference=invoice.reference||invoice.id,expired=new Date(invoice.expiresAt)<new Date(),paid=invoice.status==='COMPLETED',wrongNetwork=isConnected&&chain?.id!==chainId,hasOpenWalletPayment=!!pending&&!pending.txHash;

  const confirm=async()=>{
    if(expired||paid||submitting||hasOpenWalletPayment)return;
    setSubmitting(true);
    setError('');
    try{
      const prepared=await preparePayment(invoice,token);
      const amount=token==='ETH'?parseEther(prepared.amountCrypto):parseUnits(prepared.amountCrypto,6);
      if(isMockMode){
        const payment:Payment={transactionId:prepared.transactionId,invoiceId:invoice.id,status:'BLOCKCHAIN_CONFIRMING',blockchainStatus:'CONFIRMING',payoutStatus:'PENDING',amountCrypto:prepared.amountCrypto,token,amountGhs:invoice.amountGhs,customerWallet:address||'0xDemo9E45b8847d8322A5fA52A5f4D9C9b2a8',createdAt:new Date().toISOString(),merchantName:invoice.merchantName};
        mockStore.savePayment(payment);
        navigate(`/transaction/${prepared.transactionId}`);
        return;
      }
      if(!wallet||!publicClient||!address)throw new Error('Wallet is not connected');
      if(chain?.id!==chainId)throw new Error('Wrong network');
      if(!invoice.onchainId)throw new Error('Invoice is missing its onchain identifier');
      if(contractAddress===ZeroAddress)throw new Error('SikaPay contract is not configured');
      setWalletState('Checking invoice onchain');
      await preflightInvoice(publicClient,invoice.onchainId);
      let txHash:`0x${string}`;
      if(token==='USDC'){
        if(usdcAddress===ZeroAddress)throw new Error('USDC token is not configured');
        setWalletState('Approve USDC in your wallet');
        const approval=await wallet.writeContract({account:address,chain,address:usdcAddress,abi:usdcAbi,functionName:'approve',args:[contractAddress,amount]});
        setWalletState('Confirming USDC approval');
        const approvalReceipt=await publicClient.waitForTransactionReceipt({hash:approval});
        if(approvalReceipt.status!=='success')throw new Error('USDC approval reverted');
        setWalletState('Approve the SikaPay payment');
        const saved=savePendingPayment({invoiceReference:reference,token,amountCrypto:prepared.amountCrypto,senderAddress:address,stage:'wallet_opened'});
        setPending(saved);
        txHash=await wallet.writeContract({account:address,chain,address:contractAddress,abi:sikaPayAbi,functionName:'payInvoice',args:[invoice.onchainId,usdcAddress,amount]});
      }else{
        setWalletState('Approve the ETH payment');
        const saved=savePendingPayment({invoiceReference:reference,token,amountCrypto:prepared.amountCrypto,senderAddress:address,stage:'wallet_opened'});
        setPending(saved);
        txHash=await wallet.writeContract({account:address,chain,address:contractAddress,abi:sikaPayAbi,functionName:'payInvoice',args:[invoice.onchainId,ZeroAddress,amount],value:amount});
      }
      const saved=savePendingPayment({invoiceReference:reference,token,amountCrypto:prepared.amountCrypto,senderAddress:address,txHash,stage:'tx_submitted',createdAt:pending?.createdAt});
      setPending(saved);
      setWalletState('Confirming on Ethereum Sepolia');
      await verifyPending(saved);
    }catch(e){
      if(isRejected(e))clearPendingPayment(reference);
      setPending(readPendingPayment(reference));
      setError(walletError(e));
      setSubmitting(false);
      setWalletState('');
    }
  };

  const resumeFromHash=()=>{
    const hash=txHashInput.trim();
    if(!/^0x[a-fA-F0-9]{64}$/.test(hash)){
      setError('Paste the full transaction hash from MetaMask. It starts with 0x and is 66 characters long.');
      return;
    }
    if(!pending)return;
    const saved=savePendingPayment({...pending,txHash:hash as `0x${string}`,stage:'tx_submitted'});
    setPending(saved);
    void verifyPending(saved);
  };

  const clearUnsubmitted=()=>{
    clearPendingPayment(reference);
    setPending(undefined);
    setError('');
    setWalletState('');
  };

  return <div className="shell py-8"><Link to="/pay" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-forest"><ArrowLeft size={17}/>Choose another invoice</Link><div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_.8fr]"><div className="space-y-5"><div className="card p-6 sm:p-8"><div className="flex items-start justify-between"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-forest text-white"><Store/></span><span className="rounded-full bg-emerald/10 px-3 py-1 text-xs font-bold text-emerald">{reference}</span></div><p className="mt-7 text-sm text-[#66766e]">Paying</p><h1 className="mt-1 text-3xl font-extrabold">{invoice.merchantName}</h1><p className="mt-2 text-[#66766e]">{invoice.description}</p><div className="my-6 border-t border-black/5"/><p className="text-sm text-[#66766e]">Amount requested</p><p className="amount mt-1 text-4xl font-extrabold text-forest">{money(invoice.amountGhs)}</p><p className="mt-5 rounded-2xl bg-[#e9f5ed] p-4 text-sm font-semibold leading-6 text-forest">{invoice.merchantName} will receive {money(invoice.amountGhs)} directly through {networkName(invoice.network)}.</p><div className="mt-4 flex justify-between text-xs text-[#718078]"><span>Expires {new Date(invoice.expiresAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span><span>{maskPhone(invoice.merchantPhone)}</span></div></div><div className="card p-6"><label className="label">Choose how to pay</label><TokenSelector value={token} onChange={setToken}/></div></div><div className="space-y-5"><PaymentSummaryCard invoice={invoice} token={token}/><div className="card p-6"><ConnectWalletButton/>{pending&&<div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><div className="flex gap-3"><ShieldCheck size={18} className="mt-0.5 shrink-0"/><div><p className="font-extrabold">Payment already started</p><p className="mt-1 leading-6">{pending.txHash?`SikaPay is verifying ${short(pending.txHash)}.`:reconcileAttempts>=3?'If MetaMask shows this payment completed, paste the transaction hash so SikaPay can verify it immediately.':'MetaMask was opened for this invoice. SikaPay is checking for the completed payment.'}</p></div></div>{!pending.txHash&&<div className="mt-4 space-y-3"><input className="input" value={txHashInput} onChange={e=>setTxHashInput(e.target.value)} placeholder="Paste transaction hash from MetaMask"/><button type="button" onClick={resumeFromHash} disabled={submitting} className="btn-primary w-full">Verify existing payment</button><button type="button" onClick={clearUnsubmitted} disabled={submitting} className="btn-secondary w-full">I did not submit in wallet</button></div>}</div>}{isMockMode&&!isConnected&&<p className="mt-3 text-center text-xs text-[#68776f]">No wallet installed? The demo payment can still continue securely.</p>}<button onClick={confirm} disabled={expired||paid||submitting||wrongNetwork||(!isConnected&&!isMockMode)||hasOpenWalletPayment} className="btn-primary mt-3 w-full">{walletState||(submitting?'Preparing transaction...':expired?'Invoice expired':paid?'Already paid':hasOpenWalletPayment?'Waiting for existing wallet payment':'Confirm payment')}</button><p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-[#75837c]"><LockKeyhole size={13}/>Success appears only after backend verification.</p>{error&&<p role="alert" className="mt-3 flex gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700"><AlertTriangle size={17}/>{error}</p>}</div></div></div></div>;
}
