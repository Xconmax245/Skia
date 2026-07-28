'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, Shield, Wallet, Copy, Check, Home, Lock, Plus, Activity } from 'lucide-react';
import { CTAButton } from './CTAButton';
import { useWallet } from '@/lib/walletContext';
import { useCopyToast } from '@/lib/useShuffleText';
import { motion } from 'framer-motion';

const LANDING_LINKS = [
  { name: 'Protocol', href: '/#protocol' },
  { name: 'Mechanics', href: '/#mechanics' },
  { name: 'Build', href: '/#build' },
];

const APP_LINKS = [
  { name: 'Dashboard', href: '/app/dashboard', icon: Home },
  { name: 'Liquidator Desk', href: '/app/liquidator', accent: 'var(--lime)', icon: Lock },
  { name: 'Hedge Desk', href: '/app/hedge', accent: 'var(--peach)', icon: Shield },
  { name: 'Settlement Feed', href: '/app/settlement', accent: 'var(--lime)', icon: Activity },
];

function truncate(addr: string) {
  return `${addr.slice(0, 6)}···${addr.slice(-4)}`;
}

function WalletPill() {
  const { address, connected, connect, status } = useWallet();
  const { copy, copied } = useCopyToast(address ?? '');
  const router = useRouter();

  if (!connected) {
    return (
      <button
        onClick={status === 'idle' || status === 'error' ? connect : () => router.push('/app')}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '8px 16px', borderRadius: 999,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)',
          color: 'rgba(255,255,255,0.65)',
          fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        <Wallet size={14} />
        {status === 'connecting' ? 'Connecting…' : 'Connect'}
      </button>
    );
  }

  return (
    <button
      onClick={copy}
      title="Copy address"
      style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '8px 16px', borderRadius: 999,
        background: 'rgba(184,242,78,0.08)',
        border: '1px solid rgba(184,242,78,0.2)',
        color: 'var(--lime)',
        fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--lime)', flexShrink: 0 }} />
      {truncate(address!)}
      {copied ? <Check size={12} /> : <Copy size={12} style={{ opacity: 0.6 }} />}
    </button>
  );
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const isApp = pathname.startsWith('/app');
  const links = isApp ? APP_LINKS : LANDING_LINKS;

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -20, x: "-50%", filter: 'blur(6px)' }}
        animate={{ opacity: 1, y: 0, x: "-50%", filter: 'blur(0px)' }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className={`navbar ${isApp ? 'desktop-only' : ''}`}
        style={{ background: scrolled ? 'rgba(15,15,15,0.96)' : 'rgba(15,15,15,0.75)' }}
      >
        {/* Logo */}
        <Link href="/" className="nav-logo" style={{ textDecoration: 'none', marginRight: 16 }}>
          <img src="/logo.png" alt="Skia Logo" style={{ height: 28, width: 'auto', objectFit: 'contain' }} />
        </Link>

        {/* Desktop nav links */}
        <nav className="nav-links" style={{ display: 'none' }}>
          {links.map(l => {
            const active = isApp && (pathname === l.href || pathname.startsWith(l.href + '/'));
            return (
              <Link 
                key={l.name} 
                href={l.href} 
                className="nav-link"
                style={active ? { color: '#fff', fontWeight: 600 } : {}}
              >
                {l.name}
              </Link>
            );
          })}
          {isApp && (
            <Link href="/app/how-it-works" className="nav-link" style={pathname.startsWith('/app/how-it-works') ? { color: '#fff', fontWeight: 600 } : {}}>
              How It Works
            </Link>
          )}
        </nav>

        {/* Right CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {isApp ? (
            <WalletPill />
          ) : (
            <CTAButton variant="lime" label="Launch App" href="/app" icon />
          )}

          {!isApp && (
            <button
              className="nav-hamburger"
              aria-label="Toggle menu"
              onClick={() => setMobileOpen(o => !o)}
              style={{ display: 'none', color: 'white', padding: 6, cursor: 'pointer', background: 'transparent', border: 'none' }}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          )}
        </div>
      </motion.header>

      {/* Mobile drawer (landing only) */}
      {!isApp && mobileOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99,
          background: 'rgba(15,15,15,0.98)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 32,
          paddingTop: 80,
        }}>
          {LANDING_LINKS.map(l => (
            <Link key={l.name} href={l.href}
              onClick={() => setMobileOpen(false)}
              style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', textDecoration: 'none' }}
            >{l.name}</Link>
          ))}
          <div onClick={() => setMobileOpen(false)}><CTAButton variant="lime" label="Launch App" href="/app" icon /></div>
        </div>
      )}

      {/* Floating Bottom Nav (app only, mobile only) */}
      {isApp && (
        <div className="mobile-only app-bottom-nav">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
              {APP_LINKS.map(l => {
                const active = pathname === l.href || pathname.startsWith(l.href + '/');
                const Icon = l.icon;
                return (
                  <Link key={l.name} href={l.href} style={{ color: active ? 'var(--lime)' : 'rgba(255,255,255,0.3)', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <Icon size={20} />
                  </Link>
                );
              })}
            </div>
            
            {/* Elevated circular action button */}
            <Link href={pathname.includes('/liquidator') ? "/app/liquidator" : "/app/hedge"} style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--lime)', color: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', boxShadow: '0 8px 24px rgba(184,242,78,0.3)' }}>
              <Plus size={24} />
            </Link>
          </div>
        </div>
      )}

      <style>{`
        @media (min-width: 768px) {
          .nav-links { display: flex !important; }
          .mobile-only { display: none !important; }
        }
        @media (max-width: 767px) {
          .nav-hamburger { display: block !important; }
          .desktop-only { display: none !important; }
        }
        
        .app-bottom-nav {
          position: fixed;
          bottom: 24px;
          left: 16px;
          right: 16px;
          background: var(--ink);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 999px;
          z-index: 100;
          box-shadow: 0 12px 48px rgba(0,0,0,0.6);
        }
      `}</style>
    </>
  );
}
