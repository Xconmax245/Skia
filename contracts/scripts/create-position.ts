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

const POOL_ABI = [
  "function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external",
  "function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external",
  "function withdraw(address asset, uint256 amount, address to) external",
  "function getUserAccountData(address user) external view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)"
];

const WETH_ABI = [
  "function deposit() external payable",
  "function approve(address spender, uint256 amount) external"
];

async function createPosition() {
  const pk = process.env.PRIVATE_KEY_BORROWER;
  if (!pk) throw new Error("Missing PRIVATE_KEY_BORROWER in .env");

  const wallet = new ethers.Wallet(pk, provider);
  const pool = new ethers.Contract(POOL_ADDRESS, POOL_ABI, wallet);
  const weth = new ethers.Contract(WETH, WETH_ABI, wallet);

  console.log(`[Fixture] Creating Aave V3 edge position for: ${wallet.address}`);

  // 1. Wrap ETH to WETH
  const depositAmount = ethers.parseEther("0.003"); // We have 0.005 ETH, use 0.003
  console.log(`Wrapping ${ethers.formatEther(depositAmount)} ETH...`);
  let tx = await weth.deposit({ value: depositAmount });
  await tx.wait();

  // 2. Approve Aave Pool
  console.log(`Approving Aave Pool...`);
  tx = await weth.approve(POOL_ADDRESS, ethers.MaxUint256);
  await tx.wait();

  // 3. Supply WETH
  console.log(`Supplying WETH to Aave...`);
  tx = await pool.supply(WETH, depositAmount, wallet.address, 0);
  await tx.wait();

  // 4. Check max borrow
  let data = await pool.getUserAccountData(wallet.address);
  console.log(`Max Available Borrow (Base): ${data.availableBorrowsBase.toString()}`);
  
  // USDC has 6 decimals, base is USD with 8 decimals in Aave oracle. 
  // We want to borrow exactly the max available.
  // Borrow amount in USDC = (availableBorrowsBase / 1e8) * 1e6 = availableBorrowsBase / 100
  // Let's borrow 99% of max to be safe from rounding reverts.
  const borrowUsdcBase = (data.availableBorrowsBase * 99n) / 100n;
  const borrowUsdc = borrowUsdcBase / 100n; 

  console.log(`Borrowing ${ethers.formatUnits(borrowUsdc, 6)} USDC...`);
  tx = await pool.borrow(USDC, borrowUsdc, 2, 0, wallet.address); // 2 = Variable Rate
  await tx.wait();

  // 5. Withdraw WETH until HF is exactly ~1.001
  data = await pool.getUserAccountData(wallet.address);
  const currentHf = Number(ethers.formatEther(data.healthFactor));
  console.log(`Current HF after borrow: ${currentHf}`);

  const targetHf = 1.001;
  const requiredCollateralBase = (Number(data.totalDebtBase) * targetHf * 10000) / Number(data.currentLiquidationThreshold);
  const excessCollateralBase = Number(data.totalCollateralBase) - requiredCollateralBase;
  
  if (excessCollateralBase > 0) {
      // Convert excess base (USD 8 decimals) back to WETH. 
      // Oracle price of WETH is ~$4000. WETH = 18 decimals.
      // ratio = excessCollateralBase / totalCollateralBase
      const withdrawRatio = excessCollateralBase / Number(data.totalCollateralBase);
      const withdrawWeth = (depositAmount * BigInt(Math.floor(withdrawRatio * 10000))) / 10000n;
      
      console.log(`Withdrawing excess WETH to hit HF ${targetHf}...`);
      try {
          tx = await pool.withdraw(WETH, withdrawWeth, wallet.address);
          await tx.wait();
      } catch (e) {
          console.log("Withdraw reverted, maybe too tight. Try slightly less.");
          const safeWithdraw = (withdrawWeth * 98n) / 100n;
          tx = await pool.withdraw(WETH, safeWithdraw, wallet.address);
          await tx.wait();
      }
  }

  // 6. Final Status
  data = await pool.getUserAccountData(wallet.address);
  console.log(`Final Health Factor: ${ethers.formatEther(data.healthFactor)}`);
  console.log(`✅ Edge position created successfully! It is now seasoning.`);
}

createPosition().catch(console.error);
