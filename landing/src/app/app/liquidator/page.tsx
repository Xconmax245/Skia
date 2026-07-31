'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Copy, Check, ExternalLink, ChevronUp, ChevronDown, CheckCircle2, XCircle, Loader2, Zap, Eye } from 'lucide-react';
import { CountdownRing } from '@/components/CountdownRing';
import { Sparkline } from '@/components/Sparkline';
import { CipherSkeleton } from '@/components/CipherSkeleton';
import { CopyToast } from '@/components/CopyToast';
import { useCopyToast } from '@/lib/useShuffleText';
import { fadeUp, stagger, springPop } from '@/lib/motion';
import { RequireWallet } from '@/components/RequireWallet';
import { useAccount, useReadContract, useWriteContract, useWalletClient } from 'wagmi';
import { createViemHandleClient } from '@iexec-nox/handle';
import { formatUnits, formatEther, parseUnits, isAddress, createWalletClient, custom } from 'viem';
import { sepolia } from 'viem/chains';
import { AAVE_POOL_ABI, AAVE_POOL_ADDRESS, AUCTION_VAULT_ABI, AUCTION_VAULT_ADDRESS, SETTLEMENT_CORE_ABI, SETTLEMENT_CORE_ADDRESS, SEPOLIA_WETH, SEPOLIA_USDC } from '@/lib/contracts';
import { Modal } from '@/components/Modal';
import { createPublicClient, http, parseAbiItem } from 'viem';

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(),
});

/* Sepolia Aave Debt Asset (USDC) */
const DEBT_ASSET = SEPOLIA_USDC;
/* Sepolia Aave Collateral Asset (WETH) */
const COLLATERAL_ASSET = SEPOLIA_WETH;

/* ── Dynamic data setup ── */
// Using the created position from the fixture:
const TARGET_BORROWER = '0xBfBD7FA7488b574274eaa9c9f29374EF6b0c40E8';
const WINDOW_SECS = 60; // 60s for liquidation window

type BidState = 'idle' | 'encrypting' | 'submitted' | 'error';
type SettleState = 'idle' | 'resolving' | 'decrypting' | 'settling' | 'done' | 'error';

function truncate(addr: string) { return `${addr.slice(0, 8)}···${addr.slice(-6)}`; }

/* §17.4 — anonymity set in bits */
function anonymityBits(n: number) { return n > 1 ? Math.log2(n).toFixed(2) : '0.00'; }

/* Discount stepper */
function DiscountInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const step = (delta: number) => {
    const n = Math.round((parseFloat(value) + delta) * 10) / 10;
    onChange(String(Math.min(20, Math.max(1, n))));
  };
  return (
    <div style={{ position: 'relative' }}>
      <input
        type="number" step="0.1" min="1" max="20"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="app-input"
        style={{ paddingRight: 56, fontSize: '1.4rem', fontWeight: 700, fontFamily: 'monospace' }}
      />
      <span style={{ position: 'absolute', right: 44, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.35)', fontSize: '1rem' }}>%</span>
      <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 1 }}>
        <button onClick={() => step(0.1)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 4, width: 22, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.5)' }}>
          <ChevronUp size={11} />
        </button>
        <button onClick={() => step(-0.1)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 4, width: 22, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.5)' }}>
          <ChevronDown size={11} />
        </button>
      </div>
    </div>
  );
}

export default function LiquidatorDesk() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useWriteContract();

  const [loaded, setLoaded] = useState(false);
  const [countdown, setCountdown] = useState(WINDOW_SECS);
  const [discount, setDiscount] = useState('10.5');
  const [bidState, setBidState] = useState<BidState>('idle');
  const [encPayload, setEncPayload] = useState<string | null>(null);
  const [encTx, setEncTx] = useState<string | null>(null);
  const [settleTx, setSettleTx] = useState<string | null>(null);
  const [settleState, setSettleState] = useState<SettleState>('idle');
  const [settleError, setSettleError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lastSettledTs, setLastSettledTs] = useState<number | null>(null);
  const [lastSettledTx, setLastSettledTx] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  // Tick every 10s to update the "X ago" time
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(t);
  }, []);

  // Fetch last SettlementExecuted event for the status strip
  useEffect(() => {
    const fetchLast = async () => {
      try {
        // Thirdweb caps eth_getLogs at 10,000 blocks — cap to 9,000, floor at deployment block
        const currentBlock = await publicClient.getBlockNumber();
        const DEPLOY_BLOCK = BigInt(11371920);
        const fromBlock = currentBlock > DEPLOY_BLOCK + BigInt(900)
          ? currentBlock - BigInt(900)
          : DEPLOY_BLOCK;
        const logs = await publicClient.getLogs({
          address: SETTLEMENT_CORE_ADDRESS as `0x${string}`,
          event: parseAbiItem('event SettlementExecuted(address indexed borrower, address indexed winner)'),
          fromBlock,
          toBlock: 'latest',
        });

        if (logs.length > 0) {
          const last = logs[logs.length - 1];
          const block = await publicClient.getBlock({ blockNumber: last.blockNumber! });
          setLastSettledTs(Number(block.timestamp) * 1000);
          setLastSettledTx(last.transactionHash);
        }
      } catch {}
    };
    fetchLast();
  }, []);

  function timeAgo(ts: number) {
    const diffSec = Math.floor((now - ts) / 1000);
    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    return `${Math.floor(diffSec / 3600)}h ago`;
  }

  const { copy: copyAddr, copied: copiedAddr } = useCopyToast(TARGET_BORROWER);
  const { copy: copyTx, copied: copiedTx } = useCopyToast(encTx ?? '');

  // 1. Read real data from Aave
  const { data: accountData } = useReadContract({
    address: AAVE_POOL_ADDRESS,
    abi: AAVE_POOL_ABI,
    functionName: 'getUserAccountData',
    args: [TARGET_BORROWER as `0x${string}`],
    query: {
      refetchInterval: 10000,
    }
  });

  // 2. Read auction state from Skia AuctionVault
  const { data: bidCountData } = useReadContract({
    address: AUCTION_VAULT_ADDRESS as `0x${string}`,
    abi: AUCTION_VAULT_ABI,
    functionName: 'bidCount',
    query: {
      refetchInterval: 5000,
    }
  });

  const bidCount = bidCountData ? Number(bidCountData) : 0;
  
  const hfCurrent = accountData 
    ? (accountData[5] === BigInt(2)**BigInt(256) - BigInt(1) ? 1.04 : parseFloat(formatUnits(accountData[5], 18)))
    : 1.04;

  const sparklineData = useMemo(() => {
    const pointsCount = 10;
    const startHF = Math.max(hfCurrent + 0.15, 1.15);
    const data = [];
    for (let i = 0; i < pointsCount; i++) {
      const p = i / (pointsCount - 1);
      const ease = 1 - Math.pow(1 - p, 3);
      const noise = Math.sin(p * Math.PI * 4) * 0.015 + Math.cos(p * Math.PI * 7) * 0.01;
      data.push(startHF - (startHF - hfCurrent) * ease + noise);
    }
    data[data.length - 1] = hfCurrent;
    return data;
  }, [hfCurrent]);
  const hasRealPosition = accountData && accountData[0] > BigInt(0);
  const collateralValue = hasRealPosition
    ? parseFloat(formatUnits(accountData![0], 8))
    : 0;
  const debtValue = hasRealPosition
    ? parseFloat(formatUnits(accountData![1], 8))
    : 0;

  /* Simulated load */
  useEffect(() => { const t = setTimeout(() => setLoaded(true), 900); return () => clearTimeout(t); }, []);

  /* Countdown */
  useEffect(() => {
    const t = setInterval(() => {
      setCountdown(p => {
        if (p <= 1) return WINDOW_SECS; // new window
        return p - 1;
      });
    }, 1000);
    return () => clearTimeout(t);
  }, []);

  const getActiveClient = async () => {
    if (walletClient) {
      // Force chain to sepolia for Nox SDK compatibility
      return { ...walletClient, chain: sepolia };
    }
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      return createWalletClient({ chain: sepolia, transport: custom((window as any).ethereum) });
    }
    return null;
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const client = await getActiveClient();
    if (!client) {
      setIsModalOpen(true);
      return;
    }
    
    try {
      setBidState('encrypting');
      
      // Calculate basis points for the discount (e.g., 10.5% -> 1050 bps)
      const discountBps = BigInt(Math.floor(parseFloat(discount) * 100));

      // Remove mocked encryption
      const handleClient = await createViemHandleClient(client as any);
      
      const { handle, handleProof } = await handleClient.encryptInput(
        discountBps, 'uint256', AUCTION_VAULT_ADDRESS as `0x${string}`
      );

      const tx = await writeContractAsync({
        address: AUCTION_VAULT_ADDRESS as `0x${string}`,
        abi: AUCTION_VAULT_ABI,
        functionName: 'submitBid',
        args: [handle, handleProof]
      });

      setEncTx(tx);
      setBidState('submitted');
    } catch (err) {
      console.error(err);
      setBidState('error');
    }
  }, [discount, walletClient, writeContractAsync]);

  // Force Settle — real end-to-end trigger instead of unattended keeper
  const handleForceSettle = useCallback(async () => {
    const client = await getActiveClient();
    if (!client) { setIsModalOpen(true); return; }
    setSettleState('resolving');
    setSettleError(null);
    try {
      if (!hasRealPosition) {
        throw new Error("No active position exists. Cannot force settle.");
      }
      if (hfCurrent >= 1.0) {
        throw new Error("Position is perfectly healthy (Health Factor ≥ 1.0). Cannot liquidate.");
      }

      // Step 1: Resolve Vickrey auction on-chain
      const resolveTxHash = await writeContractAsync({
        address: AUCTION_VAULT_ADDRESS as `0x${string}`,
        abi: AUCTION_VAULT_ABI,
        functionName: 'resolveVickrey'
      });
      console.log('[ForceSettle] resolveVickrey tx:', resolveTxHash);

      setSettleState('decrypting');

      // Step 2: Read public handles from state
      const winningBidderHandle = await publicClient.readContract({
        address: AUCTION_VAULT_ADDRESS as `0x${string}`,
        abi: AUCTION_VAULT_ABI,
        functionName: 'winningBidderEnc'
      });
      const winningDiscountHandle = await publicClient.readContract({
        address: AUCTION_VAULT_ADDRESS as `0x${string}`,
        abi: AUCTION_VAULT_ABI,
        functionName: 'winningDiscount'
      });

      // Step 3 & 4: Pull-decrypt handles off-chain via Nox Handle Gateway
      const handleClient = await createViemHandleClient(client as any);
      
      // If nox gateway is down, this will throw an explicit error which is what we want!
      const rawAddressBytes = await handleClient.decrypt(winningBidderHandle as `0x${string}`);
      const rawDiscountBytes = await handleClient.decrypt(winningDiscountHandle as `0x${string}`);

      // Process decrypted address correctly from JsValue
      let winnerAddress = ("0x" + BigInt(rawAddressBytes.value.toString()).toString(16).padStart(40, "0")) as `0x${string}`;
      
      const winningDiscountBps = BigInt(rawDiscountBytes.value.toString());

      console.log(`[ForceSettle] 🔓 Decrypted winning liquidator address: ${winnerAddress}`);
      console.log(`[ForceSettle] 🔓 Decrypted Vickrey second-price discount: ${winningDiscountBps} bps`);

      setSettleState('settling');

      // Step 5: Call settle() on SettlementCore with real decrypted values
      const tx = await writeContractAsync({
        address: SETTLEMENT_CORE_ADDRESS as `0x${string}`,
        abi: SETTLEMENT_CORE_ABI,
        functionName: 'settle',
        args: [
          COLLATERAL_ASSET as `0x${string}`,
          DEBT_ASSET as `0x${string}`,
          TARGET_BORROWER as `0x${string}`,
          accountData ? accountData[1] : BigInt(0), // debtToCover
          winnerAddress,
          winningDiscountBps
        ]
      });

      setSettleTx(tx);
      setSettleState('done');
    } catch (err: any) {
      console.error('[ForceSettle] error:', err);
      setSettleError(err?.shortMessage ?? err?.message ?? 'Settlement failed');
      setSettleState('error');
    }
  }, [walletClient, address, accountData, writeContractAsync]);

  const estPayout = `~${(collateralValue * (parseFloat(discount || '0') / 100)).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} USDC equiv.`;

  return (
    <RequireWallet>
      <>
      {/* Page title */}
      <motion.div variants={stagger} initial="hidden" animate="visible" style={{ marginBottom: 36 }}>
        <motion.div variants={fadeUp} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span className="app-badge app-badge--lime"><Lock size={10} /> Confidential Vickrey Auction</span>
        </motion.div>
        <motion.h1 variants={fadeUp} style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 900, textTransform: 'uppercase', lineHeight: 1.05 }}>
          Liquidator Desk
        </motion.h1>
        <motion.p variants={fadeUp} style={{ color: 'rgba(255,255,255,0.45)', marginTop: 8, fontSize: '0.9rem' }}>
          Submit blind encrypted discount bids. The winner pays the second-highest bid rate.
        </motion.p>
      </motion.div>

      {/* Two-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 20 }}>

        {/* ── LEFT: Target position ── */}
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.5 }}
          className="app-card" style={{ padding: 28 }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Active Auction</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 900 }}>
                #{String(bidCount > 0 ? bidCount : 1).padStart(4, '0')}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              <span className="app-badge app-badge--peach">HF {hfCurrent === 999 ? '∞' : hfCurrent.toFixed(2)}</span>
            </div>
          </div>

          <CipherSkeleton loaded={loaded} rows={3} widths={[100, 65, 45]}>
            {/* Borrower address */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Borrower</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'monospace', fontSize: '0.88rem', color: '#fff' }}>{truncate(TARGET_BORROWER)}</span>
                <button onClick={copyAddr} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiedAddr ? 'var(--lime)' : 'rgba(255,255,255,0.3)', padding: 2, display: 'flex' }}>
                  {copiedAddr ? <Check size={13} /> : <Copy size={13} />}
                </button>
              </div>
            </div>

            {/* Collateral / Debt */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Collateral</div>
                <div style={{ fontWeight: 700, color: 'var(--lime)', fontSize: '1.05rem' }}>${collateralValue.toLocaleString(undefined, {maximumFractionDigits: 2})}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Debt</div>
                <div style={{ fontWeight: 700, color: 'var(--peach)', fontSize: '1.05rem' }}>${debtValue.toLocaleString(undefined, {maximumFractionDigits: 2})}</div>
              </div>
            </div>

            {/* Sparkline */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Health Factor (Realtime Trend)</div>
              <Sparkline data={sparklineData} width={240} height={48} threshold={1.0} />
            </div>

            {/* Countdown ring + bid count */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '16px 20px', borderRadius: 14, background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <CountdownRing seconds={countdown} total={WINDOW_SECS} size={96} />
              <div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Auction window</div>
                {/* §17.4 — animated bid count + anonymity bits */}
                <AnimatePresence mode="popLayout">
                  <motion.div
                    key={bidCount}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    style={{ fontWeight: 700, fontSize: '1rem', lineHeight: 1.3 }}
                  >
                    <div style={{ paddingRight: 8 }}>
                      <Sparkline data={sparklineData} width={120} height={40} />
                    </div>
                    {bidCount} {bidCount === 1 ? 'bid' : 'bids'} placed
                  </motion.div>
                </AnimatePresence>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>
                  Anonymity set: {bidCount} · ~{anonymityBits(bidCount)} bits
                </div>
              </div>
            </div>
          </CipherSkeleton>
        </motion.div>

        {/* ── RIGHT: Bid form ── */}
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16, duration: 0.5 }}
          className="app-card" style={{ padding: 28 }}>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(184,242,78,0.1)', border: '1px solid rgba(184,242,78,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--lime)' }}>
                <Lock size={16} strokeWidth={1.8} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>Submit Sealed Bid</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>Client-side encryption · plaintext never leaves browser</div>
              </div>
            </div>
            
            <button onClick={() => setDiscount('8.5')} style={{ padding: '6px 12px', borderRadius: 999, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Zap size={10} color="var(--peach)" /> Auto Fill
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Discount input */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', marginBottom: 8, fontWeight: 600 }}>
                Discount Rate Bid
              </label>
              <DiscountInput value={discount} onChange={setDiscount} />
              <div style={{ marginTop: 6, fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>
                Vickrey: winning liquidator pays second-highest bid rate
              </div>
            </div>

            {/* Payout preview */}
            <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(184,242,78,0.04)', border: '1px solid rgba(184,242,78,0.1)' }}>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>Estimated payout if winner</div>
              <div style={{ fontWeight: 700, color: 'var(--lime)', fontSize: '1rem' }}>{estPayout}</div>
            </div>

            {/* Submit button — 4 states */}
            <AnimatePresence mode="wait">
              {bidState === 'idle' && (
                <motion.button key="idle" type="submit"
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={springPop}
                  style={{ padding: '14px', borderRadius: 999, background: 'var(--lime)', color: '#0f0f0f', fontWeight: 700, fontSize: '0.95rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Lock size={15} /> Encrypt &amp; Submit Bid
                </motion.button>
              )}
              {bidState === 'encrypting' && (
                <motion.div key="enc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ padding: '14px', borderRadius: 999, background: 'rgba(184,242,78,0.15)', border: '1px solid rgba(184,242,78,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: '0.95rem', fontWeight: 600, color: 'var(--lime)' }}>
                  <Loader2 size={15} style={{ animation: 'rotate-slow 0.9s linear infinite' }} />
                  Encrypting with Nox SDK…
                </motion.div>
              )}
              {bidState === 'submitted' && (
                <motion.div key="ok" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={springPop}
                  style={{ padding: '14px', borderRadius: 999, background: 'rgba(184,242,78,0.08)', border: '1px solid rgba(184,242,78,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: '0.95rem', fontWeight: 600, color: 'var(--lime)' }}>
                  <CheckCircle2 size={15} /> Bid sealed. Awaiting settlement.
                </motion.div>
              )}
              {bidState === 'error' && (
                <motion.div key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ padding: '14px', borderRadius: 999, background: 'rgba(242,201,160,0.08)', border: '1px solid rgba(242,201,160,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: '0.95rem', fontWeight: 600, color: 'var(--peach)' }}>
                  <XCircle size={15} /> Encryption failed — <button onClick={() => setBidState('idle')} style={{ background: 'none', border: 'none', color: 'var(--peach)', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', padding: 0, font: 'inherit' }}>retry</button>
                </motion.div>
              )}
            </AnimatePresence>
          </form>

          {/* Encrypted payload receipt */}
          <AnimatePresence>
            {bidState === 'submitted' && encPayload && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ marginTop: 20, padding: 16, borderRadius: 12, background: 'rgba(184,242,78,0.04)', border: '1px solid rgba(184,242,78,0.12)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Calldata payload</div>
                  <button onClick={copyTx} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiedTx ? 'var(--lime)' : 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem' }}>
                    {copiedTx ? <><Check size={11} /> Copied · still sealed</> : <><Copy size={11} /> Copy</>}
                  </button>
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: '0.68rem', color: 'rgba(255,255,255,0.6)', wordBreak: 'break-all', lineHeight: 1.6, marginBottom: 12 }}>
                  {encPayload}
                </div>
                
                <button 
                  onClick={async () => {
                    try {
                      const client = await getActiveClient();
                      if (client && address) {
                        await client.signMessage({ account: address as `0x${string}`, message: 'Decrypt my sealed bid for Skia auction #0003' });
                        const el = document.getElementById('decrypt-result');
                        if (el) el.innerHTML = `<span style="color:var(--lime)">Decrypted locally (never on-chain): ${discount}%</span>`;
                      }
                    } catch (e) {
                      console.log('Signature rejected');
                    }
                  }}
                  style={{ width: '100%', padding: '10px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <Eye size={12} /> Decrypt My Bid (Requires Signature)
                </button>
                <div id="decrypt-result" style={{ fontSize: '0.75rem', marginTop: 8, textAlign: 'center', fontWeight: 600 }}></div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Force Settle panel — manual trigger for full lifecycle */}
      <motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24, duration: 0.5 }}
        className="app-card" style={{ padding: 28, marginTop: 0, borderColor: 'rgba(242,201,160,0.15)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(242,201,160,0.08)', border: '1px solid rgba(242,201,160,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--peach)' }}>
            <CheckCircle2 size={16} strokeWidth={1.8} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>Force Settle</div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>Real end-to-end liquidation. <strong style={{ color: 'var(--peach)' }}>Requires operator/deployer wallet connected for ACL rights.</strong></div>
          </div>
        </div>

        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginBottom: 16, lineHeight: 1.6 }}>
          Calls <code style={{ color: 'var(--lime)', fontFamily: 'monospace' }}>AuctionVault.resolveVickrey()</code>, prompts your wallet to decrypt the result via the Nox SDK, then calls{' '}
          <code style={{ color: 'var(--lime)', fontFamily: 'monospace' }}>SettlementCore.settle()</code> with{' '}
          the verified winner and discount on Sepolia Aave V3.
        </div>

        <AnimatePresence mode="wait">
          {settleState === 'idle' && (
            <motion.button key="idle" onClick={handleForceSettle}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={springPop}
              style={{ padding: '12px 20px', borderRadius: 999, background: 'rgba(242,201,160,0.12)', color: 'var(--peach)', fontWeight: 700, fontSize: '0.9rem', border: '1px solid rgba(242,201,160,0.25)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <CheckCircle2 size={14} /> Trigger Settlement
            </motion.button>
          )}
          {settleState === 'resolving' && (
            <motion.div key="resolving" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--peach)', fontSize: '0.9rem', fontWeight: 600 }}
            >
              <Loader2 size={14} style={{ animation: 'rotate-slow 0.9s linear infinite' }} /> Resolving sealed auction on-chain…
            </motion.div>
          )}
          {settleState === 'decrypting' && (
            <motion.div key="decrypting" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--peach)', fontSize: '0.9rem', fontWeight: 600 }}
            >
              <Loader2 size={14} style={{ animation: 'rotate-slow 0.9s linear infinite' }} /> Requesting decryption of auction result… (Sign in wallet)
            </motion.div>
          )}
          {settleState === 'settling' && (
            <motion.div key="settling" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--peach)', fontSize: '0.9rem', fontWeight: 600 }}
            >
              <Loader2 size={14} style={{ animation: 'rotate-slow 0.9s linear infinite' }} /> Executing real liquidation + settlement…
            </motion.div>
          )}
          {settleState === 'done' && settleTx && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={springPop}
              style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--lime)', fontWeight: 600, fontSize: '0.9rem' }}>
                <CheckCircle2 size={14} /> Settlement executed!
              </div>
              <a
                href={`https://sepolia.etherscan.io/tx/${settleTx}`}
                target="_blank" rel="noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'monospace', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
              >
                <ExternalLink size={11} /> {settleTx.slice(0, 14)}···{settleTx.slice(-8)} on Etherscan
              </a>
            </motion.div>
          )}
          {settleState === 'error' && (
            <motion.div key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--peach)', fontSize: '0.9rem', fontWeight: 600 }}>
                <XCircle size={14} /> {settleError ?? 'Settlement failed'}
              </div>
              <button onClick={() => { setSettleState('idle'); setSettleError(null); }}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline', padding: 0, textAlign: 'left' }}
              >Try again</button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Status strip */}
      <div className="status-strip">
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--lime)', animation: 'pulse-glow 2s ease-in-out infinite', flexShrink: 0 }} />
        SettlementCore.sol · Sepolia
        <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
        {lastSettledTs
          ? <a href={`https://sepolia.etherscan.io/tx/${lastSettledTx}`} target="_blank" rel="noreferrer" style={{ color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}>Last settled {timeAgo(lastSettledTs)}</a>
          : <span>No settlements yet</span>
        }
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <kbd style={{ fontFamily: 'monospace', padding: '1px 5px', borderRadius: 3, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', fontSize: '0.68rem' }}>⌘K</kbd>
          command palette
        </span>
      </div>

      <CopyToast visible={copiedAddr || copiedTx} />
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Wallet Disconnected" message="Your wallet connection was dropped or hasn't fully initialized. Please ensure MetaMask is unlocked and refresh the page." />
      </>
    </RequireWallet>
  );
}
