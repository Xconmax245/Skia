import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const AAVE_POOL_ADDRESS = "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951";
const RPC_URL = process.env.RPC_URL || "https://11155111.rpc.thirdweb.com";

function getArtifact(name: string) {
  const p = path.join(process.cwd(), `artifacts/contracts/${name}.sol/${name}.json`);
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) throw new Error("PRIVATE_KEY not set");
  const wallet = new ethers.Wallet(privateKey, provider);
  console.log(`Deploying Skia contracts with the account: ${wallet.address}`);

  // ── 1. AuctionVault ──────────────────────────────────────────────────
  console.log("Deploying AuctionVault...");
  const auctionArtifact = getArtifact("AuctionVault");
  const auctionVault = await new ethers.ContractFactory(auctionArtifact.abi, auctionArtifact.bytecode, wallet).deploy();
  await auctionVault.waitForDeployment();
  const auctionAddress = await auctionVault.getAddress();
  console.log(`AuctionVault deployed to: ${auctionAddress}`);

  // ── 2. CollateralToken (lives inside CreditVault.sol artifact) ───────
  console.log("Deploying CollateralToken...");
  const pCollat = path.join(process.cwd(), `artifacts/contracts/CreditVault.sol/CollateralToken.json`);
  const collatArtifact = JSON.parse(fs.readFileSync(pCollat, "utf8"));
  const collateralToken = await new ethers.ContractFactory(collatArtifact.abi, collatArtifact.bytecode, wallet).deploy();
  await collateralToken.waitForDeployment();
  const collateralAddress = await collateralToken.getAddress();
  console.log(`CollateralToken deployed to: ${collateralAddress}`);

  // ── 3. CreditVault ───────────────────────────────────────────────────
  // referencePosition is set to the deployer wallet as a placeholder.
  // In a real scenario this would be the borrower's address being monitored.
  console.log("Deploying CreditVault...");
  const creditArtifact = getArtifact("CreditVault");
  const creditVault = await new ethers.ContractFactory(creditArtifact.abi, creditArtifact.bytecode, wallet).deploy(
    collateralAddress,
    wallet.address,
  );
  await creditVault.waitForDeployment();
  const creditAddress = await creditVault.getAddress();
  console.log(`CreditVault deployed to: ${creditAddress}`);

  // ── 4. SettlementCore ────────────────────────────────────────────────
  console.log("Deploying SettlementCore...");
  const settleArtifact = getArtifact("SettlementCore");
  const settlementCore = await new ethers.ContractFactory(settleArtifact.abi, settleArtifact.bytecode, wallet).deploy(
    auctionAddress,
    creditAddress,
    AAVE_POOL_ADDRESS,
  );
  await settlementCore.waitForDeployment();
  const settlementAddress = await settlementCore.getAddress();
  console.log(`SettlementCore deployed to: ${settlementAddress}`);

  // ── 5. Wire onlySettlementCore guard ─────────────────────────────────
  // CreditVault.setSettlementCore() is one-shot (require(settlementCore == address(0))).
  // After this call, only SettlementCore can call settleOnDefault().
  // The deployer wallet cannot call settleOnDefault() even though it set the address.
  console.log("Wiring CreditVault.setSettlementCore()...");
  const creditVaultContract = new ethers.Contract(creditAddress, creditArtifact.abi, wallet);
  const wireTx = await creditVaultContract.setSettlementCore(settlementAddress);
  await wireTx.wait();
  console.log(`onlySettlementCore guard active. Only ${settlementAddress} can trigger settleOnDefault().`);

  // ── 6. Update files automatically ───────────────
  console.log("Updating files with new addresses...");

  // Update .env
  const envPath = path.join(process.cwd(), "../.env");
  let envContent = fs.readFileSync(envPath, "utf8");
  envContent = envContent.replace(/NEXT_PUBLIC_AUCTION_VAULT=.*/g, `NEXT_PUBLIC_AUCTION_VAULT=${auctionAddress}`);
  envContent = envContent.replace(/NEXT_PUBLIC_CREDIT_VAULT=.*/g, `NEXT_PUBLIC_CREDIT_VAULT=${creditAddress}`);
  envContent = envContent.replace(/NEXT_PUBLIC_SETTLEMENT_CORE=.*/g, `NEXT_PUBLIC_SETTLEMENT_CORE=${settlementAddress}`);
  envContent = envContent.replace(/NEXT_PUBLIC_COLLATERAL_TOKEN=.*/g, `NEXT_PUBLIC_COLLATERAL_TOKEN=${collateralAddress}`);
  fs.writeFileSync(envPath, envContent);

  // Update contracts.ts
  const contractsPath = path.join(process.cwd(), "../landing/src/lib/contracts.ts");
  let contractsContent = fs.readFileSync(contractsPath, "utf8");
  contractsContent = contractsContent.replace(/export const AUCTION_VAULT_ADDRESS = ".*";/g, `export const AUCTION_VAULT_ADDRESS = "${auctionAddress}";`);
  contractsContent = contractsContent.replace(/export const CREDIT_VAULT_ADDRESS = ".*";/g, `export const CREDIT_VAULT_ADDRESS = "${creditAddress}";`);
  contractsContent = contractsContent.replace(/export const SETTLEMENT_CORE_ADDRESS = ".*";/g, `export const SETTLEMENT_CORE_ADDRESS = "${settlementAddress}";`);
  contractsContent = contractsContent.replace(/export const COLLATERAL_TOKEN_ADDRESS = ".*";/g, `export const COLLATERAL_TOKEN_ADDRESS = "${collateralAddress}";`);
  fs.writeFileSync(contractsPath, contractsContent);

  // Update keeper.ts defaults
  const keeperPath = path.join(process.cwd(), "scripts/keeper.ts");
  let keeperContent = fs.readFileSync(keeperPath, "utf8");
  keeperContent = keeperContent.replace(/const settlementCore = process\.env\.SETTLEMENT_CORE_ADDRESS \|\| ".*";/g, `const settlementCore = process.env.SETTLEMENT_CORE_ADDRESS || "${settlementAddress}";`);
  keeperContent = keeperContent.replace(/const auctionVault = process\.env\.AUCTION_VAULT_ADDRESS \|\| ".*";/g, `const auctionVault = process.env.AUCTION_VAULT_ADDRESS || "${auctionAddress}";`);
  fs.writeFileSync(keeperPath, keeperContent);

  console.log("\n=================================");
  console.log("Deployment and auto-update complete!");
  console.log(`AuctionVault: ${auctionAddress}`);
  console.log(`CreditVault: ${creditAddress}`);
  console.log(`SettlementCore: ${settlementAddress}`);
  console.log(`CollateralToken: ${collateralAddress}`);
  console.log("=================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
