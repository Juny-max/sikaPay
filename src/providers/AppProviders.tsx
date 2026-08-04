import '@rainbow-me/rainbowkit/styles.css';
import {getDefaultConfig,RainbowKitProvider} from '@rainbow-me/rainbowkit';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {MotionConfig} from 'motion/react';import type {PropsWithChildren} from 'react';
import {WagmiProvider} from 'wagmi';import {sepolia} from 'wagmi/chains';
const config=getDefaultConfig({appName:'SikaPay',projectId:import.meta.env.VITE_WALLETCONNECT_PROJECT_ID||'demo-project-id',chains:[sepolia],ssr:false});
const queryClient=new QueryClient({defaultOptions:{queries:{retry:1}}});
export function AppProviders({children}:PropsWithChildren){return <WagmiProvider config={config}><QueryClientProvider client={queryClient}><RainbowKitProvider><MotionConfig reducedMotion="user">{children}</MotionConfig></RainbowKitProvider></QueryClientProvider></WagmiProvider>}
