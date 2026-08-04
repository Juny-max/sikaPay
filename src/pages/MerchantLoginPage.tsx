import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';

export function MerchantLoginPage() {
  const navigate = useNavigate();
  const [signup, setSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setLoading(true); setError('');
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email')), password = String(form.get('password'));
    const result = signup
      ? await supabase.auth.signUp({ email, password, options: { data: { full_name: String(form.get('name')), role: 'merchant' } } })
      : await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (result.error) return setError(result.error.message);
    navigate(signup ? '/merchant/setup' : '/merchant');
  };
  return <div className="shell py-12"><div className="card mx-auto max-w-md p-7 sm:p-9"><p className="eyebrow">Merchant portal</p><h1 className="mt-2 text-3xl font-extrabold">{signup ? 'Create your account' : 'Welcome back'}</h1><p className="mt-2 text-sm text-[#66766e]">Manage crypto payments and receive Ghana Cedis through Mobile Money.</p><form onSubmit={submit} className="mt-7 space-y-4">{signup && <div><label className="label">Full name</label><input className="input" name="name" required /></div>}<div><label className="label">Email</label><input className="input" name="email" type="email" required /></div><div><label className="label">Password</label><input className="input" name="password" type="password" minLength={8} required /></div>{error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<button className="btn-primary w-full" disabled={loading}>{loading ? 'Please wait…' : signup ? 'Create merchant account' : 'Sign in'}</button></form><button onClick={() => { setSignup(!signup); setError(''); }} className="mt-5 w-full text-sm font-bold text-forest">{signup ? 'Already registered? Sign in' : 'New merchant? Create an account'}</button></div></div>;
}
