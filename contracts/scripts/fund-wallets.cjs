const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const RPC_URL = process.env.RPC_URL || 'https://11155111.rpc.thirdweb.com';
const provider = new ethers.JsonRpcProvider(RPC_URL);

async function main() {
  const pkDeployer = process.env.PRIVATE_KEY;
  if (!pkDeployer) throw new Error("Missing PRIVATE_KEY in .env");

  const walletDeployer = new ethers.Wallet(pkDeployer, provider);
  console.log(`Deployer Address: ${walletDeployer.address}`);
  console.log(`Deployer Balance: ${ethers.formatEther(await provider.getBalance(walletDeployer.address))} ETH`);

  // Target wallets
  const pkB = process.env.PRIVATE_KEY_B;
  const pkC = process.env.PRIVATE_KEY_C;
  const walletB = new ethers.Wallet(pkB, provider);
  const walletC = new ethers.Wallet(pkC, provider);

  // Generate a new borrower wallet
  const borrowerWallet = ethers.Wallet.createRandom();
  console.log(`New Borrower Address: ${borrowerWallet.address}`);

  // Append to .env
  const envPath = path.join(__dirname, '../.env');
  fs.appendFileSync(envPath, `\n# Borrower Wallet for Edge Position\nPRIVATE_KEY_BORROWER=${borrowerWallet.privateKey}\n`);
  console.log("Appended PRIVATE_KEY_BORROWER to .env");

  const targets = [
    { name: 'Bidder B', address: walletB.address },
    { name: 'Hedge Seller', address: walletC.address },
    { name: 'Borrower', address: borrowerWallet.address }
  ];

  // Transfer 0.005 ETH to each target
  const amountToTransfer = ethers.parseEther('0.005');

  for (const t of targets) {
    const bal = await provider.getBalance(t.address);
    if (bal < ethers.parseEther('0.002')) {
        console.log(`Funding ${t.name} (${t.address}) with 0.005 ETH...`);
        const tx = await walletDeployer.sendTransaction({
            to: t.address,
            value: amountToTransfer
        });
        await tx.wait();
        console.log(`✅ Funded ${t.name}. Hash: ${tx.hash}`);
    } else {
        console.log(`${t.name} (${t.address}) already has ${ethers.formatEther(bal)} ETH.`);
    }
  }

  console.log("All wallets funded!");
}

main().catch(console.error);
