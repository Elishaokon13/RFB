import { cn } from "@/lib/utils";
import { usePreloadAllData } from "@/hooks/usePreloadAllData";
import { useMultipleDexScreenerPrices } from "@/hooks/useDexScreener";
import { useNavigate } from "react-router-dom";
import { TokenDataTable } from "./TokenDataTable";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Coin as PreloadCoin } from "@/hooks/usePreloadAllData";
import { Coin as TokenDataCoin } from "@/hooks/useTopVolume24h";

// Filter options
const topFilters = ["Most Valuable", "Top Gainers", "Top Volume 24h"];

// Helper function to convert PreloadCoin to TokenDataCoin
const convertToTokenDataCoin = (coin: PreloadCoin): TokenDataCoin => ({
  id: coin.id || "",
  name: coin.name || "",
  symbol: coin.symbol || "",
  description: coin.description || "",
  address: coin.address || "",
  totalSupply: coin.totalSupply || "",
  totalVolume: coin.totalVolume || "",
  volume24h: coin.volume24h || "",
  createdAt: coin.createdAt || "",
  creatorAddress: coin.creatorAddress || "",
  creatorEarnings: [],
  marketCap: coin.marketCap || "",
  marketCapDelta24h: coin.marketCapDelta24h || "",
  chainId: coin.chainId || 0,
  price: "",
  priceChange24h: "",
  imageUrl: coin.image || "",
  website: "",
  twitter: "",
  telegram: "",
  discord: "",
  metadata: {},
  uniswapV3PoolAddress: "",
  uniqueHolders: coin.uniqueHolders || 0,
  uniswapV4PoolKey: null,
  zoraComments: null,
});

// Custom event system to bypass React rendering
class DataEventEmitter {
  private listeners: Map<string, Set<Function>> = new Map();
  private dataStore: Map<string, any> = new Map();

  emit(event: string, data: any) {
    this.dataStore.set(event, data);
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(data));
    }
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    
    // Return current data if available
    return this.dataStore.get(event);
  }

  off(event: string, callback: Function) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  getData(event: string) {
    return this.dataStore.get(event);
  }
}

// Global event emitter instance
const dataEmitter = new DataEventEmitter();

export function TokenTable() {
  const navigate = useNavigate();
  const [activeTopFilter, setActiveTopFilter] = useState<string>(() => {
    return localStorage.getItem("activeTopFilter") || "Most Valuable";
  });
  const [currentPage, setCurrentPage] = useState(1);
  
  // Force re-render counter (only used when we actually want to update)
  const [forceUpdate, setForceUpdate] = useState(0);

  // Preload all data sources (but don't use their data directly)
  const { mostValuable, topGainers, topVolume, isLoading: preloadLoading } = usePreloadAllData();

  // Save active filter to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("activeTopFilter", activeTopFilter);
  }, [activeTopFilter]);

  // Extract token addresses for DexScreener API
  const tokenAddresses = useMemo(() => {
    const currentData = dataEmitter.getData(`coins-${activeTopFilter}`) || [];
    return currentData.map((coin: any) => coin.address).filter(Boolean);
  }, [activeTopFilter, forceUpdate]);

  // Get DexScreener data for real-time price updates
  const { pricesData: dexScreenerData, loading: dexScreenerLoading, refetch: refetchDexScreener } = useMultipleDexScreenerPrices(tokenAddresses);

  // Listen for data changes and update only when necessary
  useEffect(() => {
    const handleDataChange = (data: any) => {
      // Only force re-render if data actually changed
      setForceUpdate(prev => prev + 1);
    };

    // Listen to data changes for the active filter
    dataEmitter.on(`coins-${activeTopFilter}`, handleDataChange);
    dataEmitter.on('dexScreenerData', handleDataChange);

    return () => {
      dataEmitter.off(`coins-${activeTopFilter}`, handleDataChange);
      dataEmitter.off('dexScreenerData', handleDataChange);
    };
  }, [activeTopFilter]);

  // Process data changes and emit events only when data actually changes
  useEffect(() => {
    const processDataChange = () => {
      let data;
      switch (activeTopFilter) {
        case "Most Valuable":
          data = mostValuable.data;
          break;
        case "Top Gainers":
          data = topGainers.data;
          break;
        case "Top Volume 24h":
          data = topVolume.data;
          break;
        default:
          data = mostValuable.data;
      }

      if (data?.coins) {
        const currentData = dataEmitter.getData(`coins-${activeTopFilter}`);
        
        // Deep comparison to check if data actually changed
        const hasChanged = !currentData || 
          data.coins.length !== currentData.length ||
          data.coins.some((coin: any, index: number) => {
            const prevCoin = currentData[index];
            if (!prevCoin) return true;
            
            return (
              coin.id !== prevCoin.id ||
              coin.marketCap !== prevCoin.marketCap ||
              coin.volume24h !== prevCoin.volume24h ||
              coin.marketCapDelta24h !== prevCoin.marketCapDelta24h
            );
          });

        // Only emit event if data actually changed
        if (hasChanged) {
          dataEmitter.emit(`coins-${activeTopFilter}`, data.coins);
        }
      }
    };

    // Process data changes
    processDataChange();
  }, [activeTopFilter, mostValuable.data, topGainers.data, topVolume.data]);

  // Process DexScreener data changes
  useEffect(() => {
    const currentDexData = dataEmitter.getData('dexScreenerData');
    
    // Deep comparison for DexScreener data
    const hasChanged = !currentDexData || 
      Object.keys(dexScreenerData).some(key => {
        const prevData = currentDexData[key];
        const currentData = dexScreenerData[key];
        
        if (!prevData || !currentData) return true;
        
        return (
          prevData.priceUsd !== currentData.priceUsd ||
          prevData.volume?.h24 !== currentData.volume?.h24 ||
          prevData.priceChange?.h24 !== currentData.priceChange?.h24
        );
      });

    // Only emit event if data actually changed
    if (hasChanged) {
      dataEmitter.emit('dexScreenerData', dexScreenerData);
    }
  }, [dexScreenerData]);

  // Get stable data from event emitter
  const stableCoins = useMemo(() => {
    const rawCoins = dataEmitter.getData(`coins-${activeTopFilter}`) || [];
    return rawCoins.map(convertToTokenDataCoin);
  }, [activeTopFilter, forceUpdate]);

  const stableDexScreenerData = useMemo(() => {
    return dataEmitter.getData('dexScreenerData') || {};
  }, [forceUpdate]);

  // Always use cached data if available, never show blank states
  const pageInfo = useMemo(() => {
    let data;
    switch (activeTopFilter) {
      case "Most Valuable":
        data = mostValuable.data;
        break;
      case "Top Gainers":
        data = topGainers.data;
        break;
      case "Top Volume 24h":
        data = topVolume.data;
        break;
      default:
        data = mostValuable.data;
    }

    if (!data?.pagination) return null;
    return {
      endCursor: data.pagination.cursor,
      hasNextPage: !!data.pagination.cursor,
    };
  }, [activeTopFilter, mostValuable.data, topGainers.data, topVolume.data]);
  
  // Only show error if we have absolutely no data
  const error = mostValuable.error || topGainers.error || topVolume.error;
  const errorMessage = error ? error.toString() : null;
  const hasAnyData = stableCoins.length > 0;

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
      switch (activeTopFilter) {
        case "Most Valuable":
          mostValuable.refetch();
          break;
        case "Top Gainers":
          topGainers.refetch();
          break;
        case "Top Volume 24h":
          topVolume.refetch();
          break;
      }
    }
  }, [pageInfo, activeTopFilter, mostValuable, topGainers, topVolume]);

  const handleGoToPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // Calculate total volume for display
  const totalVolume = useMemo(() => {
    return stableCoins.reduce((sum, coin) => {
      return sum + (parseFloat(coin.volume24h || "0") || 0);
    }, 0);
  }, [stableCoins]);

  const handleRefresh = useCallback(() => {
    // Refresh all data sources for better UX
    mostValuable.refetch();
    topGainers.refetch();
    topVolume.refetch();
    refetchDexScreener();
  }, [mostValuable, topGainers, topVolume, refetchDexScreener]);

  // Show loading state only if the active tab is still loading
  const showLoading = preloadLoading || dexScreenerLoading;

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
                  onClick={() => {
                    setActiveTopFilter(filter);
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
              disabled={showLoading}
              className="flex items-center gap-1 px-3 py-1 bg-muted rounded-lg text-sm text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className={cn("w-4 h-4", showLoading && "animate-spin")} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Progressive Loading - Show data as soon as it's available */}
      {hasAnyData && (
        <TokenDataTable
          coins={stableCoins}
          dexScreenerData={stableDexScreenerData}
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
      {error && !hasAnyData && (
        <div className="flex items-center justify-center p-8">
          <div className="text-center text-red-500">
            <p>Error loading {activeTopFilter.toLowerCase()} coins:</p>
            <p className="text-sm">{errorMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}
