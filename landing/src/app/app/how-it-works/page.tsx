'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Eye, Zap, Shield, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { fadeUp, stagger, scaleIn } from '@/lib/motion';

/* ── Step component ── */
function Step({ n, icon, title, desc }: { n: number; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <motion.div variants={fadeUp} style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
      <div style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--lime)' }}>
        {icon}
      </div>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Step {n}</span>
        </div>
        <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.65 }}>{desc}</div>
      </div>
    </motion.div>
  );
}

function Section({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}
      className="app-card" style={{ padding: 32, marginBottom: 20 }}>
      <motion.div variants={fadeUp} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ width: 4, height: 24, borderRadius: 999, background: accent }} />
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 900, textTransform: 'uppercase' }}>{title}</h2>
      </motion.div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {children}
      </div>
    </motion.div>
  );
}

/* ── §17.1 — Interactive Privacy Playground ── */
const HEX_CHARS = '0123456789abcdef';
const randHex = (len: number) => Array.from({ length: len }, () => HEX_CHARS[Math.floor(Math.random() * HEX_CHARS.length)]).join('');

function PrivacyPlayground() {
  const [discountBid, setDiscountBid] = useState(12.5);
  const [mode, setMode] = useState<'sealed' | 'public'>('sealed');
  const [ciphertext, setCiphertext] = useState('0'.repeat(64));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* Cycle ciphertext when in sealed mode */
  useEffect(() => {
    if (mode === 'sealed') {
      setCiphertext(randHex(64));
      timerRef.current = setInterval(() => setCiphertext(randHex(64)), 70);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [mode, discountBid]);

  /* Reshuffle when bid changes in sealed mode */
  useEffect(() => {
    if (mode === 'sealed') setCiphertext(randHex(64));
  }, [discountBid, mode]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      style={{ marginBottom: 0 }}
    >
      {/* Caption */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <div style={{ width: 4, height: 24, borderRadius: 999, background: 'linear-gradient(180deg, var(--lime), var(--peach))' }} />
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 900, textTransform: 'uppercase' }}>Interactive Playground</h2>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>Illustrative — no transaction sent · no wallet required</div>
        </div>
      </div>

      <div className="app-card" style={{ padding: 32 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 32 }}>

          {/* Controls */}
          <div>
            {/* Discount slider */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                <label style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>Discount Bid</label>
                <span style={{ fontFamily: 'monospace', fontSize: '1.4rem', fontWeight: 700, color: mode === 'sealed' ? 'var(--lime)' : 'var(--peach)' }}>
                  {discountBid.toFixed(1)}%
                </span>
              </div>
              <input
                type="range" min={1} max={20} step={0.5}
                value={discountBid}
                onChange={e => setDiscountBid(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: mode === 'sealed' ? 'var(--lime)' : 'var(--peach)', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>
                <span>1%</span><span>20%</span>
              </div>
            </div>

            {/* Mode toggle */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: '0.82rem', color: 'rgba(255,255,255,0.55)', fontWeight: 600, marginBottom: 10 }}>Privacy Mode</label>
              <div className="pill-toggle" style={{ width: '100%' }}>
                <motion.div
                  layout layoutId="playground-pill"
                  transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                  style={{
                    position: 'absolute', top: 3, bottom: 3,
                    left: mode === 'sealed' ? 3 : '50%',
                    right: mode === 'sealed' ? '50%' : 3,
                    borderRadius: 999,
                    background: mode === 'sealed'
                      ? 'linear-gradient(135deg, rgba(184,242,78,0.25), rgba(184,242,78,0.1))'
                      : 'linear-gradient(135deg, rgba(242,201,160,0.25), rgba(242,201,160,0.1))',
                    border: `1px solid ${mode === 'sealed' ? 'rgba(184,242,78,0.3)' : 'rgba(242,201,160,0.3)'}`,
                  }}
                />
                <button onClick={() => setMode('sealed')} className="pill-toggle__btn"
                  style={{ flex: 1, color: mode === 'sealed' ? 'var(--lime)' : 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Lock size={12} /> Sealed (Nox)
                </button>
                <button onClick={() => setMode('public')} className="pill-toggle__btn"
                  style={{ flex: 1, color: mode === 'public' ? 'var(--peach)' : 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Eye size={12} /> Public
                </button>
              </div>
            </div>

            {/* Explanation */}
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.38)', lineHeight: 1.65, padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {mode === 'sealed'
                ? 'In Nox sealed mode, your bid is encrypted client-side before it leaves the browser. The chain only sees opaque bytes — the TEE sees the plaintext.'
                : 'In a public on-chain system, your bid is visible in calldata the moment you submit. Bots can read it and react within the same block.'}
            </div>
          </div>

          {/* Visualization */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Value display */}
            <div style={{ padding: '18px 20px', borderRadius: 14, background: 'rgba(0,0,0,0.35)', border: `1px solid ${mode === 'sealed' ? 'rgba(184,242,78,0.15)' : 'rgba(242,201,160,0.25)'}`, minHeight: 80, display: 'flex', flexDirection: 'column', justifyContent: 'center', transition: 'border-color 0.3s' }}>
              <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                {mode === 'sealed' ? 'Calldata (on-chain)' : 'Calldata (on-chain)'}
              </div>
              <AnimatePresence mode="wait">
                {mode === 'sealed' ? (
                  <motion.div key="sealed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                    className="cipher-text" style={{ lineHeight: 1.5, wordBreak: 'break-all', fontSize: '0.9rem' }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>0x7b3a9c40</span>
                    <span style={{ color: 'var(--lime)', opacity: 0.9 }}>{ciphertext}</span>
                  </motion.div>
                ) : (
                  <motion.div key="public" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                    style={{ fontFamily: 'monospace', fontSize: '1rem', lineHeight: 1.5, wordBreak: 'break-all' }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>0x6e8e818b</span>
                    <span style={{ color: 'rgba(255,255,255,0.2)' }}>{Math.floor(discountBid * 100).toString(16).padStart(64, '0').slice(0, 64 - Math.floor(discountBid * 100).toString(16).length)}</span>
                    <span style={{ color: 'var(--peach)', fontWeight: 700, textShadow: '0 0 8px rgba(242,201,160,0.4)' }}>{Math.floor(discountBid * 100).toString(16)}</span>
                    <div style={{ fontSize: '0.75rem', marginTop: 12, color: 'var(--peach)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <AlertTriangle size={12} />
                      Decoded: submitBid({Math.floor(discountBid * 100)} /* {discountBid}% */)
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Bot indicator */}
            <div style={{ padding: '16px 20px', borderRadius: 14, background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 14 }}>
              <motion.div
                animate={{
                  background: mode === 'sealed'
                    ? 'rgba(255,255,255,0.06)'
                    : 'rgba(242,201,160,0.15)',
                  borderColor: mode === 'sealed'
                    ? 'rgba(255,255,255,0.1)'
                    : 'rgba(242,201,160,0.35)',
                  boxShadow: mode === 'sealed'
                    ? 'none'
                    : '0 0 16px rgba(242,201,160,0.2)',
                }}
                transition={{ duration: 0.4 }}
                style={{
                  width: 42, height: 42, borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, fontSize: '1.3rem', userSelect: 'none',
                }}
              >
                🤖
              </motion.div>
              <div>
                <AnimatePresence mode="wait">
                  {mode === 'sealed' ? (
                    <motion.div key="idle" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'rgba(255,255,255,0.55)' }}>Monitoring</div>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>No data accessible</div>
                    </motion.div>
                  ) : (
                    <motion.div key="active" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--peach)', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <AlertTriangle size={12} style={{ animation: 'pulse-glow 1s ease-in-out infinite' }} />
                        Front-runner detected
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(242,201,160,0.6)', marginTop: 2 }}>Reacting to bid: {discountBid.toFixed(1)}%</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Why it matters */}
            <AnimatePresence mode="wait">
              {mode === 'sealed' ? (
                <motion.div key="why-sealed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 10, background: 'rgba(184,242,78,0.05)', border: '1px solid rgba(184,242,78,0.12)' }}>
                  <CheckCircle2 size={14} color="var(--lime)" style={{ flexShrink: 0, marginTop: 1 }} />
                  <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>The Nox TEE attests to correctness of the auction result without ever revealing individual bids.</div>
                </motion.div>
              ) : (
                <motion.div key="why-public" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 10, background: 'rgba(242,201,160,0.05)', border: '1px solid rgba(242,201,160,0.15)' }}>
                  <AlertTriangle size={14} color="var(--peach)" style={{ flexShrink: 0, marginTop: 1 }} />
                  <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>A searcher sees your bid in the mempool and submits a slightly better one — Vickrey sealed-bid makes this structurally impossible when combined with Nox.</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function HowItWorks() {
  return (
    <>
      {/* Page title */}
      <motion.div variants={stagger} initial="hidden" animate="visible" style={{ marginBottom: 40 }}>
        <motion.div variants={fadeUp} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span className="app-badge app-badge--lime"><Shield size={10} /> Mechanism Explainer</span>
        </motion.div>
        <motion.h1 variants={fadeUp} style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 900, textTransform: 'uppercase', lineHeight: 1.05 }}>
          How It Works
        </motion.h1>
        <motion.p variants={fadeUp} style={{ color: 'rgba(255,255,255,0.45)', marginTop: 8, fontSize: '0.9rem', maxWidth: 560 }}>
          Three flows. One settlement core. Everything sealed until the TEE attests.
        </motion.p>
      </motion.div>

      {/* Flow 1 — Sealed-Bid Auction */}
      <Section title="Sealed-Bid Liquidation Auction" accent="var(--lime)">
        <Step n={1} icon={<Lock size={18} strokeWidth={1.5} />} title="Borrower goes undercollateralized"
          desc="An Aave V3 Sepolia position's health factor drops below 1.0. SkiaCore.sol detects the event and opens a timed auction window." />
        <Step n={2} icon={<Eye size={18} strokeWidth={1.5} />} title="Liquidators encrypt their discount bids client-side"
          desc="Each liquidator calls the Nox JS SDK encryptInput() locally. The plaintext discount rate is encrypted before it leaves the browser. Only the resulting ciphertext hits calldata." />
        <Step n={3} icon={<Shield size={18} strokeWidth={1.5} />} title="Bids are committed on-chain as opaque bytes"
          desc="SkiaCore.sol stores encrypted euint256 values. No participant — including Aave — can read any submitted bid." />
        <Step n={4} icon={<Zap size={18} strokeWidth={1.5} />} title="Nox TEE resolves the winner"
          desc="The TEE decrypts all bids, finds the lowest discount rate (best for borrower), applies Vickrey second-price logic, and writes the result back on-chain with an attestation." />
        <Step n={5} icon={<CheckCircle2 size={18} strokeWidth={1.5} />} title="Settlement executes"
          desc="SettlementCore.settle() calls Aave's real liquidationCall() with the winning liquidator. The winning discount rate paid is the second-lowest submitted." />
      </Section>

      {/* Flow 2 — Confidential CDS */}
      <Section title="Confidential Credit Protection (CDS)" accent="var(--peach)">
        <Step n={1} icon={<Lock size={18} strokeWidth={1.5} />} title="Buyers and sellers post encrypted intents"
          desc="CDS buyers encrypt their notional USDC size and post to CreditVault.sol. Sellers do the same. No participant sees any other participant's notional." />
        <Step n={2} icon={<Shield size={18} strokeWidth={1.5} />} title="Intents remain sealed on-chain"
          desc="CreditVault.sol stores all sizes as euint256. Concentration, identity, and counterparty assignment are provably hidden from all market participants." />
        <Step n={3} icon={<Zap size={18} strokeWidth={1.5} />} title="Nox matching runs inside the TEE"
          desc="On settlement trigger, the TEE performs oblivious greedy pairwise matching using Nox.gt and Nox.select. No plaintext comparison ever touches the EVM." />
        <Step n={4} icon={<CheckCircle2 size={18} strokeWidth={1.5} />} title="CDS payouts execute atomically with the liquidation"
          desc="SettlementCore.settle() pays matched CDS buyers their protection payout in the same transaction as the Aave liquidationCall(). Two mechanisms. One attested flow." />
      </Section>

      {/* Flow 3 — Settlement */}
      <Section title="Single Settlement Core" accent="rgba(255,255,255,0.5)">
        <Step n={1} icon={<Zap size={18} strokeWidth={1.5} />} title="settle() is called"
          desc="Any party can trigger SettlementCore.settle(). The function validates the Nox attestation and reads the TEE-written results." />
        <Step n={2} icon={<Shield size={18} strokeWidth={1.5} />} title="Aave liquidationCall() executes"
          desc="The winning liquidator's address and collateral amounts are passed to Aave's pool contract. No Aave modifications required." />
        <Step n={3} icon={<CheckCircle2 size={18} strokeWidth={1.5} />} title="CDS payouts clear"
          desc="Matched buyers receive USDC payouts. The amounts are computed inside the TEE and only the final transfer amounts appear on-chain." />
        <Step n={4} icon={<Eye size={18} strokeWidth={1.5} />} title="Public receipt"
          desc="The Settlement Feed shows: borrower address, winning liquidator address, second-price paid, CDS leaks = 0. Nothing else — because there's nothing else to show." />
      </Section>

      {/* §17.1 — Interactive Playground */}
      <PrivacyPlayground />

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        style={{ marginTop: 40, display: 'flex', gap: 12, flexWrap: 'wrap' }}
      >
        <Link href="/app/liquidator" style={{ textDecoration: 'none' }}>
          <motion.div
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 999, background: 'var(--lime)', color: '#0f0f0f', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}
          >
            Try Liquidator Desk <ArrowRight size={14} />
          </motion.div>
        </Link>
        <Link href="/app/hedge" style={{ textDecoration: 'none' }}>
          <motion.div
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 999, background: 'rgba(242,201,160,0.12)', border: '1px solid rgba(242,201,160,0.25)', color: 'var(--peach)', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}
          >
            Try Hedge Desk <ArrowRight size={14} />
          </motion.div>
        </Link>
      </motion.div>
    </>
  );
}
