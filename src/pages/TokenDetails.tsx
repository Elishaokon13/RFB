import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePrivy } from "@privy-io/react-auth";
import { useBalance } from "wagmi";
import { LiFiWidget, WidgetConfig, type WidgetVariant } from "@lifi/widget";
import { Token } from "@coinbase/onchainkit/token";
import { useTheme as useNextTheme } from "next-themes";
import {
  ArrowLeft,
  TrendingUp,
  DollarSign,
  Activity,
  ExternalLink,
  ArrowUpDown,
  Wallet,
  MessageCircle,
  Users,
  BarChart3,
  Lock,
  RefreshCw,
  Search,
  AlertCircle,
  Home,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useTokenDetails,
  formatTokenValue,
  type TokenDetails,
} from "@/hooks/useTokenDetails";
import { useTokenPrice } from "@/hooks/useTokenPrice";
import { useNumberFormatter } from "@/lib/formatNumber";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "next-themes";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@radix-ui/react-dialog";
import { DialogHeader } from "@/components/ui/dialog";

// GeckoTerminalWidget Component
function GeckoTerminalWidget({ tokenAddress }: { tokenAddress: string }) {
  const [widgetLoaded, setWidgetLoaded] = useState(false);
  const { theme } = useNextTheme();

  // Determine GeckoTerminal theme based on app's theme
  const geckoTheme = theme === 'dark' ? 'dark' : 'light';

  useEffect(() => {
    const timer = setTimeout(() => setWidgetLoaded(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full h-full">
      <div className="w-full h-[800px] rounded-lg overflow-hidden relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
        {!widgetLoaded && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 mx-auto bg-blue-500 rounded-full flex items-center justify-center animate-pulse">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Loading Trading Interface
              </p>
            </div>
          </div>
        )}
        <iframe
          src={`https://www.geckoterminal.com/base/tokens/${tokenAddress}?embed=1&info=0&swaps=1&theme=${geckoTheme}`}
          frameBorder="0"
          allow="clipboard-write"
          className="w-full h-full"
          onLoad={() => setWidgetLoaded(true)}
          title="GeckoTerminal Trading Widget"
        />
      </div>
    </div>
  );
}

// TokenHeader Component
function TokenHeader({ token }: { token: TokenDetails | null }) {
  const [showFullDescription, setShowFullDescription] = useState(false);
  const creatorHandle = token?.creatorAddress
    ? `${token.creatorAddress.slice(0, 6)}...${token.creatorAddress.slice(-4)}`
    : "Unknown";
  const timeAgo = token?.createdAt ? getTimeAgo(token.createdAt) : "4d";

  const description = token?.description || "Loading token description...";
  const MAX_DESCRIPTION_LENGTH = 120; // Characters to show before truncating
  const shouldTruncate = description.length > MAX_DESCRIPTION_LENGTH;
  const displayDescription =
    shouldTruncate && !showFullDescription
      ? `${description.slice(0, MAX_DESCRIPTION_LENGTH)}...`
      : description;

  return (
    <div className="p-6 border-b border-gray-100 dark:border-gray-800">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
          {token?.mediaContent?.previewImage?.small ? (
            <img
              src={token.mediaContent.previewImage.small}
              alt={token.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-lg">🧠</span>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm text-gray-500">{creatorHandle}</span>
            <span className="text-sm text-gray-400">{timeAgo}</span>
            {token?.creatorAddress && (
              <a
                href={`https://basescan.org/address/${token.creatorAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {token?.name || "Loading..."}
          </h1>
          <div className="text-gray-600 dark:text-gray-400 text-sm">
            <p className="leading-relaxed">{displayDescription}</p>
            {shouldTruncate && (
              <button
                onClick={() => setShowFullDescription(!showFullDescription)}
                className="text-primary hover:text-primary/80 text-xs font-medium mt-1 transition-colors"
              >
                {showFullDescription ? "Show less" : "Show more"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// TokenStats Component
function TokenStats({ token }: { token: TokenDetails | null }) {
  const priceData = useTokenPrice(token?.address || null);

  const formatPrice = (price: number): string => {
    if (price < 0.01) {
      return `$${price.toFixed(6)}`;
    } else if (price < 1) {
      return `$${price.toFixed(4)}`;
    } else {
      return `$${price.toFixed(2)}`;
    }
  };

  return (
    <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
      <div className="grid grid-cols-3 gap-6">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            Market Cap
          </p>
          <div className="flex items-center gap-1">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="font-semibold text-green-500">
              ${token ? formatTokenValue(token.marketCap) : "0"}
            </span>
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            24H Volume
          </p>
          <div className="flex items-center gap-1">
            <Activity className="w-4 h-4 text-gray-600" />
            <span className="font-semibold text-gray-900 dark:text-white">
              ${token ? formatTokenValue(token.volume24h) : "0"}
            </span>
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            Token Price
          </p>
          <div className="flex items-center gap-1">
            <DollarSign className="w-4 h-4 text-blue-500" />
            <span className="font-semibold text-blue-500">
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
      </div>
    </div>
  );
}

// TradingInterface Component with LI.FI Widget
function TradingInterface({ token }: { token: TokenDetails | null }) {
  // Get Privy user info
  const { user, authenticated } = usePrivy();
  const userAddress = user?.wallet?.address;
  const { theme } = useNextTheme();

  // Configure LI.FI Widget based on v3.24.3
  const widgetConfig: WidgetConfig = {
    integrator: "Zoracle",
    fromChain: 8453, // Base chain
    toChain: 8453,  // Default to same chain
    fromToken: "0x0000000000000000000000000000000000000000", // ETH
    toToken: token?.address || "", // Current token
    appearance: theme === 'dark' ? 'dark' : 'light',
    fee: 0.05,
    variant: "compact",
    buildUrl: false, // prevents widget links updating your URL/history
    theme: { container: { display: "flex", height: "100%", maxHeight: 800 } },
    sdkConfig: {
      rpcUrls: {
        8453: [
          `https://base-mainnet.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_API_KEY}`,
        ],
      },
    },
  };
  
  return (
    <div className="p-6">
      {authenticated ? (
        <LiFiWidget
          config={widgetConfig}
          integrator="Zoracle"
        />
      ) : (
        <div className="text-center p-6 bg-muted/30 rounded-lg">
          <Wallet className="w-12 h-12 mx-auto mb-3 text-primary/50" />
          <p className="text-lg font-medium mb-2">Connect your wallet</p>
          <p className="text-sm text-muted-foreground mb-4">
            Connect your wallet to swap tokens using LI.FI
          </p>
          <Button variant="default">Connect Wallet</Button>
        </div>
      )}
    </div>
  );
}

// CommentsSection Component
function CommentsSection({ token }: { token: TokenDetails | null }) {
  const comments = token?.zoraComments?.edges || [];
  const commentsCount = token?.zoraComments?.count || 0;

  return (
    <div className="flex-1">
      <Tabs defaultValue="comments" className="h-full flex flex-col">
        <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-800">
          <TabsList className="grid w-full grid-cols-4 bg-gray-100 dark:bg-gray-800">
            <TabsTrigger value="comments" className="text-xs">
              Comments <Badge className="ml-1 text-xs">{commentsCount}</Badge>
            </TabsTrigger>
            <TabsTrigger value="holders" className="text-xs">
              Holders{" "}
              <Badge className="ml-1 text-xs">
                {token?.uniqueHolders || "0"}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="activity" className="text-xs">
              Activity
            </TabsTrigger>
            <TabsTrigger value="details" className="text-xs">
              Details
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="comments" className="flex-1 p-0 m-0">
          <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Add a comment..."
                className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>Become a holder to unlock</span>
                <Lock className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {comments.length > 0 ? (
              comments.map((comment, index) => (
                <div
                  key={comment.node.txHash || index}
                  className="px-6 py-4 border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50/50 dark:hover:bg-gray-800/50"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm overflow-hidden">
                      {comment.node.userProfile?.avatar?.previewImage?.small ? (
                        <img
                          src={
                            comment.node.userProfile.avatar.previewImage.small
                          }
                          alt={comment.node.userProfile.handle}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>👤</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-gray-900 dark:text-white">
                          {comment.node.userProfile?.handle ||
                            `${comment.node.userAddress.slice(
                              0,
                              6
                            )}...${comment.node.userAddress.slice(-4)}`}
                        </span>
                        <span className="text-xs text-gray-500">
                          {getTimeAgo(
                            new Date(
                              comment.node.timestamp * 1000
                            ).toISOString()
                          )}
                        </span>
                        <div className="ml-auto flex items-center gap-1">
                          <button className="text-gray-400 hover:text-gray-600">
                            <svg
                              className="w-4 h-4"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M10 12l-4-4h8l-4 4z" />
                            </svg>
                          </button>
                          <span className="text-xs text-gray-500">0</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        {comment.node.comment}
                      </p>
                      <button className="text-xs text-gray-500 hover:text-gray-700 mt-2">
                        Reply
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center py-12">
                <div className="text-center text-gray-500">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2" />
                  <p>No comments yet</p>
                  <p className="text-xs">Be the first to comment!</p>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="holders" className="flex-1 p-6">
          <div className="text-center text-gray-500 py-8">
            <Users className="w-8 h-8 mx-auto mb-2" />
            <p>Holders: {token?.uniqueHolders || "0"}</p>
            <p className="text-sm">
              Total Supply: {token ? formatTokenValue(token.totalSupply) : "0"}
            </p>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="flex-1 p-6">
          <div className="text-center text-gray-500 py-8">
            <BarChart3 className="w-8 h-8 mx-auto mb-2" />
            <p>
              Total Volume: ${token ? formatTokenValue(token.totalVolume) : "0"}
            </p>
            <p className="text-sm">
              24h Volume: ${token ? formatTokenValue(token.volume24h) : "0"}
            </p>
          </div>
        </TabsContent>

        <TabsContent value="details" className="flex-1 p-6">
          <div className="space-y-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Contract Address:</span>
              <span className="font-mono">
                {token?.address
                  ? `${token.address.slice(0, 6)}...${token.address.slice(-4)}`
                  : "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Symbol:</span>
              <span>{token?.symbol || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Creator:</span>
              <span className="font-mono">
                {token?.creatorAddress
                  ? `${token.creatorAddress.slice(
                      0,
                      6
                    )}...${token.creatorAddress.slice(-4)}`
                  : "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Created:</span>
              <span>
                {token?.createdAt
                  ? new Date(token.createdAt).toLocaleDateString()
                  : "N/A"}
              </span>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper function to get time ago
function getTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

  if (diffInDays > 0) {
    return `${diffInDays}d`;
  } else if (diffInHours > 0) {
    return `${diffInHours}h`;
  } else if (diffInMinutes > 0) {
    return `${diffInMinutes}m`;
  } else {
    return "now";
  }
}

export default function TokenDetails() {
  const { address: rawAddress, "*": extraPath } = useParams<{ address: string, "*": string }>();
  const navigate = useNavigate();
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);

  // Handle extra path parameters like "from-token"
  useEffect(() => {
    // If we have a path like "/token/{address}/from-token"
    if (extraPath && extraPath.includes("from-token") && rawAddress) {
      console.log(`Token details with "from-token" path: ${rawAddress}/${extraPath}`);
      // The LI.FI widget will handle this internally through its UI
      // No need to redirect, the widget will show the right interface
    }
  }, [extraPath, rawAddress]);

  const address = useMemo(() => rawAddress || null, [rawAddress]);
  const { data: token, isLoading: loading, error } = useTokenDetails(address);

  const handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "/";
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4 py-6 max-w-[1800px]">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Skeleton className="h-8 w-48" />
          </div>
          <div className="flex gap-6">
            <div className="flex-1">
              <Skeleton className="h-[800px] w-full rounded-lg" />
            </div>
            <div className="w-80 xl:w-96 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
              <Skeleton className="h-[800px] w-full" />
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
              Back
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
                  The token you're looking for doesn't exist, has expired, or
                  couldn't be loaded. This might happen if the token was deleted
                  or the link is outdated.
                </p>

                {/* Token ID display (if available) */}
                <div className="inline-flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-md text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-mono">Token ID: ***...****</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="space-y-3 mb-8">
                <button
                  onClick={handleRefresh}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg hover:scale-[1.02]"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={handleGoBack}
                    className="flex-1 flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium py-3 px-4 rounded-lg transition-colors duration-200"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Go Back
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

              {/* Help section */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Need help finding the right token?
                </p>
                <div className="flex justify-center gap-4">
                  <button className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium transition-colors">
                    <Search className="w-4 h-4" />
                    Browse Tokens
                  </button>
                  <span className="text-gray-300 dark:text-gray-600">•</span>
                  <a
                    href="/support"
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium transition-colors"
                  >
                    Contact Support
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Decorative elements */}
          <div className="fixed top-1/4 left-10 w-2 h-2 bg-orange-400 rounded-full opacity-20 animate-bounce"></div>
          <div className="fixed bottom-1/4 right-10 w-3 h-3 bg-red-400 rounded-full opacity-15 animate-pulse delay-500"></div>
          <div className="fixed top-1/3 right-20 w-1 h-1 bg-blue-400 rounded-full opacity-25 animate-ping delay-700"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4 py-6 max-w-[1800px]">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>

        {/* Main Layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Section - Main Content (GeckoTerminal Widget) */}
          <div className="flex-1">
            <GeckoTerminalWidget tokenAddress={token.address} />
          </div>

          {/* Right Section - Sidebar (Fixed Width) */}
          <div className="w-full lg:w-80 xl:w-96 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col h-[800px]">
            <TokenHeader token={token} />
            <TokenStats token={token} />
            <div className="p-4 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={() => setIsTradeModalOpen(true)}
                className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 px-4 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <ArrowUpDown className="w-4 h-4" />
                Trade {token.symbol || "Token"}
              </button>
            </div>
            {isTradeModalOpen && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl w-fit p-5 flex flex-col overflow-hidden">
                  {/* <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      Trade {token.name}
                      <span className="text-sm font-normal px-2 py-1 bg-primary/10 text-primary rounded-full">
                        {token.symbol}
                      </span>
                    </h3>
                  </div> */}
                  <button
                    onClick={() => setIsTradeModalOpen(false)}
                    className="p-2 bg-gray-100 w-fit self-end p-2 rounded-full z-10 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </button>
                  <div className="flex-1 overflow-auto">
                    <TradingInterface token={token} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
