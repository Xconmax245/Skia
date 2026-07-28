import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config({ path: "../.env" });

async function simulateHedgers() {
  console.log("[Simulation] Submitting confidential credit protection intents...");
  console.log("  Buyer 1: Protection Buyer [Encrypted Notional: $50,000]");
  console.log("  Seller 1: Protection Seller [Encrypted Notional: $30,000, ERC-7984 Collateral]");
  console.log("  Seller 2: Protection Seller [Encrypted Notional: $25,000, ERC-7984 Collateral]");
  console.log("[Simulation] Buyer/Seller intents posted to CreditVault.sol confidentially.");
}

simulateHedgers().catch(console.error);
