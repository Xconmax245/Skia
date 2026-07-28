# Skia — Confidential Credit Infrastructure for Aave

Skia is a confidential credit infrastructure built for Aave V3 on Sepolia using iExec Nox TEEs (Trusted Execution Environments). It introduces two novel primitives to DeFi:
1. **Sealed-Bid Liquidation Auctions:** Preventing MEV extraction and gas wars during distress events via Vickrey (second-price) auctions.
2. **Private Credit-Default Hedging (CDS):** Allowing users to buy and sell default protection on Aave positions without signaling their intent or position size to the public market.

Both primitives converge into a **Single Settlement Core** that atomically executes the Aave liquidation, distributes second-price collateral to the winning liquidator, rebates surplus to the borrower, and triggers CDS payouts—all in one attested transaction.

## 🏗 Architecture & Mechanism

### 1. AuctionVault.sol (Confidential Vickrey Auctions)
Standard public liquidations lead to zero efficiency gains for the protocol, as public bidding collapses into an ascending-price auction. Skia uses iExec Nox to keep bids entirely encrypted (`euint256`). 

**Mechanism:** 
- Liquidators submit sealed bids representing their desired discount rate.
- The `resolveVickrey()` function requires **at least two bidders** to ensure a fair second-price discovery (preventing a single bidder from sweeping the entire collateral).
- The Nox TEE evaluates the highest and second-highest bids obliviously.
- Access Control Lists (ACLs) conditionally grant decryption rights to the contract owner *only* for the winning bidder identity and the second-highest price, keeping the highest bid perfectly secret.

### 2. CreditVault.sol (Confidential CDS)
Buying default protection publicly against a position acts as a market-moving signal that can trigger the very bank run it aims to insure. 
- Hedgers and underwriters post intents with encrypted notional sizes and identities.
- The TEE matches them obliviously, generating a confidential position ticket.

### 3. SettlementCore.sol (Shared Settlement)
When an Aave position becomes eligible for liquidation:
1. `SettlementCore.settle()` is called with the decrypted winner and second-price.
2. It executes `Aave.liquidationCall()`.
3. It pays the liquidator their requested second-price discount portion of the seized collateral.
4. It rebates any excess surplus penalty directly back to the defaulted borrower.
5. It calls `CreditVault.settleOnDefault()` to trigger confidential CDS payouts.

## 🚀 Deployed Contracts (Sepolia)

The final architecture with full ACL-grants and economic settlement wiring has been successfully deployed to Sepolia:

- **AuctionVault:** `0x02C76637...` (Most recent verified deployment)
- **SettlementCore:** Connected to Sepolia Aave V3 Pool
- **CreditVault:** Handles CDS

## 💻 Running Locally

### Prerequisites
- Node.js & pnpm
- Hardhat (`npm i -g hardhat`)

### 1. Smart Contracts
The contracts rely on the `@iexec-nox/nox-hardhat-plugin` for local TEE simulation.
```bash
cd contracts
pnpm install
npx hardhat compile --config hardhat.config.cjs
```
*Note: We explicitly pass the `.cjs` config due to the project's native ESM (`"type": "module"`) setup.*

**Simulating Bidders:**
To simulate the sealed-bid auction on Sepolia:
```bash
npx ts-node scripts/simulate-bidders.ts
```
*(This uses `ethers` and `viem` to encrypt 2 distinct discount bids client-side and submit them to the `AuctionVault`.)*

### 2. Next.js Frontend
The frontend features dedicated dashboards for liquidators and hedgers.
```bash
cd landing
pnpm install
pnpm dev
```
- **App Routes:** The core application lives under `/app/liquidator`, `/app/hedge`, and `/app/settlement`. (Root routes dynamically redirect here).

## 📝 Developer Feedback
We've heavily documented our experience building with iExec Nox, specifically outlining the structural necessity of confidentiality and friction points around ACLs in `feedback.md`.
