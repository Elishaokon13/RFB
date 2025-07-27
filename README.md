# Zoracle – Professional Analytics Tool for Zora Coins

## Overview

**Zoracle** is a professional analytics platform designed specifically for tracking and analyzing tokens created on the Zora protocol on the Base blockchain. Built with modern web technologies and real-time data integration, Zoracle provides comprehensive market insights, trending analysis, and detailed token analytics—all focused on the Zora ecosystem.

Think of Zoracle as **DexScreener for Zora coins**—a specialized platform that brings professional-grade analytics to the Zora community.

🌐 **Live Site**: [https://zoracle.xyz](https://zoracle.xyz)

---

## 🚀 Features

### **Real-Time Analytics**
- **Live Price Data**: Real-time USD prices from DexScreener API
- **24h Market Changes**: Accurate price change percentages with color-coded indicators
- **Volume Tracking**: Live 24h trading volume from DEX aggregators
- **Liquidity Analysis**: Current liquidity and FDV information

### **Comprehensive Token Views**
- **Most Valuable**: Top Zora tokens by market capitalization
- **Top Gainers**: Zora tokens with the highest 24h price increases
- **Top Volume 24h**: Most actively traded Zora tokens
- **New Picks**: Recently created Zora tokens with high volume activity
- **Last Traded**: Recently traded tokens with unique trader insights

### **Advanced Analytics**
- **Creator Analytics**: Track token creators with profile images and USD balances
- **Whale Tracking**: Monitor whale addresses and their token holdings
- **Token Details**: Comprehensive token pages with charts and related tokens
- **Trending Analysis**: Live-updating trending tokens with animated displays

### **Professional Interface**
- **DexScreener-Style Layout**: Familiar, professional trading interface
- **Responsive Design**: Optimized for desktop and mobile devices
- **Dark/Light Themes**: Beautiful animated theme switching
- **Real-Time Updates**: Automatic data refresh with smart caching

### **Data Sources**
- **Zora Coins SDK**: Primary source for token metadata and creator profiles
- **DexScreener API**: Real-time price, volume, and liquidity data
- **Base Chain**: Direct blockchain integration for comprehensive data

---

## 🛠️ Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- Yarn or npm

### Installation

```bash
git clone https://github.com/Elishaokon13/Zoracle
cd Zoracle
yarn install
# or
npm install
```

### Running the Application

```bash
yarn dev
# or
npm run dev
```

Open [http://localhost:8080](http://localhost:8080) in your browser.

---

## 📊 Data Views

### **Token Table Dashboard**
The main dashboard provides multiple views for comprehensive analysis:

- **Trending**: Hot Zora tokens with live price updates
- **Most Valuable**: Market cap leaders with detailed metrics
- **Top Gainers**: 24h price performance leaders
- **New Picks**: Fresh tokens with high trading activity

### **Token Details Pages**
Click any token to access detailed analytics:
- Real-time price charts and metrics
- Creator information and social links
- Related tokens and market comparisons
- Historical data and performance trends

### **Creator Analytics**
Track the most active token creators:
- Creator profiles with display names
- Total USD balances across tokens
- Token creation history and success rates

### **Whale Tracker**
Monitor large token holders:
- Whale address tracking
- Token holding patterns
- Large transaction monitoring

---

## 🏗️ Project Structure

```
src/
  components/         # UI components (TokenTable, Trending, etc.)
  hooks/              # Data fetching and blockchain hooks
  pages/              # Route-based pages (Index, TokenDetails, Creators)
  lib/                # Utility functions and helpers
  types/              # TypeScript type definitions
  utils/              # Miscellaneous utilities
  App.tsx             # Main application entry point
  main.tsx            # React root component
```

### **Key Components**
- **TokenTable**: Main dashboard with multiple data views
- **TokenDetails**: Comprehensive token analysis pages
- **CreatorsTable**: Creator analytics and leaderboards
- **WhaleTracker**: Whale address monitoring
- **Header**: Navigation and search interface
- **Sidebar**: Filtering and navigation menu

### **Data Hooks**
- **useDexScreener**: Real-time price data integration
- **getCoins**: New token discovery
- **getCoinsMostValuable**: Market cap analysis
- **getCoinsTopGainers**: Price performance tracking
- **useCreators**: Creator analytics
- **useTokenWhaleTracker**: Whale monitoring

---

## 🔧 Technologies

### **Frontend**
- **React 18** + **TypeScript** for type-safe development
- **Vite** for blazing-fast development and building
- **shadcn/ui** for modern, accessible UI components
- **Tailwind CSS** for utility-first styling

### **Data Management**
- **@tanstack/react-query** for efficient data fetching and caching
- **Zora Coins SDK** for blockchain data integration
- **DexScreener API** for real-time market data

### **Blockchain Integration**
- **ethers.js** and **viem** for blockchain interactions
- **wagmi** for wallet integration
- **Base Chain** for Zora protocol data

### **UI/UX**
- **Radix UI** for accessible primitives
- **Framer Motion** for smooth animations
- **React Router DOM** for client-side routing
- **Next Themes** for theme management

---

## 🎨 Customization

### **API Configuration**
Some features may require API keys for enhanced functionality. Check the relevant hooks or `.env` configuration.

### **Feature Flags**
Easily customize the dashboard by modifying the `topFilters` array in `TokenTable.tsx`.

### **Styling**
All styles are managed through Tailwind CSS and the shadcn/ui design system. Easily theme or extend the design.

---

## 📝 Scripts

- `yarn dev` – Start local development server
- `yarn build` – Build for production
- `yarn preview` – Preview production build
- `yarn lint` – Lint code with ESLint

---

## 🤝 Contributing

Zoracle is built for the Zora and Base communities. We welcome contributions that enhance the platform's analytics capabilities and user experience.

### **Development Guidelines**
- Follow TypeScript best practices
- Maintain responsive design principles
- Ensure accessibility compliance
- Write comprehensive tests for new features

---

## 🙏 Acknowledgements

- [Zora Protocol](https://zora.co/) for the innovative token creation platform
- [DexScreener](https://docs.dexscreener.com/) for real-time market data
- [Base](https://base.org/) for the scalable blockchain infrastructure
- [shadcn/ui](https://ui.shadcn.com/) for the beautiful component library
- [Viem](https://viem.sh/) and [Wagmi](https://wagmi.sh/) for blockchain integration

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Zoracle** is the premier analytics platform for the Zora ecosystem, providing professional-grade insights and real-time data for traders, creators, and enthusiasts. Discover, analyze, and track the latest Zora tokens with confidence.

*Built with ❤️ for the Zora community*
