'use client';

import React, { useState } from 'react';
import { Hero } from '@/components/Hero';
import { WaveDivider } from '@/components/SectionBlobDivider';
import { EyebrowTag } from '@/components/EyebrowPills';
import { CTAButton } from '@/components/CTAButton';
import { LogoBar } from '@/components/LogoBar';
import { AOSInit } from '@/components/AOSInit';
import {
  Lock, Eye, Zap, Shield,
  GitBranch, DollarSign, AlertTriangle, Layers,
  ArrowDown, ChevronRight,
} from 'lucide-react';

/* ─────────────────────────────────────────────────
   DATA
───────────────────────────────────────────────── */
const MECHANISMS = [
  {
    icon: <Lock size={22} strokeWidth={1.8} />,
    title: 'Sealed-Bid Auctions',
    desc: "Liquidators submit encrypted discount bids. A Vickrey second-price auction resolves the winner inside Nox TEEs — no front-running, no gas wars, ever.",
  },
  {
    icon: <Eye size={22} strokeWidth={1.8} />,
    title: 'Confidential Hedging',
    desc: "Buyers and sellers post encrypted notional sizes against a reference position. Concentration, identity, and intent stay hidden from every market participant.",
  },
  {
    icon: <Zap size={22} strokeWidth={1.8} />,
    title: 'On-Chain Matching',
    desc: "Oblivious greedy pairwise matching uses Nox.gt and Nox.select. No plaintext values ever touch calldata. Every comparison is a TEE-attested operation.",
  },
  {
    icon: <Shield size={22} strokeWidth={1.8} />,
    title: 'One Settlement Core',
    desc: "A single settle() call resolves the auction, executes the real Aave liquidationCall(), and pays out matched CDS buyers. Two mechanisms. One attested flow.",
  },
];

const WHY_NOX = [
  {
    icon: <AlertTriangle size={22} strokeWidth={1.8} />,
    title: 'Vickrey Collapses Without Sealing',
    desc: 'Public bids reduce a Vickrey auction to simple ascending-price bidding. Sealed bids aren\'t optional — they\'re what makes the mechanism valid.',
  },
  {
    icon: <Eye size={22} strokeWidth={1.8} />,
    title: 'Hedges Are Market Signals',
    desc: 'A visible hedge order can trigger the run it was meant to insure against. Public protection buying is self-defeating. Nox breaks this reflexivity.',
  },
  {
    icon: <GitBranch size={22} strokeWidth={1.8} />,
    title: 'No Separate Oracle Needed',
    desc: 'The same TEE computation that resolves the auction triggers the CDS payout. One attested execution, no additional oracle trust surface.',
  },
  {
    icon: <Layers size={22} strokeWidth={1.8} />,
    title: 'Zero Aave Modifications',
    desc: 'Skia wraps Aave V3\'s existing liquidationCall() interface. The protocol is entirely unmodified — Skia is infrastructure layered cleanly on top.',
  },
];

/* ─────────────────────────────────────────────────
   REUSABLE COMPONENTS
───────────────────────────────────────────────── */
function SectionHead({
  eyebrow, eyebrowVariant, headline, ctaVariant, ctaLabel, ctaHref = '#signup',
}: {
  eyebrow: string;
  eyebrowVariant: 'ink' | 'lime' | 'peach';
  headline: string | React.ReactNode;
  ctaVariant: 'lime' | 'cream' | 'outline-ink' | 'ghost';
  ctaLabel: string;
  ctaHref?: string;
}) {
  return (
    <div className="section-head">
      <div className="section-head-left">
        <div data-aos="fade-up">
          <EyebrowTag text={eyebrow} variant={eyebrowVariant} />
        </div>
        <h2 className="display display-lg" data-aos="fade-up" data-aos-delay="80">
          {headline}
        </h2>
      </div>
      <div data-aos="fade-up" data-aos-delay="120" style={{ paddingBottom: 6 }}>
        <CTAButton variant={ctaVariant} label={ctaLabel} href={ctaHref} icon />
      </div>
    </div>
  );
}

function FeatureGrid({ items, cardVariant, iconVariant }: {
  items: typeof MECHANISMS;
  cardVariant: 'card-ink' | 'card-lime' | 'card-peach';
  iconVariant: 'feature-icon-ink' | 'feature-icon-lime' | 'feature-icon-peach';
}) {
  return (
    <div className="feature-grid">
      {items.map((item, i) => (
        <div
          key={i}
          className={`card ${cardVariant}`}
          data-aos="fade-up"
          data-aos-delay={i * 80}
        >
          <div className={`feature-icon-wrap ${iconVariant}`}>
            {item.icon}
          </div>
          <p className="feature-title">{item.title}</p>
          <p className="feature-desc">{item.desc}</p>
        </div>
      ))}
    </div>
  );
}



function ArchSection() {
  return (
    <section className="bg-lime" id="build" style={{ position: 'relative', paddingBlock: 'var(--section-pad)' }}>
      <div className="wrap" style={{ position: 'relative', zIndex: 1 }}>
        <SectionHead
          eyebrow="Architecture"
          eyebrowVariant="lime"
          headline={<>Zero Modification<br />To Aave</>}
          ctaVariant="outline-ink"
          ctaLabel="View Documentation"
          ctaHref="/app/how-it-works"
        />

        <div style={{
          marginTop: 64,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: 640,
          marginInline: 'auto'
        }}>
          
          {/* 1. Aave */}
          <div data-aos="fade-up" style={{
            background: 'transparent',
            border: '2px solid var(--ink)',
            padding: '24px 32px',
            textAlign: 'center',
            color: 'var(--ink)',
            width: '100%',
            maxWidth: 400,
          }}>
            <div style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: 8, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>Layer 1 / Unmodified</div>
            <div className="display" style={{ fontSize: '1.25rem' }}>Aave V3 Pool (Sepolia)</div>
          </div>

          <div data-aos="fade-up" data-aos-delay="50" style={{ width: 2, height: 24, background: 'var(--ink)' }} />

          {/* 2. LiquidationWatcher */}
          <div data-aos="fade-up" data-aos-delay="100" style={{
            background: 'transparent',
            border: '2px solid var(--ink)',
            padding: '20px 24px',
            textAlign: 'center',
            color: 'var(--ink)',
            width: '100%',
            maxWidth: 360,
          }}>
            <div style={{ fontWeight: 600, fontSize: '1.05rem' }}>LiquidationWatcher.sol</div>
            <div style={{ fontSize: '0.85rem', opacity: 0.7, marginTop: 4 }}>Polls getUserAccountData() &middot; Opens auction window</div>
          </div>

          <div data-aos="fade-up" data-aos-delay="150" style={{ width: 2, height: 24, background: 'var(--ink)' }} />

          {/* 3. TEE Enclave (Vaults) */}
          <div data-aos="fade-up" data-aos-delay="200" style={{
            border: '2px dashed var(--ink)',
            padding: '40px 24px 24px',
            width: '100%',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              top: -12,
              left: 24,
              background: 'var(--lime)',
              padding: '0 8px',
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--ink)'
            }}>
              [ iExec Nox Trusted Execution Environment ]
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              <div style={{
                border: '2px solid var(--ink)',
                background: 'var(--ink)',
                color: 'var(--white)',
                padding: '20px'
              }}>
                <div style={{ fontWeight: 600, fontSize: '1.05rem', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Lock size={16} /> AuctionVault
                </div>
                <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
                  Encrypted Bids<br />Vickrey Resolution
                </div>
              </div>
              <div style={{
                border: '2px solid var(--ink)',
                background: 'var(--ink)',
                color: 'var(--white)',
                padding: '20px'
              }}>
                <div style={{ fontWeight: 600, fontSize: '1.05rem', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Shield size={16} /> CreditVault
                </div>
                <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
                  Encrypted Hedges<br />ERC-7984 Collateral
                </div>
              </div>
            </div>
          </div>

          <div data-aos="fade-up" data-aos-delay="250" style={{ width: 2, height: 24, background: 'var(--ink)' }} />

          {/* 4. SettlementCore */}
          <div data-aos="fade-up" data-aos-delay="300" style={{
            background: 'var(--ink)',
            border: '2px solid var(--ink)',
            padding: '24px 32px',
            textAlign: 'center',
            color: 'var(--lime)',
            width: '100%',
            maxWidth: 480,
          }}>
            <div className="display" style={{ fontSize: '1.25rem', marginBottom: 8 }}>SettlementCore.sol &mdash; settle()</div>
            <div style={{ fontSize: '0.85rem', color: 'rgba(184,242,78,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span>Resolve Auction</span>
              <span style={{ opacity: 0.3 }}>&middot;</span>
              <span>liquidationCall()</span>
              <span style={{ opacity: 0.3 }}>&middot;</span>
              <span>CDS Payout</span>
            </div>
          </div>

        </div>
      </div>

      <WaveDivider fill="var(--ink)" flip />
    </section>
  );
}

/* ─────────────────────────────────────────────────
   SIGNUP SECTION
───────────────────────────────────────────────── */
function SignupSection({ subscribed, setSubscribed }: { subscribed: boolean, setSubscribed: (v: boolean) => void }) {
  return (
    <section className="bg-ink" id="signup" style={{ paddingBlock: 'var(--section-pad)', textAlign: 'center' }}>
      <div className="wrap">
        <div data-aos="fade-up">
          <EyebrowTag text="Beta Access" variant="ink" />
        </div>
        <h2 className="display display-lg" data-aos="fade-up" data-aos-delay="80"
          style={{ marginTop: 16, marginBottom: 20 }}>
          Get Early Access
        </h2>
        <p className="body-lg text-muted" data-aos="fade-up" data-aos-delay="140"
          style={{ maxWidth: 480, marginInline: 'auto', marginBottom: 40, lineHeight: 1.6 }}>
          Skia is live on Sepolia. Submit sealed bids, test confidential hedges, and experience the settlement flow firsthand.
        </p>

        {subscribed ? (
          <div data-aos="fade-up" data-aos-delay="200" style={{ padding: '24px', background: 'rgba(184,242,78,0.1)', border: '1px solid rgba(184,242,78,0.2)', borderRadius: 16, display: 'inline-flex', alignItems: 'center', gap: 12, color: 'var(--lime)', fontWeight: 600 }}>
            <Lock size={18} /> Request received. Keep an eye on your inbox.
          </div>
        ) : (
          <form
            onSubmit={e => { e.preventDefault(); setSubscribed(true); }}
            className="signup-form"
            data-aos="fade-up" data-aos-delay="200"
          >
            <input
              type="email"
              placeholder="you@example.com"
              required
              className="signup-input"
            />
            <button type="submit" className="btn btn-lime">
              Request Access <ChevronRight size={15} />
            </button>
          </form>
        )}

        {/* Footer note */}
        <p style={{ marginTop: 48, fontSize: '0.8rem', color: 'rgba(255,255,255,0.2)' }}
          data-aos="fade-up" data-aos-delay="260">
          Skia · iExec WTF Hackathon Summer 2026 · Sepolia · Built with Nox
        </p>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────
   PAGE
───────────────────────────────────────────────── */
export default function Home() {
  const [subscribed, setSubscribed] = useState(false);

  return (
    <>
      <AOSInit />


      {/* 1. Hero — ink */}
      <Hero />

      {/* 2. Mechanisms — lime */}
      <section className="bg-lime" id="protocol" style={{ position: 'relative', paddingBlock: 'var(--section-pad)' }}>
        <div className="wrap">
          <SectionHead
            eyebrow="The Mechanisms"
            eyebrowVariant="lime"
            headline={<>Two Systems.<br />One Core.</>}
            ctaVariant="outline-ink"
            ctaLabel="Launch App"
            ctaHref="/app/dashboard"
          />
          <FeatureGrid items={MECHANISMS} cardVariant="card-lime" iconVariant="feature-icon-lime" />
        </div>
        <WaveDivider fill="var(--peach)" />
      </section>

      {/* 3. Why Nox — peach */}
      <section className="bg-peach" id="mechanics" style={{ position: 'relative', paddingBlock: 'var(--section-pad)' }}>
        <div className="wrap">
          <SectionHead
            eyebrow="Why Nox Is Required"
            eyebrowVariant="peach"
            headline={<>Provably Broken<br />Without It</>}
            ctaVariant="outline-ink"
            ctaLabel="Read the Architecture"
            ctaHref="/app/how-it-works"
          />
          <FeatureGrid items={WHY_NOX} cardVariant="card-peach" iconVariant="feature-icon-peach" />
        </div>
        <WaveDivider fill="var(--lime)" flip />
      </section>

      {/* 4. Architecture — lime */}
      <ArchSection />

      {/* 5. Ecosystem — ink */}
      <section className="bg-ink" style={{ paddingBlock: 'var(--section-pad)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="wrap" style={{ textAlign: 'center' }}>
          <div data-aos="fade-up">
            <EyebrowTag text="Built With" variant="ink" />
          </div>
          <h2 className="display display-lg" data-aos="fade-up" data-aos-delay="80"
            style={{ marginTop: 16, marginBottom: 56 }}>
            Real Stack.<br />Real Testnet.
          </h2>
          <div data-aos="fade-up" data-aos-delay="140">
            <LogoBar />
          </div>
        </div>
      </section>

      {/* 6. Signup — ink */}
      <SignupSection subscribed={subscribed} setSubscribed={setSubscribed} />
    </>
  );
}
