import { createViemHandleClient } from '@iexec-nox/handle';
import { createWalletClient, createPublicClient, http, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load variables from contracts/.env
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const ABI = parseAbi([
  'function submitBid(bytes32 encryptedBid, bytes proof) external',
  'function bidCount() external view returns (uint256)',
  'event BidSubmitted(address indexed bidder, uint256 index)'
]);

async function submitBidForAccount(
  privateKey: `0x${string}`,
  rpcUrl: string,
  contractAddress: `0x${string}`,
  discountBps: bigint,
  bidderName: string
) {
  const account = privateKeyToAccount(privateKey);
  console.log(`\n[${bidderName}] Sender Address:`, account.address);

  const transport = http(rpcUrl);

  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport
  });

  const publicClient = createPublicClient({
    chain: sepolia,
    transport
  });

  console.log(`[${bidderName}] Creating Nox Handle Client...`);
  const handleClient = await createViemHandleClient(walletClient);

  console.log(`[${bidderName}] Encrypting Discount Bid (${Number(discountBps) / 100}% -> ${discountBps} bps)...`);
  const { handle, handleProof } = await handleClient.encryptInput(
    discountBps,
    'uint256',
    contractAddress
  );

  console.log(`[${bidderName}] Encrypted Handle:`, handle);

  console.log(`[${bidderName}] Submitting Transaction to Sepolia...`);
  const txHash = await walletClient.writeContract({
    address: contractAddress,
    abi: ABI,
    functionName: 'submitBid',
    args: [handle, handleProof]
  });

  console.log(`[${bidderName}] Tx Submitted! Hash:`, txHash);
  
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  console.log(`[${bidderName}] ✅ Tx Confirmed in Block:`, receipt.blockNumber.toString());

  const newBidCount = await publicClient.readContract({
    address: contractAddress,
    abi: ABI,
    functionName: 'bidCount'
  });
  console.log(`[${bidderName}] Updated bidCount in AuctionVault:`, newBidCount.toString());
}

async function simulateBidders() {
  console.log("==================================================");
  console.log("   SIMULATING MULTIPLE BIDDERS VIA iEXEC NOX TEE  ");
  console.log("==================================================");

  const rpcUrl = process.env.RPC_URL || 'https://11155111.rpc.thirdweb.com';
  const contractAddress = process.env.NEXT_PUBLIC_AUCTION_VAULT as `0x${string}`;
  
  if (!contractAddress) {
    throw new Error('NEXT_PUBLIC_AUCTION_VAULT not set in .env. Please run deployment first.');
  }

  // We need at least two bids to satisfy the `require(bidCount >= 2)` Vickrey mechanism.
  // We will submit both bids using the primary PRIVATE_KEY to guarantee gas availability for the demo,
  // since the contract allows the same address to submit multiple bids (bidder tracking uses msg.sender).
  
  const pk1 = (process.env.PRIVATE_KEY as `0x${string}`);
  if (!pk1) throw new Error('PRIVATE_KEY not set in .env');

  // Submit Bid 1: 10.5% Discount
  await submitBidForAccount(pk1, rpcUrl, contractAddress, 1050n, 'Bidder 1');
  
  // Submit Bid 2: 8.5% Discount
  await submitBidForAccount(pk1, rpcUrl, contractAddress, 850n, 'Bidder 2');

  console.log("\n==================================================");
  console.log("✅ Simulation Complete. 2 Sealed Bids Submitted.");
  console.log("==================================================");
}

simulateBidders().catch((err) => {
  console.error("Simulation failed:", err);
  process.exitCode = 1;
});
