'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/lib/walletContext';

export function RequireWallet({ children }: { children: React.ReactNode }) {
  const { connected, status } = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (status !== 'connecting' && !connected) {
      router.push('/app');
    }
  }, [connected, status, router]);

  if (!connected) {
    return null;
  }

  return <>{children}</>;
}
