import type {Session,User} from '@supabase/supabase-js';
import {request} from './client';
import {isSupabaseConfigured,supabase} from '../config/supabase';
import type {AuthResult,MerchantProfile,MerchantProfileUpdate,MerchantSignInInput,MerchantSignUpInput,MerchantUser} from '../types/auth';

const PENDING_KEY='sikapay_pending_merchant';
interface BackendIdentity{user:{id:string;email?:string};merchant:MerchantProfile|null}
type MeResponse={data:BackendIdentity}|BackendIdentity;

const mapUser=(user:User):MerchantUser=>({id:user.id,email:user.email||'',fullName:String(user.user_metadata.full_name||''),phone:typeof user.user_metadata.phone==='string'?user.user_metadata.phone:undefined,walletAddress:typeof user.user_metadata.wallet_address==='string'?user.user_metadata.wallet_address as `0x${string}`:undefined});
const requireConfig=()=>{if(!isSupabaseConfigured)throw new Error('Supabase frontend configuration is missing.')};

async function loadBackendIdentity(user:User):Promise<AuthResult>{const response=await request<MeResponse>('/api/me',{auth:true});const identity='data' in response?response.data:response;if(!identity||!('merchant' in identity))throw new Error('The SikaPay API returned an invalid account response. Restart the backend and try again.');return{user:mapUser(user),merchant:identity.merchant,session:(await supabase.auth.getSession()).data.session}}
async function createMerchant(input:MerchantProfileUpdate):Promise<MerchantProfile>{const response=await request<{data:MerchantProfile}|MerchantProfile>('/api/merchants/me',{method:'PUT',auth:true,body:JSON.stringify({businessName:input.businessName,momoPhone:input.momoPhone})});const merchant='data' in response?response.data:response;if(!merchant?.id)throw new Error('The SikaPay API did not return a merchant profile.');return merchant}

export async function signUpMerchant(input:MerchantSignUpInput):Promise<AuthResult>{requireConfig();const {data,error}=await supabase.auth.signUp({email:input.email,password:input.password,options:{emailRedirectTo:`${location.origin}/merchant/signin`,data:{full_name:input.ownerName,role:'merchant',phone:input.phone,momo_network:input.momoNetwork}}});if(error)throw error;if(!data.user)throw new Error('Account creation did not return a user.');localStorage.setItem(PENDING_KEY,JSON.stringify({email:input.email.toLowerCase(),businessName:input.businessName,momoPhone:toInternationalPhone(input.momoNumber)}));if(!data.session)return{user:mapUser(data.user),merchant:null,session:null,requiresEmailConfirmation:true};const merchant=await createMerchant({businessName:input.businessName,momoPhone:toInternationalPhone(input.momoNumber)});localStorage.removeItem(PENDING_KEY);return{user:mapUser(data.user),merchant,session:data.session}}
export async function signInMerchant(input:MerchantSignInInput):Promise<AuthResult>{requireConfig();const {data,error}=await supabase.auth.signInWithPassword({email:input.email,password:input.password});if(error)throw error;let result=await loadBackendIdentity(data.user);if(!result.merchant){const pending=readPending(input.email);if(pending){result={...result,merchant:await createMerchant(pending)};localStorage.removeItem(PENDING_KEY)}}return result}
export async function signOutMerchant():Promise<void>{await supabase.auth.signOut();localStorage.removeItem(PENDING_KEY)}
export async function getCurrentMerchant():Promise<AuthResult|null>{requireConfig();const {data}=await supabase.auth.getSession();if(!data.session?.user)return null;return loadBackendIdentity(data.session.user)}
export async function isAuthenticated():Promise<boolean>{return Boolean((await supabase.auth.getSession()).data.session)}
export async function requestPasswordReset(email:string):Promise<void>{requireConfig();const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:`${location.origin}/merchant/signin`});if(error)throw error}
export async function updateMerchantProfile(input:MerchantProfileUpdate):Promise<MerchantProfile>{if(input.walletAddress){const {error}=await supabase.auth.updateUser({data:{wallet_address:input.walletAddress}});if(error)throw error}return createMerchant({...input,momoPhone:toInternationalPhone(input.momoPhone)})}
export async function completeMerchantOnboarding(input:MerchantProfileUpdate):Promise<MerchantProfile>{return updateMerchantProfile(input)}
export function onAuthStateChange(callback:(session:Session|null)=>void){return supabase.auth.onAuthStateChange((_event,session)=>callback(session)).data.subscription}

const toInternationalPhone=(phone:string)=>phone.startsWith('+233')?phone:`+233${phone.replace(/^0/,'')}`;
const readPending=(email:string):MerchantProfileUpdate|null=>{try{const value=JSON.parse(localStorage.getItem(PENDING_KEY)||'null') as {email:string;businessName:string;momoPhone:string}|null;return value?.email===email.toLowerCase()?{businessName:value.businessName,momoPhone:value.momoPhone}:null}catch{return null}};
