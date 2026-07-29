'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CTAButton } from './CTAButton';
import { EyebrowWordPills } from './EyebrowPills';
import { ArrowDown } from 'lucide-react';
import { useSmoothCipherReveal } from '@/lib/useShuffleText';
import { fadeUp, stagger, scaleIn, ease } from '@/lib/motion';
import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { AUCTION_VAULT_ABI, AUCTION_VAULT_ADDRESS } from '@/lib/contracts';

const publicClient = createPublicClient({ chain: sepolia, transport: http() });

/* ── Ciphertext scramble line ── */
function ScrambledLine({
  text,
  color,
  delayMs = 200,
  durationMs = 1200,
}: {
  text: string;
  color?: string;
  delayMs?: number;
  durationMs?: number;
}) {
  const { display, isResolved } = useSmoothCipherReveal(text, true, {
    delayMs,
    durationMs,
  });

  return (
    <motion.span
      variants={{
        hidden: { opacity: 0, y: 28, filter: 'blur(8px)' },
        visible: {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          transition: { duration: 0.9, ease }
        }
      }}
      className={`cipher-scramble-text ${!isResolved ? 'is-decrypting' : 'is-resolved'}`}
      style={{ display: 'block', color }}
    >
      {display}
    </motion.span>
  );
}

/* ── Floating Hex Fragments ── */
function DriftingHex() {
  const [frags, setFrags] = useState<{ id: number; text: string; left: string; top: string; size: number; delay: number; dur: number }[]>([]);
  
  useEffect(() => {
    const HEX = '0123456789abcdef';
    const gen = () => '0x' + Array.from({ length: 12 }, () => HEX[Math.floor(Math.random() * 16)]).join('');
    
    const items = Array.from({ length: 8 }, (_, i) => ({
      id: i,
      text: gen(),
      left: `${15 + Math.random() * 70}%`,
      top: `${30 + Math.random() * 50}%`,
      size: 0.7 + Math.random() * 0.4,
      delay: 0.2 + Math.random() * 2,
      dur: 8 + Math.random() * 6,
    }));
    setFrags(items);
  }, []);

  return (
    <>
      {frags.map(f => (
        <div
          key={f.id}
          className="cipher-text"
          style={{
            position: 'absolute',
            left: f.left,
            top: f.top,
            fontSize: `${f.size}rem`,
            animation: `drift-hex ${f.dur}s cubic-bezier(0.16, 1, 0.3, 1) infinite`,
            animationDelay: `${f.delay}s`,
            opacity: 0,
            '--frag-opacity': 0.18 + Math.random() * 0.12,
          } as React.CSSProperties}
        >
          {f.text}
        </div>
      ))}
    </>
  );
}

export function Hero() {
  const [bidCount, setBidCount] = useState<number | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const count = await publicClient.readContract({
          address: AUCTION_VAULT_ADDRESS as `0x${string}`,
          abi: AUCTION_VAULT_ABI,
          functionName: 'bidCount',
        });
        setBidCount(Number(count));
      } catch {}
    };
    fetch();
    const t = setInterval(fetch, 30000);
    return () => clearInterval(t);
  }, []);
  return (
    <section className="hero bg-ink" id="home">
      {/* ── Background Atmosphere ── */}
      <div className="hero-grain" />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.6, ease }}
        className="hero-glow hero-glow-1"
        style={{
          width: 800, height: 800, top: '-10%', left: '-10%',
          background: 'radial-gradient(circle, rgba(184,242,78,0.1) 0%, transparent 65%)',
          filter: 'blur(140px)',
        }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.8, delay: 0.2, ease }}
        className="hero-glow hero-glow-2"
        style={{
          width: 600, height: 600, bottom: '-5%', right: '-5%',
          background: 'radial-gradient(circle, rgba(242,201,160,0.08) 0%, transparent 65%)',
          filter: 'blur(120px)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 1.1, ease }}
        className="wrap"
        style={{ position: 'relative', zIndex: 2, width: '100%' }}
      >
        <div className="hero-grid">
          
          {/* ── Left: Content ── */}
          <motion.div
            className="hero-content"
            variants={stagger}
            initial="hidden"
            animate="visible"
          >

            {/* Scrambling Headline */}
            <h1 className="hero-headline" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <ScrambledLine text="PUBLIC AUCTIONS GET FRONT-RUN." delayMs={250} durationMs={1100} color="#fff" />
              <ScrambledLine text="PUBLIC HEDGES TRIGGER PANICS." delayMs={600} durationMs={1200} color="var(--peach)" />
            </h1>

            {/* Sub-copy */}
            <motion.p
              variants={fadeUp}
              className="body-lg text-muted hero-sub"
              style={{ maxWidth: 560, marginTop: 28, marginBottom: 36, lineHeight: 1.6 }}
            >
              Skia fixes both with one TEE-attested settlement core for Aave V3 — combining sealed-bid Vickrey liquidations with confidential CDS matching. No MEV, no reflexivity.
            </motion.p>

            {/* CTAs */}
            <motion.div variants={fadeUp} className="hero-cta-row" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
              <CTAButton variant="lime" label="Join Beta" href="#signup" icon className="btn-arrow-right" />
              <a href="#protocol" className="btn btn-ghost btn-arrow-down">
                How it works <ArrowDown size={15} strokeWidth={2.5} />
              </a>
            </motion.div>

            {/* Live Signal */}
            <motion.div variants={fadeUp} style={{ marginTop: 24, fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }} className="hero-cta-row">
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--lime)', animation: 'pulse-glow 2s ease-in-out infinite' }} />
              Live on Sepolia · {bidCount !== null ? `${bidCount} sealed bid${bidCount !== 1 ? 's' : ''} on-chain` : 'Loading auction state...'}
            </motion.div>
          </motion.div>

          {/* ── Right: Asymmetric Deco ── */}
          <motion.div
            className="hero-deco"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 1.2, ease }}
          >
            <DriftingHex />
            {/* Subtle isometric wireframe motif */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.15, pointerEvents: 'none' }}>
              <svg width="280" height="280" viewBox="0 0 200 200" fill="none">
                <path d="M100 20L180 60L100 100L20 60L100 20Z" stroke="var(--lime)" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M180 60V140L100 180V100" stroke="var(--lime)" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M20 60V140L100 180V100" stroke="var(--lime)" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M60 40L140 80" stroke="var(--lime)" strokeWidth="1" strokeDasharray="4 4"/>
                <path d="M140 80V160" stroke="var(--lime)" strokeWidth="1" strokeDasharray="4 4"/>
              </svg>
            </div>
          </motion.div>

        </div>
      </motion.div>

      {/* Clean wave divider */}
      <div className="wave-divider">
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M0,80 L0,40 Q180,0 360,40 Q540,80 720,40 Q900,0 1080,40 Q1260,80 1440,40 L1440,80 Z"
            fill="var(--lime)"
          />
        </svg>
      </div>
    </section>
  );
}
