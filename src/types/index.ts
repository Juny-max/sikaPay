export type SupportedToken='ETH'|'USDC';
export type MobileMoneyNetwork='MTN'|'TELECEL'|'AT';
export type PaymentStatus='AWAITING_PAYMENT'|'BLOCKCHAIN_CONFIRMING'|'CRYPTO_CONFIRMED'|'PROCESSING_MOMO'|'COMPLETED'|'FAILED';
export type BlockchainStatus='PENDING'|'CONFIRMING'|'CONFIRMED'|'FAILED'; export type PayoutStatus='PENDING'|'PROCESSING'|'SUCCESS'|'FAILED';
export interface Merchant {id:string;name:string;phone:string;network:MobileMoneyNetwork}
export interface Invoice {id:string;reference?:string;onchainId?:`0x${string}`;onchainCreationTxHash?:`0x${string}`;merchantId:string;merchantName:string;merchantPhone:string;network:MobileMoneyNetwork;amountGhs:number;description:string;status:PaymentStatus;expiresAt:string;paymentUrl:string;qrPayload?:string;createdAt?:string}
export interface Payment {transactionId:string;invoiceId:string;status:PaymentStatus;blockchainStatus:BlockchainStatus;payoutStatus:PayoutStatus;amountCrypto:string;token:SupportedToken;amountGhs:number;txHash?:string;momoReference?:string;customerWallet?:string;createdAt:string;merchantName?:string}
export interface PreparedPayment {transactionId:string;invoiceId:string;token:SupportedToken;amountCrypto:string;amountGhs:number;exchangeRate:number;contractAddress:`0x${string}`;recipientAddress:`0x${string}`}
