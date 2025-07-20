import { useState, useMemo, useCallback } from "react";
import { ChevronDown, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTrendingCoins, formatCoinData, Coin } from "@/hooks/useTopVolume24h";
import { useMultipleDexScreenerPrices, formatDexScreenerPrice, DexScreenerPair } from "@/hooks/useDexScreener";
import { useNavigate } from "react-router-dom";

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

const timeFilters = ["5M", "1H", "6H", "24H"];
const topFilters = [
  "Trending",
  "Top Gainers",
  "Top Volume 24h",
  "New Pairs",
  "Creator",
];

function PercentageCell({ value, cap }: { value: number; cap: string | undefined }) {
  const isPositive = value > 0;
  const capValue = parseFloat(cap || "0");
  const calcValue = capValue > 0 ? (capValue / value) * 100 : 0;

  return (
    <span className={cn("font-medium", isPositive ? "text-gain" : "text-loss")}>
      {isPositive ? "+" : ""}
      {calcValue.toFixed(2)}%
    </span>
  );
}

// Component to display price with DexScreener data
function PriceCell({ coin, dexScreenerData }: { coin: Coin; dexScreenerData: Record<string, DexScreenerPair> }) {
  const priceData = dexScreenerData[coin.address];
  
  if (priceData) {
    const formatted = formatDexScreenerPrice(priceData);
    return (
      <div className="text-sm font-medium text-foreground">
        {formatted.priceUsd}
      </div>
    );
  }
  
  // Fallback to Zora data if DexScreener data not available
  const formattedCoin = formatCoinData(coin);
  return (
    <div className="text-sm font-medium text-foreground">
      {formattedCoin.formattedPrice}
    </div>
  );
}

// Component to display 24h change with DexScreener data
function Change24hCell({ coin, dexScreenerData }: { coin: Coin; dexScreenerData: Record<string, DexScreenerPair> }) {
  const priceData = dexScreenerData[coin.address];
  
  if (priceData) {
    const formatted = formatDexScreenerPrice(priceData);
    const changeValue = priceData.priceChange?.h24;
    const isPositive = changeValue && changeValue >= 0;
    
    return (
      <span className={cn("font-medium", isPositive ? "text-gain" : "text-loss")}>
        {formatted.priceChange24h}
      </span>
    );
  }
  
  // Fallback to Zora data
  return (
    <PercentageCell
      value={parseFloat(coin.marketCapDelta24h || "0")}
      cap={coin.marketCap}
    />
  );
}

// Component to display volume with DexScreener data
function VolumeCell({ coin, dexScreenerData }: { coin: Coin; dexScreenerData: Record<string, DexScreenerPair> }) {
  const priceData = dexScreenerData[coin.address];
  
  if (priceData) {
    const formatted = formatDexScreenerPrice(priceData);
    return (
      <div className="text-sm text-muted-foreground">
        {formatted.volume24h}
      </div>
    );
  }
  
  // Fallback to Zora data
  const formattedCoin = formatCoinData(coin);
  return (
    <div className="text-sm text-muted-foreground">
      {formattedCoin.formattedVolume24h}
    </div>
  );
}

export function TokenTable() {
  const [activeTimeFilter, setActiveTimeFilter] = useState("6H");
  const [activeTopFilter, setActiveTopFilter] = useState("Top");
  const navigate = useNavigate();

  // Fetch real coin data from Zora SDK
  const {
    coins,
    loading,
    error,
    refetch,
    totalCount,
    currentPage,
    pageInfo,
    loadNextPage,
    goToPage,
  } = useTrendingCoins(20);

  // Extract token addresses for DexScreener API - memoized to prevent unnecessary re-renders
  const tokenAddresses = useMemo(() => 
    coins.map(coin => coin.address).filter(Boolean), 
    [coins]
  );

  // Fetch DexScreener price data for all tokens
  const {
    pricesData: dexScreenerData,
    loading: dexScreenerLoading,
    error: dexScreenerError,
    refetch: refetchDexScreener,
  } = useMultipleDexScreenerPrices(tokenAddresses);

  // Calculate total volume for header stats
  const totalVolume = coins.reduce((sum, coin) => {
    return sum + (parseFloat(coin.volume24h || "0") || 0);
  }, 0);

  const handleCoinClick = useCallback((coinAddress: string) => {
    navigate(`/token/${coinAddress}`);
  }, [navigate]);

  const handleRefresh = useCallback(() => {
    refetch();
    refetchDexScreener();
  }, [refetch, refetchDexScreener]);

  return (
    <div className="flex-1 bg-background">
      {/* Header Stats */}
      <div className="bg-card border-b border-border p-4">
        {/* Filters */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex bg-muted rounded-lg p-1">
              {topFilters.map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveTopFilter(filter)}
                  className={cn(
                    "px-3 py-1 rounded-md text-sm font-medium transition-colors",
                    activeTopFilter === filter
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-1 px-3 py-1 bg-muted rounded-lg text-sm text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center p-8">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Loading trending coins...</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {(error || dexScreenerError) && (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <p className="text-red-500 mb-2">
              {error || dexScreenerError}
            </p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="overflow-auto">
          <table className="w-full">
            <thead className="bg-muted border-b border-border">
              <tr className="text-left">
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  #
                </th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  TOKEN
                </th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  PRICE
                </th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  AGE
                </th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  VOLUME
                </th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  24H
                </th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  MCAP
                </th>
              </tr>
            </thead>
            <tbody>
              {coins.map((coin, index) => {
                const formattedCoin = formatCoinData(coin);
                return (
                  <tr
                    key={coin.id}
                    onClick={() => handleCoinClick(coin.address)}
                    className={cn(
                      "border-b border-border hover:bg-muted/50 transition-colors cursor-pointer",
                      index % 2 === 0 ? "bg-card" : "bg-background"
                    )}
                  >
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      #{(currentPage - 1) * 20 + index + 1}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <span className="w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center text-xs">
                            ◎
                          </span>
                          <span className="w-4 h-4 bg-orange-500 rounded-full"></span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">
                              {coin.symbol}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <PriceCell coin={coin} dexScreenerData={dexScreenerData} />
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {coin.createdAt
                        ? getAgeFromTimestamp(coin.createdAt)
                        : "N/A"}
                    </td>
                    <td className="px-4 py-3">
                      <VolumeCell coin={coin} dexScreenerData={dexScreenerData} />
                    </td>
                    <td className="px-4 py-3">
                      <Change24hCell coin={coin} dexScreenerData={dexScreenerData} />
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {formattedCoin.formattedMarketCap}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between p-4 border-t border-border">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} - Showing {coins.length} coins
            </div>
            <div className="flex items-center gap-2">
              {/* Previous Page */}
              {currentPage > 1 && (
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={loading}
                  className="px-3 py-1 bg-muted text-muted-foreground rounded-md text-sm font-medium hover:bg-muted/80 disabled:opacity-50"
                >
                  Previous
                </button>
              )}

              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {Array.from(
                  { length: Math.min(currentPage + 2, 5) },
                  (_, i) => {
                    const pageNum = i + 1;
                    if (pageNum <= currentPage) {
                      return (
                        <button
                          key={pageNum}
                          onClick={() => goToPage(pageNum)}
                          disabled={loading}
                          className={cn(
                            "px-3 py-1 rounded-md text-sm font-medium transition-colors",
                            pageNum === currentPage
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          )}
                        >
                          {pageNum}
                        </button>
                      );
                    }
                    return null;
                  }
                )}
              </div>

              {/* Next Page */}
              {pageInfo?.hasNextPage && (
                <button
                  onClick={loadNextPage}
                  disabled={loading}
                  className="px-3 py-1 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Loading
                    </div>
                  ) : (
                    "Next"
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
