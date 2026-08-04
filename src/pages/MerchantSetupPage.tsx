import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveMerchant } from '../api/merchants';

export function MerchantSetupPage() {
  const navigate = useNavigate(); const [loading, setLoading] = useState(false), [error, setError] = useState('');
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setLoading(true); setError(''); const form = new FormData(event.currentTarget); try { await saveMerchant({ businessName: String(form.get('businessName')), momoPhone: String(form.get('momoPhone')) }); navigate('/merchant'); } catch (e) { setError(e instanceof Error ? e.message : 'Could not save merchant profile'); } finally { setLoading(false); } };
  return <div className="shell py-12"><form onSubmit={submit} className="card mx-auto max-w-lg space-y-5 p-7 sm:p-9"><div><p className="eyebrow">One last step</p><h1 className="mt-2 text-3xl font-extrabold">Set up your store</h1><p className="mt-2 text-sm text-[#66766e]">Payments will be settled to this Mobile Money account.</p></div><div><label className="label">Business name</label><input name="businessName" className="input" required minLength={2} /></div><div><label className="label">MTN Mobile Money number</label><input name="momoPhone" className="input" required placeholder="+233241234567" pattern="\+?233[0-9]{9}" /></div>{error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<button className="btn-primary w-full" disabled={loading}>{loading ? 'Saving…' : 'Open dashboard'}</button></form></div>;
}
