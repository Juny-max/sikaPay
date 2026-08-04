import type {Session} from '@supabase/supabase-js';import type {MobileMoneyNetwork} from './index';
export interface MerchantUser{id:string;email:string;fullName:string;phone?:string;walletAddress?:`0x${string}`}
export interface MerchantProfile{id:string;userId:string;businessName:string;momoPhone:string;momoNetwork:'MTN';createdAt:string}
export interface MerchantSignUpInput{businessName:string;ownerName:string;email:string;password:string;confirmPassword:string;phone:string;momoNetwork:MobileMoneyNetwork;momoNumber:string;acceptTerms:boolean}
export interface MerchantSignInInput{email:string;password:string;rememberMe:boolean}
export interface MerchantProfileUpdate{businessName:string;momoPhone:string;walletAddress?:`0x${string}`}
export interface AuthResult{user:MerchantUser;merchant:MerchantProfile|null;session:Session|null;requiresEmailConfirmation?:boolean}
