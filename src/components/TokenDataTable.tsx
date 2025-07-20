import { RefreshCw } from "lucide-react";
import { cn, truncateAddress } from "@/lib/utils";
import { formatCoinData, Coin } from "@/hooks/useTopVolume24h";
import { formatDexScreenerPrice, DexScreenerPair } from "@/hooks/useDexScreener";

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

interface TokenDataTableProps {
  coins: Coin[];
  dexScreenerData: Record<string, DexScreenerPair>;
  currentPage: number;
  loading: boolean;
  pageInfo?: {
    endCursor?: string;
    hasNextPage?: boolean;
  } | null;
  onCoinClick: (address: string) => void;
  onLoadNextPage: () => void;
  onGoToPage: (page: number) => void;
  showPagination?: boolean;
  itemsPerPage?: number;
}

export function TokenDataTable({
  coins,
  dexScreenerData,
  currentPage,
  loading,
  pageInfo,
  onCoinClick,
  onLoadNextPage,
  onGoToPage,
  showPagination = true,
  itemsPerPage = 20
}: TokenDataTableProps) {
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
            <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Creator
            </th>
          </tr>
        </thead>
        <tbody>
          {coins.map((coin, index) => {
            const formattedCoin = formatCoinData(coin);
            return (
              <tr
                key={coin.id}
                onClick={() => onCoinClick(coin.address)}
                className={cn(
                  "border-b border-border hover:bg-muted/50 transition-colors cursor-pointer",
                  index % 2 === 0 ? "bg-card" : "bg-background"
                )}
              >
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  #{(currentPage - 1) * itemsPerPage + index + 1}
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
                  {coin.createdAt ? getAgeFromTimestamp(coin.createdAt) : "N/A"}
                </td>
                <td className="px-4 py-3">
                  <VolumeCell coin={coin} dexScreenerData={dexScreenerData} />
                </td>
                <td className="px-4 py-3">
                  <Change24hCell
                    coin={coin}
                    dexScreenerData={dexScreenerData}
                  />
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {formattedCoin.formattedMarketCap}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {truncateAddress(coin?.creatorAddress)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Pagination Controls */}
      {showPagination && (
        <div className="flex items-center justify-between p-4 border-t border-border">
          <div className="text-sm text-muted-foreground">
            Page {currentPage} - Showing {coins.length} coins
          </div>
          <div className="flex items-center gap-2">
            {/* Previous Page */}
            {currentPage > 1 && (
              <button
                onClick={() => onGoToPage(currentPage - 1)}
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
                        onClick={() => onGoToPage(pageNum)}
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
                onClick={onLoadNextPage}
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
      )}
    </div>
  );
} 