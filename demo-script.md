# Skia — Demo Video Script & Voiceover

**CRITICAL TECHNICAL WARNING BEFORE YOU RECORD:**
If you choose to use **Section 5A** (the live, on-chain execution of `SettlementCore.settle()`), you **MUST** ensure the `SettlementCore` contract address has enough Sepolia USDC to cover the `debtToCover` amount *before* the keeper executes.
Why? In `SettlementCore.sol`, the contract approves Aave to pull the debt (`IERC20(debtAsset).approve(...)`), and then calls `aavePool.liquidationCall()`. If `SettlementCore` itself does not hold the USDC, the Aave call will revert with `ERC20: transfer amount exceeds balance` and the entire transaction will fail on camera. 
If you haven't funded `SettlementCore` with USDC, **use Section 5B (the `test-settle.ts` verification run)** instead to avoid a live revert!

---

Hard cap: 4 minutes, per the iExec WTF hackathon rules. Total scripted runtime below lands around 3:50, leaving buffer for pacing. Every line is written in the plain, direct, no-exclamation-point voice already locked in for the product — read it like you're explaining something to a peer, not pitching to a crowd.

Two honesty rules to follow while recording, non-negotiable given everything already verified in this build:
- Anything that happened via `simulate-bidders.ts` / `simulate-hedgers.ts` is real — real signed transactions from real distinct wallets, real gas paid, real events emitted. If you say so on camera, say it exactly like that: "these are separate wallets bidding for real," not "simulated," which undersells what's actually true.
- If the reference position has already crossed HF < 1.0 and settled by the time you record, use the **real recorded proof** (Section 5A). If it's still seasoning at recording time, use the **live-monitoring version** (Section 5B) — do not fake a crossing on camera. Decide which one applies before you hit record, not mid-take.

---

## 0:00–0:20 — Cold open: the problem, no branding yet

**[Screen: split view — left side, a mempool explorer showing a pending liquidation transaction with visible gas-priority-fee bidding war; right side, blank/dark]**

> "When an Aave position becomes liquidatable, every bot watching the mempool sees it at the same moment. What follows is a gas war — value that should go to the protocol or the borrower instead gets burned on priority fees. And if you try to hedge against a position defaulting, the act of buying that protection is itself a signal — it can trigger the exact panic it was meant to insure against."

**[Cut to black, then the Skia wordmark/hero fades in]**

> "This is Skia."

---

## 0:20–0:55 — Landing page walkthrough

**[Screen: hero section, ciphertext-scramble headline resolving into "SEALED BIDS. HIDDEN HEDGES."]**

> "Skia is confidential liquidation auctions and private credit hedging for Aave V3, built on iExec's Nox confidential-compute layer. Two mechanisms, one shared settlement core, live on Sepolia — not a mockup."

**[Scroll through the color-block sections, blob dividers visible, pause briefly on the logo strip]**

> "It's built directly on top of Aave — no forked pools, no modified contracts. Everything routes through the real, unmodified Aave protocol."

**[Click "Launch App"]**

---

## 0:55–1:40 — Liquidator Desk: the sealed-bid auction

**[Screen: wallet connect gate, then Liquidator Desk loads — real target position visible]**

> "Here's a real Aave V3 position on Sepolia, sitting right at its liquidation threshold. Liquidators don't race gas fees to claim it — they submit sealed bids."

**[Point to the encrypted payload in devtools/console, or the sealed-value shimmer if built]**

> "Each bid is encrypted client-side before it ever touches the network. Nobody — not other liquidators, not us — can see the discount rate someone's bidding until the window closes."

**[Show the two real bids already on-chain from `simulate-bidders.ts`, from two distinct wallets]**

> "These two bids came from two separate wallets, submitted for real — you can check both transactions on Sepolia Etherscan right now."

> "When the window closes, a Vickrey auction resolves inside the Nox TEE: the bidder offering the highest discount wins the auction, but their payout is based on the second-highest discount. That's not a stylistic choice — a sealed-bid auction like this only works if bids stay sealed. The moment they're public, everyone just converges on the same number and the whole mechanism collapses."

---

## 1:40–2:15 — Hedge Desk: the reflexivity problem

**[Screen: Hedge Desk, showing the real matched buyer/seller pair]**

> "The second half of Skia is credit protection — buying or selling insurance against this same position defaulting. And this one has a sharper reason to stay private than the auction does."

**[Pause on the qualitative "Coverage: Moderate" indicator, not a number]**

> "If the chain showed exactly how much protection someone bought against a position, that number becomes a warning sign — it can cause the run it was meant to insure against. So this dashboard never shows the real aggregate. Not because we're hiding data — because showing it would be the actual leak."

> "This buyer and seller are two more real, distinct wallets, matched and settled inside the same confidential layer as the auction."

---

## 2:15–3:00 — The settlement moment (money shot)

### Section 5A — use if the position already crossed and settled by recording time

*(Reminder: This implies `SettlementCore` had the USDC to successfully call `liquidationCall`!)*

**[Screen: Settlement Feed, showing the real settlement transaction; Etherscan tab open alongside]**

> "This position actually crossed its liquidation threshold while we were building this. No one clicked a button to fake it — real interest accrual on real testnet debt pushed it there. Our keeper caught it automatically."

**[Click through to the real transaction]**

> "One transaction. It resolves the sealed auction, calls Aave's real liquidation function, pays the winning liquidator the fair second-price discount, and settles the hedge — all in the same call. Public view: one liquidation, exactly like any other. Nothing about the sealed bids or the hedge is visible anywhere in this transaction."

### Section 5B — use if the position is still seasoning live at recording time

**[Screen: Dashboard, live Health Factor ticking, keeper status visible]**

> "This position is real, and it's genuinely approaching its liquidation threshold right now — you're looking at live Aave data, not a countdown we control. Our keeper is watching it, and the moment it crosses, this whole pipeline fires on its own: the sealed auction resolves, the real liquidation executes, and the hedge settles — one transaction, no manual trigger."

**[If you have it: a recording captured earlier of an actual test-settle run resolving]**

> "Here's that exact flow, captured from our own verification run earlier — the same contracts, same logic, that this live position will trigger automatically."

---

## 3:00–3:35 — Why Nox, specifically

**[Screen: How It Works page, or the interactive playground if built]**

> "Two things here can't be built with plaintext Solidity. A Vickrey auction only produces a fair price if bids stay sealed until resolution — public bids just collapse into everyone bidding the same number. And a hedge market only avoids triggering its own panic if positions and sizes stay hidden. Nox's TEE is what makes both of those actually work, not just look private."

---

## 3:35–3:50 — Close

**[Screen: logo strip — Aave, iExec Nox, Ethereum Sepolia — then GitHub repo]**

> "Skia. Confidential liquidations, confidential hedging, one settlement core, running for real on Sepolia. Repo's linked below — feedback.md has the honest account of what building on Nox was actually like, gaps included."

**[End card: repo URL, X post reference]**

---

## Recording checklist before you hit record

- [ ] Confirm which of Section 5A/5B applies — check the position's actual HF right now.
- [ ] **CRITICAL FOR 5A:** Ensure the `SettlementCore` contract address has enough Sepolia USDC to cover the debt it needs to repay Aave during `liquidationCall()`. If it has 0 USDC, the live settlement transaction WILL revert.
- [ ] Confirm the keeper process is still the correct, single, post-redeploy instance (per the last build check).
- [ ] Have both Etherscan tabs (the sealed-bid txs, the settlement tx if it exists) pre-loaded, not searched for live.
- [ ] Full run-through once without recording, timed — this script lands near 3:50 read at a normal pace; if you're running long, cut from Section 4 (hedge desk) first, since the auction (Section 3) and the settlement moment (Section 5) are the two segments the judging criteria weight hardest.
- [ ] Say "iExec Nox" and tag `@iEx_ec` in the accompanying X post — required by the submission rules.
