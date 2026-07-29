# Skia — Confidential Liquidation & Credit Protection for Aave V3

> **iExec Nox Hackathon Submission** · Sepolia Testnet · Next.js + Solidity

Skia is a two-sided protocol that brings confidentiality to DeFi liquidations and credit default swaps using iExec Nox Trusted Execution Environments. Liquidators compete in sealed-bid Vickrey auctions. CDS counterparties post encrypted protection intents. A single settlement function clears both markets atomically via Aave V3's `liquidationCall()`.

---

## 📐 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (Next.js)                                              │
│  ┌──────────────┐   encryptInput()   ┌──────────────────────┐  │
│  │ Liquidator   │ ──────────────────▶│  Nox Handle Gateway  │  │
│  │ Desk         │◀────────────────── │  (bytes32 handle +   │  │
│  └──────────────┘   handle + proof   │   ZK proof)          │  │
│                                      └──────────────────────┘  │
└──────────────────────────────┬──────────────────────────────────┘
                               │ submitBid(handle, proof)
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  Sepolia EVM                                                    │
│                                                                 │
│  ┌────────────────┐   resolveVickrey()  ┌─────────────────┐    │
│  │ AuctionVault   │ ◀───────────────── │   Nox TEE        │    │
│  │ (euint256 bids)│ ──────────────────▶│  (SGX Enclave)   │    │
│  └────────────────┘   winner + proof   └─────────────────┘    │
│                                                ▲               │
│  ┌────────────────┐   settleOnDefault()        │               │
│  │ CreditVault    │ ──────────────────────────┘               │
│  │ (euint256 CDS) │                                            │
│  └────────────────┘                                            │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ SettlementCore                                         │    │
│  │  settle(collateral, debt, borrower, winner, discount)  │    │
│  │   └─▶ Aave V3 liquidationCall()                        │    │
│  │   └─▶ CreditVault.settleOnDefault()                    │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🏗 Smart Contracts

All contracts deployed on **Sepolia testnet** (Chain ID: 11155111).

| Contract | Address | Description |
|---|---|---|
| `CollateralToken` (cSKIA) | [`0xf020F931B7488E8f4c43e14E677D62979f2Af2f7`](https://sepolia.etherscan.io/address/0xf020F931B7488E8f4c43e14E677D62979f2Af2f7) | ERC-7984 confidential token. Balances stored as `euint256`. Used for CDS seller margin. |
| `AuctionVault` | [`0xc8306aC560A8c78E4EAfaE0B5F9Ce59B665F7aC4`](https://sepolia.etherscan.io/address/0xc8306aC560A8c78E4EAfaE0B5F9Ce59B665F7aC4) | Stores encrypted liquidation bids. Exposes `resolveVickrey()` for TEE execution. |
| `CreditVault` | [`0xFdEfbB3C5Cf4Eb96a2D92Bc4F8e01ccD75bdf784`](https://sepolia.etherscan.io/address/0xFdEfbB3C5Cf4Eb96a2D92Bc4F8e01ccD75bdf784) | Stores encrypted CDS intents. Matches buyers/sellers inside TEE on `settleOnDefault()`. |
| `SettlementCore` | [`0xBF5D670e868f833668759A36c0Ab4d290B5Aa125`](https://sepolia.etherscan.io/address/0xBF5D670e868f833668759A36c0Ab4d290B5Aa125) | Settlement hub. Calls Aave `liquidationCall()` + CDS clearing atomically. |
| Aave V3 Pool (external) | [`0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951`](https://sepolia.etherscan.io/address/0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951) | Sepolia Aave V3 Pool. Not our contract. |

**Sepolia asset addresses used in settlement:**
- WETH collateral: `0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c`
- USDC debt: `0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8`

---

## 🔒 How the Encryption Works

### Client-side encryption (browser)

```typescript
import { createViemHandleClient } from '@iexec-nox/handle';

// 1. Connect to Nox Handle Gateway via MetaMask
const handleClient = await createViemHandleClient(walletClient);

// 2. Encrypt the plaintext bid (e.g. 10.5% = 1050 basis points)
const { handle, handleProof } = await handleClient.encryptInput(
  BigInt(1050),               // plaintext — never leaves browser
  'uint256',                  // type
  AUCTION_VAULT_ADDRESS       // contract that will receive it
);

// 3. Submit — only opaque bytes32 handle hits calldata
await writeContract({
  functionName: 'submitBid',
  args: [handle, handleProof]
});
```

### What goes on-chain

```
calldata: 0x7b3a9c40  [4-byte selector]
          a8f2b903...  [bytes32 handle — looks random to everyone]
          00000000...  [proof bytes]
```

The plaintext `1050` never appears in the transaction. The EVM stores a `euint256` (a Nox-managed encrypted integer).

### TEE decryption (off-chain, attested)

When `resolveVickrey()` is called, the Nox TEE:
1. Decrypts all stored `euint256` bids using the distributed Nox master key
2. Runs the Vickrey comparison: finds minimum discount, second minimum (the price paid)
3. Encrypts the winner's address and second-price back into `euint256` handles
4. Writes them to `AuctionVault.winningDiscount` and `winningBidderEnc`
5. Generates a hardware attestation proving the correct program ran

---

## 📂 Repository Structure

```
skia/
├── contracts/                     # Hardhat project
│   ├── contracts/
│   │   ├── CollateralToken.sol    # ERC-7984 cSKIA token
│   │   ├── AuctionVault.sol       # Sealed-bid auction + Vickrey resolve
│   │   ├── CreditVault.sol        # Confidential CDS order book
│   │   └── SettlementCore.sol     # Aave liquidation + CDS clearing
│   ├── scripts/
│   │   ├── deploy.ts              # Deploys all 4 contracts to Sepolia
│   │   ├── create-position.ts     # Creates a demo Aave borrower position
│   │   ├── simulate-bidders.ts    # Submits 2 encrypted bids to AuctionVault
│   │   ├── simulate-hedgers.ts    # Submits 2 encrypted CDS intents
│   │   └── keeper.ts              # Polls HF + triggers settlement
│   └── hardhat.config.cjs
│
├── landing/                       # Next.js 14 app
│   └── src/
│       ├── app/
│       │   ├── page.tsx           # Landing page
│       │   └── app/
│       │       ├── dashboard/     # Portfolio view + HF chart
│       │       ├── liquidator/    # Bid submission + Force Settle
│       │       ├── hedge/         # CDS intent submission + order book
│       │       ├── how-it-works/  # Architecture explainer (this page)
│       │       └── settlement/    # Public settlement feed
│       ├── components/
│       │   ├── Hero.tsx           # Landing hero with live bid count
│       │   ├── Navbar.tsx         # Floating pill navbar
│       │   ├── CountdownRing.tsx  # SVG auction countdown
│       │   ├── Sparkline.tsx      # Inline HF sparkline
│       │   ├── CipherSkeleton.tsx # Encrypted data loading state
│       │   ├── RequireWallet.tsx  # Wallet gate HOC
│       │   └── Modal.tsx          # Error modal
│       └── lib/
│           ├── contracts.ts       # ABIs + Sepolia addresses
│           ├── walletContext.tsx   # RainbowKit wallet context
│           └── useShuffleText.ts  # Cipher text animation hook
│
└── .env                           # Private keys + contract addresses (gitignored)
```

---

## 🚀 Local Development

### Prerequisites

- Node.js 18+
- pnpm (`npm i -g pnpm`)
- MetaMask with Sepolia ETH

### 1. Clone and install

```bash
git clone https://github.com/Xconmax245/Skia.git
cd skia

# Install contract dependencies
cd contracts && npm install

# Install frontend dependencies
cd ../landing && pnpm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in:

```bash
PRIVATE_KEY=0x...          # Deployer private key (needs Sepolia ETH)
SEPOLIA_RPC_URL=https://...  # Sepolia RPC (Alchemy, Infura, etc.)

# These are set automatically after running deploy.ts:
NEXT_PUBLIC_AUCTION_VAULT=0xc8306aC560A8c78E4EAfaE0B5F9Ce59B665F7aC4
NEXT_PUBLIC_CREDIT_VAULT=0xFdEfbB3C5Cf4Eb96a2D92Bc4F8e01ccD75bdf784
NEXT_PUBLIC_SETTLEMENT_CORE=0xBF5D670e868f833668759A36c0Ab4d290B5Aa125
NEXT_PUBLIC_COLLATERAL_TOKEN=0xf020F931B7488E8f4c43e14E677D62979f2Af2f7
```

### 3. Run the frontend

```bash
cd landing
pnpm dev
# Opens at http://localhost:3000
```

### 4. (Optional) Redeploy contracts to Sepolia

```bash
cd contracts
npx hardhat run scripts/deploy.ts --config hardhat.config.cjs --network sepolia
```

This prints all 4 addresses. Update `.env` and `landing/src/lib/contracts.ts`.

### 5. (Optional) Run simulation scripts

```bash
# Create a demo Aave borrower position
npx hardhat run scripts/create-position.ts --config hardhat.config.cjs --network sepolia

# Submit 2 encrypted bids to AuctionVault
npx hardhat run scripts/simulate-bidders.ts --config hardhat.config.cjs --network sepolia

# Submit 2 encrypted CDS intents to CreditVault
npx hardhat run scripts/simulate-hedgers.ts --config hardhat.config.cjs --network sepolia
```

---

## 🧪 Testing the Full Flow

### Via the UI (recommended for demo)

1. Connect MetaMask to Sepolia
2. Go to `/app/liquidator` → Submit a sealed bid (uses real `encryptInput()`)
3. Go to `/app/hedge` → Post a buy or sell CDS intent
4. On the Liquidator Desk → Click "Trigger Settlement" (calls `resolveVickrey()` + `settle()`)
5. Watch the activity feed on `/app/dashboard` update with the new `SettlementExecuted` event

### Via Hardhat scripts

```bash
# Run the full keeper loop once
npx hardhat run scripts/keeper.ts --config hardhat.config.cjs --network sepolia
```

---

## 🔑 Key Design Decisions

### Why Vickrey (second-price) auction?

In a first-price auction, bidders shade their bids below true value to avoid the winner's curse. This leads to inefficient price discovery and is exploitable by MEV searchers who can front-run bids. Vickrey pricing aligns incentives: the dominant strategy is to bid your true discount rate. Combined with Nox's privacy guarantee (no one can read your bid until after settlement), this creates a structurally front-run-proof liquidation mechanism.

### Why ERC-7984 instead of ERC-20?

ERC-7984 is the Nox-native confidential token standard. Unlike ERC-20, balances are stored as `euint256` — encrypted on-chain and only decryptable by the holder via Nox. The `setOperator()` function replaces `approve()` with time-limited delegation, which is both more gas-efficient and safer. CDS sellers must post `cSKIA` collateral without revealing their position size to other participants.

### Why not use FHE directly on-chain?

Fully Homomorphic Encryption on-chain is theoretically possible but orders of magnitude too expensive for production use. Nox uses the TEE model: compute happens off-chain in a hardware-attested enclave, and only the result (with its attestation) is written back on-chain. This preserves verifiability without the gas cost of on-chain FHE.

---

## 📦 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Framer Motion |
| Styling | Vanilla CSS (design tokens: ink/lime/peach/cream) |
| Web3 | Wagmi v2, RainbowKit, Viem |
| Encryption | `@iexec-nox/handle` — iExec Nox JS SDK |
| Contracts | Solidity 0.8.x, Hardhat |
| Network | Ethereum Sepolia testnet |
| Lending | Aave V3 (external, unmodified) |
| Privacy | iExec Nox TEE (Intel SGX) |
| Token Standard | ERC-7984 (Nox confidential token) |

---

## 👥 Team

Built for the iExec Nox Hackathon.

- GitHub: [Xconmax245/Skia](https://github.com/Xconmax245/Skia)

---

## 📄 License

MIT
