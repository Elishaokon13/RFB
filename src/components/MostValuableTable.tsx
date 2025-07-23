import { useState } from "react";
import { ChevronDown, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTrendingCoins, formatCoinData } from "@/hooks/useTopVolume24h";

// Helper function to calculate age from timestamp
const getAgeFromTimestamp = (timestamp: string) => {
  const now = new Date();
  const created = new Date(timestamp);
  const diffInMs = now.getTime() - created.getTime();
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  const diffInWeeks = Math.floor(diffInDays / 7);
  const diffInYears = Math.floor(diffInDays / 365);

  if (diffInHours < 1) return "<1h";
  if (diffInHours < 24) return `${diffInHours}h`;
  if (diffInDays < 7) return `${diffInDays}d`;
  if (diffInWeeks < 52) return `${diffInWeeks}w`;
  return `${diffInYears}y`;
};

const timeFilters = ["5M", "1H", "6H", "24H"];
const topFilters = [
  "Trending",
  "Top Gainers",
  "Top Volume 24h",
  "New Pairs",
  "Creator",
];

function PercentageCell({ value, cap }: { value: number; cap: string | number }) {
  const isPositive = value > 0;
  const calcValue = (Number(cap) / value) * 100;

  return (
    <span className={cn("font-medium", isPositive ? "text-gain" : "text-loss")}>
      {isPositive ? "+" : ""}
      {calcValue.toFixed(2)}%
    </span>
  );
}

export function MostValuableTable() {
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
                        <span className="text-xs text-muted-foreground">
                          /{coin.name}
                        </span>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm font-medium text-foreground">
                  {formattedCoin.formattedPrice}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {coin.createdAt ? getAgeFromTimestamp(coin.createdAt) : "N/A"}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {formattedCoin.formattedVolume24h}
                </td>
                <td className="px-4 py-3 text-sm">
                  <PercentageCell
                    value={parseFloat(coin.marketCapDelta24h || "0")}
                    cap={coin.marketCap}
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
            {Array.from({ length: Math.min(currentPage + 2, 5) }, (_, i) => {
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
            })}
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
  );
}
