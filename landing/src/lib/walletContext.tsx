'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { createConfig, http, WagmiProvider, useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export type WalletStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'no-wallet';

interface WalletState {
  address: string | null;
  connected: boolean;
  status: WalletStatus;
  errorMsg: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const config = createConfig({
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(process.env.NEXT_PUBLIC_RPC_URL || 'https://11155111.rpc.thirdweb.com'),
  },
  connectors: [injected()],
  ssr: true,
});

const queryClient = new QueryClient();

const WalletContext = createContext<WalletState>({
  address: null,
  connected: false,
  status: 'idle',
  errorMsg: null,
  connect: async () => {},
  disconnect: () => {},
});

function WalletProviderInner({ children }: { children: React.ReactNode }) {
  const { address, isConnected, isConnecting, chainId } = useAccount();
  const { connectAsync, connectors, error: connectError } = useConnect();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();

  const [status, setStatus] = useState<WalletStatus>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isConnected) {
      if (chainId !== sepolia.id) {
        setStatus('connecting');
        setErrorMsg('Please switch to Sepolia network.');
      } else {
        setStatus('connected');
        setErrorMsg(null);
      }
    } else if (isConnecting) {
      setStatus('connecting');
    } else {
      setStatus('idle');
    }
  }, [isConnected, isConnecting, chainId]);

  const connect = useCallback(async () => {
    try {
      setStatus('connecting');
      setErrorMsg(null);
      // use the first injected connector (e.g. metamask)
      const connector = connectors.find(c => c.type === 'injected') || connectors[0];
      if (!connector) {
        setStatus('no-wallet');
        setErrorMsg('No wallet detected. Install MetaMask to continue.');
        return;
      }
      await connectAsync({ connector });
      
      // Check if we need to switch chain
      if (switchChainAsync) {
        await switchChainAsync({ chainId: sepolia.id });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      if (msg.toLowerCase().includes('rejected') || msg.includes('User rejected')) {
        setErrorMsg('Connection rejected by user.');
      } else {
        setErrorMsg('Failed to connect — please retry.');
      }
      setStatus('error');
    }
  }, [connectAsync, connectors]);

  const disconnect = useCallback(() => {
    wagmiDisconnect();
    setStatus('idle');
    setErrorMsg(null);
  }, [wagmiDisconnect]);

  return (
    <WalletContext.Provider
      value={{
        address: address ? (address as string) : null,
        connected: isConnected,
        status,
        errorMsg,
        connect,
        disconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <WalletProviderInner>{children}</WalletProviderInner>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export const useWallet = () => useContext(WalletContext);
