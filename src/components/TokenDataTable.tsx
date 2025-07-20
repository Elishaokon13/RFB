import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCoinData, Coin } from "@/hooks/useTopVolume24h";
import { formatDexScreenerPrice, DexScreenerPair } from "@/hooks/useDexScreener";
import { memo, useMemo, useCallback, useRef, useEffect } from "react";

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

// Deep comparison function for coin data
const areCoinsEqual = (prevCoin: Coin, nextCoin: Coin, prevDexData: DexScreenerPair | null, nextDexData: DexScreenerPair | null) => {
  // Compare core coin properties
  if (
    prevCoin.id !== nextCoin.id ||
    prevCoin.symbol !== nextCoin.symbol ||
    prevCoin.name !== nextCoin.name ||
    prevCoin.address !== nextCoin.address ||
    prevCoin.marketCap !== nextCoin.marketCap ||
    prevCoin.volume24h !== nextCoin.volume24h ||
    prevCoin.marketCapDelta24h !== nextCoin.marketCapDelta24h ||
    prevCoin.createdAt !== nextCoin.createdAt ||
    prevCoin.uniqueHolders !== nextCoin.uniqueHolders
  ) {
    return false;
  }

  // Compare DexScreener data if available
  if (prevDexData && nextDexData) {
    if (
      prevDexData.priceUsd !== nextDexData.priceUsd ||
      prevDexData.volume?.h24 !== nextDexData.volume?.h24 ||
      prevDexData.priceChange?.h24 !== nextDexData.priceChange?.h24
    ) {
      return false;
    }
  } else if (prevDexData !== nextDexData) {
    return false;
  }

  return true;
};

// Create a stable data store to prevent unnecessary re-renders
const useStableData = (coins: Coin[], dexScreenerData: Record<string, DexScreenerPair>) => {
  const prevDataRef = useRef<{
    coins: Coin[];
    dexScreenerData: Record<string, DexScreenerPair>;
    stableCoins: Coin[];
  }>({ coins: [], dexScreenerData: {}, stableCoins: [] });

  return useMemo(() => {
    const currentData = { coins, dexScreenerData };
    const prevData = prevDataRef.current;

    // Check if data actually changed
    const coinsChanged = coins.length !== prevData.coins.length ||
      coins.some((coin, index) => {
        const prevCoin = prevData.coins[index];
        if (!prevCoin) return true;
        
        const prevDexData = prevData.dexScreenerData[prevCoin.address];
        const nextDexData = dexScreenerData[coin.address];
        
        return !areCoinsEqual(prevCoin, coin, prevDexData, nextDexData);
      });

    // If data changed, update the stable reference
    if (coinsChanged) {
      prevDataRef.current = currentData;
      return coins;
    }

    // Return stable reference if no changes
    return prevData.stableCoins.length > 0 ? prevData.stableCoins : coins;
  }, [coins, dexScreenerData]);
};

// Memoized price cell component with aggressive memoization
const PriceCell = memo(({ coin, dexScreenerData }: { coin: Coin; dexScreenerData: Record<string, DexScreenerPair> }) => {
  const priceData = dexScreenerData[coin.address];
  
  if (priceData) {
    const formatted = formatDexScreenerPrice(priceData);
    return (
      <div className="text-sm font-medium text-foreground">
        {formatted.priceUsd}
      </div>
    );
  }
  
  // Always show fallback data immediately, no loading states
  const formattedCoin = formatCoinData(coin);
  return (
    <div className="text-sm font-medium text-foreground">
      {formattedCoin.formattedPrice}
    </div>
  );
}, (prevProps, nextProps) => {
  const prevPriceData = prevProps.dexScreenerData[prevProps.coin.address];
  const nextPriceData = nextProps.dexScreenerData[nextProps.coin.address];
  return areCoinsEqual(prevProps.coin, nextProps.coin, prevPriceData, nextPriceData);
});

PriceCell.displayName = 'PriceCell';

// Memoized volume cell component
const VolumeCell = memo(({ coin, dexScreenerData }: { coin: Coin; dexScreenerData: Record<string, DexScreenerPair> }) => {
  const priceData = dexScreenerData[coin.address];
  
  if (priceData) {
    const formatted = formatDexScreenerPrice(priceData);
    return (
      <div className="text-sm text-muted-foreground">
        {formatted.volume24h}
      </div>
    );
  }
  
  // Always show fallback data immediately, no loading states
  const formattedCoin = formatCoinData(coin);
  return (
    <div className="text-sm text-muted-foreground">
      {formattedCoin.formattedVolume24h}
    </div>
  );
}, (prevProps, nextProps) => {
  const prevPriceData = prevProps.dexScreenerData[prevProps.coin.address];
  const nextPriceData = nextProps.dexScreenerData[nextProps.coin.address];
  return areCoinsEqual(prevProps.coin, nextProps.coin, prevPriceData, nextPriceData);
});

VolumeCell.displayName = 'VolumeCell';

// Memoized 24h change cell component
const Change24hCell = memo(({ coin, dexScreenerData }: { coin: Coin; dexScreenerData: Record<string, DexScreenerPair> }) => {
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
  
  // Always show fallback data immediately, no loading states
  return (
    <PercentageCell
      value={parseFloat(coin.marketCapDelta24h || "0")}
      cap={coin.marketCap}
    />
  );
}, (prevProps, nextProps) => {
  const prevPriceData = prevProps.dexScreenerData[prevProps.coin.address];
  const nextPriceData = nextProps.dexScreenerData[nextProps.coin.address];
  return areCoinsEqual(prevProps.coin, nextProps.coin, prevPriceData, nextPriceData);
});

Change24hCell.displayName = 'Change24hCell';

// Memoized percentage cell component
const PercentageCell = memo(({ value, cap }: { value: number; cap: string | undefined }) => {
  const isPositive = value > 0;
  const capValue = parseFloat(cap || "0");
  const calcValue = capValue > 0 ? (capValue / value) * 100 : 0;

  return (
    <span className={cn("font-medium", isPositive ? "text-gain" : "text-loss")}>
      {isPositive ? "+" : ""}
      {calcValue.toFixed(2)}%
    </span>
  );
}, (prevProps, nextProps) => {
  return prevProps.value === nextProps.value && prevProps.cap === nextProps.cap;
});

PercentageCell.displayName = 'PercentageCell';

// Memoized table row component with aggressive memoization
const TableRow = memo(({ 
  coin, 
  index, 
  dexScreenerData, 
  onCoinClick 
}: { 
  coin: Coin; 
  index: number; 
  dexScreenerData: Record<string, DexScreenerPair>; 
  onCoinClick: (address: string) => void;
}) => {
  const formattedCoin = formatCoinData(coin);
  const priceData = dexScreenerData[coin.address];
  
  // Create a stable key for the row based on coin data
  const rowKey = useMemo(() => {
    const priceKey = priceData ? `${priceData.priceUsd}-${priceData.volume?.h24}-${priceData.priceChange?.h24}` : 'no-price';
    return `${coin.id}-${coin.marketCap}-${coin.volume24h}-${priceKey}`;
  }, [coin.id, coin.marketCap, coin.volume24h, priceData]);

  return (
    <tr
      key={rowKey}
      onClick={() => onCoinClick(coin.address)}
      className={cn(
        "border-b border-border hover:bg-muted/50 transition-colors cursor-pointer",
        index % 2 === 0 ? "bg-card" : "bg-background",
        // Add subtle animation for real-time updates
        "animate-pulse-subtle"
      )}
    >
      <td className="px-4 py-3 text-sm text-muted-foreground">
        #{index + 1}
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
}, (prevProps, nextProps) => {
  // Deep comparison for the entire row
  const prevPriceData = prevProps.dexScreenerData[prevProps.coin.address];
  const nextPriceData = nextProps.dexScreenerData[nextProps.coin.address];
  
  return (
    prevProps.index === nextProps.index &&
    areCoinsEqual(prevProps.coin, nextProps.coin, prevPriceData, nextPriceData)
  );
});

TableRow.displayName = 'TableRow';

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
  // Use stable data to prevent unnecessary re-renders
  const stableCoins = useStableData(coins, dexScreenerData);

  // Always show data if we have coins, regardless of loading state
  if (stableCoins.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Loading coins...</span>
        </div>
      </div>
    );
  }

  // Memoize the click handler to prevent unnecessary re-renders
  const handleCoinClick = useCallback((address: string) => {
    onCoinClick(address);
  }, [onCoinClick]);

  // Memoize the table body to prevent unnecessary re-renders
  const tableBody = useMemo(() => {
    return stableCoins.map((coin, index) => (
      <TableRow
        key={`${coin.id}-${coin.address}`}
        coin={coin}
        index={index}
        dexScreenerData={dexScreenerData}
        onCoinClick={handleCoinClick}
      />
    ));
  }, [stableCoins, dexScreenerData, handleCoinClick]);

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
          {tableBody}
        </tbody>
      </table>

      {/* Pagination Controls */}
      {showPagination && (
        <div className="flex items-center justify-between p-4 border-t border-border">
          <div className="text-sm text-muted-foreground">
            Page {currentPage} - Showing {stableCoins.length} coins
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