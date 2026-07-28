import type { Metadata } from 'next';
import './globals.css';
import './fonts.css';
import { Navbar } from '@/components/Navbar';
import { Providers } from './Providers';

export const metadata: Metadata = {
  title: 'Skia — Confidential Credit Infrastructure for Aave',
  description:
    'Sealed-bid liquidation auctions and private credit-default hedging for Aave V3, powered by iExec Nox TEEs. Zero modification to Aave. One shared settlement core.',
  keywords: ['Aave', 'iExec', 'Nox', 'DeFi', 'confidential', 'liquidation', 'TEE', 'Sepolia'],
  openGraph: {
    title: 'Skia — Confidential Credit Infrastructure',
    description: 'Sealed bids. Hidden hedges. One settlement core.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Fontshare — preconnect for zero FOUT, then load Synonym + Chillax */}
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="anonymous" />

      </head>
      <body className="font-sans antialiased bg-ink text-white">
        <Providers>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
