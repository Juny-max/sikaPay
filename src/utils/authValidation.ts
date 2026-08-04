export const emailPattern=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const ghanaPhonePattern=/^0\d{9}$/;
export const walletPattern=/^0x[a-fA-F0-9]{40}$/;
export const strongPasswordPattern=/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
export type FormErrors=Record<string,string>;
export const required=(value:string,label:string)=>value.trim()?undefined:`${label} is required.`;
export const validatePassword=(value:string)=>strongPasswordPattern.test(value)?undefined:'Use 8+ characters with uppercase, lowercase, number and symbol.';
