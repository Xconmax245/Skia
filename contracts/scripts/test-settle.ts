import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";
import { createWalletClient, http, createPublicClient, getContract } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { createViemHandleClient } from "@iexec-nox/handle";

config({ path: "../.env" });

const RPC_URL = process.env.RPC_URL || "https://rpc.sepolia.org";
const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;

function getArtifact(name: string, isCredit = false) {
  const p = path.join(
    process.cwd(),
    isCredit
      ? `artifacts/contracts/CreditVault.sol/${name}.json`
      : `artifacts/contracts/${name}.sol/${name}.json`
  );
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

async function main() {
  console.log("==================================================");
  console.log("   TESTING settleOnDefault() IN ISOLATION");
  console.log("==================================================");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const deployer = new ethers.Wallet(PRIVATE_KEY, provider);
  console.log(`[Test] Using Wallet: ${deployer.address}`);

  // 1. Deploy test instances
  console.log("[Test] Deploying test CollateralToken...");
  const collatArt = getArtifact("CollateralToken", true);
  const CollateralToken = new ethers.ContractFactory(collatArt.abi, collatArt.bytecode, deployer);
  const collateral = await CollateralToken.deploy();
  await collateral.waitForDeployment();
  const collatAddr = await collateral.getAddress();

  console.log("[Test] Deploying test CreditVault...");
  const vaultArt = getArtifact("CreditVault");
  const CreditVault = new ethers.ContractFactory(vaultArt.abi, vaultArt.bytecode, deployer);
  const vault = (await CreditVault.deploy(collatAddr, deployer.address)) as any;
  await vault.waitForDeployment();
  const vaultAddr = await vault.getAddress();

  // 2. Mock SettlementCore to the deployer wallet so we can call settleOnDefault
  console.log("[Test] Wiring Vault: setting SettlementCore to deployer...");
  const txWire = await vault.setSettlementCore(deployer.address);
  await txWire.wait();

  // 3. Initialize Viem for Nox handling
  const account = privateKeyToAccount(PRIVATE_KEY);
  const transport = http(RPC_URL);
  const publicClient = createPublicClient({ chain: sepolia, transport });
  const walletClient = createWalletClient({ account, chain: sepolia, transport });
  
  const handleClient = await createViemHandleClient(walletClient as any);

  // 4. Encrypt $50k and mint to Seller
  console.log("[Test] Encrypting $50k collateral mint amount...");
  const collatMintHandle = await handleClient.encryptInput(50000n, 'uint256', collatAddr as `0x${string}`);

  console.log("[Test] Minting collateral to Seller...");
  const tokenContract = getContract({
    address: collatAddr as `0x${string}`,
    abi: collatArt.abi,
    client: walletClient
  });
  
  const hashMint = await tokenContract.write.mint([
    deployer.address, 
    collatMintHandle.handle,
    collatMintHandle.handleProof
  ]);
  await publicClient.waitForTransactionReceipt({ hash: hashMint });
  
  console.log("[Test] Seller setting CreditVault as operator...");
  const expiration = BigInt(Math.floor(Date.now() / 1000) + 86400);
  const hashOp = await tokenContract.write.setOperator([vaultAddr as `0x${string}`, expiration]);
  await publicClient.waitForTransactionReceipt({ hash: hashOp });

  // 5. Encrypt intents
  console.log("[Test] Encrypting $50,000 Hedge Intent for Seller...");
  const sellerNotional = await handleClient.encryptInput(50000n, 'uint256', vaultAddr as `0x${string}`);
  console.log("[Test] Submitting Seller Intent...");
  
  const vaultContract = getContract({
    address: vaultAddr as `0x${string}`,
    abi: vaultArt.abi,
    client: walletClient
  });

  const txSellerHash = await vaultContract.write.submitIntent([
    sellerNotional.handle, 
    sellerNotional.handleProof, 
    false // isSeller
  ]);
  await publicClient.waitForTransactionReceipt({ hash: txSellerHash });
  console.log("[Test] ✅ Seller Intent submitted.");

  console.log("[Test] Encrypting $50,000 Hedge Intent for Buyer...");
  const buyerNotional = await handleClient.encryptInput(50000n, 'uint256', vaultAddr as `0x${string}`);
  console.log("[Test] Submitting Buyer Intent...");
  const txBuyerHash = await vaultContract.write.submitIntent([
    buyerNotional.handle, 
    buyerNotional.handleProof, 
    true // isBuyer
  ]);
  await publicClient.waitForTransactionReceipt({ hash: txBuyerHash });
  console.log("[Test] ✅ Buyer Intent submitted.");

  // 6. Execute settleOnDefault directly
  console.log("[Test] Triggering settleOnDefault() directly...");
  try {
    const txSettle = await vault.settleOnDefault({ gasLimit: 2000000 });
    console.log(`[Test] Tx Submitted! Hash: ${txSettle.hash}`);
    const receipt = await txSettle.wait();
    console.log(`[Test] ✅ settleOnDefault() Confirmed! Block: ${receipt.blockNumber}`);
  } catch (err: any) {
    console.error("[Test] ❌ settleOnDefault() REVERTED!");
    console.error(err);
    if (err.data) {
        console.error("Revert data:", err.data);
    }
  }
}

main().catch(console.error);
