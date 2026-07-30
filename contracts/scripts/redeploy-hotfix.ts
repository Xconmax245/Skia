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
  console.log(`Redeploying Skia hotfix with the account: ${wallet.address}`);

  const auctionAddress = process.env.NEXT_PUBLIC_AUCTION_VAULT;
  const collateralAddress = process.env.NEXT_PUBLIC_COLLATERAL_TOKEN;

  if (!auctionAddress || !collateralAddress) {
    throw new Error("Missing AUCTION_VAULT or COLLATERAL_TOKEN in .env");
  }

  console.log(`Using existing AuctionVault: ${auctionAddress}`);
  console.log(`Using existing CollateralToken: ${collateralAddress}`);

  // 1. Redeploy CreditVault
  console.log("Deploying CreditVault...");
  const creditArtifact = getArtifact("CreditVault");
  const creditVault = await new ethers.ContractFactory(creditArtifact.abi, creditArtifact.bytecode, wallet).deploy(
    collateralAddress,
    wallet.address,
  );
  await creditVault.waitForDeployment();
  const creditAddress = await creditVault.getAddress();
  console.log(`New CreditVault deployed to: ${creditAddress}`);

  // 2. Redeploy SettlementCore
  console.log("Deploying SettlementCore...");
  const settleArtifact = getArtifact("SettlementCore");
  const settlementCore = await new ethers.ContractFactory(settleArtifact.abi, settleArtifact.bytecode, wallet).deploy(
    auctionAddress,
    creditAddress,
    AAVE_POOL_ADDRESS,
  );
  await settlementCore.waitForDeployment();
  const settlementAddress = await settlementCore.getAddress();
  console.log(`New SettlementCore deployed to: ${settlementAddress}`);

  // 3. Wire onlySettlementCore guard
  console.log("Wiring CreditVault.setSettlementCore()...");
  const creditVaultContract = new ethers.Contract(creditAddress, creditArtifact.abi, wallet);
  const wireTx = await creditVaultContract.setSettlementCore(settlementAddress);
  await wireTx.wait();
  console.log(`onlySettlementCore guard active. Only ${settlementAddress} can trigger settleOnDefault().`);

  // 4. Update files automatically
  console.log("Updating files with new addresses...");

  // Update .env
  const envPath = path.join(process.cwd(), "../.env");
  let envContent = fs.readFileSync(envPath, "utf8");
  envContent = envContent.replace(/NEXT_PUBLIC_CREDIT_VAULT=.*/g, `NEXT_PUBLIC_CREDIT_VAULT=${creditAddress}`);
  envContent = envContent.replace(/NEXT_PUBLIC_SETTLEMENT_CORE=.*/g, `NEXT_PUBLIC_SETTLEMENT_CORE=${settlementAddress}`);
  fs.writeFileSync(envPath, envContent);

  // Update contracts.ts
  const contractsPath = path.join(process.cwd(), "../landing/src/lib/contracts.ts");
  let contractsContent = fs.readFileSync(contractsPath, "utf8");
  contractsContent = contractsContent.replace(/export const CREDIT_VAULT_ADDRESS = ".*";/g, `export const CREDIT_VAULT_ADDRESS = "${creditAddress}";`);
  contractsContent = contractsContent.replace(/export const SETTLEMENT_CORE_ADDRESS = ".*";/g, `export const SETTLEMENT_CORE_ADDRESS = "${settlementAddress}";`);
  fs.writeFileSync(contractsPath, contractsContent);

  // Update keeper.ts defaults
  const keeperPath = path.join(process.cwd(), "scripts/keeper.ts");
  let keeperContent = fs.readFileSync(keeperPath, "utf8");
  keeperContent = keeperContent.replace(/const settlementCore = process\.env\.SETTLEMENT_CORE_ADDRESS \|\| ".*";/g, `const settlementCore = process.env.SETTLEMENT_CORE_ADDRESS || "${settlementAddress}";`);
  fs.writeFileSync(keeperPath, keeperContent);

  console.log("\n=================================");
  console.log("Hotfix Deployment and auto-update complete!");
  console.log(`New CreditVault: ${creditAddress}`);
  console.log(`New SettlementCore: ${settlementAddress}`);
  console.log("=================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
