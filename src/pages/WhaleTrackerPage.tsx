import React, { useState, useEffect } from "react";
import { WhaleTracker } from "../components/WhaleTracker";
import { Footer } from "../components/Footer";
import { sanitizeEthereumAddress } from "@/lib/utils";

export default function WhaleTrackerPage() {
  const [tokenAddress, setTokenAddress] = useState("");
  const [submittedAddress, setSubmittedAddress] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);

  // Example tokens on Base mainnet
  const exampleTokens = [
    { name: "USDC", address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" },
    { name: "DAI", address: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb" },
    { name: "WETH", address: "0x4200000000000000000000000000000000000006" },
    { name: "cbETH", address: "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22" },
    { name: "USDbC", address: "0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca" },
  ];

  // Popular tokens on Base
  const popularTokens = [
    { name: "BALD", address: "0xf73978b3a7d1d4974abae11f696c1b4408c027a0" },
    { name: "DEGEN", address: "0x4ed4e862860bed51a9570b96d89af5e1b0efefed" },
    { name: "TOSHI", address: "0xac1bd2486aaf3b5c0fc3fd868558b082a531b2b4" },
  ];

  useEffect(() => {
    // Clear error when input changes
    if (inputError) setInputError(null);
  }, [tokenAddress, inputError]);

  // Handle example token click
  const handleExampleClick = (token: { name: string; address: string }) => {
    setTokenAddress(token.address);
    setSubmittedAddress(token.address);
  };

  // Submit handler
  const handleSubmit = () => {
    // Validate address
    const sanitizedAddress = sanitizeEthereumAddress(tokenAddress);
    if (!sanitizedAddress) {
      setInputError("Please enter a valid Ethereum address");
      return;
    }
    setSubmittedAddress(sanitizedAddress);
    setInputError(null);
  };

  // Handle enter key in input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && tokenAddress) {
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex flex-1">
        <main className="flex-1 p-8 pb-24">
          <div className="w-full mx-auto">
            <h1 className="text-3xl font-bold mb-6">Whale Tracker</h1>

            <div className="mb-8 p-6 border rounded-lg bg-card shadow-sm">
              <h2 className="text-xl font-semibold mb-4">
                Track Token Holders & Transfers
              </h2>

              <div className="mb-6">
                <label
                  htmlFor="token-address"
                  className="block text-sm font-medium mb-2"
                >
                  Token Address
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      id="token-address"
                      className={`w-full border rounded-md px-4 py-2 pr-10 bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                        inputError ? "border-red-500" : "border-border"
                      }`}
                      placeholder="Enter ERC20 Token Address (0x...)"
                      value={tokenAddress}
                      onChange={(e) => setTokenAddress(e.target.value)}
                      // onFocus={handleInputFocus}
                      // onBlur={handleInputBlur}
                      onKeyDown={handleKeyDown}
                    />
                    {inputError && (
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg
                          className="h-5 w-5 text-red-500"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                  <button
                    className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-md disabled:opacity-50 transition-colors"
                    disabled={!tokenAddress}
                    onClick={handleSubmit}
                  >
                    Track
                  </button>
                </div>
                {inputError && (
                  <p className="mt-2 text-sm text-red-600">{inputError}</p>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">
                    Stablecoins & Major Tokens
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {exampleTokens.map((token) => (
                      <button
                        key={token.address}
                        onClick={() => handleExampleClick(token)}
                        className="text-xs px-3 py-1.5 border rounded-full hover:bg-primary/10 hover:border-primary/30 transition-colors"
                      >
                        {token.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">
                    Popular Base Tokens
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {popularTokens.map((token) => (
                      <button
                        key={token.address}
                        onClick={() => handleExampleClick(token)}
                        className="text-xs px-3 py-1.5 border rounded-full hover:bg-primary/10 hover:border-primary/30 transition-colors"
                      >
                        {token.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {submittedAddress && (
              <WhaleTracker tokenAddress={submittedAddress} />
            )}
            {!submittedAddress && (
              <div className="text-center py-12 text-muted-foreground">
                <svg
                  className="mx-auto h-12 w-12 text-muted-foreground/70"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="mt-4">
                  Enter a token address above or select one of the example
                  tokens to start tracking whales and top holders.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}
