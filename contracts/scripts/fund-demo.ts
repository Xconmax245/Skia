import { ethers } from "ethers";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(process.cwd(), "../.env") });

const RPC_URL = process.env.RPC_URL || "https://11155111.rpc.thirdweb.com";
const provider = new ethers.JsonRpcProvider(RPC_URL);

async function run() {
  console.log("Starting funding script...");
  
  const deployerPK = process.env.PRIVATE_KEY;
  const deployer = new ethers.Wallet(deployerPK, provider);
  
  const hhPK = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
  const hhWallet = new ethers.Wallet(hhPK, provider);
  
  console.log("Hardhat Wallet:", hhWallet.address); // should be 0x7099...
  
  const deployerBal = await provider.getBalance(deployer.address);
  console.log("Deployer balance:", ethers.formatEther(deployerBal), "ETH");
  
  if (deployerBal > ethers.parseEther("0.005")) {
    console.log("Sending 0.005 ETH to 0x7099 for gas...");
    const tx1 = await deployer.sendTransaction({ to: hhWallet.address, value: ethers.parseEther("0.005") });
    await tx1.wait(2); // Wait 2 confirmations to ensure RPC is synced
    console.log("✅ ETH sent!");
  } else {
    console.log("⚠️ Deployer out of ETH too!");
  }
  
  const hhBal = await provider.getBalance(hhWallet.address);
  console.log("HH ETH Balance:", ethers.formatEther(hhBal));
  
  const usdcAbi = ["function transfer(address to, uint256 amount) returns (bool)", "function balanceOf(address account) view returns (uint256)"];
  const usdc = new ethers.Contract("0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8", usdcAbi, hhWallet);
  
  const usdcBal = await usdc.balanceOf(hhWallet.address);
  console.log("USDC balance in 0x7099:", ethers.formatUnits(usdcBal, 6));
  
  if (usdcBal >= 20000000n) {
    console.log("Transferring 20 USDC to SettlementCore...");
    const tx2 = await usdc.transfer("0x61668091Bd024eA46Aab05230f081EeedF9f4B8d", 20000000n);
    await tx2.wait();
    console.log("✅ USDC transferred! TX:", tx2.hash);
    console.log("🎉 SettlementCore is FUNDED! You are ready to record.");
  } else {
    console.log("❌ Not enough USDC to transfer 20! Has:", usdcBal.toString());
  }
}

run().catch(console.error);
