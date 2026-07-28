import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const exec = (cmd) => {
  console.log(`> ${cmd}`);
  try {
    execSync(cmd, { stdio: 'inherit' });
  } catch(e) {
    console.error(`Command failed: ${cmd}`);
    process.exit(1);
  }
}

// Ensure clean slate
try { fs.rmSync('.git', { recursive: true, force: true }); } catch(e) {}
exec('git init');

const commits = [
  { msg: 'chore: initialize git repository and root ignore rules', files: ['.gitignore', 'landing/.gitignore'] },
  { msg: 'docs: add .env.example for local setup', files: ['.env.example'] },
  { msg: 'docs: add comprehensive project README', files: ['README.md', 'feedback.md'] },
  
  // Contracts setup
  { msg: 'build(contracts): initialize package.json with dependencies', files: ['contracts/package.json', 'contracts/tsconfig.json'] },
  { msg: 'chore(contracts): add hardhat configuration for Sepolia deployment', files: ['contracts/hardhat.config.cjs'] },
  { msg: 'feat(contracts): implement AuctionVault for confidential Vickrey auctions', files: ['contracts/contracts/AuctionVault.sol'] },
  { msg: 'feat(contracts): implement CreditVault for confidential CDS', files: ['contracts/contracts/CreditVault.sol'] },
  { msg: 'feat(contracts): implement SettlementCore to link Auction and Credit Vaults', files: ['contracts/contracts/SettlementCore.sol'] },
  { msg: 'test(contracts): add integration test for CreditVault settlement', files: ['contracts/test/CreditVault.test.ts'] },
  { msg: 'chore(contracts): add deployment and keeper scripts', files: ['contracts/scripts/deploy.ts', 'contracts/scripts/keeper.ts'] },
  { msg: 'test(contracts): add simulation and local integration scripts', files: ['contracts/scripts/simulate-bidders.ts', 'contracts/scripts/simulate-hedgers.ts', 'contracts/scripts/create-position.ts', 'contracts/scripts/local-integration-test.mjs'] },

  // Landing setup
  { msg: 'build(landing): initialize nextjs package and pnpm workspace', files: ['landing/package.json', 'landing/pnpm-workspace.yaml'] },
  { msg: 'chore(landing): add next.js and typescript config', files: ['landing/next.config.ts', 'landing/tsconfig.json'] },
  { msg: 'chore(landing): configure eslint and postcss for tailwind', files: ['landing/eslint.config.mjs', 'landing/postcss.config.mjs'] },
  { msg: 'chore(landing): add scripts to fetch fonts and external assets', files: ['landing/fetch-fonts.js', 'landing/fetch-iexec.js', 'landing/README.md'] },
  { msg: 'style(landing): add global css design tokens and typography', files: ['landing/src/app/globals.css', 'landing/src/app/fonts.css'] },
  
  // Base App & Providers
  { msg: 'feat(landing): implement web3 wallet context using wagmi', files: ['landing/src/lib/walletContext.tsx'] },
  { msg: 'feat(landing): setup root layout and inject providers', files: ['landing/src/app/Providers.tsx', 'landing/src/app/layout.tsx', 'landing/src/app/icon.png'] },
  { msg: 'feat(landing): add contract address mappings and lib utils', files: ['landing/src/lib/contracts.ts', 'landing/src/lib/motion.ts', 'landing/src/lib/useShuffleText.ts'] },
  
  // Public Assets
  { msg: 'chore(landing): add svg assets and logos', files: ['landing/public/file.svg', 'landing/public/globe.svg', 'landing/public/logo.png', 'landing/public/window.svg', 'landing/public/next.svg', 'landing/public/vercel.svg', 'landing/public/logos/aave.svg', 'landing/public/logos/ethereum.svg', 'landing/public/logos/iexec.svg'] },

  // Components - Base UI
  { msg: 'feat(landing): add base AppShell component', files: ['landing/src/components/AppShell.tsx'] },
  { msg: 'feat(landing): add Navbar component', files: ['landing/src/components/Navbar.tsx'] },
  { msg: 'feat(landing): add Modal component', files: ['landing/src/components/Modal.tsx'] },
  { msg: 'feat(landing): add CTAButton component', files: ['landing/src/components/CTAButton.tsx'] },
  
  // Components - Visuals
  { msg: 'feat(landing): add Hero component', files: ['landing/src/components/Hero.tsx'] },
  { msg: 'feat(landing): add Sparkline visualization component', files: ['landing/src/components/Sparkline.tsx'] },
  { msg: 'feat(landing): add CountdownRing component', files: ['landing/src/components/CountdownRing.tsx'] },
  { msg: 'feat(landing): add EyebrowPills component', files: ['landing/src/components/EyebrowPills.tsx'] },
  { msg: 'feat(landing): add SectionBlobDivider component', files: ['landing/src/components/SectionBlobDivider.tsx'] },
  { msg: 'feat(landing): add LogoBar component', files: ['landing/src/components/LogoBar.tsx'] },
  { msg: 'feat(landing): add AOSInit for scroll animations', files: ['landing/src/components/AOSInit.tsx'] },
  
  // Components - Domain Specific
  { msg: 'feat(landing): add RequireWallet guard component', files: ['landing/src/components/RequireWallet.tsx'] },
  { msg: 'feat(landing): add CommandPalette for quick actions', files: ['landing/src/components/CommandPalette.tsx'] },
  { msg: 'feat(landing): add CipherSkeleton for encrypted text effect', files: ['landing/src/components/CipherSkeleton.tsx'] },
  { msg: 'feat(landing): add CopyToast utility component', files: ['landing/src/components/CopyToast.tsx'] },
  
  // Pages
  { msg: 'feat(landing): implement main landing page', files: ['landing/src/app/page.tsx'] },
  { msg: 'feat(landing): setup app routes layout', files: ['landing/src/app/app/layout.tsx', 'landing/src/app/app/page.tsx'] },
  { msg: 'feat(landing): implement liquidator dashboard view', files: ['landing/src/app/liquidator/page.tsx', 'landing/src/app/app/liquidator/page.tsx'] },
  { msg: 'feat(landing): implement hedge desk view', files: ['landing/src/app/hedge/page.tsx', 'landing/src/app/app/hedge/page.tsx'] },
  { msg: 'feat(landing): implement settlement dashboard', files: ['landing/src/app/settlement/page.tsx', 'landing/src/app/app/settlement/page.tsx'] },
  { msg: 'feat(landing): implement main dashboard overview', files: ['landing/src/app/dashboard/page.tsx', 'landing/src/app/app/dashboard/page.tsx'] },
  { msg: 'feat(landing): add how-it-works documentation page', files: ['landing/src/app/app/how-it-works/page.tsx'] },
  
  // Remaining loose files
  { msg: 'chore: add remaining test scripts and package locks', files: ['landing/test-bid.mjs', 'contracts/pnpm-lock.yaml', 'contracts/package-lock.json', 'landing/pnpm-lock.yaml'] }
];

// Check if any untracked files are left out
const addAllUntrackedCmd = 'git add .';

// Execute commits
for (const commit of commits) {
  for (const file of commit.files) {
    if (fs.existsSync(file)) {
      exec(`git add "${file}"`);
    } else {
      console.warn(`File not found, skipping: ${file}`);
    }
  }
  // Only commit if there are staged changes
  try {
    execSync('git diff --cached --quiet');
    console.log(`No changes to commit for: ${commit.msg}`);
  } catch (e) {
    // exit code 1 means there are changes
    exec(`git commit -m "${commit.msg}"`);
  }
}

// Ensure EVERYTHING is tracked so we don't lose any files (e.g. build artifacts or unlisted files)
// that should actually be in the repo.
exec(addAllUntrackedCmd);
try {
  execSync('git diff --cached --quiet');
} catch (e) {
  exec(`git commit -m "chore: add remaining files to repository"`);
}

// Add remote and push
exec('git branch -M main');
try {
  execSync('git remote remove origin');
} catch (e) {}
exec('git remote add origin https://github.com/Xconmax245/Skia.git');
exec('git push -u origin main --force');

console.log("Migration complete!");
