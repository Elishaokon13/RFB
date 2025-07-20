import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useTrendingCoins,
  formatCoinData,
  useCoinDetails,
} from "@/hooks/useTopVolume24h";
import {
  useDexScreenerTokens,
  DexScreenerPair,
  calculateFallbackPrice,
} from "@/hooks/useDexScreener";
import { tradeCoin, TradeParameters } from "@zoralabs/coins-sdk";
import { base } from "viem/chains";
import { getCoin } from "@zoralabs/coins-sdk";
import type { WalletClient, PublicClient } from "viem";
import type { Account } from "viem/accounts";
import { Identity } from "@coinbase/onchainkit/identity";
import {
  SignInWithBaseButton,
  BasePayButton,
} from "@base-org/account-ui/react";
import { createBaseAccountSDK, pay, getPaymentStatus } from "@base-org/account";

// Chart period types
type ChartPeriod = "1H" | "6H" | "24H" | "7D" | "1M";

// Mock historical data generator (in real app, you'd fetch this from API)
const generateHistoricalData = (
  period: ChartPeriod,
  currentPrice: number,
  priceChange: number
) => {
  const now = Date.now();
  let dataPoints = 50;
  let interval = 60000; // 1 minute default

  switch (period) {
    case "1H":
      interval = 60000; // 1 minute
      dataPoints = 60;
      break;
    case "6H":
      interval = 300000; // 5 minutes
      dataPoints = 72;
      break;
    case "24H":
      interval = 900000; // 15 minutes
      dataPoints = 96;
      break;
    case "7D":
      interval = 3600000; // 1 hour
      dataPoints = 168;
      break;
    case "1M":
      interval = 86400000; // 1 day
      dataPoints = 30;
      break;
  }

  const data = [];
  const volatility = Math.abs(priceChange) / 100;

  for (let i = dataPoints; i >= 0; i--) {
    const timestamp = now - i * interval;
    const progress = i / dataPoints;

    // Create realistic price movement
    const basePrice = currentPrice * (1 - (priceChange / 100) * progress);
    const randomFactor = 1 + (Math.random() - 0.5) * volatility * 0.1;
    const price = basePrice * randomFactor;

    data.push({
      timestamp,
      price,
      volume: Math.random() * 1000000 + 100000, // Random volume
    });
  }

  return data;
};

// Interactive Price Chart Component
const PriceChart = ({
  dexScreenerData,
  period,
  onPeriodChange,
}: {
  dexScreenerData: DexScreenerPair | undefined;
  period: ChartPeriod;
  onPeriodChange: (period: ChartPeriod) => void;
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<{
    price: number;
    timestamp: number;
  } | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [chartContainer, setChartContainer] = useState<HTMLDivElement | null>(
    null
  );

  // DexScreener data is no longer used; use mock or prop values if needed
  const currentPrice = dexScreenerData?.priceUsd
    ? parseFloat(dexScreenerData.priceUsd)
    : 0;
  const priceChange = dexScreenerData?.priceChange?.h24 || 0;

  const chartData = useMemo(() => {
    if (!currentPrice) return [];
    return generateHistoricalData(period, currentPrice, priceChange);
  }, [currentPrice, priceChange, period]);

  const periods: ChartPeriod[] = ["1H", "6H", "24H", "7D", "1M"];

  // Dynamic chart dimensions based on container
  const chartWidth = chartContainer ? chartContainer.clientWidth - 80 : 800; // Account for padding
  const chartHeight = 400; // Fixed height for better aspect ratio
  const padding = 60; // Increased padding for better labels

  // Calculate chart scales
  const prices = chartData.map((d) => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;
  const pricePadding = priceRange * 0.15; // Increased padding for better visualization

  const xScale = (timestamp: number) => {
    if (chartData.length === 0) return padding;
    const timeRange =
      chartData[chartData.length - 1].timestamp - chartData[0].timestamp;
    return (
      padding +
      ((timestamp - chartData[0].timestamp) / timeRange) *
        (chartWidth - 2 * padding)
    );
  };

  const yScale = (price: number) => {
    return (
      chartHeight -
      padding -
      ((price - (minPrice - pricePadding)) / (priceRange + 2 * pricePadding)) *
        (chartHeight - 2 * padding)
    );
  };

  // Generate SVG path for the line
  const linePath = chartData
    .map((point, index) => {
      const x = xScale(point.timestamp);
      const y = yScale(point.price);
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  // Generate area path for fill
  const areaPath =
    chartData
      .map((point, index) => {
        const x = xScale(point.timestamp);
        const y = yScale(point.price);
        return `${index === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ") +
    ` L ${xScale(chartData[chartData.length - 1]?.timestamp || 0)} ${
      chartHeight - padding
    } L ${xScale(chartData[0]?.timestamp || 0)} ${chartHeight - padding} Z`;

  const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;

    // Find closest data point
    const closestPoint = chartData.reduce((closest, point) => {
      const pointX = xScale(point.timestamp);
      const distance = Math.abs(x - pointX);
      return distance < Math.abs(x - xScale(closest.timestamp))
        ? point
        : closest;
    });

    setHoveredPoint(closestPoint);
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  const formatPrice = (price: number) => {
    if (price < 0.000001) return `$${price.toExponential(2)}`;
    if (price < 0.01) return `$${price.toFixed(6)}`;
    if (price < 1) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(2)}`;
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    switch (period) {
      case "1H":
        return date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      case "6H":
        return date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      case "24H":
        return date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      case "7D":
        return date.toLocaleDateString([], { month: "short", day: "numeric" });
      case "1M":
        return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  return (
    <div className="space-y-4">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Price Chart</h2>
        <div className="flex bg-muted rounded-lg p-1">
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => {
                setIsAnimating(true);
                onPeriodChange(p);
                setTimeout(() => setIsAnimating(false), 300);
              }}
              className={cn(
                "px-3 py-1 rounded-md text-sm font-medium transition-all duration-200",
                p === period
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Container */}
      <div
        ref={setChartContainer}
        className="relative bg-muted/10 rounded-lg border border-border p-6 w-full"
        style={{ minHeight: `${chartHeight + 40}px` }}
      >
        {chartData.length > 0 ? (
          <svg
            width="100%"
            height={chartHeight}
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            preserveAspectRatio="xMidYMid meet"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="w-full h-auto"
          >
            {/* Grid Lines */}
            <defs>
              <pattern
                id="grid"
                width="60"
                height="60"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 60 0 L 0 0 0 60"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.5"
                  className="text-border opacity-20"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Price Labels */}
            <g className="text-xs text-gray-500">
              {[0, 0.2, 0.4, 0.6, 0.8, 1].map((ratio) => {
                const price =
                  minPrice -
                  pricePadding +
                  (priceRange + 2 * pricePadding) * ratio;
                const y =
                  chartHeight - padding - (chartHeight - 2 * padding) * ratio;
                return (
                  <g key={ratio}>
                    <line
                      x1={padding}
                      y1={y}
                      x2={chartWidth - padding}
                      y2={y}
                      stroke="currentColor"
                      strokeWidth="0.5"
                      className="text-gray-300 opacity-40"
                    />
                    <text
                      x={padding - 8}
                      y={y + 3}
                      textAnchor="end"
                      className="text-xs font-medium text-gray-500"
                    >
                      {formatPrice(price)}
                    </text>
                  </g>
                );
              })}
            </g>

            {/* Time Labels */}
            <g className="text-xs text-gray-500">
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const index = Math.floor(ratio * (chartData.length - 1));
                const point = chartData[index];
                if (!point) return null;
                const x = xScale(point.timestamp);
                return (
                  <g key={ratio}>
                    <line
                      x1={x}
                      y1={chartHeight - padding}
                      x2={x}
                      y2={chartHeight - padding + 5}
                      stroke="currentColor"
                      strokeWidth="0.5"
                      className="text-gray-300 opacity-40"
                    />
                    <text
                      x={x}
                      y={chartHeight - padding + 18}
                      textAnchor="middle"
                      className="text-xs text-gray-500"
                    >
                      {formatTime(point.timestamp)}
                    </text>
                  </g>
                );
              })}
            </g>

            {/* Area Fill */}
            <path
              d={areaPath}
              fill="url(#gradient)"
              opacity="0.4"
              className={cn(
                "transition-all duration-300",
                isAnimating && "animate-pulse"
              )}
            />

            {/* Line */}
            <path
              d={linePath}
              stroke="url(#lineGradient)"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={cn(
                "transition-all duration-300",
                isAnimating && "animate-pulse"
              )}
            />

            {/* Hover Point */}
            {hoveredPoint && (
              <g>
                <circle
                  cx={xScale(hoveredPoint.timestamp)}
                  cy={yScale(hoveredPoint.price)}
                  r="6"
                  fill="currentColor"
                  className="text-primary"
                />
                <circle
                  cx={xScale(hoveredPoint.timestamp)}
                  cy={yScale(hoveredPoint.price)}
                  r="12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-primary opacity-30"
                />
              </g>
            )}

            {/* Gradients */}
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop
                  offset="0%"
                  stopColor="currentColor"
                  className="text-primary"
                  stopOpacity="0.6"
                />
                <stop
                  offset="100%"
                  stopColor="currentColor"
                  className="text-primary"
                  stopOpacity="0"
                />
              </linearGradient>
              <linearGradient
                id="lineGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop
                  offset="0%"
                  stopColor="currentColor"
                  className="text-primary"
                />
                <stop
                  offset="50%"
                  stopColor="currentColor"
                  className="text-blue-500"
                />
                <stop
                  offset="100%"
                  stopColor="currentColor"
                  className="text-purple-500"
                />
              </linearGradient>
            </defs>
          </svg>
        ) : (
          <div className="flex items-center justify-center h-80">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No price data available</p>
              <p className="text-sm text-muted-foreground">
                Check back later for updates
              </p>
            </div>
          </div>
        )}

        {/* Tooltip */}
        {hoveredPoint && (
          <div
            className="absolute bg-background border border-border rounded-lg p-3 shadow-lg pointer-events-none z-10"
            style={{
              left: `${xScale(hoveredPoint.timestamp)}px`,
              top: `${yScale(hoveredPoint.price) - 80}px`,
              transform: "translateX(-50%)",
            }}
          >
            <div className="text-sm font-medium text-foreground">
              {formatPrice(hoveredPoint.price)}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatTime(hoveredPoint.timestamp)}
            </div>
          </div>
        )}

        {/* Chart Stats */}
        <div className="flex items-center justify-between mt-6 text-sm">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-muted-foreground">Current: </span>
              <span className="font-semibold text-foreground">
                {formatPrice(currentPrice)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Change: </span>
              <span
                className={cn(
                  "font-semibold",
                  priceChange >= 0 ? "text-green-600" : "text-red-600"
                )}
              >
                {priceChange >= 0 ? "+" : ""}
                {priceChange.toFixed(2)}%
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Range: </span>
              <span className="font-medium text-foreground">
                {formatPrice(minPrice)} - {formatPrice(maxPrice)}
              </span>
            </div>
          </div>
          <div className="text-muted-foreground font-medium">
            {period} view • {chartData.length} data points
          </div>
        </div>
      </div>
    </div>
  );
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

export default function TokenDetails() {
  const { address: rawAddress } = useParams<{ address: string }>();
  const navigate = useNavigate();
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>("24H");

  // Stabilize the address to prevent unnecessary re-renders
  const address = useMemo(() => {
    return rawAddress || null;
  }, [rawAddress]);

  // Debug logging for address changes
  const prevAddress = useRef(address);
  useEffect(() => {
    if (prevAddress.current !== address) {
      console.log(
        "[TokenDetails] Address changed from",
        prevAddress.current,
        "to",
        address
      );
      prevAddress.current = address;
    }
  }, [address]);

  // Fetch coin details using the proper hook
  const { coin: token, loading, error } = useCoinDetails(address);

  // Debug: log the full token object (but only when it actually changes)
  useEffect(() => {
    console.log("[TokenDetails] Token data updated:", token);
  }, [token]);

  // Fetch DexScreener data for this token
  const dexScreenerAddresses = useMemo(
    () => (address ? [address] : []),
    [address]
  );

  const {
    tokens: dexTokens,
    loading: dexLoading,
    error: dexError,
  } = useDexScreenerTokens("8453", dexScreenerAddresses);

  const dexData: DexScreenerPair | undefined = useMemo(
    () => (dexTokens && dexTokens.length > 0 ? dexTokens[0] : undefined),
    [dexTokens]
  );

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleCoinClick = useCallback(
    (coinAddress: string) => {
      navigate(`/token/${coinAddress}`);
    },
    [navigate]
  );

  // Base Account SDK state
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const toggleTheme = useCallback(
    () => setTheme((prev) => (prev === "light" ? "dark" : "light")),
    []
  );

  // Trading UI state
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const [tradeAmount, setTradeAmount] = useState("");
  const [slippage, setSlippage] = useState(0.5); // Default slippage

  // Price from DexScreener
  const price = useMemo(
    () => (dexData && dexData.priceUsd ? parseFloat(dexData.priceUsd) : null),
    [dexData]
  );

  // Early return if no address (before hooks that depend on it)
  if (!address) {
    return (
      <div className="flex-1 bg-background">
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Invalid Token Address
            </h2>
            <p className="text-muted-foreground mb-4">
              No token address provided in the URL.
            </p>
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 bg-background">
        <div className="flex items-center justify-center p-8">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Loading token details...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !token) {
    return (
      <div className="flex-1 bg-background">
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Token Not Found
            </h2>
            <p className="text-muted-foreground mb-4">
              The token you're looking for doesn't exist or has been removed.
            </p>
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const formattedToken = formatCoinData(token);
  console.log(formattedToken);
  

  return (
    <div className="flex-1 bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-3 py-1 bg-muted rounded-lg text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg overflow-hidden object cover flex items-center justify-center">
                <img src={token.mediaContent.previewImage.medium} alt="" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">
                  {token.name || "Unknown Token"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {token.symbol || "N/A"}
                </p>
              </div>
            </div>
          </div>

          <button
            disabled={loading || dexLoading}
            className="flex items-center gap-1 px-3 py-1 bg-muted rounded-lg text-sm text-muted-foreground hover:text-foreground"
          >
            <RefreshCw
              className={cn(
                "w-4 h-4",
                (loading || dexLoading) && "animate-spin"
              )}
            />
            Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 p-6">
        {/* Main Content */}
        <div className="flex-1 space-y-6">
          {/* Price Overview Card */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Current Price */}
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Current Price</p>
                <p className="text-2xl font-bold text-foreground">
                  {price !== null
                    ? `$${price.toFixed(6)}`
                    : formattedToken.formattedPrice ||
                      calculateFallbackPrice(
                        token.marketCap,
                        token.totalSupply
                      )}
                </p>
              </div>

              {/* Market Cap */}
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Market Cap</p>
                <p className="text-2xl font-bold text-foreground">
                  {formattedToken.formattedMarketCap}
                </p>
                {/* <p className="text-sm text-muted-foreground">N/A</p> */}
              </div>

              {/* Volume */}
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">24h Volume</p>
                <p className="text-2xl font-bold text-foreground">
                  {token.totalVolume}
                </p>
                {/* <p className="text-sm text-muted-foreground">N/A</p> */}
              </div>
            </div>
          </div>

          {/* Interactive Price Chart */}
          <div className="bg-card border border-border rounded-lg p-6">
            <PriceChart
              dexScreenerData={dexData}
              period={chartPeriod}
              onPeriodChange={setChartPeriod}
            />
          </div>

          {/* Token Information */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Token Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Token Address
                  </span>
                  <span className="text-sm font-mono text-foreground">
                    {token.address}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Total Supply
                  </span>
                  <span className="text-sm text-foreground">
                    {formattedToken.formattedTotalSupply}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Holders</span>
                  <span className="text-sm text-foreground">
                    {token.uniqueHolders || "N/A"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Created</span>
                  <span className="text-sm text-foreground">
                    {token.createdAt
                      ? new Date(token.createdAt).toLocaleDateString()
                      : "N/A"}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Chain</span>
                  <span className="text-sm text-foreground">Base</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Contract Type
                  </span>
                  <span className="text-sm text-foreground">ERC-20</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Creator</span>
                  <span className="text-sm text-foreground">
                    {typeof token.creatorAddress === "string" ? (
                      <Identity address={token.creatorAddress as `0x${string}`}>
                        {null}
                      </Identity>
                    ) : (
                      "N/A"
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Age</span>
                  <span className="text-sm text-foreground">
                    {token.createdAt
                      ? getAgeFromTimestamp(token.createdAt)
                      : "N/A"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:w-80 space-y-6">
          {/* Base Account UI SDK Demo */}
          <div className="bg-card border border-border rounded-lg p-6 flex flex-col items-center">
            <button onClick={toggleTheme} className="mb-4 self-end text-lg">
              {theme === "light" ? "🌙" : "☀️"}
            </button>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Base Account
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Experience seamless crypto payments
            </p>
            <div className="flex flex-col gap-4 w-full items-center">
              <SignInWithBaseButton
                align="center"
                variant="solid"
                colorScheme={theme}
                onClick={() => setIsSignedIn(true)}
              />
              {isSignedIn && (
                <div className="text-green-600 text-sm">
                  ✅ Connected to Base Account
                </div>
              )}
              <BasePayButton
                colorScheme={theme}
                onClick={() => {
                  setPaymentId("mock-payment-id");
                  setPaymentStatus(
                    'Payment initiated! Click "Check Status" to see the result.'
                  );
                }}
              />
              {paymentId && (
                <button
                  onClick={() =>
                    setPaymentStatus(
                      `Payment status: Mock Payment ${paymentId}`
                    )
                  }
                  className="px-4 py-2 rounded bg-muted text-foreground border mt-2"
                >
                  Check Payment Status
                </button>
              )}
            </div>
            {paymentStatus && (
              <div className="mt-4 p-2 rounded bg-muted text-foreground text-xs w-full text-center">
                {paymentStatus}
              </div>
            )}
          </div>

          {/* Trading Coins - only show if Base Account is connected */}
          {isSignedIn && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Trading Coins
              </h3>
              <div>
                <div className="mb-2 text-sm text-muted-foreground">
                  Connected: <span className="font-mono">Base Account</span>
                </div>
                <div className="flex gap-2 mb-2">
                  <button
                    className={`px-3 py-1 rounded ${
                      tradeType === "buy"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                    onClick={() => setTradeType("buy")}
                  >
                    Buy
                  </button>
                  <button
                    className={`px-3 py-1 rounded ${
                      tradeType === "sell"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                    onClick={() => setTradeType("sell")}
                  >
                    Sell
                  </button>
                </div>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder={
                    tradeType === "buy"
                      ? "ETH amount"
                      : `${token.symbol} amount`
                  }
                  value={tradeAmount}
                  onChange={(e) => setTradeAmount(e.target.value)}
                  className="w-full mb-2 px-3 py-2 border rounded"
                />
                <button
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-lg w-full"
                  disabled={!tradeAmount || Number(tradeAmount) <= 0}
                  onClick={() => alert("Trading logic not implemented.")}
                >
                  {tradeType === "buy"
                    ? `Buy ${token.symbol}`
                    : `Sell ${token.symbol}`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper function to calculate age from timestamp
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
