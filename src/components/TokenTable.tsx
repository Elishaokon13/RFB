import { cn } from "@/lib/utils";
import { useTokenFeed } from "@/hooks/useTokenFeed";
import { useNavigate } from "react-router-dom";
import { TokenDataTable } from "./TokenDataTable";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState, useMemo, useRef } from "react";
import { useBasename } from "@/hooks/useBasename";
import { Address } from "viem";
import { Coin } from "@/hooks/useTopVolume24h";
import { useDexScreenerTokens, DexScreenerPair } from "@/hooks/useDexScreener";
import { useGetCoinsTopVolume24h } from "@/hooks/getCoinsTopVolume24h";

// Filter options
const topFilters = [
  "Most Valuable",
  "Top Gainers",
  "Top Volume 24h",
  "New Picks",
];

const ITEMS_PER_PAGE = 20;

export function TokenTable() {
  const navigate = useNavigate();
  const [activeTopFilter, setActiveTopFilter] = useState<string>(() => {
    return localStorage.getItem("activeTopFilter") || "Most Valuable";
  });
  const [currentPage, setCurrentPage] = useState(1);
  const retryTimeout = useRef<NodeJS.Timeout | null>(null);

  // Use dedicated hook for smart state handling
  const {
    coins,
    pageInfo,
    error,
    isLoading,
    refetchAll,
    refetchActive,
    hasData,
  } = useTokenFeed(activeTopFilter);

  // New Picks integration: use top volume 24h as a proxy for new coins
  const {
    data: newPicksData,
    isLoading: newLoading,
    error: newError,
    refetch: refetchNewPicks,
  } = useGetCoinsTopVolume24h({ count: ITEMS_PER_PAGE });
  const newCoins = newPicksData?.coins || [];

  // Log the full API response for New Picks every time it changes
  // useEffect(() => {
  //   if (newPicksData) {
  //     console.log('[New Picks API Raw Response]', newPicksData);
  //     if (Array.isArray(newPicksData.coins)) {
  //       newPicksData.coins.forEach((coin, index) => {
  //         console.log(`New Coin ${index + 1}:`);
  //         console.log(`- Name: ${coin.name}`);
  //         console.log(`- Created At: ${coin.createdAt}`);
  //       });
  //     }
  //   }
  // }, [newPicksData]);

  // Auto-retry logic for New Picks on internal server error
  useEffect(() => {
    if (
      activeTopFilter === "New Picks" &&
      (newError?.toString().includes("500") ||
        (!newCoins.length && !newLoading))
    ) {
      if (!retryTimeout.current) {
        retryTimeout.current = setTimeout(() => {
          refetchNewPicks();
          retryTimeout.current = null;
        }, 2000); // retry every 2s
      }
    }
    return () => {
      if (retryTimeout.current) {
        clearTimeout(retryTimeout.current);
        retryTimeout.current = null;
      }
    };
  }, [activeTopFilter, newError, newCoins.length, newLoading, refetchNewPicks]);

  // Save active filter to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("activeTopFilter", activeTopFilter);
    setCurrentPage(1);
  }, [activeTopFilter]);

  // Helper for fine-grained age (seconds/minutes/hours/days)
  function getFineAgeFromTimestamp(timestamp: string) {
    const now = new Date();
    const created = new Date(timestamp);
    const diffMs = now.getTime() - created.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return `${diffSec}s old`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m old`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h old`;
    const days = Math.floor(diffHour / 24);
    return `${days}d old`;
  }

  // Pagination logic for 20 per page
  const paginatedCoins = useMemo(() => {
    if (activeTopFilter === "New Picks") {
      // Sort by createdAt descending (latest first)
      const sorted = [...newCoins].sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      // Map TopVolumeCoin to CoinWithImage with default values for missing fields
      return sorted.map((c) => ({
        id: c.id || "",
        name: c.name || "",
        symbol: c.symbol || "",
        address: c.address || "",
        totalSupply: c.totalSupply || "",
        totalVolume: c.totalVolume || "",
        volume24h: c.volume24h || "",
        createdAt: c.createdAt || "",
        creatorAddress: c.creatorAddress || "",
        marketCap: c.marketCap || "",
        chainId: c.chainId || 0,
        uniqueHolders: c.uniqueHolders || 0,
        image: c.image || "",
        uniswapV3PoolAddress: "",
        creatorEarnings: [],
        marketCapDelta24h: "",
        price: "",
        priceChange24h: "",
        imageUrl: c.image || "",
        website: "",
        twitter: "",
        telegram: "",
        discord: "",
        metadata: {},
        zoraComments: null,
        mediaContent: undefined,
        description: "",
        // Add fine-grained age for New Picks
        fineAge: c.createdAt ? getFineAgeFromTimestamp(c.createdAt) : "",
      }));
    }
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return coins.slice(start, start + ITEMS_PER_PAGE);
  }, [coins, newCoins, currentPage, activeTopFilter]);

  // Get token addresses for the current page
  const tokenAddresses = useMemo(
    () => paginatedCoins.map((c) => c.address),
    [paginatedCoins]
  );

  // Fetch token details from DexScreener
  const {
    tokens: dexScreenerTokens,
    loading: dexLoading,
    error: dexError,
  } = useDexScreenerTokens("8453", tokenAddresses);

  // Map address to DexScreenerPair for fast lookup
  const dexScreenerData = useMemo(() => {
    const map: Record<string, DexScreenerPair> = {};
    dexScreenerTokens.forEach((pair) => {
      if (pair.baseToken?.address) {
        map[pair.baseToken.address.toLowerCase()] = pair;
      }
    });
    return map;
  }, [dexScreenerTokens]);

  // Handle coin click
  const handleCoinClick = useCallback(
    (address: string) => {
      navigate(`/token/${address}`);
    },
    [navigate]
  );

  // Handle pagination
  const handleLoadNextPage = useCallback(() => {
    setCurrentPage((prev) => prev + 1);
  }, []);

  const handleGoToPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleRefresh = useCallback(() => {
    if (activeTopFilter === "New Picks") {
      // No explicit refetch for useGetCoinsTopVolume24h, but could add if needed
      window.location.reload(); // crude but effective for now
    } else {
      refetchAll();
    }
  }, [activeTopFilter, refetchAll]);

  const loading = activeTopFilter === "New Picks" ? newLoading : isLoading;
  const errorMsg =
    activeTopFilter === "New Picks" ? newError : error || dexError;
  const pageInfoToUse = pageInfo; // Not used for New Picks

  const safeErrorMsg =
    typeof errorMsg === "string"
      ? errorMsg
      : errorMsg instanceof Error
      ? errorMsg.message
      : "Unknown error";

  // Animated fire loading state for New Picks
  const fireLoading = (
    <div className="flex flex-col items-center justify-center py-16 animate-pulse">
      <span className="text-6xl animate-bounce">🔥</span>
      <span className="mt-4 text-lg font-semibold text-primary animate-pulse">
        Loading the hottest new picks...
      </span>
      <span className="mt-2 text-sm text-muted-foreground">
        Fetching the latest tokens. This may take a moment if the network is
        busy.
      </span>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header with Live Indicator */}
      <div className="bg-card border-b border-border p-4">
        {/* Filters */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex bg-muted rounded-lg p-1">
              {topFilters.map((filter) => (
                <button
                  key={filter}
                  onClick={() => {
                    setActiveTopFilter(filter);
                    setCurrentPage(1);
                  }}
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
            <div className="flex items-center gap-1 text-xs text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live</span>
            </div>
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

      {/* Progressive Loading - Show data as soon as it's available */}
      {activeTopFilter === "New Picks" &&
        (newLoading || (!newCoins.length && !newError)) &&
        fireLoading}
      {paginatedCoins.length > 0 && (
        <TokenDataTable
          coins={paginatedCoins}
          dexScreenerData={dexScreenerData}
          currentPage={currentPage}
          loading={loading}
          pageInfo={pageInfoToUse}
          onCoinClick={handleCoinClick}
          onLoadNextPage={handleLoadNextPage}
          onGoToPage={handleGoToPage}
          showPagination={true}
          itemsPerPage={ITEMS_PER_PAGE}
        />
      )}

      {/* Only show error if we have no data at all, except for New Picks which fails silently */}
      {activeTopFilter !== "New Picks" &&
        safeErrorMsg &&
        paginatedCoins.length === 0 && (
          <div className="flex items-center justify-center p-8">
            <div className="text-center text-red-500">
              <p>Error loading {activeTopFilter.toLowerCase()} coins:</p>
              <p className="text-sm">{safeErrorMsg}</p>
            </div>
          </div>
        )}
    </div>
  );
}

const CreatorRow = ({
  address,
  count,
  idx,
}: {
  address: string;
  count: number;
  idx: number;
}) => {
  const { basename } = useBasename(address as Address);
  return (
    <tr className="border-b border-border transition-colors duration-200 hover:bg-muted/50 animate-fade-in">
      <td className="px-4 py-3 text-sm text-muted-foreground">{idx + 1}</td>
      <td className="px-4 py-3 text-sm font-mono">{address}</td>
      <td className="px-4 py-3 text-sm">{basename || "-"}</td>
      <td className="px-4 py-3 text-sm">{count}</td>
    </tr>
  );
};

export function CreatorsTable({ coins }: { coins: Coin[] }) {
  // Aggregate creators
  const creatorsMap = new Map<string, { count: number }>();
  coins.forEach((coin) => {
    if (coin.creatorAddress) {
      creatorsMap.set(coin.creatorAddress, {
        count: (creatorsMap.get(coin.creatorAddress)?.count || 0) + 1,
      });
    }
  });
  const creators = Array.from(creatorsMap.entries()).map(
    ([address, { count }]) => ({ address, count })
  );

  return (
    <div className="w-full max-w-full overflow-x-auto sm:overflow-x-visible">
      <table className="min-w-full w-full max-w-full">
        <thead className="bg-muted border-b border-border">
          <tr className="text-left">
            <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              #
            </th>
            <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Creator
            </th>
            <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Basename
            </th>
            <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Tokens Created
            </th>
          </tr>
        </thead>
        <tbody>
          {creators.map((creator, idx) => (
            <CreatorRow
              key={creator.address}
              address={creator.address}
              count={creator.count}
              idx={idx}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
