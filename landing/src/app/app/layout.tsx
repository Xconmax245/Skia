import type { Metadata } from 'next';
import { AppShell } from '@/components/AppShell';

export const metadata: Metadata = {
  title: 'Skia App — Confidential Credit Infrastructure',
  description: 'Sealed-bid liquidation auctions and private credit-default hedging for Aave V3 on Sepolia, powered by iExec Nox TEEs.',
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
