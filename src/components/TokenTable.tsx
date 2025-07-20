import { cn } from "@/lib/utils";
import { useTokenFeed } from "@/hooks/useTokenFeed";
import { useNavigate } from "react-router-dom";
import { TokenDataTable } from "./TokenDataTable";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

// Filter options
const topFilters = ["Most Valuable", "Top Gainers", "Top Volume 24h"];

export function TokenTable() {
  const navigate = useNavigate();
  const [activeTopFilter, setActiveTopFilter] = useState<string>(() => {
    return localStorage.getItem("activeTopFilter") || "Most Valuable";
  });
  const [currentPage, setCurrentPage] = useState(1);

  // Use dedicated hook for smart state handling
  const {
    coins,
    dexScreenerData,
    pageInfo,
    error,
    isLoading,
    refetchAll,
    refetchActive,
    hasData
  } = useTokenFeed(activeTopFilter);

  // Save active filter to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("activeTopFilter", activeTopFilter);
  }, [activeTopFilter]);

  // Handle coin click
  const handleCoinClick = useCallback((address: string) => {
    navigate(`/token/${address}`);
  }, [navigate]);

  // Handle pagination
  const handleLoadNextPage = useCallback(() => {
    if (pageInfo?.endCursor) {
      // Update the query with new cursor
      const newParams = { count: 20, after: pageInfo.endCursor };
      
      // Refetch with new parameters
      refetchActive();
    }
  }, [pageInfo, refetchActive]);

  const handleGoToPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleRefresh = useCallback(() => {
    // Refresh all data sources for better UX
    refetchAll();
  }, [refetchAll]);

  return (
    <div className="space-y-4">
      {/* Header with Live Indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Token Explorer</h1>
          <div className="flex items-center gap-2 text-sm text-green-500">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Live</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1 bg-muted text-muted-foreground rounded-md text-sm font-medium hover:bg-muted/80 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        {topFilters.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveTopFilter(filter)}
            className={cn(
              "flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors",
              activeTopFilter === filter
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Progressive Loading - Show data as soon as it's available */}
      {hasData && (
        <TokenDataTable
          coins={coins}
          dexScreenerData={dexScreenerData}
          currentPage={currentPage}
          loading={false} // Never show loading state for seamless updates
          pageInfo={pageInfo}
          onCoinClick={handleCoinClick}
          onLoadNextPage={handleLoadNextPage}
          onGoToPage={handleGoToPage}
          showPagination={false} // No pagination for top volume
          itemsPerPage={20}
        />
      )}

      {/* Only show error if we have no data at all */}
      {error && !hasData && (
        <div className="flex items-center justify-center p-8">
          <div className="text-center text-red-500">
            <p>Error loading {activeTopFilter.toLowerCase()} coins:</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
