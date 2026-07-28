# iExec Nox & Skia Developer Feedback

## Overview
Skia is a confidential credit infrastructure built for Aave V3 on Sepolia using iExec Nox TEEs. This document highlights real developer experiences, friction points, and key structural findings during the hackathon implementation.

---

## Technical Findings & Architectural Strengths

### 1. Structural Necessity of Confidentiality
- **Vickrey Liquidation Auctions**: Public bids in a Vickrey auction collapse the mechanism to standard ascending-price bidding with zero efficiency gain. Sealing bids inside Nox TEEs (`euint256`, `Nox.gt`, `Nox.select`) is structurally mandatory to preserve incentive compatibility.
- **Credit-Default Hedging (CDS)**: Public hedge orders act as market-moving signals. Buying default protection publicly against a position can trigger the very run it was meant to insure against. Nox breaks this reflexivity by keeping sizes and identities encrypted.
- **Shared Settlement Core**: Executing both the liquidation call (`Aave.liquidationCall()`) and the CDS payout inside a single attested transaction eliminates the need for separate external oracles or trigger events.

---

## Developer Friction Points & Recommendations

### 1. Access Control & Public Decryption Flow
- **Challenge**: Revealing *who won* a Vickrey auction without revealing the *bid values* requires carefully configuring viewer Access Control Lists (ACLs) and managing public decryption callbacks. The boundary between oblivious smart contract evaluation and plaintext result disclosure is under-documented in standard guides.
- **Recommendation**: Provide clearer step-by-step documentation and Solidity helper libraries for conditional winner disclosure patterns.

### 2. Dependency Management & Native Binaries
- **Challenge**: The Hardhat 3 engine (`@nomicfoundation/edr`) attempts to resolve optional native platform binaries for all target operating systems (darwin, linux-musl, linux-gnu) during package installation, causing network timeouts on slow connections unless `--omit=optional` is explicitly passed.
- **Recommendation**: Bundle or scope platform binaries dynamically at runtime rather than requiring top-level optional dependency resolution.

### 3. Local Docker Nox Stack Workflow
- **Strength**: The `nox-hardhat-plugin` local Docker simulation stack allows realistic local testing of encrypted types (`euint256`, `ebool`) and `fromExternal` proof verification prior to testnet deployment.
