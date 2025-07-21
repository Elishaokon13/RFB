import { useState, useEffect, useCallback, useRef } from "react";
import { usePreloadAllData } from "./usePreloadAllData";
import { Coin } from "./usePreloadAllData";

// Deep comparison function for coin data
const areCoinsEqual = (prevCoin: Coin, nextCoin: Coin) => {
  return (
    prevCoin.id === nextCoin.id &&
    prevCoin.marketCap === nextCoin.marketCap &&
    prevCoin.volume24h === nextCoin.volume24h &&
    prevCoin.marketCapDelta24h === nextCoin.marketCapDelta24h &&
    prevCoin.uniqueHolders === nextCoin.uniqueHolders
  );
};

// Global cache to store data for each tab
const tabDataCache = new Map<
  string,
  {
    coins: Coin[];
    dexScreenerData: Record<string, unknown>;
    pageInfo: { endCursor?: string; hasNextPage?: boolean } | null;
    lastUpdate: number;
    isInitialized: boolean;
  }
>();

// Smart state management with diffing and tab-specific caching
export function useTokenFeed(activeFilter: string) {
  const [stableCoins, setStableCoins] = useState<Coin[]>([]);

  const [stableDexScreenerData, setStableDexScreenerData] = useState<
    Record<string, unknown>
  >({});
  const [pageInfo, setPageInfo] = useState<{
    endCursor?: string;
    hasNextPage?: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Refs to store previous data for comparison
  const prevCoinsRef = useRef<Coin[]>([]);
  const prevDexDataRef = useRef<Record<string, unknown>>({});
  const prevPageInfoRef = useRef<{
    endCursor?: string;
    hasNextPage?: boolean;
  } | null>(null);
  const prevActiveFilterRef = useRef<string>(activeFilter);
  const hasInitializedRef = useRef<boolean>(false);

  // Preload all data sources
  const {
    mostValuable,
    topGainers,
    topVolume,
    isLoading: preloadLoading,
  } = usePreloadAllData();

  // Get data for the active filter
  const getActiveData = useCallback(() => {
    switch (activeFilter) {
      case "Most Valuable":
        return mostValuable.data;
      case "Top Gainers":
        return topGainers.data;
      case "Top Volume 24h":
        return topVolume.data;
      default:
        return mostValuable.data;
    }
  }, [activeFilter, mostValuable.data, topGainers.data, topVolume.data]);

  const activeData = getActiveData();
  const currentCoins = activeData?.coins || [];
  const currentPageInfo = activeData?.pagination;

  // Extract token addresses for DexScreener API
  const tokenAddresses = currentCoins
    .map((coin) => coin.address)
    .filter(Boolean);

  // Handle tab switching - restore cached data immediately
  useEffect(() => {
    if (prevActiveFilterRef.current !== activeFilter) {
      const cached = tabDataCache.get(activeFilter);
      if (cached && cached.isInitialized) {
        setStableCoins(cached.coins);
        setStableDexScreenerData(cached.dexScreenerData);
        setPageInfo(cached.pageInfo);
        // setIsInitialized(true); // Not needed
      } else {
        // If no cached data, reset to loading state
        setStableCoins([]);
        setStableDexScreenerData({});
        setPageInfo(null);
        // setIsInitialized(false); // Not needed
      }
      prevActiveFilterRef.current = activeFilter;
    }
  }, [activeFilter]);

  // Smart diffing for coins data
  useEffect(() => {
    const prevCoins = prevCoinsRef.current;

    // Only process if we have actual data
    if (currentCoins.length === 0 && !preloadLoading) {
      return;
    }

    // Check if coins data actually changed
    const coinsChanged =
      currentCoins.length !== prevCoins.length ||
      currentCoins.some((coin, index) => {
        const prevCoin = prevCoins[index];
        if (!prevCoin) return true;
        return !areCoinsEqual(prevCoin, coin);
      });

    // Only update if data actually changed
    if (coinsChanged) {
      setStableCoins(currentCoins);
      prevCoinsRef.current = currentCoins;

      // Only cache if we have valid data
      if (currentCoins.length > 0) {
        const currentCache = tabDataCache.get(activeFilter) || {
          coins: [],
          dexScreenerData: {},
          pageInfo: null,
          lastUpdate: 0,
          isInitialized: false,
        };

        tabDataCache.set(activeFilter, {
          ...currentCache,
          coins: currentCoins,
          lastUpdate: Date.now(),
          isInitialized: true,
          dexScreenerData: stableDexScreenerData,
          pageInfo: pageInfo,
        });
      }
    }
  }, [
    currentCoins,
    activeFilter,
    preloadLoading,
    stableDexScreenerData,
    pageInfo,
  ]);

  // Smart diffing for page info
  useEffect(() => {
    const prevPageInfo = prevPageInfoRef.current;

    if (currentPageInfo !== prevPageInfo) {
      let newPageInfo: { endCursor?: string; hasNextPage?: boolean } | null =
        null;
      function hasCursor(obj: unknown): obj is { cursor?: string } {
        return typeof obj === "object" && obj !== null && "cursor" in obj;
      }
      if (hasCursor(currentPageInfo)) {
        const cursor = currentPageInfo.cursor;
        newPageInfo = {
          endCursor: typeof cursor === "string" ? cursor : undefined,
          hasNextPage: typeof cursor === "string" && cursor.length > 0,
        };
      } else {
        newPageInfo = null;
      }
      setPageInfo(newPageInfo);
      prevPageInfoRef.current = newPageInfo;

      // Only cache if we have valid data
      if (stableCoins.length > 0) {
        const currentCache = tabDataCache.get(activeFilter) || {
          coins: [],
          dexScreenerData: {},
          pageInfo: null,
          lastUpdate: 0,
          isInitialized: false,
        };

        tabDataCache.set(activeFilter, {
          ...currentCache,
          pageInfo: newPageInfo,
          lastUpdate: Date.now(),
          isInitialized: true,
          dexScreenerData: stableDexScreenerData,
        });
      }
    }
  }, [
    currentPageInfo,
    activeFilter,
    stableCoins.length,
    stableDexScreenerData,
  ]);

  // Smart diffing for DexScreener data
  useEffect(() => {
    const prevDexData = prevDexDataRef.current;

    // Check if DexScreener data actually changed
    const dexDataChanged = Object.keys(stableDexScreenerData).some((key) => {
      const prevData = prevDexData[key];
      const currentData = stableDexScreenerData[key];
      return prevData !== currentData;
    });

    // Only update if data actually changed
    if (dexDataChanged) {
      setStableDexScreenerData(stableDexScreenerData);
      prevDexDataRef.current = stableDexScreenerData;

      // Only cache if we have valid data
      if (stableCoins.length > 0) {
        const currentCache = tabDataCache.get(activeFilter) || {
          coins: [],
          dexScreenerData: {},
          pageInfo: null,
          lastUpdate: 0,
          isInitialized: false,
        };

        tabDataCache.set(activeFilter, {
          ...currentCache,
          dexScreenerData: stableDexScreenerData,
          lastUpdate: Date.now(),
          isInitialized: true,
        });
      }
    }
  }, [stableDexScreenerData, activeFilter, stableCoins.length]);

  // Handle errors
  useEffect(() => {
    const currentError =
      mostValuable.error || topGainers.error || topVolume.error;
    setError(currentError ? currentError.toString() : null);
  }, [mostValuable.error, topGainers.error, topVolume.error]);

  // Handle loading state
  useEffect(() => {
    const shouldShowLoading = preloadLoading || !stableCoins.length;
    setIsLoading(shouldShowLoading);
  }, [preloadLoading, stableCoins.length]);

  // Refetch functions
  const refetchAll = useCallback(() => {
    mostValuable.refetch();
    topGainers.refetch();
    topVolume.refetch();
  }, [mostValuable, topGainers, topVolume]);

  const refetchActive = useCallback(() => {
    switch (activeFilter) {
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
  }, [activeFilter, mostValuable, topGainers, topVolume]);

  return {
    coins: stableCoins,
    dexScreenerData: stableDexScreenerData,
    pageInfo,
    error,
    isLoading,
    refetchAll,
    refetchActive,
    hasData: stableCoins.length > 0,
  };
}
