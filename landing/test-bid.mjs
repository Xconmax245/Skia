import { createViemHandleClient } from '@iexec-nox/handle';
import { createWalletClient, createPublicClient, http, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';

const PRIVATE_KEY = '0xc0726aad8d4986ea0f9077e8b4b0bcf4920a8e35abe7678fd035f2c06836a2d9';
const AUCTION_VAULT_ADDRESS = '0xC08936143B886b95570b3a4eB11D3Fa20df4F0Bd';

const ABI = parseAbi([
  'function submitBid(bytes32 encryptedBid, bytes proof) external',
  'function bidCount() external view returns (uint256)',
  'event BidSubmitted(address indexed bidder, uint256 index)'
]);

async function run() {
  console.log('--- Initializing Viem Account & Public Client ---');
  const account = privateKeyToAccount(PRIVATE_KEY);
  console.log('Sender Address:', account.address);

  const transport = http('https://11155111.rpc.thirdweb.com');

  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport
  });

  const publicClient = createPublicClient({
    chain: sepolia,
    transport
  });

  console.log('--- Creating Nox Handle Client ---');
  const handleClient = await createViemHandleClient(walletClient);

  console.log('--- Encrypting Discount Bid (10.5% -> 1050 bps) ---');
  const discountBps = 1050n;
  const { handle, handleProof } = await handleClient.encryptInput(
    discountBps,
    'uint256',
    AUCTION_VAULT_ADDRESS
  );

  console.log('Encrypted Handle:', handle);
  console.log('Handle Proof Length:', handleProof.length);

  console.log('--- Submitting Transaction to Sepolia ---');
  const txHash = await walletClient.writeContract({
    address: AUCTION_VAULT_ADDRESS,
    abi: ABI,
    functionName: 'submitBid',
    args: [handle, handleProof]
  });

  console.log('Tx Submitted! Hash:', txHash);
  console.log('Waiting for receipt...');

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  console.log('✅ Tx Confirmed in Block:', receipt.blockNumber.toString());
  console.log('Status:', receipt.status === 'success' ? 'SUCCESS' : 'REVERTED');

  const newBidCount = await publicClient.readContract({
    address: AUCTION_VAULT_ADDRESS,
    abi: ABI,
    functionName: 'bidCount'
  });
  console.log('Updated bidCount in AuctionVault:', newBidCount.toString());
}

run().catch(console.error);
