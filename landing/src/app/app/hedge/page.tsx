'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, ArrowDownLeft, ArrowUpRight, CheckCircle2, XCircle, Loader2, Copy, Check } from 'lucide-react';
import { CopyToast } from '@/components/CopyToast';
import { useHoverShuffle, useCopyToast } from '@/lib/useShuffleText';
import { fadeUp, stagger, springPop } from '@/lib/motion';
import { RequireWallet } from '@/components/RequireWallet';
import { useAccount, useReadContract, useWriteContract, useWalletClient } from 'wagmi';
import { createViemHandleClient } from '@iexec-nox/handle';
import { formatUnits, formatEther, parseUnits, isAddress, createWalletClient, custom, createPublicClient, http, parseAbiItem } from 'viem';
import { sepolia } from 'viem/chains';
import { CREDIT_VAULT_ABI, CREDIT_VAULT_ADDRESS, COLLATERAL_TOKEN_ABI, COLLATERAL_TOKEN_ADDRESS } from '@/lib/contracts';
import { Modal } from '@/components/Modal';

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http('https://11155111.rpc.thirdweb.com'),
});

type OnChainOrder = { side: 'BUY' | 'SELL'; enc: string; ts: string; party: string; };

type Side = 'buy' | 'sell';
// 'granting-operator' = setOperator tx in-flight (seller pre-flight, explicit UI state)
// 'operator-granted'  = setOperator confirmed, now proceeding to encrypt + submitIntent
type IntentState = 'idle' | 'granting-operator' | 'operator-granted' | 'encrypting' | 'submitted' | 'error';
type Tenor = '7d' | '30d' | '90d';

/* §17.3 — sealed order book row with hover shuffle */
function SealedOrderRow({ side, enc, ts }: { side: 'BUY' | 'SELL'; enc: string; ts: string }) {
  const { display, onMouseEnter, onMouseLeave, hovering } = useHoverShuffle(enc);
  return (
    <motion.div
      variants={fadeUp}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderRadius: 10,
        background: hovering ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.025)',
        border: `1px solid ${hovering ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)'}`,
        transition: 'background 0.18s, border-color 0.18s', cursor: 'default',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className={`app-badge ${side === 'BUY' ? 'app-badge--lime' : 'app-badge--peach'}`}>{side}</span>
        <span className="cipher-text" style={{ opacity: hovering ? 0.9 : 0.55 }}>{display}</span>
      </div>
      <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>{ts}</span>
    </motion.div>
  );
}

/* Coverage quality bar */
function CoverageBar({ intentCount }: { intentCount: number }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Order Book (Encrypted Intents)</div>
        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>{intentCount} Intents</div>
      </div>
    </div>
  );
}

const TENORS: Tenor[] = ['7d', '30d', '90d'];
// Real borrower address — same as Liquidator Desk
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
    query: { refetchInterval: 5000 }
  });

  const intentCount = intentCountData ? Number(intentCountData) : 0;

  // Fetch real IntentSubmitted events from CreditVault
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        let currentBlock = await publicClient.getBlockNumber();
        if (currentBlock < BigInt(11330000)) {
          currentBlock = BigInt(11337000);
        }
        const fromBlock = currentBlock - BigInt(9000);
        const logs = await publicClient.getLogs({
          address: CREDIT_VAULT_ADDRESS as `0x${string}`,
          event: parseAbiItem('event IntentSubmitted(address indexed party, bool isBuyer, uint256 index)'),
          fromBlock: fromBlock,
          toBlock: 'latest',
        });

        const parsed: OnChainOrder[] = logs.reverse().slice(0, 10).map(log => {
          const party = (log.args as any).party as string;
          const isBuyer = (log.args as any).isBuyer as boolean;
          const enc = log.transactionHash ? `${log.transactionHash.slice(0, 14)}` : '0x????';
          return {
            side: isBuyer ? 'BUY' : 'SELL',
            enc,
            ts: `Block ${Number(log.blockNumber ?? BigInt(0)).toLocaleString()}`,
            party,
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
      // ── Seller pre-flight: grant CreditVault operator rights on CollateralToken ──
      // ERC-7984 has no approve(). The vault must be an operator to call
      // confidentialTransferFrom(seller -> vault) inside submitIntent().
      // This is a separate on-chain tx, shown as its own UI state.
      if (side === 'sell') {
        setIntentState('granting-operator');
        // Grant for 2 hours — enough for the demo session.
        const expiry = BigInt(Math.floor(Date.now() / 1000) + 7200);
        await writeContractAsync({
          address: COLLATERAL_TOKEN_ADDRESS as `0x${string}`,
          abi: COLLATERAL_TOKEN_ABI,
          functionName: 'setOperator',
          args: [CREDIT_VAULT_ADDRESS as `0x${string}`, expiry],
        });
        setIntentState('operator-granted');
      }

      // ── Encrypt notional and submit intent ────────────────────────────────────
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
        args: [handle as `0x${string}`, handleProof as `0x${string}`, side === 'buy']
      });

      setEncTx(txHash);
      setIntentState('submitted');
    } catch (err) {
      console.error(err);
      setIntentState('error');
    }
  }, [side, amount, walletClient, writeContractAsync]);

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
            {/* Animated background pill */}
            <motion.div
              layout
              layoutId="hedge-side-pill"
              transition={{ type: 'spring', stiffness: 360, damping: 30 }}
              style={{
                position: 'absolute',
                top: 3, bottom: 3,
                left: side === 'buy' ? 3 : '50%',
                right: side === 'buy' ? '50%' : 3,
                borderRadius: 999,
                background: side === 'buy'
                  ? 'linear-gradient(135deg, rgba(184,242,78,0.25), rgba(184,242,78,0.12))'
                  : 'linear-gradient(135deg, rgba(242,201,160,0.25), rgba(242,201,160,0.12))',
                border: `1px solid ${side === 'buy' ? 'rgba(184,242,78,0.3)' : 'rgba(242,201,160,0.3)'}`,
              }}
            />
            <button onClick={() => setSide('buy')}
              className="pill-toggle__btn"
              style={{ color: side === 'buy' ? accent : 'rgba(255,255,255,0.4)', flex: 1 }}>
              <ArrowDownLeft size={13} style={{ display: 'inline', marginRight: 5 }} />
              Buy Protection
            </button>
            <button onClick={() => setSide('sell')}
              className="pill-toggle__btn"
              style={{ color: side === 'sell' ? accent : 'rgba(255,255,255,0.4)', flex: 1 }}>
              <ArrowUpRight size={13} style={{ display: 'inline', marginRight: 5 }} />
              Sell Protection
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
                <span>{REF_ADDR.slice(0, 10)}···{REF_ADDR.slice(-6)}</span>
                <button onClick={() => navigator.clipboard.writeText(REF_ADDR)} type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 2, display: 'flex' }}>
                  <Copy size={13} />
                </button>
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

            {/* Submit — 6 states: idle / granting-operator / operator-granted / encrypting / submitted / error */}
            <AnimatePresence mode="wait">
              {intentState === 'idle' && (
                <motion.button key="idle" type="submit"
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={springPop}
                  style={{ padding: '14px', borderRadius: 999, background: accent, color: '#0f0f0f', fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: '0.95rem', transition: 'background 0.3s' }}>
                  <Lock size={15} /> Encrypt &amp; Post {side === 'buy' ? 'Buy' : 'Sell'} Intent
                </motion.button>
              )}
              {intentState === 'granting-operator' && (
                <motion.div key="grant" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ padding: '14px', borderRadius: 999, background: 'rgba(242,201,160,0.08)', border: '1px solid rgba(242,201,160,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 600, color: 'var(--peach)', fontSize: '0.95rem' }}>
                  <Loader2 size={15} style={{ animation: 'rotate-slow 0.9s linear infinite' }} />
                  Approving collateral access… (1/2)
                </motion.div>
              )}
              {intentState === 'operator-granted' && (
                <motion.div key="granted" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ padding: '14px', borderRadius: 999, background: 'rgba(242,201,160,0.08)', border: '1px solid rgba(242,201,160,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 600, color: 'var(--peach)', fontSize: '0.95rem' }}>
                  <CheckCircle2 size={15} />
                  Collateral access granted — encrypting… (2/2)
                </motion.div>
              )}
              {intentState === 'encrypting' && (
                <motion.div key="enc" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ padding: '14px', borderRadius: 999, background: accentA, border: `1px solid ${accentB}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 600, color: accent, fontSize: '0.95rem' }}>
                  <Loader2 size={15} style={{ animation: 'rotate-slow 0.9s linear infinite' }} />
                  Encrypting notional…
                </motion.div>
              )}
              {intentState === 'submitted' && (
                <motion.div key="ok" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={springPop}
                  style={{ padding: '14px', borderRadius: 999, background: accentA, border: `1px solid ${accentB}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 600, color: accent, fontSize: '0.95rem' }}>
                  <CheckCircle2 size={15} /> Intent posted to CreditVault.sol
                </motion.div>
              )}
              {intentState === 'error' && (
                <motion.div key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ padding: '14px', borderRadius: 999, background: 'rgba(242,201,160,0.08)', border: '1px solid rgba(242,201,160,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 600, color: 'var(--peach)', fontSize: '0.95rem' }}>
                  <XCircle size={15} /> Failed — <button onClick={() => setIntentState('idle')} style={{ background: 'none', border: 'none', color: 'var(--peach)', cursor: 'pointer', fontWeight: 700, textDecoration: 'underline', font: 'inherit', padding: 0 }}>retry</button>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </motion.div>

        {/* ── RIGHT: Order book ── */}
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16, duration: 0.5 }}
          className="app-card" style={{ padding: 28 }}>

          <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 8 }}>On-Chain Order Book</h3>
          <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', marginBottom: 20, lineHeight: 1.6 }}>
            All notional sizes stored as encrypted <code style={{ color: 'var(--lime)', fontFamily: 'monospace' }}>euint256</code> in CreditVault.sol.
            Hover any row to feel the encryption.
          </p>

          <motion.div variants={stagger} initial="hidden" animate="visible" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ordersLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', padding: '12px 0' }}>
                <Loader2 size={13} style={{ animation: 'rotate-slow 0.9s linear infinite' }} />
                Scanning CreditVault.sol…
              </div>
            )}
            {!ordersLoading && orders.length === 0 && (
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', padding: '12px 0', fontStyle: 'italic' }}>
                No intents yet — be the first.
              </div>
            )}
            {orders.map((o, i) => <SealedOrderRow key={i} side={o.side} enc={o.enc} ts={o.ts} />)}
          </motion.div>

          <div style={{ marginTop: 24, padding: '12px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1.65 }}>
            Concentration, identity, and counterparty assignment remain sealed until the Nox TEE reveals settlement outcomes.
          </div>
        </motion.div>
      </div>

      <div className="status-strip">
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--peach)', flexShrink: 0 }} />
        CreditVault.sol · Sepolia
        <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
        cSKIA (ERC-7984) active
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <kbd style={{ fontFamily: 'monospace', padding: '1px 5px', borderRadius: 3, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', fontSize: '0.68rem' }}>⌘K</kbd>
          command palette
        </span>
      </div>
      <CopyToast visible={copiedTx} />
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Wallet Disconnected" message="Your wallet connection was dropped or hasn't fully initialized. Please ensure MetaMask is unlocked and refresh the page." />
      </>
    </RequireWallet>
  );
}
