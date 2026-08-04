import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || env.SUPABASE_URL || ''),
      'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY || ''),
      'import.meta.env.VITE_SIKAPAY_CONTRACT_ADDRESS': JSON.stringify(env.VITE_SIKAPAY_CONTRACT_ADDRESS || env.SIKAPAY_CONTRACT_ADDRESS || ''),
      'import.meta.env.VITE_USDC_TOKEN_ADDRESS': JSON.stringify(env.VITE_USDC_TOKEN_ADDRESS || env.USDC_CONTRACT_ADDRESS || '')
    }
  };
});
