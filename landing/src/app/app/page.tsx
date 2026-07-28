'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, AlertTriangle, ExternalLink } from 'lucide-react';
import { useWallet } from '@/lib/walletContext';
import { fadeUp, stagger, springPop } from '@/lib/motion';

export default function WalletGate() {
  const { status, errorMsg, connect, connected } = useWallet();
  const router = useRouter();

  /* Auto-advance once connected */
  useEffect(() => {
    if (connected) {
      const t = setTimeout(() => router.push('/app/dashboard'), 600);
      return () => clearTimeout(t);
    }
  }, [connected, router]);

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        style={{ maxWidth: 440, width: '100%', textAlign: 'center' }}
      >
        {/* Shield icon with pulse glow ring */}
        <motion.div variants={fadeUp} style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
          <div style={{ position: 'relative', display: 'inline-flex' }}>
            {/* Pulse rings */}
            {status !== 'connected' && (
              <>
                {[1, 2].map(i => (
                  <div
                    key={i}
                    style={{
                      position: 'absolute', inset: `-${i * 16}px`,
                      borderRadius: '50%',
                      border: '1px solid rgba(184,242,78,0.15)',
                      animation: `pulse-glow ${2 + i * 0.5}s ease-in-out infinite`,
                      animationDelay: `${i * 0.3}s`,
                    }}
                  />
                ))}
              </>
            )}
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: status === 'connected'
                ? 'linear-gradient(145deg, rgba(184,242,78,0.25), rgba(184,242,78,0.08))'
                : 'linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
              border: status === 'connected' ? '1.5px solid rgba(184,242,78,0.4)' : '1.5px solid rgba(255,255,255,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.4s ease',
              boxShadow: status === 'connected' ? '0 0 32px rgba(184,242,78,0.2)' : 'none',
            }}>
              <Shield size={36} color={status === 'connected' ? 'var(--lime)' : 'rgba(255,255,255,0.7)'} strokeWidth={1.5} />
            </div>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1 variants={fadeUp} style={{
          fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 5vw, 2.6rem)',
          fontWeight: 900, textTransform: 'uppercase', lineHeight: 1.05,
          marginBottom: 12, color: '#fff',
        }}>
          {status === 'connected' ? 'Wallet Connected' : 'Connect your wallet'}
        </motion.h1>

        {/* Sub */}
        <motion.p variants={fadeUp} style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: 36 }}>
          {status === 'connected'
            ? 'Routing to dashboard…'
            : 'Sepolia Testnet · iExec Nox TEE-attested transactions'}
        </motion.p>

        {/* Error state */}
        <AnimatePresence>
          {(status === 'error' || status === 'no-wallet') && errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              style={{
                padding: '14px 18px',
                borderRadius: 12,
                background: 'rgba(242,201,160,0.08)',
                border: '1px solid rgba(242,201,160,0.25)',
                marginBottom: 20,
                display: 'flex', alignItems: 'flex-start', gap: 10, textAlign: 'left',
              }}
            >
              <AlertTriangle size={15} color="var(--peach)" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ color: 'var(--peach)', fontWeight: 600, fontSize: '0.875rem' }}>{errorMsg}</div>
                {status === 'no-wallet' && (
                  <a
                    href="https://metamask.io/download/"
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem', marginTop: 6, textDecoration: 'underline' }}
                  >
                    Download MetaMask <ExternalLink size={11} />
                  </a>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CTA button */}
        <motion.div variants={fadeUp}>
          <AnimatePresence mode="wait">
            {status !== 'connected' && (
              <motion.button
                key="connect-btn"
                onClick={connect}
                disabled={status === 'connecting'}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={springPop}
                style={{
                  width: '100%', padding: '16px 32px',
                  borderRadius: 999,
                  background: status === 'connecting'
                    ? 'rgba(184,242,78,0.3)'
                    : 'var(--lime)',
                  color: '#0f0f0f', fontWeight: 700, fontSize: '1rem',
                  border: 'none', cursor: status === 'connecting' ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  transition: 'background 0.2s ease',
                }}
              >
                {status === 'connecting' ? (
                  <>
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{ animation: 'rotate-slow 0.9s linear infinite' }}>
                      <path d="M21 12a9 9 0 11-6.219-8.56" />
                    </svg>
                    Requesting accounts…
                  </>
                ) : (
                  <>{status === 'error' || status === 'no-wallet' ? 'Try Again' : 'Connect Wallet'}</>
                )}
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Keyboard hint */}
        <motion.div variants={fadeUp} style={{ marginTop: 24, fontSize: '0.75rem', color: 'rgba(255,255,255,0.22)' }}>
          Press <kbd style={{ fontFamily: 'monospace', padding: '1px 5px', borderRadius: 4, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>⌘K</kbd> to open command palette
        </motion.div>
      </motion.div>
    </div>
  );
}
