import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const RPC_URL = process.env.RPC_URL || "https://11155111.rpc.thirdweb.com";
const provider = new ethers.JsonRpcProvider(RPC_URL);

// Official Aave V3 Sepolia addresses
const AAVE_POOL_ADDRESS = "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951";

const POOL_ABI = [
  "function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external",
  "function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external",
  "function getUserAccountData(address user) external view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)",
];

async function createPosition() {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("Please set PRIVATE_KEY in .env to run position creation fixture");
    return;
  }

  const wallet = new ethers.Wallet(privateKey, provider);
  const pool = new ethers.Contract(AAVE_POOL_ADDRESS, POOL_ABI, wallet);

  console.log(`[Fixture] Creating Aave V3 position for address: ${wallet.address}...`);

  // Step 1: Query current account status
  const initialData = await pool.getUserAccountData(wallet.address);
  console.log(`Initial Health Factor: ${ethers.formatEther(initialData.healthFactor)}`);

  console.log(`[Fixture] Position script ready. To execute real deposit/borrow on Sepolia, fund ${wallet.address} with Sepolia ETH.`);
}

createPosition().catch(console.error);
