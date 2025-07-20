import { useState } from "react";
import { ChevronDown, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTrendingCoins, formatCoinData } from "@/hooks/useTopVolume24h";

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
const topFilters = ["Top", "Gainers", "New Pairs"];

function PercentageCell({ value }: { value: number }) {
  const isPositive = value > 0;
  return (
    <span className={cn("font-medium", isPositive ? "text-gain" : "text-loss")}>
      {isPositive ? "+" : ""}
      {value.toFixed(2)}%
    </span>
  );
}

export function TokenTable() {
  const [activeTimeFilter, setActiveTimeFilter] = useState("6H");
  const [activeTopFilter, setActiveTopFilter] = useState("Top");

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

  // Calculate total volume for header stats
  const totalVolume = coins.reduce((sum, coin) => {
    return sum + (parseFloat(coin.volume24h || "0") || 0);
  }, 0);

  return (
    <div className="flex-1 bg-background">
      {/* Header Stats */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-8">
            <div>
              <span className="text-sm text-muted-foreground">24H Volume:</span>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">
                Total Coins:
              </span>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            Live data from Zora
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex bg-muted rounded-lg p-1">
              <button className="px-3 py-1 bg-primary text-primary-foreground rounded-md text-sm font-medium">
                Trending
              </button>
            </div>

            <div className="flex bg-muted rounded-lg p-1">
              {timeFilters.map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveTimeFilter(filter)}
                  className={cn(
                    "px-3 py-1 rounded-md text-sm font-medium transition-colors",
                    activeTimeFilter === filter
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {filter}
                </button>
              ))}
            </div>

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
            <span className="text-sm text-muted-foreground">Rank by:</span>
            <button className="flex items-center gap-1 text-sm text-foreground hover:text-primary">
              Trending 6H
              <ChevronDown className="w-4 h-4" />
            </button>
            <button
              onClick={refetch}
              disabled={loading}
              className="flex items-center gap-1 px-3 py-1 bg-muted rounded-lg text-sm text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              Refresh
            </button>
            <button className="px-3 py-1 bg-muted rounded-lg text-sm text-muted-foreground hover:text-foreground">
              Customize
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
      {error && (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <p className="text-red-500 mb-2">Error loading data: {error}</p>
            <button
              onClick={refetch}
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
                            {/* <span className="text-xs text-muted-foreground">
                              /{coin.name}
                            </span> */}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground">
                      {formattedCoin.formattedPrice}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {coin.createdAt
                        ? getAgeFromTimestamp(coin.createdAt)
                        : "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {formattedCoin.formattedVolume24h}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <PercentageCell
                        value={parseFloat(coin.priceChange24h || "0")}
                      />
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
