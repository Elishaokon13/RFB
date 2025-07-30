import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePrivy } from "@privy-io/react-auth";
import { LiFiWidget, WidgetConfig } from "@lifi/widget";
import {
  ArrowLeft,
  TrendingUp,
  DollarSign,
  Activity,
  ExternalLink,
  ArrowUpDown,
  Wallet,
  BarChart3,
  RefreshCw,
  Search,
  AlertCircle,
  Home,
  X,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWalletTokens } from "@/hooks/useWalletTokens";
import { useTokenPrice } from "@/hooks/useTokenPrice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "next-themes";

// TradingInterface Component (copied from TokenDetails.tsx)
function TradingInterface({ tokenAddress }: { tokenAddress: string }) {
  const { user, authenticated } = usePrivy();
  const { theme } = useTheme();

  const widgetConfig: WidgetConfig = {
    integrator: "Zoracle",
    fromChain: 8453,
    fee: 0.05,
    toChain: 8453,
    fromToken: tokenAddress, // User's token (for selling) - locked
    appearance: theme === "dark" ? "light" : "dark",
    variant: "compact",
    buildUrl: false,
    theme: { container: { display: "flex", height: "100%", maxHeight: 600 } },
    sdkConfig: {
      rpcUrls: {
        8453: [
          `https://base-mainnet.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_API_KEY}`,
        ],
      },
    },
  };

  return (
    <div className="h-full flex flex-col">
      {authenticated && tokenAddress ? (
        <LiFiWidget config={widgetConfig} integrator="Zoracle" />
      ) : (
        <p className="p-4">Please connect your wallet to trade.</p>
      )}
    </div>
  );
}

// TokenHeader Component
function TokenHeader({ token, balance, showBalances }: { 
  token: any; 
  balance: number;
  showBalances: boolean;
}) {
  const formatTokenAmount = (amount: number) => {
    if (amount >= 1000000) {
      return (amount / 1000000).toFixed(2) + "M";
    } else if (amount >= 1000) {
      return (amount / 1000).toFixed(2) + "K";
    }
    return amount.toLocaleString();
  };

  return (
    <div className="p-6 border-b border-gray-100 dark:border-gray-800">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
          {token?.logo ? (
            <img
              src={token.logo}
              alt={token.symbol}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-lg">{token?.symbol?.charAt(0) || "?"}</span>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm text-gray-500">Your Holdings</span>
            <Badge variant="outline" className="text-xs">
              {token?.symbol || "TOKEN"}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {token?.name || "Unknown Token"}
          </h1>
          <div className="text-gray-600 dark:text-gray-400 text-sm">
            <p className="leading-relaxed">
              Balance: {showBalances ? formatTokenAmount(balance) : "****"} {token?.symbol}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Contract: {token?.contractAddress?.slice(0, 6)}...{token?.contractAddress?.slice(-4)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// TokenStats Component
function TokenStats({ token, balance }: { token: any; balance: number }) {
  const { data: priceData } = useTokenPrice(token?.contractAddress || null);

  const formatPrice = (price: number): string => {
    if (price < 0.01) {
      return `$${price.toFixed(6)}`;
    } else if (price < 1) {
      return `$${price.toFixed(4)}`;
    } else {
      return `$${price.toFixed(2)}`;
    }
  };

  const formatTokenAmount = (amount: number) => {
    if (amount >= 1000000) {
      return (amount / 1000000).toFixed(2) + "M";
    } else if (amount >= 1000) {
      return (amount / 1000).toFixed(2) + "K";
    }
    return amount.toLocaleString();
  };

  const estimatedValue = priceData ? balance * priceData.price : 0;

  return (
    <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            Your Balance
          </p>
          <div className="flex items-center gap-1">
            <Wallet className="w-4 h-4 text-blue-500" />
            <span className="font-semibold text-blue-500">
              {formatTokenAmount(balance)} {token?.symbol}
            </span>
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            Estimated Value
          </p>
          <div className="flex items-center gap-1">
            <DollarSign className="w-4 h-4 text-green-500" />
            <span className="font-semibold text-green-500">
              ${estimatedValue.toFixed(2)}
            </span>
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            Token Price
          </p>
          <div className="flex items-center gap-1">
            <TrendingUp className="w-4 h-4 text-gray-600" />
            <span className="font-semibold text-gray-900 dark:text-white">
              {priceData ? formatPrice(priceData.price) : "$0.00"}
            </span>
            {priceData && priceData.priceChange24h !== 0 && (
              <span
                className={`text-xs ${
                  priceData.priceChange24h > 0
                    ? "text-green-500"
                    : "text-red-500"
                }`}
              >
                {priceData.priceChange24h > 0 ? "+" : ""}
                {priceData.priceChange24h.toFixed(2)}%
              </span>
            )}
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            24H Change
          </p>
          <div className="flex items-center gap-1">
            <Activity className="w-4 h-4 text-gray-600" />
            <span className="font-semibold text-gray-900 dark:text-white">
              {priceData && priceData.priceChange24h !== 0 ? (
                <span
                  className={
                    priceData.priceChange24h > 0
                      ? "text-green-500"
                      : "text-red-500"
                  }
                >
                  {priceData.priceChange24h > 0 ? "+" : ""}
                  {priceData.priceChange24h.toFixed(2)}%
                </span>
              ) : (
                "0.00%"
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PortfolioTokenDetails() {
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [showBalances, setShowBalances] = useState(true);
  const { address: rawAddress } = useParams<{ address: string }>();
  const navigate = useNavigate();
  const { user, authenticated } = usePrivy();
  const { tokens, loading, error, refetch, isConnected } = useWalletTokens();

  const address = useMemo(() => rawAddress || null, [rawAddress]);

  // Find the specific token from user's holdings
  const token = useMemo(() => {
    if (!address || !tokens.length) return null;
    return tokens.find(t => t.contractAddress.toLowerCase() === address.toLowerCase());
  }, [address, tokens]);

  const handleGoBack = () => {
    navigate('/portfolio');
  };

  const handleRefresh = () => {
    refetch();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4 py-6 max-w-[1800px]">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="sm" onClick={handleGoBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Portfolio
            </Button>
            <Skeleton className="h-8 w-48" />
          </div>
          <div className="flex gap-6">
            <div className="flex-1">
              <Skeleton className="h-[600px] w-full rounded-lg" />
            </div>
            <div className="w-80 xl:w-96 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
              <Skeleton className="h-[600px] w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !token) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
        <div className="container mx-auto px-4 py-6 max-w-[1800px]">
          {/* Navigation Header */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={handleGoBack}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors duration-200"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Portfolio
            </button>
          </div>

          {/* Main Content */}
          <div className="flex items-center justify-center py-12 min-h-[calc(100vh-200px)]">
            <div className="max-w-md w-full text-center">
              {/* Icon with animation */}
              <div className="relative mb-8 flex justify-center">
                <div className="relative">
                  <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center mb-4 animate-pulse">
                    <AlertCircle className="w-10 h-10 text-white" />
                  </div>
                  {/* Floating rings */}
                  <div className="absolute inset-0 w-20 h-20 border-2 border-orange-300 rounded-full animate-ping opacity-20"></div>
                  <div className="absolute inset-0 w-20 h-20 border-2 border-red-300 rounded-full animate-ping opacity-10 delay-300"></div>
                </div>
              </div>

              {/* Main message */}
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                  Token Not Found
                </h2>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                  This token is not in your portfolio or couldn't be loaded. Make sure you're connected to the right wallet.
                </p>

                {/* Token ID display (if available) */}
                <div className="inline-flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-md text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-mono">Token: {address?.slice(0, 6)}...{address?.slice(-4)}</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="space-y-3 mb-8">
                <button
                  onClick={handleRefresh}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg hover:scale-[1.02]"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh Portfolio
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={handleGoBack}
                    className="flex-1 flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium py-3 px-4 rounded-lg transition-colors duration-200"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Portfolio
                  </button>

                  <a
                    href="/"
                    className="flex-1 flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium py-3 px-4 rounded-lg transition-colors duration-200"
                  >
                    <Home className="w-4 h-4" />
                    Home
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4 py-6 max-w-[1800px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={handleGoBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Portfolio
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBalances(!showBalances)}
            >
              {showBalances ? (
                <EyeOff className="w-4 h-4 mr-2" />
              ) : (
                <Eye className="w-4 h-4 mr-2" />
              )}
              {showBalances ? "Hide" : "Show"} Balances
            </Button>
          </div>
        </div>

        {/* Main Layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Section - Token Info Card */}
          <div className="flex-1">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Token Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Token Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Token Name</p>
                      <p className="font-medium">{token.name}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Symbol</p>
                      <p className="font-medium">{token.symbol}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Your Balance</p>
                      <p className="font-medium">
                        {showBalances ? token.balance.toLocaleString() : "****"} {token.symbol}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Decimals</p>
                      <p className="font-medium">{token.decimals}</p>
                    </div>
                  </div>

                  {/* Contract Address */}
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Contract Address</p>
                    <div className="flex items-center gap-2">
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {token.contractAddress}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigator.clipboard.writeText(token.contractAddress)}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* External Links */}
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">External Links</p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`https://basescan.org/token/${token.contractAddress}`, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        BaseScan
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`https://dexscreener.com/base/${token.contractAddress}`, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        DexScreener
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Section - Trading Interface */}
          <div className="w-full lg:w-80 xl:w-96 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col h-[600px]">
            <TokenHeader token={token} balance={token.balance} showBalances={showBalances} />
            <TokenStats token={token} balance={token.balance} />
            <div className="p-4 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={() => setIsTradeModalOpen(true)}
                className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 px-4 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <ArrowUpDown className="w-4 h-4" />
                Trade {token.symbol}
              </button>
            </div>
          </div>
        </div>

        {/* Trade Modal */}
        {isTradeModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl w-fit p-5 flex flex-col overflow-hidden">
              <button
                onClick={() => setIsTradeModalOpen(false)}
                className="p-2 bg-gray-100 w-fit self-end p-2 rounded-full z-10 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
              <div className="flex-1 overflow-auto">
                <TradingInterface tokenAddress={token.contractAddress} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 