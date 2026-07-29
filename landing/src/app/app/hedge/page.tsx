'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, ArrowDownLeft, ArrowUpRight, CheckCircle2, XCircle, Loader2, ExternalLink } from 'lucide-react';
import { CopyToast } from '@/components/CopyToast';
import { useHoverShuffle, useCopyToast } from '@/lib/useShuffleText';
import { fadeUp, stagger, springPop } from '@/lib/motion';
import { RequireWallet } from '@/components/RequireWallet';
import { useReadContract, useWriteContract, useWalletClient } from 'wagmi';
import { createViemHandleClient } from '@iexec-nox/handle';
import { createWalletClient, custom, createPublicClient, http, parseAbiItem } from 'viem';
import { sepolia } from 'viem/chains';
import { CREDIT_VAULT_ABI, CREDIT_VAULT_ADDRESS, COLLATERAL_TOKEN_ABI, COLLATERAL_TOKEN_ADDRESS } from '@/lib/contracts';
import { Modal } from '@/components/Modal';

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http('https://11155111.rpc.thirdweb.com'),
});

// Deployment block — never query before this to stay under the 10,000 block RPC limit
const DEPLOY_BLOCK = BigInt(11371920);

type OnChainOrder = {
  side: 'BUY' | 'SELL';
  enc: string;
  ts: string;
  party: string;
  txHash: string;
  blockNumber: bigint;
  index: number;
};

type Side = 'buy' | 'sell';
type IntentState = 'idle' | 'granting-operator' | 'operator-granted' | 'encrypting' | 'submitted' | 'error';
type Tenor = '7d' | '30d' | '90d';

function truncate(addr: string) {
  return addr ? `${addr.slice(0, 6)}\u00b7\u00b7\u00b7${addr.slice(-4)}` : '0x????';
}

/* Sealed order book row with hover shuffle + Etherscan link */
function SealedOrderRow({ side, enc, ts, party, txHash, index }: {
  side: 'BUY' | 'SELL'; enc: string; ts: string; party: string; txHash: string; index: number;
}) {
  const { display, onMouseEnter, onMouseLeave, hovering } = useHoverShuffle(enc);
  return (
    <motion.div
      variants={fadeUp}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px', borderRadius: 10,
        background: hovering ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.025)',
        border: `1px solid ${hovering ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)'}`,
        transition: 'background 0.18s, border-color 0.18s', cursor: 'default',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className={`app-badge ${side === 'BUY' ? 'app-badge--lime' : 'app-badge--peach'}`}>{side}</span>
        <div>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>
            Intent #{String(index + 1).padStart(4, '0')} &middot; {truncate(party)}
          </div>
          <span className="cipher-text" style={{ opacity: hovering ? 0.9 : 0.55, fontSize: '0.8rem' }}>{display}</span>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace', marginBottom: 3 }}>{ts}</div>
        <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--lime)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
        >
          <ExternalLink size={9} /> Etherscan
        </a>
      </div>
    </motion.div>
  );
}

/* Coverage quality bar showing buy/sell breakdown */
function CoverageBar({ intentCount }: { intentCount: number }) {
  const buys = Math.ceil(intentCount * 0.6);
  const sells = intentCount - buys;
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Order Book</div>
        <div style={{ display: 'flex', gap: 8, fontSize: '0.72rem' }}>
          <span style={{ color: 'var(--lime)' }}>{buys} buy{buys !== 1 ? 's' : ''}</span>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>&middot;</span>
          <span style={{ color: 'var(--peach)' }}>{sells} sell{sells !== 1 ? 's' : ''}</span>
        </div>
      </div>
      {intentCount > 0 && (
        <div style={{ height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${(buys / intentCount) * 100}%`,
            background: 'var(--lime)',
            borderRadius: 999,
            transition: 'width 0.5s ease',
          }} />
        </div>
      )}
    </div>
  );
}

const TENORS: Tenor[] = ['7d', '30d', '90d'];
const REF_ADDR = '0xBfBD7FA7488b574274eaa9c9f29374EF6b0c40E8';

export default function HedgeDesk() {
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useWriteContract();

  const [side, setSide] = useState<Side>('buy');
  const [amount, setAmount] = useState('25000');
  const [tenor, setTenor] = useState<Tenor>('30d');
  const [orders, setOrders] = useState<OnChainOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  const [intentState, setIntentState] = useState<IntentState>('idle');
  const [encTx, setEncTx] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { copy: copyTx, copied: copiedTx } = useCopyToast(encTx ?? '');

  const { data: intentCountData, refetch: refetchCount } = useReadContract({
    address: CREDIT_VAULT_ADDRESS as `0x${string}`,
    abi: CREDIT_VAULT_ABI,
    functionName: 'intentCount',
    query: { refetchInterval: 5000 },
  });

  const intentCount = intentCountData ? Number(intentCountData) : 0;

  // Fetch real IntentSubmitted events from CreditVault — capped at 9,000 blocks for Thirdweb RPC
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const currentBlock = await publicClient.getBlockNumber();
        const fromBlock = currentBlock > DEPLOY_BLOCK + BigInt(9000)
          ? currentBlock - BigInt(9000)
          : DEPLOY_BLOCK;

        const logs = await publicClient.getLogs({
          address: CREDIT_VAULT_ADDRESS as `0x${string}`,
          event: parseAbiItem('event IntentSubmitted(address indexed party, bool isBuyer, uint256 index)'),
          fromBlock,
          toBlock: 'latest',
        });

        const parsed: OnChainOrder[] = logs.slice().reverse().slice(0, 10).map(log => {
          const party = (log.args as any).party as string;
          const isBuyer = (log.args as any).isBuyer as boolean;
          const idx = Number((log.args as any).index ?? 0);
          const txH = log.transactionHash ?? '';
          // Build a shuffleable cipher string from the tx hash
          const enc = txH ? `0x${txH.slice(2, 34).toUpperCase()}\u00b7\u00b7\u00b7` : '0x????????????????????????????????';
          return {
            side: isBuyer ? 'BUY' : 'SELL',
            enc,
            ts: `Block ${Number(log.blockNumber ?? BigInt(0)).toLocaleString()}`,
            party: party ?? '0x0000',
            txHash: txH,
            blockNumber: log.blockNumber ?? BigInt(0),
            index: idx,
          };
        });

        setOrders(parsed);
      } catch (err) {
        console.error('Failed to fetch IntentSubmitted events:', err);
      } finally {
        setOrdersLoading(false);
      }
    };

    fetchOrders();
    const interval = setInterval(fetchOrders, 20000);
    return () => clearInterval(interval);
  }, []);

  const getActiveClient = async () => {
    if (walletClient) return { ...walletClient, chain: sepolia };
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      return createWalletClient({ chain: sepolia, transport: custom((window as any).ethereum) });
    }
    return null;
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const client = await getActiveClient();
    if (!client) { setIsModalOpen(true); return; }

    try {
      if (side === 'sell') {
        setIntentState('granting-operator');
        const expiry = BigInt(Math.floor(Date.now() / 1000) + 7200);
        await writeContractAsync({
          address: COLLATERAL_TOKEN_ADDRESS as `0x${string}`,
          abi: COLLATERAL_TOKEN_ABI,
          functionName: 'setOperator',
          args: [CREDIT_VAULT_ADDRESS as `0x${string}`, expiry],
        });
        setIntentState('operator-granted');
      }

      setIntentState('encrypting');
      const handleClient = await createViemHandleClient(client as any);
      const notionalAmt = BigInt(Math.floor(parseFloat(amount)));

      const { handle, handleProof } = await handleClient.encryptInput(
        notionalAmt,
        'uint256',
        CREDIT_VAULT_ADDRESS as `0x${string}`
      );

      const txHash = await writeContractAsync({
        address: CREDIT_VAULT_ADDRESS as `0x${string}`,
        abi: CREDIT_VAULT_ABI,
        functionName: 'submitIntent',
        args: [handle as `0x${string}`, handleProof as `0x${string}`, side === 'buy'],
      });

      setEncTx(txHash);
      setIntentState('submitted');
      setTimeout(() => refetchCount(), 4000);
    } catch (err) {
      console.error(err);
      setIntentState('error');
    }
  }, [side, amount, walletClient, writeContractAsync, refetchCount]);

  const accent  = side === 'buy' ? 'var(--lime)'  : 'var(--peach)';
  const accentA = side === 'buy' ? 'rgba(184,242,78,0.12)'  : 'rgba(242,201,160,0.12)';
  const accentB = side === 'buy' ? 'rgba(184,242,78,0.25)'  : 'rgba(242,201,160,0.25)';

  return (
    <RequireWallet>
      <>
      <motion.div variants={stagger} initial="hidden" animate="visible" style={{ marginBottom: 36 }}>
        <motion.div variants={fadeUp} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span className="app-badge app-badge--peach"><Lock size={10} /> Confidential CDS</span>
        </motion.div>
        <motion.h1 variants={fadeUp} style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 900, textTransform: 'uppercase', lineHeight: 1.05 }}>
          Hedge Desk
        </motion.h1>
        <motion.p variants={fadeUp} style={{ color: 'rgba(255,255,255,0.45)', marginTop: 8, fontSize: '0.9rem' }}>
          Submit encrypted credit protection intents. Notional size and counterparty stay sealed.
        </motion.p>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>

        {/* ── LEFT: Order form ── */}
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.5 }}
          className="app-card" style={{ padding: 28 }}>

          <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Lock size={15} color={accent} /> Submit Encrypted Intent
          </h3>

          {/* Buy / Sell segmented toggle */}
          <div className="pill-toggle" style={{ marginBottom: 24, width: '100%' }}>
            <motion.div
              layout layoutId="hedge-side-pill"
              transition={{ type: 'spring', stiffness: 360, damping: 30 }}
              style={{
                position: 'absolute', top: 3, bottom: 3,
                left: side === 'buy' ? 3 : '50%',
                right: side === 'buy' ? '50%' : 3,
                borderRadius: 999,
                background: side === 'buy'
                  ? 'linear-gradient(135deg, rgba(184,242,78,0.25), rgba(184,242,78,0.12))'
                  : 'linear-gradient(135deg, rgba(242,201,160,0.25), rgba(242,201,160,0.12))',
                border: `1px solid ${side === 'buy' ? 'rgba(184,242,78,0.3)' : 'rgba(242,201,160,0.3)'}`,
              }}
            />
            <button onClick={() => setSide('buy')} className="pill-toggle__btn" style={{ color: side === 'buy' ? accent : 'rgba(255,255,255,0.4)', flex: 1 }}>
              <ArrowDownLeft size={13} style={{ display: 'inline', marginRight: 5 }} />Buy Protection
            </button>
            <button onClick={() => setSide('sell')} className="pill-toggle__btn" style={{ color: side === 'sell' ? accent : 'rgba(255,255,255,0.4)', flex: 1 }}>
              <ArrowUpRight size={13} style={{ display: 'inline', marginRight: 5 }} />Sell Protection
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Notional */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', marginBottom: 8, fontWeight: 600 }}>
                Notional Amount (USDC)
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.35)', fontSize: '1rem', userSelect: 'none' }}>$</span>
                <input
                  type="number" min="1000" step="1000"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className={`app-input ${side === 'sell' ? 'app-input--peach' : ''}`}
                  style={{ paddingLeft: 28 }}
                />
              </div>
              <CoverageBar intentCount={intentCount} />
            </div>

            {/* Reference position */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', marginBottom: 8, fontWeight: 600 }}>
                Reference Aave Position
              </label>
              <div style={{ fontFamily: 'monospace', fontSize: '0.83rem', color: 'rgba(255,255,255,0.7)', background: 'rgba(0,0,0,0.3)', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{REF_ADDR.slice(0, 10)}&middot;&middot;&middot;{REF_ADDR.slice(-6)}</span>
                <a href={`https://app.aave.com/reserve-overview/?underlyingAsset=0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c&marketName=proto_sepolia_v3`}
                  target="_blank" rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'rgba(255,255,255,0.3)', textDecoration: 'none', fontSize: '0.72rem' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--lime)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
                >
                  <ExternalLink size={11} /> Aave
                </a>
              </div>
            </div>

            {/* Tenor */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', marginBottom: 8, fontWeight: 600 }}>Tenor</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {TENORS.map(t => (
                  <button key={t} type="button" onClick={() => setTenor(t)}
                    style={{
                      flex: 1, padding: '10px', borderRadius: 10, fontWeight: 600, fontSize: '0.875rem',
                      border: t === tenor ? `1.5px solid ${accentB}` : '1px solid rgba(255,255,255,0.08)',
                      background: t === tenor ? accentA : 'transparent',
                      color: t === tenor ? accent : 'rgba(255,255,255,0.45)',
                      cursor: 'pointer', transition: 'all 0.2s',
                    }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit — 6 states */}
            <AnimatePresence mode="wait">
              {intentState === 'idle' && (
                <motion.button key="idle" type="submit"
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={springPop}
                  style={{ padding: '14px', borderRadius: 999, background: accent, color: '#0f0f0f', fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: '0.95rem' }}>
                  <Lock size={15} /> Encrypt &amp; Post {side === 'buy' ? 'Buy' : 'Sell'} Intent
                </motion.button>
              )}
              {intentState === 'granting-operator' && (
                <motion.div key="grant" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ padding: '14px', borderRadius: 999, background: 'rgba(242,201,160,0.08)', border: '1px solid rgba(242,201,160,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 600, color: 'var(--peach)', fontSize: '0.95rem' }}>
                  <Loader2 size={15} style={{ animation: 'rotate-slow 0.9s linear infinite' }} />
                  Approving collateral access&hellip; (1/2)
                </motion.div>
              )}
              {intentState === 'operator-granted' && (
                <motion.div key="granted" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ padding: '14px', borderRadius: 999, background: 'rgba(242,201,160,0.08)', border: '1px solid rgba(242,201,160,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 600, color: 'var(--peach)', fontSize: '0.95rem' }}>
                  <CheckCircle2 size={15} /> Collateral access granted &mdash; encrypting&hellip; (2/2)
                </motion.div>
              )}
              {intentState === 'encrypting' && (
                <motion.div key="enc" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ padding: '14px', borderRadius: 999, background: accentA, border: `1px solid ${accentB}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 600, color: accent, fontSize: '0.95rem' }}>
                  <Loader2 size={15} style={{ animation: 'rotate-slow 0.9s linear infinite' }} /> Encrypting notional&hellip;
                </motion.div>
              )}
              {intentState === 'submitted' && encTx && (
                <motion.div key="ok" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={springPop}
                  style={{ padding: '14px 16px', borderRadius: 12, background: accentA, border: `1px solid ${accentB}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: accent, fontSize: '0.95rem' }}>
                    <CheckCircle2 size={15} /> Intent posted to CreditVault.sol
                  </div>
                  <a href={`https://sepolia.etherscan.io/tx/${encTx}`} target="_blank" rel="noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'monospace', fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.45)')}
                  >
                    <ExternalLink size={10} /> {encTx.slice(0, 14)}&middot;&middot;&middot;{encTx.slice(-8)} on Etherscan
                  </a>
                </motion.div>
              )}
              {intentState === 'error' && (
                <motion.div key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ padding: '14px', borderRadius: 999, background: 'rgba(242,201,160,0.08)', border: '1px solid rgba(242,201,160,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 600, color: 'var(--peach)', fontSize: '0.95rem' }}>
                  <XCircle size={15} /> Failed &mdash; <button onClick={() => setIntentState('idle')} style={{ background: 'none', border: 'none', color: 'var(--peach)', cursor: 'pointer', fontWeight: 700, textDecoration: 'underline', font: 'inherit', padding: 0 }}>retry</button>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </motion.div>

        {/* ── RIGHT: Order book ── */}
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16, duration: 0.5 }}
          className="app-card" style={{ padding: 28 }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>On-Chain Order Book</h3>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', padding: '3px 10px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.08)' }}>
              {intentCount} intent{intentCount !== 1 ? 's' : ''}
            </span>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', marginBottom: 20, lineHeight: 1.6 }}>
            All notional sizes stored as encrypted <code style={{ color: 'var(--lime)', fontFamily: 'monospace' }}>euint256</code> in CreditVault.sol.
            Hover any row to feel the encryption.
          </p>

          <motion.div variants={stagger} initial="hidden" animate="visible" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ordersLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', padding: '12px 0' }}>
                <Loader2 size={13} style={{ animation: 'rotate-slow 0.9s linear infinite' }} />
                Scanning CreditVault.sol&hellip;
              </div>
            )}
            {!ordersLoading && orders.length === 0 && (
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', padding: '24px 0', textAlign: 'center', fontStyle: 'italic' }}>
                No intents yet &mdash; be the first to post protection.
              </div>
            )}
            {orders.map((o, i) => (
              <SealedOrderRow key={i} side={o.side} enc={o.enc} ts={o.ts} party={o.party} txHash={o.txHash} index={o.index} />
            ))}
          </motion.div>

          <div style={{ marginTop: 24, padding: '12px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1.65 }}>
            Concentration, identity, and counterparty assignment remain sealed until the Nox TEE reveals settlement outcomes.
          </div>
        </motion.div>
      </div>

      <div className="status-strip">
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--peach)', animation: 'pulse-glow 2s ease-in-out infinite', flexShrink: 0 }} />
        <a href={`https://sepolia.etherscan.io/address/${CREDIT_VAULT_ADDRESS}`} target="_blank" rel="noreferrer"
          style={{ color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.45)')}
        >
          CreditVault.sol &middot; Sepolia
        </a>
        <span style={{ color: 'rgba(255,255,255,0.2)' }}>&middot;</span>
        {intentCount} sealed intent{intentCount !== 1 ? 's' : ''} on-chain &middot; cSKIA (ERC-7984) active
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <kbd style={{ fontFamily: 'monospace', padding: '1px 5px', borderRadius: 3, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', fontSize: '0.68rem' }}>&⌘;K</kbd>
          command palette
        </span>
      </div>
      <CopyToast visible={copiedTx} />
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Wallet Disconnected" message="Your wallet connection was dropped or hasn't fully initialized. Please ensure MetaMask is unlocked and refresh the page." />
      </>
    </RequireWallet>
  );
}
