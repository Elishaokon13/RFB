import { cn } from "@/lib/utils";
import { useTokenFeed } from "@/hooks/useTokenFeed";
import { useNavigate } from "react-router-dom";
import { TokenDataTable } from "./TokenDataTable";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState, useMemo } from "react";
import { useBasename } from '@/hooks/useBasename';
import { Address } from 'viem';
import { Coin } from '@/hooks/useTopVolume24h';
import { useDexScreenerTokens, DexScreenerPair } from '@/hooks/useDexScreener';

// Filter options
const topFilters = ["Most Valuable", "Top Gainers", "Top Volume 24h"];

const ITEMS_PER_PAGE = 60;

export function TokenTable() {
  const navigate = useNavigate();
  const [activeTopFilter, setActiveTopFilter] = useState<string>(() => {
    return localStorage.getItem("activeTopFilter") || "Most Valuable";
  });
  const [currentPage, setCurrentPage] = useState(1);

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

  // Save active filter to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("activeTopFilter", activeTopFilter);
  }, [activeTopFilter]);

  // Pagination logic for 60 per page
  const paginatedCoins = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return coins.slice(start, start + ITEMS_PER_PAGE);
  }, [coins, currentPage]);

  // Get token addresses for the current page
  const tokenAddresses = useMemo(() => paginatedCoins.map(c => c.address), [paginatedCoins]);

  // Fetch token details from DexScreener
  const { tokens: dexScreenerTokens, loading: dexLoading, error: dexError } = useDexScreenerTokens('8453', tokenAddresses);

  // Map address to DexScreenerPair for fast lookup
  const dexScreenerData = useMemo(() => {
    const map: Record<string, DexScreenerPair> = {};
    dexScreenerTokens.forEach(pair => {
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
    refetchAll();
  }, [refetchAll]);

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
              onClick={refetchAll}
              disabled={isLoading}
              className="flex items-center gap-1 px-3 py-1 bg-muted rounded-lg text-sm text-muted-foreground hover:text-foreground"
            >
              <RefreshCw
                className={cn("w-4 h-4", isLoading && "animate-spin")}
              />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Progressive Loading - Show data as soon as it's available */}
      {hasData && (
        <TokenDataTable
          coins={paginatedCoins}
          dexScreenerData={dexScreenerData}
          currentPage={currentPage}
          loading={dexLoading}
          pageInfo={pageInfo}
          onCoinClick={handleCoinClick}
          onLoadNextPage={handleLoadNextPage}
          onGoToPage={handleGoToPage}
          showPagination={true}
          itemsPerPage={ITEMS_PER_PAGE}
        />
      )}

      {/* Only show error if we have no data at all */}
      {(error || dexError) && !hasData && (
        <div className="flex items-center justify-center p-8">
          <div className="text-center text-red-500">
            <p>Error loading {activeTopFilter.toLowerCase()} coins:</p>
            <p className="text-sm">{error || dexError}</p>
          </div>
        </div>
      )}
    </div>
  );
}

const CreatorRow = ({ address, count, idx }: { address: string; count: number; idx: number }) => {
  const { basename } = useBasename(address as Address);
  return (
    <tr className="border-b border-border">
      <td className="px-4 py-3 text-sm text-muted-foreground">{idx + 1}</td>
      <td className="px-4 py-3 text-sm font-mono">{address}</td>
      <td className="px-4 py-3 text-sm">{basename || '-'}</td>
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
  const creators = Array.from(creatorsMap.entries()).map(([address, { count }]) => ({ address, count }));

  return (
    <div className="w-full max-w-full overflow-x-auto sm:overflow-x-visible">
      <table className="min-w-full w-full max-w-full">
            <thead className="bg-muted border-b border-border">
              <tr className="text-left">
            <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">#</th>
            <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Creator</th>
            <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Basename</th>
            <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Tokens Created</th>
              </tr>
            </thead>
            <tbody>
          {creators.map((creator, idx) => (
            <CreatorRow key={creator.address} address={creator.address} count={creator.count} idx={idx} />
          ))}
            </tbody>
          </table>
    </div>
  );
}
