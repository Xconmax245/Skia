'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock, Eye, Zap, Shield, AlertTriangle, CheckCircle2,
  ArrowRight, Code2, ExternalLink, BookOpen, ChevronDown, ChevronUp,
  Cpu, Database, GitBranch, Layers, Network, Key
} from 'lucide-react';
import Link from 'next/link';
import { fadeUp, stagger } from '@/lib/motion';
import {
  AUCTION_VAULT_ADDRESS, CREDIT_VAULT_ADDRESS,
  SETTLEMENT_CORE_ADDRESS, COLLATERAL_TOKEN_ADDRESS, AAVE_POOL_ADDRESS
} from '@/lib/contracts';

/* ─────────────────────────────────────────── */
/* Sub-components                              */
/* ─────────────────────────────────────────── */

function AccentBar({ color }: { color: string }) {
  return <div style={{ width: 4, height: 28, borderRadius: 999, background: color, flexShrink: 0 }} />;
}

function SectionHeader({ accent, badge, title, subtitle }: { accent: string; badge: string; title: string; subtitle: string }) {
  return (
    <motion.div variants={fadeUp} style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
      <AccentBar color={accent} />
      <div>
        <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>{badge}</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.2rem, 3vw, 1.6rem)', fontWeight: 900, textTransform: 'uppercase', lineHeight: 1.05, marginBottom: 8 }}>{title}</h2>
        <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, maxWidth: 640 }}>{subtitle}</p>
      </div>
    </motion.div>
  );
}

function Step({
  n, icon, accent, title, desc, code, contractNote
}: {
  n: number; icon: React.ReactNode; accent: string;
  title: string; desc: string; code?: string; contractNote?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <motion.div variants={fadeUp} style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
      <div style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 14, background: `${accent}14`, border: `1px solid ${accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.25)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'rgba(255,255,255,0.05)', padding: '2px 7px', borderRadius: 999 }}>Step {n}</span>
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{title}</div>
        </div>
        <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.75, marginBottom: contractNote || code ? 10 : 0 }}>{desc}</div>
        {contractNote && (
          <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 8 }}>
            📄 {contractNote}
          </div>
        )}
        {code && (
          <div>
            <button onClick={() => setExpanded(e => !e)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: accent, fontSize: '0.72rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, padding: 0, marginBottom: expanded ? 8 : 0 }}>
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />} {expanded ? 'Hide' : 'Show'} code snippet
            </button>
            <AnimatePresence>
              {expanded && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                  <pre style={{ fontSize: '0.72rem', color: 'var(--lime)', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(184,242,78,0.1)', borderRadius: 10, padding: '14px 16px', overflowX: 'auto', lineHeight: 1.7, margin: 0 }}>
                    {code}
                  </pre>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ContractCard({ name, address, description, etherscanPath, accent, children }: {
  name: string; address: string; description: string; etherscanPath?: string; accent: string; children?: React.ReactNode;
}) {
  return (
    <motion.div variants={fadeUp} style={{ padding: 20, borderRadius: 14, background: 'rgba(255,255,255,0.025)', border: `1px solid ${accent}20` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 2 }}>{name}</div>
          <code style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>{address.slice(0, 10)}···{address.slice(-8)}</code>
        </div>
        <a href={`https://sepolia.etherscan.io/address/${address}`} target="_blank" rel="noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.68rem', color: accent, textDecoration: 'none', padding: '4px 8px', borderRadius: 999, background: `${accent}12`, border: `1px solid ${accent}25` }}
          onMouseEnter={e => (e.currentTarget.style.background = `${accent}25`)}
          onMouseLeave={e => (e.currentTarget.style.background = `${accent}12`)}
        >
          <ExternalLink size={9} /> Sepolia
        </a>
      </div>
      <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.65 }}>{description}</div>
      {children}
    </motion.div>
  );
}

function FAQ({ q, a }: { q: string; a: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div variants={fadeUp} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff', textAlign: 'left', gap: 16 }}>
        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'rgba(255,255,255,0.85)' }}>{q}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} style={{ flexShrink: 0 }}>
          <ChevronDown size={16} color="rgba(255,255,255,0.4)" />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            <div style={{ paddingBottom: 16, fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.8 }}>{a}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─────────────────────────────────────────── */
/* Interactive Playground                      */
/* ─────────────────────────────────────────── */
const HEX = '0123456789abcdef';
const randHex = (n: number) => Array.from({ length: n }, () => HEX[Math.floor(Math.random() * 16)]).join('');

function PrivacyPlayground() {
  const [bid, setBid] = useState(12.5);
  const [mode, setMode] = useState<'sealed' | 'public'>('sealed');
  const [cipher, setCipher] = useState('ad934be68f53848af3c30f30701bd08216e87e69355a76c572ebb93ccc2e4046');
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Generate a random cipher immediately on mount so it doesn't look static
    setCipher(randHex(64));
    if (mode === 'sealed') {
      timer.current = setInterval(() => setCipher(randHex(64)), 75);
    } else {
      if (timer.current) clearInterval(timer.current);
    }
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [mode]);

  const bidBps = Math.floor(bid * 100);
  const bidHex = bidBps.toString(16);
  const padding = '0'.repeat(64 - bidHex.length);

  return (
    <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
      <div className="app-card" style={{ padding: 32 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 28 }}>
          <AccentBar color="linear-gradient(180deg, var(--lime), var(--peach))" />
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: 4 }}>Interactive Playground</h2>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)' }}>Illustrative only — no wallet, no transaction</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 32 }}>
          {/* Controls */}
          <div>
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                <label style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>Your Discount Bid</label>
                <span style={{ fontFamily: 'monospace', fontSize: '1.5rem', fontWeight: 700, color: mode === 'sealed' ? 'var(--lime)' : 'var(--peach)' }}>{bid.toFixed(1)}%</span>
              </div>
              <input type="range" min={1} max={20} step={0.5} value={bid} onChange={e => setBid(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: mode === 'sealed' ? 'var(--lime)' : 'var(--peach)', cursor: 'pointer' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>
                <span>1% (best for borrower)</span><span>20% (max discount)</span>
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: '0.82rem', color: 'rgba(255,255,255,0.55)', fontWeight: 600, marginBottom: 10 }}>Privacy Mode</label>
              <div className="pill-toggle" style={{ width: '100%' }}>
                <motion.div layout layoutId="playground-pill" transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                  style={{ position: 'absolute', top: 3, bottom: 3, left: mode === 'sealed' ? 3 : '50%', right: mode === 'sealed' ? '50%' : 3, borderRadius: 999,
                    background: mode === 'sealed' ? 'linear-gradient(135deg,rgba(184,242,78,.25),rgba(184,242,78,.1))' : 'linear-gradient(135deg,rgba(242,201,160,.25),rgba(242,201,160,.1))',
                    border: `1px solid ${mode === 'sealed' ? 'rgba(184,242,78,.3)' : 'rgba(242,201,160,.3)'}` }} />
                <button onClick={() => setMode('sealed')} className="pill-toggle__btn" style={{ flex: 1, color: mode === 'sealed' ? 'var(--lime)' : 'rgba(255,255,255,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Lock size={12} /> Nox Sealed
                </button>
                <button onClick={() => setMode('public')} className="pill-toggle__btn" style={{ flex: 1, color: mode === 'public' ? 'var(--peach)' : 'rgba(255,255,255,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Eye size={12} /> Public Chain
                </button>
              </div>
            </div>

            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.38)', lineHeight: 1.7, padding: '14px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {mode === 'sealed'
                ? 'Your bid is encrypted by the Nox JS SDK before leaving the browser. The EVM sees only an opaque bytes32 handle. The TEE is the only party that ever reads the plaintext.'
                : 'Without encryption, your bid amount is visible in calldata the instant the tx enters the mempool. Any searcher bot can read it and undercut you in the same block.'}
            </div>
          </div>

          {/* Visualization */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Calldata box */}
            <div style={{ padding: '18px 20px', borderRadius: 14, background: 'rgba(0,0,0,0.4)', border: `1px solid ${mode === 'sealed' ? 'rgba(184,242,78,0.15)' : 'rgba(242,201,160,0.25)'}`, minHeight: 90, display: 'flex', flexDirection: 'column', justifyContent: 'center', transition: 'border-color 0.3s' }}>
              <div style={{ fontSize: '0.64rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                {mode === 'sealed' ? 'On-chain calldata — opaque' : 'On-chain calldata — readable'}
              </div>
              <AnimatePresence mode="wait">
                {mode === 'sealed' ? (
                  <motion.div key="sealed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                    className="cipher-text" style={{ lineHeight: 1.5, wordBreak: 'break-all', fontSize: '0.82rem' }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>0x7b3a9c40</span>
                    <span style={{ color: 'var(--lime)', opacity: 0.85 }}>{cipher}</span>
                  </motion.div>
                ) : (
                  <motion.div key="public" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                    style={{ fontFamily: 'monospace', fontSize: '0.82rem', lineHeight: 1.5, wordBreak: 'break-all' }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>0x6e8e818b</span>
                    <span style={{ color: 'rgba(255,255,255,0.2)' }}>{padding}</span>
                    <span style={{ color: 'var(--peach)', fontWeight: 700, textShadow: '0 0 8px rgba(242,201,160,0.4)' }}>{bidHex}</span>
                    <div style={{ fontSize: '0.72rem', marginTop: 10, color: 'var(--peach)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <AlertTriangle size={11} /> Decoded: submitBid({bidBps} bps = {bid.toFixed(1)}% discount)
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* MEV bot indicator */}
            <div style={{ padding: '16px 20px', borderRadius: 14, background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 14 }}>
              <motion.div animate={{ background: mode === 'sealed' ? 'rgba(255,255,255,0.05)' : 'rgba(242,201,160,0.15)', borderColor: mode === 'sealed' ? 'rgba(255,255,255,0.08)' : 'rgba(242,201,160,0.4)', boxShadow: mode === 'sealed' ? 'none' : '0 0 20px rgba(242,201,160,0.25)' }} transition={{ duration: 0.4 }}
                style={{ width: 44, height: 44, borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1.3rem' }}>
                🤖
              </motion.div>
              <AnimatePresence mode="wait">
                {mode === 'sealed' ? (
                  <motion.div key="idle" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)' }}>MEV Bot — Idle</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>Calldata is opaque — no data to front-run</div>
                  </motion.div>
                ) : (
                  <motion.div key="active" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--peach)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <AlertTriangle size={12} style={{ animation: 'pulse-glow 1s ease-in-out infinite' }} /> Front-runner active!
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(242,201,160,0.65)', marginTop: 2 }}>Saw your {bid.toFixed(1)}% bid — undercutting at {(bid - 0.1).toFixed(1)}%</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Result */}
            <AnimatePresence mode="wait">
              {mode === 'sealed' ? (
                <motion.div key="ok" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 10, background: 'rgba(184,242,78,0.05)', border: '1px solid rgba(184,242,78,0.15)' }}>
                  <CheckCircle2 size={14} color="var(--lime)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.65 }}>
                    The Nox TEE is the only compute environment that decrypts bids. It produces a TEE attestation proving Vickrey winner selection without ever exposing individual bids — not even to the contract deployer.
                  </div>
                </motion.div>
              ) : (
                <motion.div key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 10, background: 'rgba(242,201,160,0.05)', border: '1px solid rgba(242,201,160,0.2)' }}>
                  <AlertTriangle size={14} color="var(--peach)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.65 }}>
                    A searcher detects your bid in the pending tx pool and submits a slightly better one before your block. Sealed-bid + Vickrey pricing makes this structurally impossible with Nox.
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────── */
/* Main page                                   */
/* ─────────────────────────────────────────── */
export default function HowItWorks() {
  return (
    <>
      {/* ── Page header ── */}
      <motion.div variants={stagger} initial="hidden" animate="visible" style={{ marginBottom: 48 }}>
        <motion.div variants={fadeUp} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span className="app-badge app-badge--lime"><Shield size={10} /> Architecture</span>
          <span className="app-badge" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}><BookOpen size={10} /> Deep Dive</span>
        </motion.div>
        <motion.h1 variants={fadeUp} style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 900, textTransform: 'uppercase', lineHeight: 1.0, marginBottom: 16 }}>
          How Skia Works
        </motion.h1>
        <motion.p variants={fadeUp} style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1rem', lineHeight: 1.75, maxWidth: 620 }}>
          Skia is a confidential liquidation and credit protection system for Aave V3, powered by iExec Nox Trusted Execution Environments.
          Three on-chain contracts coordinate a two-sided market — sealed bids from liquidators, encrypted protection intents from CDS counterparties —
          and a single settlement function finalises everything atomically.
        </motion.p>
      </motion.div>

      {/* ── 1. Architecture Overview ── */}
      <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} className="app-card" style={{ padding: 32, marginBottom: 20 }}>
        <SectionHeader
          accent="rgba(255,255,255,0.6)"
          badge="Section 1 · Overview"
          title="System Architecture"
          subtitle="Four deployed contracts on Sepolia form the Skia settlement stack. Each handles a discrete concern: token, auction, credit, and settlement. The iExec Nox TEE is the decryption oracle that bridges encrypted state to the EVM."
        />

        <motion.div variants={stagger} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 32 }}>
          <ContractCard
            name="CollateralToken (cSKIA)"
            address={COLLATERAL_TOKEN_ADDRESS}
            description="ERC-7984 confidential token. Balances and transfers are stored as euint256 — an encrypted 256-bit integer that lives on-chain but can only be read by the TEE or the holder using their Nox key. Used as collateral posting for CDS sellers."
            accent="rgba(255,255,255,0.6)"
          >
            <div style={{ marginTop: 12, fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', lineHeight: 1.8 }}>
              confidentialBalanceOf() → euint256<br />
              confidentialTransfer() → euint256<br />
              setOperator(spender, expiry)<br />
              mint(to, encAmt, proof)
            </div>
          </ContractCard>

          <ContractCard
            name="AuctionVault.sol"
            address={AUCTION_VAULT_ADDRESS}
            description="Stores encrypted discount bids from liquidators as euint256. Exposes resolveVickrey() which runs inside the Nox TEE to determine the winner and second-price using confidential comparisons."
            accent="var(--lime)"
          >
            <div style={{ marginTop: 12, fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', lineHeight: 1.8 }}>
              submitBid(encBid, proof)<br />
              resolveVickrey() → (winner, discount, highest)<br />
              bidCount() → uint256<br />
              bids(i) → (addr, euint256, euint256, bool)
            </div>
          </ContractCard>

          <ContractCard
            name="CreditVault.sol"
            address={CREDIT_VAULT_ADDRESS}
            description="Stores encrypted CDS intents from buyers and sellers. Notional sizes are euint256. On default, the TEE performs confidential pairwise matching and calls settleOnDefault() to clear matched positions."
            accent="var(--peach)"
          >
            <div style={{ marginTop: 12, fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', lineHeight: 1.8 }}>
              submitIntent(encNotional, proof, isBuyer)<br />
              settleOnDefault() → void<br />
              intentCount() → uint256<br />
              intents(i) → (addr, euint256, bool, bool)
            </div>
          </ContractCard>

          <ContractCard
            name="SettlementCore.sol"
            address={SETTLEMENT_CORE_ADDRESS}
            description="The final execution hub. Receives TEE-attested results from AuctionVault and CreditVault, then calls Aave V3's liquidationCall() on Sepolia. Emits SettlementExecuted for the public activity feed."
            accent="rgba(130,200,255,0.8)"
          >
            <div style={{ marginTop: 12, fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', lineHeight: 1.8 }}>
              settle(collateral, debt, borrower,<br />
              {'  '}debtToCover, winner, discountBps)<br />
              aavePool() → 0x6Ae43···38951<br />
              event SettlementExecuted(borrower, winner)
            </div>
          </ContractCard>
        </motion.div>

        {/* Data flow diagram */}
        <motion.div variants={fadeUp} style={{ padding: '20px 24px', borderRadius: 14, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16, fontWeight: 700 }}>Unified Settlement Data Flow</div>
          
          {/* Explicit note about shared settlement */}
          <div style={{ marginBottom: 20, padding: '10px 14px', borderRadius: 8, background: 'rgba(130,200,255,0.08)', border: '1px solid rgba(130,200,255,0.2)', fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)' }}>
            <strong style={{ color: 'rgba(130,200,255,0.9)' }}>Crucial Detail:</strong> One TEE call does both Vickrey resolution and CDS payout matching. The on-chain footprint is identical whether the CDS market has open intents or is completely empty.
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap', rowGap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ padding: '8px 14px', borderRadius: 10, background: `var(--lime)12`, border: `1px solid var(--lime)25`, textAlign: 'center' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--lime)' }}>Liquidators</div>
                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', marginTop: 2, fontFamily: 'monospace' }}>submitBid(encBid)</div>
              </div>
              <div style={{ padding: '8px 14px', borderRadius: 10, background: `var(--peach)12`, border: `1px solid var(--peach)25`, textAlign: 'center' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--peach)' }}>CDS Market</div>
                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', marginTop: 2, fontFamily: 'monospace' }}>submitIntent(encAmt)</div>
              </div>
            </div>
            
            <ArrowRight size={16} color="rgba(255,255,255,0.2)" style={{ margin: '0 8px' }} />
            
            <div style={{ padding: '12px 16px', borderRadius: 12, background: `rgba(255,255,255,0.05)`, border: `1px solid rgba(255,255,255,0.2)`, textAlign: 'center' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff' }}>Nox TEE (SGX)</div>
              <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                1. Decrypt all inputs<br/>
                2. Select Vickrey winner<br/>
                3. Match CDS orders<br/>
                4. Sign single attestation
              </div>
            </div>

            <ArrowRight size={16} color="rgba(255,255,255,0.2)" style={{ margin: '0 8px' }} />

            <div style={{ padding: '12px 16px', borderRadius: 12, background: `rgba(130,200,255,0.1)`, border: `1px solid rgba(130,200,255,0.3)`, textAlign: 'center' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'rgba(130,200,255,0.9)' }}>SettlementCore</div>
              <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', marginTop: 4, fontFamily: 'monospace' }}>
                liquidationCall(winner)<br/>
                Transfer CDS payouts
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* ── 2. Sealed-Bid Auction ── */}
      <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} className="app-card" style={{ padding: 32, marginBottom: 20 }}>
        <SectionHeader
          accent="var(--lime)"
          badge="Section 2 · Liquidation"
          title="Sealed-Bid Vickrey Auction"
          subtitle="When an Aave borrower's Health Factor drops below 1.0, Skia opens a sealed-bid auction. Liquidators compete on discount rate. The lowest rate wins (best for the borrower), but pays the second-lowest rate — Vickrey pricing. This eliminates MEV and delivers a fair outcome."
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <Step n={1} icon={<AlertTriangle size={18} strokeWidth={1.5} />} accent="var(--lime)"
            title="Borrower position goes unhealthy on Aave V3"
            desc="The Aave V3 pool on Sepolia tracks each user's Health Factor continuously. When a position's HF falls below 1.0, the underlying collateral no longer covers the debt at the required liquidation threshold. Skia's keeper script monitors this via getUserAccountData() on the Aave pool at 0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951."
            contractNote="Aave Pool: getUserAccountData(borrower) → [totalCollateralBase, totalDebtBase, ..., healthFactor]"
            code={`// keeper.ts
const data = await aavePool.read.getUserAccountData([borrower]);
const hf = parseFloat(formatUnits(data[5], 18));
if (hf < 1.0) { await auctionVault.write.openAuction(); }`}
          />
          <Step n={2} icon={<Key size={18} strokeWidth={1.5} />} accent="var(--lime)"
            title="Liquidators encrypt their discount bids client-side"
            desc="Each liquidator decides a discount rate (1–20%). They call the iExec Nox JS SDK encryptInput() in their browser. This produces an opaque bytes32 handle and a zero-knowledge proof. The discount rate plaintext never leaves the browser — only the encrypted handle hits calldata."
            contractNote="AuctionVault: submitBid(bytes32 encryptedBid, bytes proof) — stores as euint256"
            code={`// Browser — /app/liquidator
const { handle, handleProof } = await handleClient.encryptInput(
  discountBps,      // e.g. BigInt(1050) = 10.5%
  'uint256',
  AUCTION_VAULT_ADDRESS
);
// handle = opaque bytes32 (the euint256 pointer)
// handleProof = ZK proof the handle is well-formed

await writeContract({
  address: AUCTION_VAULT_ADDRESS,
  functionName: 'submitBid',
  args: [handle, handleProof]
});`}
          />
          <Step n={3} icon={<Database size={18} strokeWidth={1.5} />} accent="var(--lime)"
            title="Bids stored on-chain as encrypted euint256 values"
            desc="AuctionVault.sol records each bid as a struct containing the bidder address, their encrypted discount rate (euint256 = bytes32 on-chain), and an encrypted bidder-ID handle for TEE matching. The contract stores up to MAX_BIDDERS = 32 bids per auction. No on-chain logic can compare or read any bid value."
            contractNote="struct Bid { address bidder; euint256 discountBid; euint256 bidderIdEnc; bool submitted; }"
          />
          <Step n={4} icon={<Cpu size={18} strokeWidth={1.5} />} accent="var(--lime)"
            title="Nox TEE resolves the Vickrey winner"
            desc="The keeper calls resolveVickrey() on AuctionVault. This function executes inside the Nox Trusted Execution Environment (a hardware-isolated Intel SGX enclave). Inside the TEE, Nox decrypts all bids using its master decryption key, finds the lowest discount rate (best for the borrower), applies second-price (Vickrey) logic to determine what the winner actually pays, and writes encrypted result handles back on-chain. The TEE generates a cryptographic attestation of the result without revealing any individual bid."
            contractNote="AuctionVault: resolveVickrey() → (euint256 winningDiscount, euint256 winningBidderEnc, euint256 highestBidEnc)"
            code={`// Inside Nox TEE (simplified pseudocode)
let minDiscount = Infinity;
let secondMin = Infinity;
let winner = address(0);

for (const bid of bids) {
  const d = await nox.decrypt(bid.discountBid);
  if (d < minDiscount) {
    secondMin = minDiscount;
    minDiscount = d;
    winner = bid.bidder;
  } else if (d < secondMin) {
    secondMin = d;
  }
}
// Winner pays secondMin (Vickrey pricing)
return { winner, pricePaid: secondMin };`}
          />
          <Step n={5} icon={<CheckCircle2 size={18} strokeWidth={1.5} />} accent="var(--lime)"
            title="SettlementCore executes the Aave liquidation"
            desc="The keeper passes the TEE-attested winner address and discount rate to SettlementCore.settle(). This calls Aave's liquidationCall() with WETH as collateral and USDC as debt. The winning liquidator repays the borrower's debt at the Vickrey second-price discount rate and receives the collateral. Skia emits SettlementExecuted(borrower, winner) for the public activity feed."
            contractNote="SettlementCore: settle(collateral, debt, borrower, debtToCover, winner, discountBps)"
            code={`// SettlementCore.sol (simplified)
function settle(
  address collateralAsset,  // WETH on Sepolia
  address debtAsset,        // USDC on Sepolia
  address borrower,
  uint256 debtToCover,
  address liquidatorWinner,
  uint256 winningDiscountBps
) external {
  // Call Aave V3 liquidation
  IPool(aavePool).liquidationCall(
    collateralAsset,
    debtAsset,
    borrower,
    debtToCover,
    false // receiveAToken
  );
  emit SettlementExecuted(borrower, liquidatorWinner);
}`}
          />
        </div>
      </motion.div>

      {/* ── 3. Confidential CDS ── */}
      <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} className="app-card" style={{ padding: 32, marginBottom: 20 }}>
        <SectionHeader
          accent="var(--peach)"
          badge="Section 3 · Hedge Desk"
          title="Confidential Credit Default Swap"
          subtitle="Alongside the liquidation auction, Skia runs a confidential CDS order book via CreditVault.sol. Buyers post encrypted protection intents; sellers post encrypted coverage supply. The Nox TEE matches them without any participant — or the contract itself — seeing any other party's notional size."
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <Step n={1} icon={<Lock size={18} strokeWidth={1.5} />} accent="var(--peach)"
            title="CDS buyers and sellers encrypt their notional size"
            desc="A protection buyer wants to hedge against the referenced Aave position defaulting. They choose a notional USDC amount and a tenor (7d / 30d / 90d). The notional is encrypted with encryptInput() before submitIntent() is called. Sellers do the same. No participant sees any other notional."
            contractNote="CreditVault: submitIntent(bytes32 encNotional, bytes proof, bool isBuyer)"
            code={`// Browser — /app/hedge
const { handle, handleProof } = await handleClient.encryptInput(
  BigInt(25000),     // $25,000 USDC notional
  'uint256',
  CREDIT_VAULT_ADDRESS
);
await writeContract({
  functionName: 'submitIntent',
  args: [handle, handleProof, true]  // true = buyer
});`}
          />
          <Step n={2} icon={<Shield size={18} strokeWidth={1.5} />} accent="var(--peach)"
            title="ERC-7984 CollateralToken for seller margin"
            desc="CDS sellers must post collateral to back their protection. CollateralToken (cSKIA) is an ERC-7984 confidential token — balances are stored as euint256 and transfers are opaque. Sellers call setOperator(CreditVault, expiry) to grant the vault time-limited transfer rights, then submitIntent(). The vault pulls the encrypted collateral using confidentialTransferFrom()."
            contractNote="CollateralToken: setOperator(operator, uint48 until) — time-limited transfer delegation"
          />
          <Step n={3} icon={<GitBranch size={18} strokeWidth={1.5} />} accent="var(--peach)"
            title="Nox TEE performs confidential pairwise matching"
            desc="When a default is triggered (borrower's HF < 1.0), CreditVault.settleOnDefault() is called. Inside the Nox TEE, all buyer intents and seller intents are decrypted. The TEE runs a greedy matching algorithm using Nox.gt() and Nox.select() — confidential comparison operations — pairing buyers with sellers by notional size. Only final transfer amounts exit the TEE."
            contractNote="CreditVault: settleOnDefault() → emits HedgeSettlementExecuted(referencePosition)"
          />
          <Step n={4} icon={<Zap size={18} strokeWidth={1.5} />} accent="var(--peach)"
            title="Matched positions clear atomically with the liquidation"
            desc="SettlementCore.settle() coordinates both settlement paths in a single transaction: first Aave's liquidationCall() executes, then CreditVault's matched payouts transfer. Protection buyers receive their USDC payout. The only public information is: which borrower defaulted, who won the liquidation auction. Individual CDS notionals never appear on-chain."
          />
        </div>
      </motion.div>

      {/* ── 4. Nox TEE Architecture ── */}
      <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} className="app-card" style={{ padding: 32, marginBottom: 20 }}>
        <SectionHeader
          accent="rgba(130,200,255,0.8)"
          badge="Section 4 · iExec Nox"
          title="Nox Trusted Execution Environment"
          subtitle="The iExec Nox TEE is the cryptographic backbone of Skia. It is a hardware-isolated compute environment (Intel SGX) running on iExec's decentralised worker network. All encrypted state in AuctionVault and CreditVault is only decryptable inside a running Nox enclave."
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 24 }}>
          {[
            { icon: <Key size={18} />, title: 'Key Management', color: 'rgba(130,200,255,0.8)', desc: 'The Nox network holds a master decryption key distributed across a threshold of TEE workers. No single worker has the full key. This protects against compromise of any individual enclave.' },
            { icon: <Lock size={18} />, title: 'encryptInput()', color: 'var(--lime)', desc: 'The iExec Nox JS SDK (@iexec-nox/handle) runs client-side. It generates a symmetric key in the browser, encrypts the plaintext value, and wraps the key under the Nox network public key. The resulting handle (bytes32) is a pointer — not the ciphertext itself.' },
            { icon: <Cpu size={18} />, title: 'Confidential Operations', color: 'var(--peach)', desc: 'Inside the TEE, Nox exposes Nox.add(), Nox.gt(), Nox.select(), and similar operations on euint256 values. These are the FHE-style operations that allow comparisons and arithmetic on encrypted data without decrypting to plaintext.' },
            { icon: <Shield size={18} />, title: 'Attestation', color: 'rgba(255,255,255,0.6)', desc: 'After resolveVickrey() runs, the TEE generates a cryptographic attestation — a signed proof that the enclave ran a specific, unmodified program and produced a specific output. This attestation is verifiable on-chain by SettlementCore.' },
            { icon: <Network size={18} />, title: 'Nox Handle Gateway', color: 'rgba(130,200,255,0.8)', desc: 'createViemHandleClient() from @iexec-nox/handle connects the browser to the Nox Handle Gateway — a decentralised RPC that coordinates encryption/decryption requests. It uses EIP-712 signatures for authorization.' },
            { icon: <Layers size={18} />, title: 'No Trusted Third Party', color: 'var(--lime)', desc: 'Unlike threshold-key or MPC-based systems, Nox uses hardware attestation. The trust assumption is: the Intel SGX hardware spec is correct. No operator — including iExec — can read encrypted inputs.' },
          ].map((item, i) => (
            <motion.div variants={fadeUp} key={i} style={{ padding: 20, borderRadius: 14, background: 'rgba(255,255,255,0.025)', border: `1px solid ${item.color}18` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${item.color}14`, border: `1px solid ${item.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color }}>
                  {item.icon}
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{item.title}</div>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>{item.desc}</div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ── 5. Interactive Playground ── */}
      <PrivacyPlayground />

      {/* ── 6. FAQ ── */}
      <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} className="app-card" style={{ padding: 32, marginBottom: 20, marginTop: 20 }}>
        <SectionHeader
          accent="rgba(255,255,255,0.4)"
          badge="Section 6 · FAQ"
          title="Frequently Asked Questions"
          subtitle="Common questions about the Skia protocol, the Nox TEE, and the trade-offs involved."
        />
        <motion.div variants={stagger} style={{ display: 'flex', flexDirection: 'column' }}>
          <FAQ q="Why use Vickrey (second-price) rather than first-price?"
            a={<>In a first-price auction, the dominant strategy is to shade your bid below your true value — leading to inefficient outcomes and MEV opportunities. In a Vickrey sealed-bid auction, the dominant strategy is to bid your true discount rate. The winner pays the second-highest rate, meaning they cannot gain by shading their bid. Combined with Nox's privacy guarantee, this creates a uniquely fair liquidation market.</>}
          />
          <FAQ q="Who can call resolveVickrey() — is it permissioned?"
            a={<>In the current deployment, <code style={{ color: 'var(--lime)', fontFamily: 'monospace' }}>resolveVickrey()</code> is called by the keeper (deployer EOA) for the demo. In production, this would be triggered by a Nox task scheduled when a position's HF crosses 1.0. The key point: the TEE cryptographically guarantees correctness regardless of who calls it, because the attestation proves the unmodified Vickrey program ran.</>}
          />
          <FAQ q="Can the deployer rug — read bids, or change the winner?"
            a={<>No. The deployer owns the contracts but cannot read any encrypted bid or intent — the euint256 values are byte strings that are meaningless without the Nox master key, which is distributed and never available to any single party. The TEE attestation is verifiable: SettlementCore checks that the output came from a genuine Nox enclave running the correct program hash.</>}
          />
          <FAQ q="What happens if a liquidator wins but doesn't have enough USDC?"
            a={<>SettlementCore calls Aave's <code style={{ color: 'var(--lime)', fontFamily: 'monospace' }}>liquidationCall()</code> which reverts if the liquidator's debt repayment fails. In production, the winner would need to have pre-approved the Aave pool to pull their debt repayment. The auction can be re-run in the next window if the winner cannot settle.</>}
          />
          <FAQ q="Why ERC-7984 instead of ERC-20 for CollateralToken?"
            a={<>ERC-7984 is a confidential token standard built for Nox. Unlike ERC-20, where balances are public, ERC-7984 stores <code style={{ color: 'var(--lime)', fontFamily: 'monospace' }}>euint256</code> balances that are encrypted on-chain. This means CDS sellers can post collateral without revealing their position size to other market participants. The <code style={{ color: 'var(--lime)', fontFamily: 'monospace' }}>setOperator()</code> function replaces ERC-20 allowances with time-limited delegation — more gas-efficient and revokable.</>}
          />
          <FAQ q="Is this production-ready?"
            a={<>Skia is a hackathon prototype. Key gaps before production: (1) auction windows need a time-lock enforced on-chain, (2) the keeper must be a Nox task rather than a centralized EOA, (3) CreditVault matching needs more sophisticated partial-fill logic, (4) SettlementCore needs a multi-sig or timelock for upgrades. The protocol mechanics and smart contract structure are production-oriented.</>}
          />
          <FAQ q="What are the deployed contract addresses?"
            a={
              <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', lineHeight: 2 }}>
                <div><span style={{ color: 'rgba(255,255,255,0.4)' }}>CollateralToken (cSKIA):</span> <a href={`https://sepolia.etherscan.io/address/${COLLATERAL_TOKEN_ADDRESS}`} target="_blank" rel="noreferrer" style={{ color: 'var(--lime)', textDecoration: 'none' }}>{COLLATERAL_TOKEN_ADDRESS}</a></div>
                <div><span style={{ color: 'rgba(255,255,255,0.4)' }}>AuctionVault:</span> <a href={`https://sepolia.etherscan.io/address/${AUCTION_VAULT_ADDRESS}`} target="_blank" rel="noreferrer" style={{ color: 'var(--lime)', textDecoration: 'none' }}>{AUCTION_VAULT_ADDRESS}</a></div>
                <div><span style={{ color: 'rgba(255,255,255,0.4)' }}>CreditVault:</span> <a href={`https://sepolia.etherscan.io/address/${CREDIT_VAULT_ADDRESS}`} target="_blank" rel="noreferrer" style={{ color: 'var(--lime)', textDecoration: 'none' }}>{CREDIT_VAULT_ADDRESS}</a></div>
                <div><span style={{ color: 'rgba(255,255,255,0.4)' }}>SettlementCore:</span> <a href={`https://sepolia.etherscan.io/address/${SETTLEMENT_CORE_ADDRESS}`} target="_blank" rel="noreferrer" style={{ color: 'var(--lime)', textDecoration: 'none' }}>{SETTLEMENT_CORE_ADDRESS}</a></div>
                <div><span style={{ color: 'rgba(255,255,255,0.4)' }}>Aave V3 Pool (Sepolia):</span> <a href={`https://sepolia.etherscan.io/address/${AAVE_POOL_ADDRESS}`} target="_blank" rel="noreferrer" style={{ color: 'var(--lime)', textDecoration: 'none' }}>{AAVE_POOL_ADDRESS}</a></div>
              </div>
            }
          />
        </motion.div>
      </motion.div>

      {/* ── CTAs ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} style={{ marginTop: 40, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link href="/app/liquidator" style={{ textDecoration: 'none' }}>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 999, background: 'var(--lime)', color: '#0f0f0f', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
            Try Liquidator Desk <ArrowRight size={14} />
          </motion.div>
        </Link>
        <Link href="/app/hedge" style={{ textDecoration: 'none' }}>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 999, background: 'rgba(242,201,160,0.12)', border: '1px solid rgba(242,201,160,0.25)', color: 'var(--peach)', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
            Try Hedge Desk <ArrowRight size={14} />
          </motion.div>
        </Link>
        <a href="https://github.com/Xconmax245/Skia" target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 999, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
            <Code2 size={14} /> Source on GitHub
          </motion.div>
        </a>
      </motion.div>

      {/* Status strip */}
      <div className="status-strip" style={{ marginTop: 40 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--lime)', animation: 'pulse-glow 2s ease-in-out infinite', flexShrink: 0 }} />
        All contracts live on Sepolia testnet
        <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
        iExec Nox TEE · ERC-7984 · Aave V3
        <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>Skia v0.1 · Hackathon Build</span>
      </div>
    </>
  );
}
