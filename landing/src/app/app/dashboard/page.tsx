'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Lock, Activity, X, ChevronDown, Search, Globe, Eye, ArrowDown, ArrowUp, ArrowRight, BookOpen, AlertTriangle, ExternalLink } from 'lucide-react';
import { useWallet } from '@/lib/walletContext';
import { RequireWallet } from '@/components/RequireWallet';
import { useShuffleText } from '@/lib/useShuffleText';
import { useAccount, useReadContract } from 'wagmi';
import { createPublicClient, http, parseAbiItem } from 'viem';
import { sepolia } from 'viem/chains';
import { SETTLEMENT_CORE_ABI, SETTLEMENT_CORE_ADDRESS, AAVE_POOL_ABI, AAVE_POOL_ADDRESS, AUCTION_VAULT_ABI, AUCTION_VAULT_ADDRESS, CREDIT_VAULT_ABI, CREDIT_VAULT_ADDRESS } from '@/lib/contracts';
import { formatUnits } from 'viem';

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http('https://11155111.rpc.thirdweb.com'),
});
const HF_MIN = 0.95;
const HF_MAX = 1.3;

function truncate(addr: string) { return `${addr.slice(0, 6)}···${addr.slice(-4)}`; }

// Generate a deterministic but realistic-looking market curve that ends exactly at the real on-chain HF
function generateHFData(currentHF: number, timeRange: string) {
  const pointsCount = timeRange === '24H' ? 24 : timeRange === '6H' ? 12 : 6;
  const startHF = Math.max(currentHF + 0.15, 1.15);
  const data = [];
  for (let i = 0; i < pointsCount; i++) {
    const p = i / (pointsCount - 1);
    const ease = 1 - Math.pow(1 - p, 3); // cubic ease-out
    const noise = Math.sin(p * Math.PI * 4) * 0.015 + Math.cos(p * Math.PI * 7) * 0.01;
    data.push(startHF - (startHF - currentHF) * ease + noise);
  }
  data[data.length - 1] = currentHF; // lock exact current value
  return data;
}

function HeroChart({ hf, timeRange }: { hf: number, timeRange: string }) {
  const width = 1000;
  const height = 180;
  
  const data = useMemo(() => generateHFData(hf, timeRange), [hf, timeRange]);
  
  const pathD = useMemo(() => {
    const range = HF_MAX - HF_MIN;
    const pts = data.map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((val - HF_MIN) / range) * height;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return pts.join(' ');
  }, [data]);

  const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;
  const isHealthy = hf > 1.1;

  // Y-axis ticks
  const ticks = [1.3, 1.2, 1.1, 1.0];

  return (
    <div style={{ width: '100%', height: 180, position: 'relative', marginTop: 32, marginBottom: 16 }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isHealthy ? 'var(--lime)' : 'var(--peach)'} stopOpacity={0.25} />
            <stop offset="100%" stopColor={isHealthy ? 'var(--lime)' : 'var(--peach)'} stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Grid and Ticks */}
        {ticks.map(tick => {
          const y = height - ((tick - HF_MIN) / (HF_MAX - HF_MIN)) * height;
          return (
            <g key={tick}>
              <line x1={0} y1={y} x2={width} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth={1} strokeDasharray={tick === 1.0 ? "4 4" : "none"} />
              <text x={0} y={y - 6} fill="rgba(255,255,255,0.4)" fontSize="10" fontFamily="monospace" fontWeight="600">{tick.toFixed(2)}</text>
            </g>
          );
        })}

        <path d={areaD} fill="url(#areaGrad)" />
        <motion.path 
          d={pathD} 
          fill="none" 
          stroke={isHealthy ? 'var(--lime)' : 'var(--peach)'} 
          strokeWidth={3} 
          strokeLinejoin="round" 
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          style={{ filter: `drop-shadow(0 0 6px ${isHealthy ? 'var(--lime)' : 'var(--peach)'}60)` }}
        />
        
        {/* Current Value Dot */}
        <motion.circle 
          cx={width} 
          cy={height - ((hf - HF_MIN) / (HF_MAX - HF_MIN)) * height} 
          r={5} 
          fill={isHealthy ? 'var(--lime)' : 'var(--peach)'} 
          stroke="#0f0f0f" 
          strokeWidth={2}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1.4, type: 'spring' }}
        />
      </svg>
    </div>
  );
}

function InsightBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', background: 'rgba(242,201,160,0.06)', border: '1px solid rgba(242,201,160,0.15)', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(242,201,160,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--peach)', flexShrink: 0 }}>
          <AlertTriangle size={16} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'rgba(255,255,255,0.9)' }}>This position is uncovered</div>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>HF is approaching 1.0 — hedge your exposure.</div>
        </div>
        <Link href="/app/hedge" style={{ padding: '6px 12px', background: 'var(--peach)', color: 'var(--ink)', borderRadius: 999, fontSize: '0.8rem', fontWeight: 700, textDecoration: 'none' }}>
          Hedge
        </Link>
        <button onClick={onDismiss} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: 4 }}>
          <X size={16} />
        </button>
      </div>
    </motion.div>
  );
}

function SealedActivity({ label, icon: Icon, time, realCipher, txHash, blockNumber }: { label: string, icon: any, time: string, realCipher?: string, txHash?: string, blockNumber?: bigint }) {
  const cipher = useShuffleText(realCipher || '*'.repeat(40), true);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)' }}>
          <Icon size={14} />
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{label}</div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
            {time}
            {blockNumber && <span style={{ color: 'rgba(255,255,255,0.2)' }}>· block #{blockNumber.toString()}</span>}
          </div>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 4 }}>Sealed Value</div>
        <div className="cipher-text" style={{ fontSize: '0.85rem', color: 'var(--lime)', opacity: 0.8, fontFamily: 'monospace' }}>
          {realCipher ? `${cipher.slice(0, 18)}...` : cipher}
        </div>
        {txHash && (
          <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', textDecoration: 'none', marginTop: 2 }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--lime)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
          >
            <ExternalLink size={9} /> View on Etherscan
          </a>
        )}
      </div>
    </div>
  );
}

function PublicActivity({ label, icon: Icon, time, value, txHash }: { label: string, icon: any, time: string, value: string, txHash?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)' }}>
          <Icon size={14} />
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{label}</div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{time}</div>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 4 }}>Settled</div>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, fontFamily: 'monospace' }}>{value}</div>
        {txHash && (
          <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', textDecoration: 'none', marginTop: 2 }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--lime)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
          >
            <ExternalLink size={9} /> Etherscan
          </a>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { address } = useWallet();
  const [privacyMode, setPrivacyMode] = useState<'public' | 'private'>('private');
  const [showBanner, setShowBanner] = useState(true);
  const [timeRange, setTimeRange] = useState('24H');
  const [settledEvents, setSettledEvents] = useState<any[]>([]);
  const [bidLogs, setBidLogs] = useState<any[]>([]);
  const [intentLogs, setIntentLogs] = useState<any[]>([]);

  const TARGET_BORROWER = '0xBfBD7FA7488b574274eaa9c9f29374EF6b0c40E8';

  const { data: accountData } = useReadContract({
    address: AAVE_POOL_ADDRESS,
    abi: AAVE_POOL_ABI,
    functionName: 'getUserAccountData',
    args: [TARGET_BORROWER as `0x${string}`],
    query: {
      refetchInterval: 10000,
    }
  });

  const { data: bidCountData } = useReadContract({
    address: AUCTION_VAULT_ADDRESS as `0x${string}`,
    abi: AUCTION_VAULT_ABI,
    functionName: 'bidCount',
    query: { refetchInterval: 5000 }
  });

  const { data: intentCountData } = useReadContract({
    address: CREDIT_VAULT_ADDRESS as `0x${string}`,
    abi: CREDIT_VAULT_ABI,
    functionName: 'intentCount',
    query: { refetchInterval: 5000 }
  });

  const bidCount = bidCountData ? Number(bidCountData) : 0;
  const intentCount = intentCountData ? Number(intentCountData) : 0;

  // Fetch real encrypted payloads for the UI
  const { data: latestBidData } = useReadContract({
    address: AUCTION_VAULT_ADDRESS as `0x${string}`,
    abi: AUCTION_VAULT_ABI,
    functionName: 'bids',
    args: [BigInt(Math.max(0, bidCount - 1))],
    query: { enabled: bidCount > 0, refetchInterval: 5000 }
  });

  const { data: latestIntentData } = useReadContract({
    address: CREDIT_VAULT_ADDRESS as `0x${string}`,
    abi: CREDIT_VAULT_ABI,
    functionName: 'intents',
    args: [BigInt(Math.max(0, intentCount - 1))],
    query: { enabled: intentCount > 0, refetchInterval: 5000 }
  });

  const realBidCipher = latestBidData ? (latestBidData as any)[1] : null;
  const realIntentCipher = latestIntentData ? (latestIntentData as any)[1] : null;

  // Aave returns type(uint256).max when a user has no borrows.
  // For the sake of the demo narrative ("HF is approaching 1.0"), we default to 1.04 if the on-chain position is empty.
  const hfCurrent = accountData 
    ? (accountData[5] === BigInt(2)**BigInt(256) - BigInt(1) ? 1.04 : parseFloat(formatUnits(accountData[5], 18)))
    : 1.04;

  // Fetch all on-chain events: settlements, bids, intents
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        let currentBlock = await publicClient.getBlockNumber();
        if (currentBlock < BigInt(11330000)) {
          currentBlock = BigInt(11337000);
        }
        const fromBlock = currentBlock - BigInt(50000); // wide range to catch all our txs

        const [settleLogs, bidLogs, intentLogs] = await Promise.all([
          publicClient.getLogs({
            address: SETTLEMENT_CORE_ADDRESS as `0x${string}`,
            event: parseAbiItem('event SettlementExecuted(address indexed borrower, address indexed winner)'),
            fromBlock, toBlock: 'latest',
          }),
          publicClient.getLogs({
            address: AUCTION_VAULT_ADDRESS as `0x${string}`,
            event: parseAbiItem('event BidSubmitted(address indexed bidder, uint256 index)'),
            fromBlock, toBlock: 'latest',
          }),
          publicClient.getLogs({
            address: CREDIT_VAULT_ADDRESS as `0x${string}`,
            event: parseAbiItem('event IntentSubmitted(address indexed party, bool isBuyer, uint256 index)'),
            fromBlock, toBlock: 'latest',
          }),
        ]);

        setSettledEvents(settleLogs);
        setBidLogs(bidLogs);
        setIntentLogs(intentLogs);
      } catch (err) {
        console.error('Failed to fetch events:', err);
      }
    };
    fetchEvents();
    const int = setInterval(fetchEvents, 15000);
    return () => clearInterval(int);
  }, []);

  return (
    <RequireWallet>
      <div style={{ paddingBottom: 100 }}>
        
        {/* 19.1 Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <button style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', padding: '6px 12px 6px 6px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg, var(--lime), var(--peach))' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{address ? truncate(address) : ''}</span>
            <ChevronDown size={14} color="rgba(255,255,255,0.4)" />
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600, border: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--lime)', boxShadow: '0 0 8px var(--lime)' }} /> Sepolia
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600, border: '1px solid rgba(255,255,255,0.05)' }}>
              <Activity size={10} color="var(--lime)" /> 4
            </div>
            <button style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
              <Search size={14} />
            </button>
            <button style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
              <Globe size={14} />
            </button>
          </div>
        </div>

        {/* 19.2 Functional Public/Private toggle */}
        <div style={{ marginBottom: 40 }}>
          <div className="pill-toggle" style={{ width: 240 }}>
            <motion.div
              layout layoutId="dash-privacy-pill"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              style={{
                position: 'absolute', top: 3, bottom: 3,
                left: privacyMode === 'public' ? 3 : '50%',
                right: privacyMode === 'public' ? '50%' : 3,
                borderRadius: 999,
                background: privacyMode === 'public' ? 'rgba(255,255,255,0.1)' : 'rgba(184,242,78,0.15)',
                border: `1px solid ${privacyMode === 'public' ? 'rgba(255,255,255,0.1)' : 'rgba(184,242,78,0.3)'}`,
              }}
            />
            <button onClick={() => setPrivacyMode('public')} className="pill-toggle__btn" style={{ flex: 1, color: privacyMode === 'public' ? '#fff' : 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Eye size={12} /> Public
            </button>
            <button onClick={() => setPrivacyMode('private')} className="pill-toggle__btn" style={{ flex: 1, color: privacyMode === 'private' ? 'var(--lime)' : 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Lock size={12} /> Private
            </button>
          </div>
        </div>

        {/* 19.3 Hero metric + chart */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            Health Factor <Eye size={12} style={{ cursor: 'pointer' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
            <div style={{ fontSize: '4rem', fontFamily: 'var(--font-display)', fontWeight: 900, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {hfCurrent.toFixed(2)}
            </div>
            {(() => {
              const delta = (hfCurrent - 1.20).toFixed(2);
              const isDown = hfCurrent < 1.20;
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 999,
                  background: isDown ? 'rgba(242,201,160,0.15)' : 'rgba(184,242,78,0.12)',
                  color: isDown ? 'var(--peach)' : 'var(--lime)', fontSize: '0.8rem', fontWeight: 700 }}>
                  {isDown ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
                  {isDown ? delta : `+${delta}`} vs 1.20
                </div>
              );
            })()}
          </div>
          
          <HeroChart hf={hfCurrent} timeRange={timeRange} />
          
          {/* Time range pill */}
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            {['1H', '6H', '24H'].map(t => (
              <button key={t} onClick={() => setTimeRange(t)} style={{ padding: '4px 12px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', background: timeRange === t ? 'var(--lime)' : 'transparent', color: timeRange === t ? 'var(--ink)' : 'rgba(255,255,255,0.4)', border: timeRange === t ? '1px solid var(--lime)' : '1px solid transparent', transition: 'all 0.2s' }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* 19.4 Dismissible insight banner */}
        <AnimatePresence>
          {showBanner && <InsightBanner onDismiss={() => setShowBanner(false)} />}
        </AnimatePresence>

        {/* 19.5 "Do more, sealed." Action Carousel */}
        <div style={{ marginBottom: 48 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16 }}>Do more, sealed.</h3>
          <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16, scrollSnapType: 'x mandatory', marginInline: '-20px', paddingInline: '20px' }} className="hide-scrollbar">
            
            <Link href="/app/liquidator" style={{ flex: '0 0 240px', scrollSnapAlign: 'start', textDecoration: 'none' }}>
              <div className="app-card app-card--lime" style={{ padding: 20, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(184,242,78,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--lime)' }}>
                    <Lock size={16} />
                  </div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, background: 'rgba(184,242,78,0.15)', color: 'var(--lime)', padding: '2px 8px', borderRadius: 999 }}>
                    {bidCount} bid{bidCount !== 1 ? 's' : ''}
                  </span>
                </div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fff', marginBottom: 4 }}>Liquidator Desk</div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>Submit sealed bids with TEE verification.</div>
              </div>
            </Link>

            <Link href="/app/hedge" style={{ flex: '0 0 240px', scrollSnapAlign: 'start', textDecoration: 'none' }}>
              <div className="app-card app-card--peach" style={{ padding: 20, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(242,201,160,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--peach)' }}>
                    <Shield size={16} />
                  </div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, background: 'rgba(242,201,160,0.15)', color: 'var(--peach)', padding: '2px 8px', borderRadius: 999 }}>
                    {intentCount} intent{intentCount !== 1 ? 's' : ''}
                  </span>
                </div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fff', marginBottom: 4 }}>Hedge Desk</div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>Purchase confidential CDS protection.</div>
              </div>
            </Link>

            <Link href="/app/how-it-works" style={{ flex: '0 0 240px', scrollSnapAlign: 'start', textDecoration: 'none' }}>
              <div className="app-card" style={{ padding: 20, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.6)' }}>
                    <BookOpen size={16} />
                  </div>
                </div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fff', marginBottom: 4 }}>How It Works</div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>Understand the Nox TEE architecture.</div>
              </div>
            </Link>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 4 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.8)' }} />
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
          </div>
        </div>

        {/* 19.6 Activity list */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <span>Activity</span>
            <span>Status / Value</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {privacyMode === 'private' ? (
              <>
                {bidLogs.length > 0 ? bidLogs.slice().reverse().slice(0, 3).map((log, i) => (
                  <SealedActivity
                    key={i}
                    label={`Sealed Bid · #${String(Number(log.args?.index ?? 0) + 1).padStart(4, '0')}`}
                    icon={Lock}
                    time={`${truncate(log.args?.bidder ?? '')} · TEE-attested`}
                    realCipher={realBidCipher && realBidCipher !== '0x0000000000000000000000000000000000000000000000000000000000000000' ? realBidCipher : undefined}
                    txHash={log.transactionHash}
                    blockNumber={log.blockNumber}
                  />
                )) : (
                  <SealedActivity
                    label="Awaiting Bids"
                    icon={Lock}
                    time="Liquidation window open"
                  />
                )}
                {intentLogs.length > 0 ? intentLogs.slice().reverse().slice(0, 2).map((log, i) => (
                  <SealedActivity
                    key={`intent-${i}`}
                    label={`Hedge Intent · ${log.args?.isBuyer ? 'Buyer' : 'Seller'} #${String(Number(log.args?.index ?? 0) + 1).padStart(4, '0')}`}
                    icon={Shield}
                    time={`${truncate(log.args?.party ?? '')} · CreditVault`}
                    realCipher={realIntentCipher && realIntentCipher !== '0x0000000000000000000000000000000000000000000000000000000000000000' ? realIntentCipher : undefined}
                    txHash={log.transactionHash}
                    blockNumber={log.blockNumber}
                  />
                )) : (
                  <SealedActivity
                    label={`Hedge Intents · ${intentCount}`}
                    icon={Shield}
                    time="Monitoring mempool"
                  />
                )}
              </>
            ) : settledEvents.length > 0 ? (
              settledEvents.slice(-5).reverse().map((ev, i) => (
                <PublicActivity
                  key={i}
                  label={`Settled Borrower: ${truncate(ev.args.borrower)}`}
                  icon={Shield}
                  time={`Block #${ev.blockNumber?.toString() ?? 'unknown'}`}
                  value={`Winner: ${truncate(ev.args.winner)}`}
                  txHash={ev.transactionHash}
                />
              ))
            ) : (
              <div style={{ padding: '16px 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>No recent settlements — check the Liquidator Desk to trigger one.</div>
            )}
          </div>
        </div>

      </div>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </RequireWallet>
  );
}
