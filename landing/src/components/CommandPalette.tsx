'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Lock, FileText, HelpCircle, Wallet, Radio,
  ArrowRight, Shield, Search,
} from 'lucide-react';
import { useWallet } from '@/lib/walletContext';

interface Cmd {
  id: string;
  group: string;
  label: string;
  sub?: string;
  icon: React.ReactNode;
  action: 'navigate' | 'wallet' | 'network';
  href?: string;
}

function buildCommands(connect: () => void, router: ReturnType<typeof useRouter>): Cmd[] {
  return [
    {
      id: 'liquidator', group: 'Navigate', label: 'Liquidator Desk',
      sub: 'Sealed-bid Vickrey auction',
      icon: <Lock size={14} />, action: 'navigate', href: '/app/liquidator',
    },
    {
      id: 'hedge', group: 'Navigate', label: 'Hedge Desk',
      sub: 'Confidential CDS intents',
      icon: <Shield size={14} />, action: 'navigate', href: '/app/hedge',
    },
    {
      id: 'settlement', group: 'Navigate', label: 'Settlement Feed',
      sub: 'Public on-chain ledger',
      icon: <FileText size={14} />, action: 'navigate', href: '/app/settlement',
    },
    {
      id: 'how', group: 'Navigate', label: 'How It Works',
      sub: 'Interactive mechanism explainer',
      icon: <HelpCircle size={14} />, action: 'navigate', href: '/app/how-it-works',
    },
    {
      id: 'connect', group: 'Wallet', label: 'Connect Wallet',
      sub: 'eth_requestAccounts · MetaMask',
      icon: <Wallet size={14} />, action: 'wallet',
    },
    {
      id: 'sepolia', group: 'Network', label: 'Switch to Sepolia',
      sub: 'Chain ID 11155111',
      icon: <Radio size={14} />, action: 'network',
    },
  ];
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const router = useRouter();
  const { connect } = useWallet();

  const cmds = buildCommands(connect, router);

  const filtered = query.trim()
    ? cmds.filter(c => c.label.toLowerCase().includes(query.toLowerCase()) || (c.sub ?? '').toLowerCase().includes(query.toLowerCase()))
    : cmds;

  const run = useCallback((cmd: Cmd) => {
    setOpen(false);
    setQuery('');
    if (cmd.action === 'navigate' && cmd.href) router.push(cmd.href);
    if (cmd.action === 'wallet') connect();
    if (cmd.action === 'network') {
      // @ts-ignore
      window.ethereum?.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0xaa36a7' }] }).catch(() => {});
    }
  }, [router, connect]);

  /* Keyboard shortcut */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(v => !v);
        setQuery('');
        setSelected(0);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  /* Arrow nav */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(v => Math.min(v + 1, filtered.length - 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(v => Math.max(v - 1, 0)); }
      if (e.key === 'Enter' && filtered[selected]) run(filtered[selected]);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, filtered, selected, run]);

  /* Group */
  const groups = [...new Set(filtered.map(c => c.group))];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="cmdk-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <motion.div
            className="cmdk-panel"
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
          >
            {/* Input */}
            <div className="cmdk-input-wrap">
              <Search size={16} style={{ color: 'rgba(255,255,255,0.35)', flexShrink: 0 }} />
              <input
                className="cmdk-input"
                placeholder="Search commands…"
                value={query}
                onChange={e => { setQuery(e.target.value); setSelected(0); }}
                autoFocus
              />
              <kbd style={{ padding: '2px 7px', borderRadius: 5, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>ESC</kbd>
            </div>

            {/* Results */}
            <div className="cmdk-list">
              {groups.map(group => (
                <div key={group}>
                  <div className="cmdk-group-heading">{group}</div>
                  {filtered.filter(c => c.group === group).map((cmd, i) => {
                    const globalIdx = filtered.indexOf(cmd);
                    return (
                      <div
                        key={cmd.id}
                        className="cmdk-item"
                        style={{ background: globalIdx === selected ? 'rgba(255,255,255,0.07)' : undefined }}
                        onClick={() => run(cmd)}
                        onMouseEnter={() => setSelected(globalIdx)}
                      >
                        <div className="cmdk-item-icon" style={{ color: 'var(--lime)' }}>{cmd.icon}</div>
                        <div style={{ flex: 1 }}>
                          <div>{cmd.label}</div>
                          {cmd.sub && <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.38)', marginTop: 1 }}>{cmd.sub}</div>}
                        </div>
                        <ArrowRight size={13} style={{ color: 'rgba(255,255,255,0.25)' }} />
                      </div>
                    );
                  })}
                </div>
              ))}
              {filtered.length === 0 && (
                <div style={{ padding: '20px 12px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.875rem' }}>
                  No commands match "{query}"
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '8px 18px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 16, fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)' }}>
              <span><kbd style={{ fontFamily: 'monospace' }}>↑↓</kbd> navigate</span>
              <span><kbd style={{ fontFamily: 'monospace' }}>↵</kbd> select</span>
              <span><kbd style={{ fontFamily: 'monospace' }}>⌘K</kbd> toggle</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
