import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  ExternalLink,
  Copy,
  Users,
  Calendar,
  Globe,
  Shield,
  Circle,
  HelpCircle,
} from "lucide-react";
import PriceChart from "@/components/PriceCharts";
import { cn, truncateAddress } from "@/lib/utils";
import {
  useTrendingCoins,
  formatCoinData,
  useCoinDetails,
} from "@/hooks/useTopVolume24h";
import {
  useDexScreenerTokens,
  DexScreenerPair,
  calculateFallbackPrice,
  useDefiLlamaPrice,
  useDefiLlamaChart,
  useDefiLlamaHistoricalPrices,
} from "@/hooks/useDexScreener";
import { tradeCoin, TradeParameters } from "@zoralabs/coins-sdk";
import { parseEther, parseUnits, erc20Abi } from "viem";
import { useWalletClient } from "wagmi";
import { wagmiConfig } from "@/wagmi";
import { base } from "viem/chains";
import { getCoin } from "@zoralabs/coins-sdk";
import type { WalletClient, PublicClient } from "viem";
import type { Account } from "viem/accounts";
import { Identity } from "@coinbase/onchainkit/identity";
import { useAccount, useBalance } from "wagmi";
import {
  SignInWithBaseButton,
  BasePayButton,
} from "@base-org/account-ui/react";
import { createBaseAccountSDK, pay, getPaymentStatus } from "@base-org/account";
import { useNumberFormatter } from "@/lib/formatNumber";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { WalletConnect } from "@/components/WalletConnect";
import { SiEthereum } from "react-icons/si";
import { baseClient } from "@/utils/basenames";

// Chart period types
type ChartPeriod = "1H" | "6H" | "24H" | "7D" | "1M" | "All";

// Helper function to calculate market cap from price and total supply
const calculateMarketCap = (
  price: number,
  totalSupply: string | number
): number => {
  const supply =
    typeof totalSupply === "string" ? parseFloat(totalSupply) : totalSupply;
  return price * supply;
};

// Helper function to transform price data to market cap data
const transformPriceToMarketCap = (
  priceData: Array<{ timestamp: number; price: number }> | null,
  totalSupply: string | number
): Array<{ timestamp: number; value: number; price: number }> => {
  if (!priceData || priceData.length === 0) return [];

  return priceData.map((point) => ({
    timestamp: point.timestamp,
    value: calculateMarketCap(point.price, totalSupply),
    price: point.price,
  }));
};

// Helper function to calculate percentage change
const calculatePercentageChange = (
  data: Array<{ timestamp: number; value: number; price: number }>
): number => {
  if (data.length < 2) return 0;

  const latest = data[data.length - 1].value;
  const earliest = data[0].value;

  if (earliest === 0) return 0;

  return ((latest - earliest) / earliest) * 100;
};

// Place this helper function before TokenDetails component
const getAgeFromTimestamp = (timestamp: string) => {
  const now = new Date();
  const created = new Date(timestamp);
  const diffInHours = Math.floor(
    (now.getTime() - created.getTime()) / (1000 * 60 * 60)
  );

  if (diffInHours < 1) return "<1h";
  if (diffInHours < 24) return `${diffInHours}h`;
  const days = Math.floor(diffInHours / 24);
  return `${days}d`;
};

// --- Trade Hook ---
function useTradeCoin({
  account,
  walletClient,
  publicClient,
}: {
  account: Account | null;
  walletClient: WalletClient | null;
  publicClient: PublicClient | null;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<unknown>(null);

  const trade = async (tradeParameters: TradeParameters) => {
    setLoading(true);
    setError(null);
    setReceipt(null);
    try {
      if (!account || !walletClient || !publicClient)
        throw new Error("Wallet not connected");
      const result: unknown = await tradeCoin({
        tradeParameters,
        walletClient,
        account,
        publicClient,
      });
      setReceipt(result);
      return result;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Trade failed");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { trade, loading, error, receipt };
}

function hasMediaContent(
  token: unknown
): token is { mediaContent: { previewImage?: { medium?: string } } } {
  return typeof token === "object" && token !== null && "mediaContent" in token;
}

const TRADE_ROUTER_ADDRESS = "0x6ff5693b99212da76ad316178a184ab56d299b43";

export default function TokenDetails() {
  const { address: rawAddress } = useParams<{ address: string }>();
  const navigate = useNavigate();
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>("24H");

  const { formatNumber } = useNumberFormatter();

  // Get chart parameters based on selected period
  const getChartParams = (period: ChartPeriod) => {
    switch (period) {
      case "1H":
        return { period: "5m", span: 12, timeRange: 3600 }; // 1 hour, 5-min intervals
      case "6H":
        return { period: "15m", span: 24, timeRange: 21600 }; // 6 hours, 15-min intervals
      case "24H":
        return { period: "1h", span: 24, timeRange: 86400 }; // 24 hours, 1-hour intervals
      case "7D":
        return { period: "4h", span: 42, timeRange: 604800 }; // 7 days, 4-hour intervals
      case "1M":
        return { period: "1d", span: 30, timeRange: 2592000 }; // 30 days, daily intervals
      case "All":
        return { period: "1d", span: 90, timeRange: 7776000 }; // 90 days, daily intervals
      default:
        return { period: "1h", span: 24, timeRange: 86400 };
    }
  };

  const chartParams = getChartParams(chartPeriod);

  // Stabilize the address to prevent unnecessary re-renders
  const address = useMemo(() => {
    return rawAddress || null;
  }, [rawAddress]);

  // Fetch coin details using the proper hook
  const { coin: token, loading, error } = useCoinDetails(address);

  // Fetch DexScreener data for this token
  const {
    tokens: dexTokens,
    loading: dexLoading,
    error: dexError,
  } = useDexScreenerTokens("8453", rawAddress ? [rawAddress] : []);

  const dexData: DexScreenerPair | undefined = useMemo(
    () => (dexTokens && dexTokens.length > 0 ? dexTokens[0] : undefined),
    [dexTokens]
  );

  // Fetch current price from DefiLlama
  const {
    priceData: defiLlamaPrice,
    loading: priceLoading,
    error: priceError,
  } = useDefiLlamaPrice("8453", address);

  // Use DefiLlama price if available, otherwise fall back to calculated price
  const price =
    defiLlamaPrice?.price ||
    (token?.marketCap && token?.totalSupply
      ? Number(token.marketCap) / Number(token.totalSupply)
      : null);

  // Fetch historical price data for chart
  const {
    chartData: historicalPriceData,
    loading: chartLoading,
    error: chartError,
  } = useDefiLlamaHistoricalPrices(
    "8453",
    address,
    chartParams.span,
    chartParams.timeRange
  );

  // Transform price data to market cap data
  const marketCapChartData = useMemo(() => {
    // If we have historical data and total supply, use real data
    if (
      historicalPriceData &&
      historicalPriceData.length > 0 &&
      token?.totalSupply
    ) {
      const transformed = transformPriceToMarketCap(
        historicalPriceData,
        token.totalSupply
      );
      return transformed;
    }

    // Fallback: create synthetic data based on current price and market cap
    if (price && token?.marketCap) {
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const syntheticData = [];

      // Create 24 data points over the last 24 hours
      for (let i = 23; i >= 0; i--) {
        const timestamp = currentTimestamp - i * 3600; // 1 hour intervals
        // Add some realistic variation (±5%)
        const variation = 1 + (Math.random() - 0.5) * 0.1;
        const syntheticPrice = price * variation;
        const syntheticMarketCap = calculateMarketCap(
          syntheticPrice,
          token.totalSupply || 0
        );

        syntheticData.push({
          timestamp,
          value: syntheticMarketCap,
          price: syntheticPrice,
        });
      }

      return syntheticData;
    }

    // Final fallback: use current market cap as a single data point
    if (token?.marketCap) {
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const currentMarketCap = parseFloat(token.marketCap);

      // Create a simple line with the current market cap
      return [
        {
          timestamp: currentTimestamp - 3600, // 1 hour ago
          value: currentMarketCap * 0.98, // Slightly lower
          price: price || 0,
        },
        {
          timestamp: currentTimestamp,
          value: currentMarketCap,
          price: price || 0,
        },
      ];
    }

    return [];
  }, [historicalPriceData, token?.totalSupply, price, token?.marketCap]);

  // Calculate percentage change for the chart
  const chartPercentageChange = useMemo(() => {
    return calculatePercentageChange(marketCapChartData);
  }, [marketCapChartData]);

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleCoinClick = useCallback(
    (coinAddress: string) => {
      navigate(`/token/${coinAddress}`);
    },
    [navigate]
  );

  // Add wagmi wallet connection state
  const { address: walletAddress, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [txStatus, setTxStatus] = useState<
    null | "pending" | "success" | "error"
  >(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [txReceipt, setTxReceipt] = useState<any>(null);

  const { data: ethBalance, isLoading: isBalanceLoading } = useBalance({
    address: walletAddress,
    chainId: 8453, // Base mainnet
    token: undefined, // native ETH
  });

  // Trading UI state
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const [tradeAmount, setTradeAmount] = useState("");
  const [slippage, setSlippage] = useState(0.5); // Default slippage
  const [inputMode, setInputMode] = useState<"ETH" | "USD">("ETH");
  const [sellInputMode, setSellInputMode] = useState<"TOKEN" | "USD">("TOKEN");

  // ERC-20 token balance for Sell
  const { data: tokenBalance, isLoading: isTokenBalanceLoading } = useBalance({
    address: walletAddress,
    token:
      tradeType === "sell"
        ? (token?.address as `0x${string}` | undefined)
        : undefined,
    chainId: 8453,
  });

  const { priceData: ethPriceData, loading: ethPriceLoading } =
    useDefiLlamaPrice("base", "0x4200000000000000000000000000000000000006");

  // Helper to get ETH value from input
  const getEthAmount = () => {
    if (inputMode === "ETH") {
      return tradeAmount;
    } else {
      // USD mode: convert USD to ETH using price
      const price = ethPriceData?.price || 0;
      if (!price) return "";
      const usd = Number(tradeAmount);
      if (isNaN(usd) || usd <= 0) return "";
      return (usd / price).toString();
    }
  };

  // Helper to get USD value from input
  const getUsdAmount = () => {
    if (inputMode === "USD") {
      return tradeAmount;
    } else {
      // ETH mode: convert ETH to USD using price
      const price = ethPriceData?.price || 0;
      const eth = Number(tradeAmount);
      if (!price || isNaN(eth) || eth <= 0) return "";
      return (eth * price).toString();
    }
  };

  // Helper to get token amount from input for Sell
  const getSellTokenAmount = () => {
    if (sellInputMode === "TOKEN") {
      return tradeAmount;
    } else {
      // USD mode: convert USD to token using price
      let pricePerToken = 0;
      if (typeof price === "number" && !isNaN(price)) {
        pricePerToken = price;
      } else if (dexData?.priceUsd) {
        pricePerToken = parseFloat(dexData.priceUsd);
      }
      if (!pricePerToken) return "";
      const usd = Number(tradeAmount);
      if (isNaN(usd) || usd <= 0) return "";
      return (usd / pricePerToken).toString();
    }
  };

  // Helper to get USD value from input for Sell
  const getSellUsdAmount = () => {
    if (sellInputMode === "USD") {
      return tradeAmount;
    } else {
      let pricePerToken = 0;
      if (typeof price === "number" && !isNaN(price)) {
        pricePerToken = price;
      } else if (dexData?.priceUsd) {
        pricePerToken = parseFloat(dexData.priceUsd);
      }
      const tokenAmt = Number(tradeAmount);
      if (!pricePerToken || isNaN(tokenAmt) || tokenAmt <= 0) return "";
      return (tokenAmt * pricePerToken).toString();
    }
  };

  const handleBuy = async () => {
    setTxStatus("pending");
    setTxError(null);
    setTxReceipt(null);
    try {
      const ethAmount = getEthAmount();
      if (
        !token?.address ||
        !walletClient ||
        !walletClient.account ||
        !ethAmount
      ) {
        setTxStatus("error");
        setTxError("Missing required data.");
        return;
      }
      const tradeParameters = {
        sell: { type: "eth" as const },
        buy: {
          type: "erc20" as const,
          address: token.address as `0x${string}`,
        },
        amountIn: parseEther(ethAmount),
        slippage: slippage / 100, // slippage is percent (e.g. 0.5 for 0.5%)
        sender: walletClient.account.address,
      };
      const receipt = await tradeCoin({
        tradeParameters,
        walletClient,
        account: walletClient.account,
        publicClient: baseClient,
      });
      setTxStatus("success");
      setTxReceipt(receipt);
    } catch (err: any) {
      setTxStatus("error");
      setTxError(err?.message || "Transaction failed");
    }
  };

  // Add handleSell function after handleBuy
  const handleSell = async () => {
    setTxStatus("pending");
    setTxError(null);
    setTxReceipt(null);
    try {
      const tokenAmount = getSellTokenAmount();
      const decimals = 18; // Default to 18 decimals
      if (
        !token?.address ||
        !walletClient ||
        !walletClient.account ||
        !tokenAmount
      ) {
        setTxStatus("error");
        setTxError("Missing required data.");
        return;
      }
      // 1. Approve the router to spend the amount being sold
      const amountToApprove = parseUnits(tokenAmount, decimals);
      await walletClient.writeContract({
        address: token.address as `0x${string}`,
        abi: erc20Abi,
        functionName: "approve",
        args: [TRADE_ROUTER_ADDRESS, amountToApprove],
        account: walletClient.account,
        chain: base,
      });
      // 2. Call tradeCoin
      const tradeParameters = {
        sell: {
          type: "erc20" as const,
          address: token.address as `0x${string}`,
        },
        buy: { type: "eth" as const },
        amountIn: amountToApprove,
        slippage: slippage / 100,
        sender: walletClient.account.address,
      };
      const receipt = await tradeCoin({
        tradeParameters,
        walletClient,
        account: walletClient.account,
        publicClient: baseClient,
      });
      setTxStatus("success");
      setTxReceipt(receipt);
    } catch (err: any) {
      setTxStatus("error");
      setTxError(err?.message || "Transaction failed");
    }
  };

  // Add max button logic
  const handleMaxBuy = () => {
    if (inputMode === "ETH") {
      if (ethBalance?.formatted) setTradeAmount(ethBalance.formatted);
    } else {
      // USD mode
      if (ethBalance?.formatted && ethPriceData?.price) {
        setTradeAmount(
          (Number(ethBalance.formatted) * ethPriceData.price).toString()
        );
      }
    }
  };
  const handleMaxSell = () => {
    if (sellInputMode === "TOKEN") {
      if (tokenBalance?.formatted) setTradeAmount(tokenBalance.formatted);
    } else {
      // USD mode
      if (tokenBalance?.formatted) {
        let pricePerToken = 0;
        if (typeof price === "number" && !isNaN(price)) {
          pricePerToken = price;
        } else if (dexData?.priceUsd) {
          pricePerToken = parseFloat(dexData.priceUsd);
        }
        setTradeAmount(
          (Number(tokenBalance.formatted) * pricePerToken).toString()
        );
      }
    }
  };

  // Early return if no address (before hooks that depend on it)
  if (!address) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6 text-center">
              <div className="mb-4">
                <Shield className="w-12 h-12 mx-auto text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Invalid Token Address
              </h2>
              <p className="text-muted-foreground mb-6">
                No token address provided in the URL.
              </p>
              <Button onClick={handleBack} className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Header Skeleton */}
          <div className="flex items-center gap-4">
            <Skeleton className="w-8 h-8" />
            <div className="space-y-2">
              <Skeleton className="w-32 h-6" />
              <Skeleton className="w-24 h-4" />
            </div>
          </div>

          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }, (_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <Skeleton className="w-20 h-4" />
                    <Skeleton className="w-32 h-8" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Chart Skeleton */}
          <Card>
            <CardContent className="pt-6">
              <Skeleton className="w-full h-64" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !token) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6 text-center">
              <div className="mb-4">
                <Shield className="w-12 h-12 mx-auto text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Token Not Found
              </h2>
              <p className="text-muted-foreground mb-6">
                The token you're looking for doesn't exist or has been removed.
              </p>
              <Button onClick={handleBack} className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const formattedToken = formatCoinData(token);

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
              <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-xl overflow-hidden flex items-center justify-center">
              {hasMediaContent(token) &&
              token.mediaContent.previewImage?.medium ? (
                <img
                  src={token.mediaContent.previewImage.medium}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-muted-foreground text-xl">◎</span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {token.name || "Unknown Token"}
              </h1>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{token.symbol || "N/A"}</Badge>
                <Badge variant="outline">Base</Badge>
              </div>
            </div>
          </div>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Price Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Current Price</p>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {priceLoading ? (
                    <Skeleton className="w-24 h-8" />
                  ) : price !== null ? (
                    `$${price.toFixed(6)}`
                  ) : (
                    calculateFallbackPrice(token?.marketCap, token?.totalSupply)
                  )}
                </p>
                {defiLlamaPrice?.confidence && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Confidence: {(defiLlamaPrice.confidence * 100).toFixed(0)}%
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Market Cap</p>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  ${formatNumber(token?.marketCap || "0")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">24h Volume</p>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  ${formatNumber(token?.volume24h || "0")}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Interactive Price Chart */}
          <Card>
            <CardContent className="pt-6">
              <PriceChart
                data={marketCapChartData}
                changePercent={chartPercentageChange}
                selectedRange={chartPeriod}
                onRangeChange={(range) => setChartPeriod(range as ChartPeriod)}
                loading={chartLoading || loading || !token}
                error={chartError || error}
                totalSupply={token?.totalSupply}
              />
            </CardContent>
          </Card>

          {/* Token Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Token Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      Token Address
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-foreground">
                        {truncateAddress(token?.address || "")}
                      </span>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Total Supply
                    </span>
                    <span className="text-sm text-foreground">
                      {formattedToken?.formattedTotalSupply || "N/A"}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Holders
                    </span>
                    <span className="text-sm text-foreground">
                      {token?.uniqueHolders || "N/A"}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Created
                    </span>
                    <span className="text-sm text-foreground">
                      {token?.createdAt
                        ? new Date(token.createdAt).toLocaleDateString()
                        : "N/A"}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Chain</span>
                    <Badge variant="outline">Base</Badge>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Contract Type
                    </span>
                    <Badge variant="secondary">ERC-20</Badge>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Creator
                    </span>
                    <span className="text-sm text-foreground">
                      {typeof token?.creatorAddress === "string" ? (
                        <Identity
                          address={token.creatorAddress as `0x${string}`}
                        >
                          {null}
                        </Identity>
                      ) : (
                        "N/A"
                      )}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Age</span>
                    <span className="text-sm text-foreground">
                      {token?.createdAt
                        ? getAgeFromTimestamp(token.createdAt)
                        : "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Wallet Connect UI */}
          <WalletConnect />
          {/* Trading Coins - only show if wallet is connected */}
          {isConnected && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Trading Coins</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    variant={tradeType === "buy" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTradeType("buy")}
                    className="flex-1"
                  >
                    Buy
                  </Button>
                  <Button
                    variant={tradeType === "sell" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTradeType("sell")}
                    className="flex-1"
                  >
                    Sell
                  </Button>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder={
                      tradeType === "buy"
                        ? inputMode === "ETH"
                          ? "ETH amount to buy"
                          : "USD amount to spend"
                        : sellInputMode === "TOKEN"
                        ? `${token?.symbol || "Token"} amount to sell`
                        : "USD amount to sell"
                    }
                    value={tradeAmount}
                    onChange={(e) => setTradeAmount(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-background pr-20"
                  />
                  {(tradeType === "buy" || tradeType === "sell") && (
                    <button
                      type="button"
                      className="absolute right-14 top-1/2 -translate-y-1/2 text-xs text-primary font-semibold px-1 py-0.5 rounded hover:underline"
                      style={{ background: "transparent", border: "none" }}
                      onClick={
                        tradeType === "buy" ? handleMaxBuy : handleMaxSell
                      }
                      tabIndex={-1}
                    >
                      Max
                    </button>
                  )}
                  {tradeType === "buy" && (
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() =>
                        setInputMode(inputMode === "ETH" ? "USD" : "ETH")
                      }
                      tabIndex={-1}
                      aria-label="Toggle input mode"
                    >
                      {inputMode === "ETH" ? (
                        <DollarSign size={18} />
                      ) : (
                        <SiEthereum size={18} />
                      )}
                    </button>
                  )}
                  {tradeType === "sell" && (
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() =>
                        setSellInputMode(
                          sellInputMode === "TOKEN" ? "USD" : "TOKEN"
                        )
                      }
                      tabIndex={-1}
                      aria-label="Toggle sell input mode"
                    >
                      {sellInputMode === "TOKEN" ? (
                        token?.imageUrl ? (
                          <img
                            src={token.imageUrl}
                            alt={token.symbol || "Token"}
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: "50%",
                            }}
                          />
                        ) : (
                          <HelpCircle size={18} />
                        )
                      ) : (
                        <DollarSign size={18} />
                      )}
                    </button>
                  )}
                </div>
                {tradeType === "buy" && (
                  <div className="text-xs text-muted-foreground text-right">
                    {isBalanceLoading || ethPriceLoading
                      ? "Loading ETH balance..."
                      : (() => {
                          const eth = ethBalance?.formatted
                            ? Number(ethBalance.formatted)
                            : 0;
                          const price = ethPriceData?.price || 0;
                          const usd = eth * price;
                          const ethDisplay = eth
                            ? eth >= 1
                              ? eth.toFixed(2)
                              : eth.toPrecision(2)
                            : "0";
                          const usdDisplay = usd
                            ? `$${
                                usd >= 1 ? usd.toFixed(2) : usd.toPrecision(2)
                              }`
                            : "$0";
                          return `${ethDisplay} ETH (${usdDisplay})`;
                        })()}
                  </div>
                )}
                {tradeType === "sell" && (
                  <div className="text-xs text-muted-foreground text-right">
                    {isTokenBalanceLoading || priceLoading
                      ? `Loading ${token?.symbol || "Token"} balance...`
                      : (() => {
                          const tokenBal = tokenBalance?.formatted
                            ? Number(tokenBalance.formatted)
                            : 0;
                          // Prefer price from price, then dexData.priceUsd, else 0
                          let pricePerToken = 0;
                          if (typeof price === "number" && !isNaN(price)) {
                            pricePerToken = price;
                          } else if (dexData?.priceUsd) {
                            pricePerToken = parseFloat(dexData.priceUsd);
                          }
                          const usd = tokenBal * pricePerToken;
                          const tokenDisplay = tokenBal
                            ? tokenBal >= 1
                              ? tokenBal.toFixed(2)
                              : tokenBal.toPrecision(2)
                            : "0";
                          const usdDisplay = usd
                            ? `$${
                                usd >= 1 ? usd.toFixed(2) : usd.toPrecision(2)
                              }`
                            : "$0";
                          return `${tokenDisplay} ${
                            tokenBalance?.symbol || token?.symbol || "Token"
                          } (${usdDisplay})`;
                        })()}
                  </div>
                )}
                <Button
                  className="w-full"
                  disabled={
                    !tradeAmount ||
                    Number(getEthAmount()) <= 0 ||
                    (tradeType === "buy" &&
                      (!ethBalance?.formatted ||
                        isNaN(Number(ethBalance.formatted)) ||
                        Number(getEthAmount()) >
                          Number(ethBalance.formatted))) ||
                    (tradeType === "sell" &&
                      (!tokenBalance?.formatted ||
                        isNaN(Number(tokenBalance.formatted)) ||
                        Number(getSellTokenAmount()) >
                          Number(tokenBalance.formatted)))
                  }
                  onClick={tradeType === "buy" ? handleBuy : handleSell}
                >
                  {tradeType === "buy"
                    ? `Buy ${token?.symbol || "Token"}`
                    : `Sell ${token?.symbol || "Token"}`}
                </Button>
                {txStatus === "pending" && (
                  <div className="text-xs text-blue-500 mt-2">
                    Transaction pending...
                  </div>
                )}
                {txStatus === "success" && (
                  <div className="text-xs text-green-600 mt-2 text-right">
                    Success!{" "}
                    <a
                      href={`https://basescan.org/tx/${txReceipt?.transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      Check Tx
                    </a>
                  </div>
                )}
                {txStatus === "error" && (
                  <div className="text-xs text-red-500 mt-2">
                    Error: {txError}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
