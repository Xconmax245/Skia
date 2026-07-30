import { ethers } from "ethers";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(process.cwd(), "../.env") });

const RPC_URL = process.env.RPC_URL || "https://11155111.rpc.thirdweb.com";
const provider = new ethers.JsonRpcProvider(RPC_URL);

// Official Aave V3 Sepolia addresses
const POOL_ADDRESS = "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951";
const WETH = "0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c";
const USDC = "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8";
const SETTLEMENT_CORE = "0x61668091Bd024eA46Aab05230f081EeedF9f4B8d";

const POOL_ABI = [
  "function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external",
  "function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external"
];
const WETH_ABI = ["function deposit() external payable", "function approve(address spender, uint256 amount) external"];
const USDC_ABI = ["function transfer(address to, uint256 amount) returns (bool)"];

async function run() {
  const pk = process.env.PRIVATE_KEY;
  const wallet = new ethers.Wallet(pk, provider);
  const pool = new ethers.Contract(POOL_ADDRESS, POOL_ABI, wallet);
  const weth = new ethers.Contract(WETH, WETH_ABI, wallet);
  const usdc = new ethers.Contract(USDC, USDC_ABI, wallet);

  console.log("Wrapping 0.02 ETH to WETH...");
  await (await weth.deposit({ value: ethers.parseEther("0.02") })).wait();
  
  console.log("Approving Aave Pool...");
  await (await weth.approve(POOL_ADDRESS, ethers.MaxUint256)).wait();
  
  console.log("Supplying WETH to Aave...");
  await (await pool.supply(WETH, ethers.parseEther("0.02"), wallet.address, 0)).wait();
  
  console.log("Borrowing 20 USDC...");
  await (await pool.borrow(USDC, 20000000n, 2, 0, wallet.address)).wait();
  
  console.log("Transferring 20 USDC to SettlementCore...");
  await (await usdc.transfer(SETTLEMENT_CORE, 20000000n)).wait();
  
  console.log("✅ SettlementCore funded directly via Aave borrow!");
}

run().catch(console.error);
