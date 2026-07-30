import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import { createViemHandleClient } from '@iexec-nox/handle';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '../.env' });

function getArtifact(name: string, isCredit = false) {
  const p = path.join(
    process.cwd(),
    isCredit
      ? `artifacts/contracts/CreditVault.sol/${name}.json`
      : `artifacts/contracts/${name}.sol/${name}.json`
  );
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

async function simulateHedgers() {
  const pkOwner = process.env.PRIVATE_KEY as `0x${string}`;
  const pkSeller = process.env.PRIVATE_KEY_C as `0x${string}`;

  if (!pkOwner || !pkSeller) {
    throw new Error('Missing private keys in .env');
  }

  const CREDIT_VAULT_ADDRESS = process.env.NEXT_PUBLIC_CREDIT_VAULT as `0x${string}`;
  const COLLATERAL_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_COLLATERAL_TOKEN as `0x${string}`;

  const transport = http(process.env.RPC_URL || 'https://11155111.rpc.thirdweb.com');

  const accountOwner = privateKeyToAccount(pkOwner);
  const accountSeller = privateKeyToAccount(pkSeller);

  const walletOwner = createWalletClient({ account: accountOwner, chain: sepolia, transport });
  const walletSeller = createWalletClient({ account: accountSeller, chain: sepolia, transport });
  const publicClient = createPublicClient({ chain: sepolia, transport });

  console.log('[Simulation] Initializing Nox Handle Clients (Viem)...');
  const handleClientOwner = await createViemHandleClient(walletOwner);
  const handleClientSeller = await createViemHandleClient(walletSeller);

  const collatAbi = getArtifact('CollateralToken', true).abi;
  const vaultAbi = getArtifact('CreditVault').abi;

  // 1. Mint 50k collateral to the Seller
  console.log(`[Simulation] Encrypting $50k collateral mint amount...`);
  const mintAmt = await handleClientOwner.encryptInput(50000n, 'uint256', COLLATERAL_TOKEN_ADDRESS);
  console.log(`[Simulation] Minting collateral to Seller (${accountSeller.address})...`);
  let txHash = await walletOwner.writeContract({
    address: COLLATERAL_TOKEN_ADDRESS,
    abi: collatAbi,
    functionName: 'mint',
    args: [accountSeller.address, mintAmt.handle, mintAmt.handleProof],
  });
  await publicClient.waitForTransactionReceipt({ hash: txHash });
  console.log(`[Simulation] ✅ Collateral minted.`);

  // 2. Seller sets operator for CreditVault
  const expiration = BigInt(Math.floor(Date.now() / 1000) + 86400); // 1 day
  console.log(`[Simulation] Seller setting CreditVault as operator for collateral...`);
  txHash = await walletSeller.writeContract({
    address: COLLATERAL_TOKEN_ADDRESS,
    abi: collatAbi,
    functionName: 'setOperator',
    args: [CREDIT_VAULT_ADDRESS, expiration],
  });
  await publicClient.waitForTransactionReceipt({ hash: txHash });
  console.log(`[Simulation] ✅ Operator set.`);

  // 3. Seller submits intent
  console.log(`[Simulation] Seller encrypting $50,000 Hedge Intent...`);
  const sellerNotional = await handleClientSeller.encryptInput(50000n, 'uint256', CREDIT_VAULT_ADDRESS);
  console.log(`[Simulation] Submitting Seller Intent...`);
  txHash = await walletSeller.writeContract({
    address: CREDIT_VAULT_ADDRESS,
    abi: vaultAbi,
    functionName: 'submitIntent',
    args: [sellerNotional.handle, sellerNotional.handleProof, false], // false = isSeller
  });
  await publicClient.waitForTransactionReceipt({ hash: txHash });
  console.log(`[Simulation] ✅ Seller Intent submitted.`);

  // 4. Buyer submits intent
  console.log(`[Simulation] Buyer encrypting $50,000 Hedge Intent...`);
  const buyerNotional = await handleClientOwner.encryptInput(50000n, 'uint256', CREDIT_VAULT_ADDRESS);
  console.log(`[Simulation] Submitting Buyer Intent...`);
  txHash = await walletOwner.writeContract({
    address: CREDIT_VAULT_ADDRESS,
    abi: vaultAbi,
    functionName: 'submitIntent',
    args: [buyerNotional.handle, buyerNotional.handleProof, true], // true = isBuyer
  });
  await publicClient.waitForTransactionReceipt({ hash: txHash });
  console.log(`[Simulation] ✅ Buyer Intent submitted.`);

  console.log('[Simulation] Buyer/Seller intents successfully posted and collateral transferred confidentially.');
}

simulateHedgers().catch(console.error);
