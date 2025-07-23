import React, { useState, useEffect } from "react";
import { WhaleTracker } from "../components/WhaleTracker";
import { sanitizeEthereumAddress } from "@/lib/utils";
import { Search, TrendingUp, Users, Activity, Copy, ExternalLink } from "lucide-react";

export default function WhaleTrackerPage() {
  const [tokenAddress, setTokenAddress] = useState("");
  const [submittedAddress, setSubmittedAddress] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);

  // Example tokens on Base mainnet
  const exampleTokens = [
    { name: "USDC", address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", icon: "💵" },
    { name: "DAI", address: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb", icon: "🪙" },
    { name: "WETH", address: "0x4200000000000000000000000000000000000006", icon: "🔷" },
    { name: "cbETH", address: "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22", icon: "🏦" },
    { name: "USDbC", address: "0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca", icon: "💎" },
  ];

  // Popular tokens on Base
  const popularTokens = [
    { name: "BALD", address: "0xf73978b3a7d1d4974abae11f696c1b4408c027a0", icon: "🦅" },
    { name: "DEGEN", address: "0x4ed4e862860bed51a9570b96d89af5e1b0efefed", icon: "🎲" },
    { name: "TOSHI", address: "0xac1bd2486aaf3b5c0fc3fd868558b082a531b2b4", icon: "🐱" },
  ];

  useEffect(() => {
    if (inputError) setInputError(null);
  }, [tokenAddress, inputError]);

  const handleExampleClick = (token: { name: string; address: string }) => {
    setTokenAddress(token.address);
    setSubmittedAddress(token.address);
  };

  const handleSubmit = () => {
    const sanitizedAddress = sanitizeEthereumAddress(tokenAddress);
    if (!sanitizedAddress) {
      setInputError("Please enter a valid Ethereum address");
      return;
    }
    setSubmittedAddress(sanitizedAddress);
    setInputError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && tokenAddress) {
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              Whale Tracker
            </h1>
          </div>
          <p className="text-muted-foreground text-sm sm:text-base">
            Track token holders, monitor whale movements, and analyze transfer patterns on Base
          </p>
        </div>

        {/* Search Section */}
        <div className="mb-8">
          <div className="bg-card border border-border rounded-xl shadow-sm p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Search className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-xl sm:text-2xl font-semibold">
                Track Token Holders & Transfers
              </h2>
            </div>

            {/* Search Input */}
            <div className="mb-6">
              <label htmlFor="token-address" className="block text-sm font-medium mb-3">
                Token Address
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <input
                    id="token-address"
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all ${
                      inputError ? "border-red-500" : "border-border"
                    }`}
                    placeholder="Enter ERC20 Token Address (0x...)"
                    value={tokenAddress}
                    onChange={(e) => setTokenAddress(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  {inputError && (
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                <button
                  className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg disabled:opacity-50 transition-all font-medium flex items-center gap-2"
                  disabled={!tokenAddress}
                  onClick={handleSubmit}
                >
                  <Activity className="w-4 h-4" />
                  Track
                </button>
              </div>
              {inputError && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {inputError}
                </p>
              )}
            </div>

            {/* Quick Select Tokens */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Stablecoins & Major Tokens
                </h3>
                <div className="flex flex-wrap gap-2">
                  {exampleTokens.map((token) => (
                    <button
                      key={token.address}
                      onClick={() => handleExampleClick(token)}
                      className="flex items-center gap-2 text-sm px-4 py-2 border border-border rounded-lg hover:bg-primary/5 hover:border-primary/30 transition-all bg-background"
                    >
                      <span className="text-lg">{token.icon}</span>
                      {token.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Popular Base Tokens
                </h3>
                <div className="flex flex-wrap gap-2">
                  {popularTokens.map((token) => (
                    <button
                      key={token.address}
                      onClick={() => handleExampleClick(token)}
                      className="flex items-center gap-2 text-sm px-4 py-2 border border-border rounded-lg hover:bg-primary/5 hover:border-primary/30 transition-all bg-background"
                    >
                      <span className="text-lg">{token.icon}</span>
                      {token.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {submittedAddress && (
          <WhaleTracker tokenAddress={submittedAddress} />
        )}
        
        {!submittedAddress && (
          <div className="text-center py-16 sm:py-24">
            <div className="max-w-md mx-auto">
              <div className="p-4 bg-muted/50 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-3">Ready to Track Whales?</h3>
              <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                Enter a token address above or select one of the example tokens to start tracking whales, 
                top holders, and transfer patterns on the Base network.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
