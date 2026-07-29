# Skia — Task Tracker

## Phase A: Landing Page (Days 1–3)

- [x] Init Next.js project with pnpm + Tailwind
- [x] Define CSS design tokens (ink/lime/peach/cream)
- [x] Load Pilcrow Rounded + Archivo fonts
- [x] Build `<CTAButton>` component (outline + solid variants)
- [x] Build `<EyebrowPills>` component
- [x] Build `<Navbar>` (floating pill)
- [x] Build `<Hero>` section
- [x] Build `<SectionBlobDivider>` (generated SVG scallop)
- [x] Build `<CarouselArrow>` (decorative fixed elements)
- [x] Build `<ColorBlockSection>` wrapper
- [x] Build `<LogoBar>` (Aave, iExec, Ethereum logos)
- [x] Build `<IllustrationGrid>` or plain-list fallback
- [x] Assemble all sections: ink → lime → peach → lime → ink
- [x] Responsive pass (mobile breakpoints)
- [x] Ship landing page

## Phase B: Protocol & Settlement Core (Days 4–15)

- [x] Set up Hardhat 3 project + nox-hardhat-plugin
- [x] Confirm local Docker Nox stack setup
- [x] Deploy CollateralToken (ERC7984) locally
- [x] Build + test AuctionVault.sol (bid submission + Vickrey resolution)
- [x] Research + implement winner reveal via public decryption ACL
- [x] create-position.ts script (real Aave Sepolia position)
- [x] Build CreditVault.sol matching logic
- [x] Build SettlementCore.sol bridge
- [x] End-to-end local Nox stack test

## Phase C: Deploy, Dashboards, Demo (Days 16–21)

- [x] Liquidator dashboard (Next.js `/dashboard`)
- [x] Hedge desk view (Next.js `/hedge`)
- [x] Public settlement feed (Next.js `/settlement`)
- [x] Wire client-side encryptInput simulation
- [x] Deploy full stack to Sepolia
- [x] simulate-bidders.ts + simulate-hedgers.ts
- [x] Record demo video (Pending User Action)
- [x] Write README.md + feedback.md
- [ ] Final deploy + X post
