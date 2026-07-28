import { ethers } from "ethers";
import * as dotenv from "dotenv";
import { createEthersHandleClient } from "@iexec-nox/handle";

dotenv.config({ path: "../.env" });

const RPC_URL = process.env.RPC_URL || "https://11155111.rpc.thirdweb.com";
const provider = new ethers.JsonRpcProvider(RPC_URL);

// Sepolia Aave V3 asset addresses — required for real liquidationCall()
const SEPOLIA_WETH = process.env.COLLATERAL_ASSET || "0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c";
const SEPOLIA_USDC = process.env.DEBT_ASSET       || "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8";

// ABI snippets
const AAVE_POOL_ABI = [
  "function getUserAccountData(address user) external view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)",
];

const AUCTION_VAULT_ABI = [
  "function resolveVickrey() external returns (bytes32 resWinningDiscount, bytes32 resWinningBidderEnc, bytes32 highestBidEnc)",
  "function winningBidderEnc() external view returns (bytes32)",
  "function winningDiscount() external view returns (bytes32)"
];

const SETTLEMENT_CORE_ABI = [
  "function settle(address collateralAsset, address debtAsset, address borrower, uint256 debtToCover, address liquidatorWinner, uint256 winningDiscountBps) external",
];

async function monitorPosition(borrower: string, settlementCoreAddress: string, auctionVaultAddress: string, poolAddress: string, privateKey: string) {
  const wallet = new ethers.Wallet(privateKey, provider);
  const pool = new ethers.Contract(poolAddress, AAVE_POOL_ABI, provider);
  const auctionVault = new ethers.Contract(auctionVaultAddress, AUCTION_VAULT_ABI, wallet);
  const settlementCore = new ethers.Contract(settlementCoreAddress, SETTLEMENT_CORE_ABI, wallet);

  // Initialize Nox Handle Client for Keeper off-chain handle decryption
  const handleClient = await createEthersHandleClient(wallet as any);

  console.log(`[Keeper] Monitoring Aave V3 borrower position: ${borrower}...`);

  provider.on("block", async (blockNumber: number) => {
    try {
      const data = await pool.getUserAccountData(borrower);
      const healthFactor = data.healthFactor;
      console.log(`[Block ${blockNumber}] Health Factor: ${ethers.formatEther(healthFactor)}`);

      if (healthFactor < ethers.parseEther("1.0")) {
        console.log(`[Keeper] ⚠️ Position ${borrower} is liquidatable! Executing Vickrey resolution & Nox Handle decrypt...`);

        // 1. Resolve Vickrey auction ONCE on-chain
        const txResolve = await auctionVault.resolveVickrey();
        const receipt = await txResolve.wait();
        console.log(`[Keeper] Auction resolved on-chain! Tx: ${receipt.hash}`);

        // 2. Read public handles from state
        const winningBidderHandle = await auctionVault.winningBidderEnc();
        const winningDiscountHandle = await auctionVault.winningDiscount();

        // 3. Pull-decrypt handles off-chain via Nox Handle Gateway
        let winnerAddress = wallet.address;
        let winningDiscountBps = 1050n; // Default 10.5% (1050 bps) fallback

        try {
          const decWinner = await handleClient.decrypt(winningBidderHandle);
          const rawAddr = "0x" + BigInt(decWinner.value.toString()).toString(16).padStart(40, "0");
          // Validate decoded address before using it
          if (ethers.isAddress(rawAddr) && rawAddr !== ethers.ZeroAddress) {
            winnerAddress = ethers.getAddress(rawAddr);
            console.log(`[Keeper] 🔓 Decrypted winning liquidator address: ${winnerAddress}`);
          } else {
            console.log(`[Keeper] Decoded address invalid (${rawAddr}), falling back to keeper wallet`);
          }
        } catch (err) {
          console.log(`[Keeper] Decryption fallback for winner: ${wallet.address}`);
        }

        try {
          const decDiscount = await handleClient.decrypt(winningDiscountHandle);
          winningDiscountBps = BigInt(decDiscount.value.toString());
          console.log(`[Keeper] 🔓 Decrypted Vickrey second-price discount: ${winningDiscountBps} bps`);
        } catch (err) {
          console.log(`[Keeper] Decryption fallback for discount: 1050 bps`);
        }

        // 4. Execute settlement flow passing decrypted winner and second-price discount
        const tx = await settlementCore.settle(
          SEPOLIA_WETH,   // Real Sepolia WETH collateral
          SEPOLIA_USDC,   // Real Sepolia USDC debt
          borrower,
          data.totalDebtBase,
          winnerAddress,
          winningDiscountBps
        );
        console.log(`[Keeper] Settlement Tx submitted: ${tx.hash}`);
        await tx.wait();
        console.log(`[Keeper] ✅ Settlement confirmed on-chain!`);
      }
    } catch (err) {
      console.error("[Keeper] Error checking account data:", err);
    }
  });
}

// Example execution
if (require.main === module) {
  const borrower = process.env.BORROWER_ADDRESS || "0xBfBD7FA7488b574274eaa9c9f29374EF6b0c40E8";
  const settlementCore = process.env.SETTLEMENT_CORE_ADDRESS || "0xBF5D670e868f833668759A36c0Ab4d290B5Aa125";
  const auctionVault = process.env.AUCTION_VAULT_ADDRESS || "0xc8306aC560A8c78E4EAfaE0B5F9Ce59B665F7aC4";
  const pool = process.env.AAVE_POOL_ADDRESS || "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951";
  const key = process.env.PRIVATE_KEY || "0xc0726aad8d4986ea0f9077e8b4b0bcf4920a8e35abe7678fd035f2c06836a2d9";

  monitorPosition(borrower, settlementCore, auctionVault, pool, key).catch(console.error);
}
