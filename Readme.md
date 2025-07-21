# RFB – Real-Time Zora Token Explorer on Base

## Overview

**RFB** is a modern, real-time explorer and dashboard for tokens **coined on Zora (on the Base blockchain)**. It provides live data, trending tokens, new picks, and deep analytics for token creators and holders—all focused on tokens created via the Zora protocol. Built with React, TypeScript, Vite, shadcn/ui, and a suite of blockchain and DeFi APIs, RFB is designed for speed, clarity, and extensibility.

---

## Features

- **Zora Token Tracking:**  
  RFB is purpose-built to track tokens created (coined) via the Zora protocol on the Base chain. All analytics, trending, and new token features are focused on Zora-originated tokens.

- **Trending Zora Tokens:**  
  See the hottest Zora tokens on Base in a live-updating, animated marquee.

- **Token Table:**  
  Explore Zora tokens with powerful filters:
  - **Most Valuable:** Top Zora tokens by market cap.
  - **Top Gainers:** Zora tokens with the highest price increase.
  - **Top Volume 24h:** Zora tokens with the most trading volume in the last 24 hours.
  - **New Picks:** The freshest Zora tokens, using top volume as a proxy for newness.

- **Token Details:**  
  Click any Zora token to view detailed stats, price charts, and creator information.

- **Creators Leaderboard:**  
  See which addresses are launching the most Zora tokens, with profile images, display names, and total USD balances.

- **Live Data:**  
  All data is fetched live from APIs (DexScreener, Zora, Basescan, etc.) and updates automatically.

- **Responsive UI:**  
  Built with shadcn/ui and Tailwind CSS for a beautiful, mobile-friendly experience.

- **Robust Error Handling:**  
  Graceful fallbacks and retry logic for API/network errors.

---

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- Yarn or npm

### Installation

```bash
git clone https://github.com/Elishaokon13/RFB
cd RFB
yarn install
# or
npm install
```

### Running the App

```bash
yarn dev
# or
npm run dev
```

Open [http://localhost:8080](http://localhost:8080) in your browser.

---

## Project Structure

```
src/
  components/         # UI components (TokenTable, Trending, etc.)
  hooks/              # Data fetching and blockchain hooks
  pages/              # Route-based pages (Index, TokenDetails, Creators)
  lib/                # Utility functions
  types/              # TypeScript types
  utils/              # Misc utilities (e.g., basenames)
  App.tsx             # Main app entry
  main.tsx            # React root
```

---

## Data Sources & APIs

- **Zora API:** Token metadata, creator profiles, and balances (primary source).
- **DexScreener API:** Price, volume, and liquidity data for tokens.
- **Basescan API:** (Optional, for advanced real-time event monitoring)
- **Custom Hooks:** All data fetching is abstracted into React hooks for composability.

---

## Key Technologies

- **React 18** + **TypeScript**
- **Vite** (blazing fast dev/build)
- **shadcn/ui** (modern UI components)
- **Tailwind CSS** (utility-first styling)
- **@tanstack/react-query** (data fetching/caching)
- **ethers.js** and **viem** (blockchain interaction)
- **wagmi** (wallet integration)
- **Radix UI** (accessible primitives)
- **DexScreener, Zora, Basescan** (DeFi/blockchain APIs)

---

## Customization

- **API Keys:**  
  Some features (like Basescan) may require API keys. See the relevant hook or `.env` usage.

- **Feature Flags:**  
  You can easily add or remove filters in `TokenTable.tsx` by editing the `topFilters` array.

- **Styling:**  
  All styles are in `src/App.css` and Tailwind config. Easily theme or extend.

---

## Scripts

- `yarn dev` – Start local dev server
- `yarn build` – Build for production
- `yarn preview` – Preview production build
- `yarn lint` – Lint code with ESLint



## Acknowledgements

- [shadcn/ui](https://ui.shadcn.com/)
- [DexScreener](https://docs.dexscreener.com/)
- [Zora Protocol](https://zora.co/)
- [Base](https://base.org/)
- [Viem](https://viem.sh/)
- [Wagmi](https://wagmi.sh/)

---

**RFB** is built for the Base and Zora communities to discover, analyze, and celebrate the latest and greatest tokens coined on Zora. Enjoy!
