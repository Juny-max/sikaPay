import '@rainbow-me/rainbowkit/styles.css';
import {getDefaultConfig,RainbowKitProvider} from '@rainbow-me/rainbowkit';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {MotionConfig} from 'motion/react';
import type {PropsWithChildren} from 'react';
import {WagmiProvider,createConfig,http} from 'wagmi';
import {sepolia} from 'wagmi/chains';
import {injected} from 'wagmi/connectors';
import {AuthProvider} from '../context/AuthContext';

const projectId=import.meta.env.VITE_WALLETCONNECT_PROJECT_ID?.trim();

// WalletConnect needs a real Reown project ID. Until one is configured, use
// injected browser wallets without making failing requests to Reown services.
const config=projectId
  ? getDefaultConfig({appName:'SikaPay',projectId,chains:[sepolia],ssr:false})
  : createConfig({
      chains:[sepolia],
      connectors:[injected()],
      transports:{[sepolia.id]:http()},
    });

const queryClient=new QueryClient({defaultOptions:{queries:{retry:1}}});

export function AppProviders({children}:PropsWithChildren){return <WagmiProvider config={config}><QueryClientProvider client={queryClient}><RainbowKitProvider><MotionConfig reducedMotion="user"><AuthProvider>{children}</AuthProvider></MotionConfig></RainbowKitProvider></QueryClientProvider></WagmiProvider>}
