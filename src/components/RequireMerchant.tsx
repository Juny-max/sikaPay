import { useEffect, useState, type PropsWithChildren } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { getMe } from '../api/merchants';
import { LoadingState } from './States';

export function RequireMerchant({ children }: PropsWithChildren) {
  const [state, setState] = useState<'loading' | 'login' | 'setup' | 'ready'>('loading');
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return setState('login');
      try { setState((await getMe()).merchant ? 'ready' : 'setup'); }
      catch { setState('login'); }
    });
  }, []);
  if (state === 'loading') return <div className="shell py-12"><LoadingState label="Loading merchant account…" /></div>;
  if (state === 'login') return <Navigate to="/merchant/login" replace />;
  if (state === 'setup') return <Navigate to="/merchant/setup" replace />;
  return <>{children}</>;
}
