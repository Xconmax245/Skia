# Skia — Hackathon Feedback & Build Notes

> Developer experience report for the **iExec Nox Hackathon**.
> Written by the Skia team after building a confidential liquidation + CDS protocol on Nox.

---

## What We Built

Skia is a two-sided DeFi primitive that adds confidentiality to Aave V3 liquidations and credit protection:

- **AuctionVault.sol** — Sealed-bid Vickrey liquidation auction. Liquidators encrypt discount bids client-side. The Nox TEE runs `resolveVickrey()` to find the winner without exposing any individual bid.
- **CreditVault.sol** — Confidential CDS order book. Buyers and sellers encrypt notional USDC sizes and post intents. Matching runs inside the TEE.
- **SettlementCore.sol** — Single settlement hub. Validates TEE attestations and calls Aave's `liquidationCall()` with WETH collateral and USDC debt on Sepolia.
- **CollateralToken (cSKIA)** — ERC-7984 confidential token. CDS sellers post encrypted margin without revealing their position size.

The frontend is a Next.js app with live on-chain data, real `encryptInput()` encryption, and a privacy toggle that blurs sensitive data in "sealed" mode.

---

## What Worked Really Well

### 1. `@iexec-nox/handle` — Exceptionally Clean DX

The `createViemHandleClient` → `encryptInput()` pattern was the most pleasant part of the build. The API is:

```typescript
const handleClient = await createViemHandleClient(walletClient);
const { handle, handleProof } = await handleClient.encryptInput(
  value, 'uint256', contractAddress
);
```

That's it. Three lines to produce an on-chain-ready encrypted handle with a ZK proof. The fact that it integrates with `viem`'s `WalletClient` directly (rather than requiring its own keystore or signing flow) made it drop into our RainbowKit setup with zero friction.

**The `externalEuint256` / `euint256` type distinction in Solidity** was also well-designed. The separation between "input from outside" (requires proof) and "internal handle" (trusted, already on-chain) made the contract logic clear and the footgun surface small.

### 2. The ERC-7984 Token Standard

ERC-7984 is the right abstraction for confidential DeFi collateral. The `setOperator(spender, until)` pattern is strictly better than ERC-20 `approve()`:
- Time-limited (can't be left open permanently)
- Gas-efficient (one call instead of approve + transferFrom setup)
- Semantically clearer (delegation, not allowance)

The `confidentialBalanceOf()` → `euint256` pattern is intuitive for developers familiar with ERC-20 — same surface, confidential semantics.

### 3. Nox Sealed Computation Model (TEE)

The mental model of "encrypt client-side, store on EVM, decrypt in TEE, attest result" is elegant and maps well to DeFi liquidation mechanics. The key insight — that the TEE is a **decryption oracle with attestation** rather than a black box — made it tractable to reason about security assumptions.

Compared to MPC or fully on-chain FHE approaches, the TEE model's latency and cost profile is appropriate for liquidation-style workloads where you have a ~30s settlement window.

---

## Friction Points & What We'd Improve

### 1. Sepolia RPC `eth_getLogs` Range Limit

**Issue:** Thirdweb's free Sepolia RPC limits `eth_getLogs` to a 10,000-block range. Since our contracts were deployed at block ~11,371,920 and Sepolia advances ~4,800 blocks/day, the logs from deployment quickly fell outside the default "fromBlock: deploymentBlock, toBlock: latest" range.

**Symptom:** Silent RPC failures (no throw, just an empty array) caused the activity feed, bid count, and intent order book to all show "0" or "No data yet" despite real on-chain events.

**Our fix:**
```typescript
const DEPLOY_BLOCK = BigInt(11371920);
const fromBlock = currentBlock > DEPLOY_BLOCK + BigInt(9000)
  ? currentBlock - BigInt(9000)
  : DEPLOY_BLOCK;
```

**What would help:** A free Sepolia RPC with a wider `eth_getLogs` range in the hackathon starter kit, or a recommendation to use Alchemy/Infura with the free tier for event fetching.

### 2. `externalEuint256` vs `euint256` — Documentation Gap

The distinction between `externalEuint256` (Solidity type for handle inputs that require proof verification) and `euint256` (internal encrypted values) is critical to getting the ABI right. We initially deployed with the wrong type on a function parameter and had confusing ABI mismatches.

A clear "input types vs. internal types" section in the Nox Hardhat plugin README would have saved ~2 hours of debugging. We eventually found the right pattern from the plugin's example contracts.

### 3. `createViemHandleClient` Initialization Timing

In Next.js with RainbowKit, `walletClient` from `useWalletClient()` is `undefined` for the first render cycle (before the user has connected their wallet). Calling `createViemHandleClient(undefined)` throws a non-obvious error.

**Workaround we used:** Fall back to `window.ethereum`:
```typescript
const getActiveClient = async () => {
  if (walletClient) return { ...walletClient, chain: sepolia };
  if (window.ethereum) return createWalletClient({ chain: sepolia, transport: custom(window.ethereum) });
  return null;
};
```

A note in the docs about SSR/hydration timing would prevent this footgun for Next.js builders.

### 4. No `euint256` Comparison / Sorting Outside TEE

By design, you cannot compare two `euint256` values in Solidity without going through the TEE. This is correct from a security standpoint but means any contract logic that "should be simple" (e.g., checking if a new bid is lower than the current minimum) requires a TEE round-trip.

For our Vickrey auction this is fine — we batch all comparisons into one TEE call. But for more complex protocols (e.g., confidential AMMs, confidential order books with partial fills), the "no comparisons outside TEE" constraint forces a more carefully designed state machine.

**Suggestion:** A Nox cookbook section for common patterns (Vickrey auction, sealed order book, confidential AMM constant product) would be very valuable.

### 5. Hardhat Config (`hardhat.config.cjs` vs `.ts`)

The `nox-hardhat-plugin` required a `.cjs` config file rather than `.ts`. This broke TypeScript users' normal workflow (we use TS everywhere else). We ended up maintaining two config files: `hardhat.config.ts` (for IDE type checking) and `hardhat.config.cjs` (for actual compilation). A TS-native plugin config would streamline this significantly.

---

## Performance Observations

| Operation | Observed latency |
|---|---|
| `encryptInput()` (browser) | ~200–400ms (includes key derivation) |
| `submitBid()` tx confirmation | ~12–20s (Sepolia block time) |
| `resolveVickrey()` + TEE | ~30–60s (TEE scheduling + execution) |
| `settle()` tx confirmation | ~12–20s |
| End-to-end (bid → settlement) | ~2–3 minutes |

The TEE scheduling latency (30–60s) is the bottleneck for production use. For liquidation, a 30-second window is often acceptable (most Aave liquidations resolve within 60s on mainnet). For real-time applications (e.g., HFT or streaming settlement), this would need to be addressed at the infrastructure layer.

---

## Security Assumptions We Made

1. **TEE correctness:** We trust that Intel SGX correctly enforces the enclave isolation guarantee. Nox's distributed key scheme means the Nox network operator cannot read encrypted inputs.

2. **Keeper centralization:** In our demo, the `resolveVickrey()` call is made by the deployer EOA. In production, this should be a Nox task triggered by an on-chain event watcher, removing the centralization.

3. **Aave liquidation mechanics:** We relied on Aave V3's `liquidationCall()` working correctly on Sepolia. In practice, the test position has zero collateral (the `create-position.ts` script ran, but the account has no real Sepolia WETH), so the actual Aave call would revert. We have a UI fallback showing demo values while the TEE attestation and smart contract paths are fully functional.

4. **No formal audit:** This is a hackathon build. AuctionVault's `resolveVickrey()` loop has O(n²) worst case complexity. CreditVault's greedy matching is not optimal. SettlementCore has no reentrancy guard. These are acceptable for a prototype; not for production.

---

## What We Would Build Next

1. **Nox task automation:** Move the keeper to a Nox iExec task so `resolveVickrey()` triggers automatically when a position's HF < 1.0. This eliminates the centralised keeper EOA.

2. **Partial-fill CDS matching:** The current greedy matcher in CreditVault creates one-to-one matches. A production system needs partial fills (one $100k sell intent covering multiple $25k buy intents).

3. **Cross-chain position monitoring:** Monitor positions on Ethereum mainnet but settle confidentially — using Nox's cross-chain attestation capabilities.

4. **Confidential AMM:** Apply the same `euint256` + TEE model to a constant-product AMM where swap sizes are hidden until settled, eliminating sandwich attacks structurally.

5. **Live Sepolia keeper:** Fund the test borrower position with real Sepolia WETH and run the full liquidation flow end-to-end with real Aave calls.

---

## Summary

Skia demonstrates that confidential liquidation mechanics — sealed-bid Vickrey auctions that are structurally front-run-proof — are buildable on Nox today, in a real-world DeFi context (Aave V3). The `@iexec-nox/handle` SDK is genuinely excellent. The primary friction was infrastructure (RPC limits, TS config), not the core Nox programming model.

The ERC-7984 + Nox TEE stack is compelling for any DeFi use case where bid/order confidentiality materially affects market quality. We're excited to see what the broader ecosystem builds on it.

---

*Skia v0.1 — Built for iExec Nox Hackathon — Sepolia testnet*
*Contracts deployed at block 11,371,920*
