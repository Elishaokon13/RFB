import { useState, useEffect, useCallback, useRef } from "react";
import { usePreloadAllData } from "./usePreloadAllData";
import { Coin } from "./usePreloadAllData";
import { getCoinsMostValuable, getCoinsTopGainers, getCoinsTopVolume24h, getCoinsNew } from "@zoralabs/coins-sdk";

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
  const [isFetchingMore, setIsFetchingMore] = useState(false);

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
    newCoins,
    isLoading: preloadLoading,
  } = usePreloadAllData();

  // Get data for the active filter
  const getActiveData = useCallback(() => {
    switch (activeFilter) {
      case "Most Valuable":
        return mostValuable.data;
      case "Top Gainers":
        // Ensure Top Gainers are sorted by market cap change in 24h (descending)
        if (topGainers.data?.coins) {
          const sortedCoins = [...topGainers.data.coins].sort((a, b) => {
            const deltaA = parseFloat(a.marketCapDelta24h || "0");
            const deltaB = parseFloat(b.marketCapDelta24h || "0");
            return deltaB - deltaA; // Descending order (highest gain first)
          });
          return {
            ...topGainers.data,
            coins: sortedCoins
          };
        }
        return topGainers.data;
      case "Top Volume 24h":
        // Ensure Top Volume are sorted by 24h volume (descending)
        if (topVolume.data?.coins) {
          const sortedCoins = [...topVolume.data.coins].sort((a, b) => {
            const volumeA = parseFloat(a.volume24h || "0");
            const volumeB = parseFloat(b.volume24h || "0");
            return volumeB - volumeA; // Descending order (highest volume first)
          });
          return {
            ...topVolume.data,
            coins: sortedCoins
          };
        }
        return topVolume.data;
      case "New Coins":
        // Ensure New Coins are sorted by creation time (newest first)
        if (newCoins.data?.coins) {
          const sortedCoins = [...newCoins.data.coins].sort((a, b) => {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return timeB - timeA; // Descending order (newest first)
          });
          return {
            ...newCoins.data,
            coins: sortedCoins
          };
        }
        return newCoins.data;
      default:
        return mostValuable.data;
    }
  }, [activeFilter, mostValuable.data, topGainers.data, topVolume.data, newCoins.data]);

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
      // If we're fetching more, append the new data instead of replacing
      if (isFetchingMore) {
        // Find unique coins to avoid duplicates
        const existingIds = new Set(prevCoins.map(coin => coin.id));
        const newCoins = currentCoins.filter(coin => !existingIds.has(coin.id));
        
        // Append new coins to existing ones
        const updatedCoins = [...prevCoins, ...newCoins];
        setStableCoins(updatedCoins);
        prevCoinsRef.current = updatedCoins;
        
        // Update cache with combined data
        const currentCache = tabDataCache.get(activeFilter) || {
          coins: [],
          dexScreenerData: {},
          pageInfo: null,
          lastUpdate: 0,
          isInitialized: false,
        };
        
        tabDataCache.set(activeFilter, {
          ...currentCache,
          coins: updatedCoins,
          lastUpdate: Date.now(),
          isInitialized: true,
          dexScreenerData: stableDexScreenerData,
          pageInfo: pageInfo,
        });
      } else {
        // Normal update - replace data
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
    }
  }, [
    currentCoins,
    activeFilter,
    preloadLoading,
    stableDexScreenerData,
    pageInfo,
    isFetchingMore,
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

  // Reset fetchingMore state when loading is done
  useEffect(() => {
    if (!preloadLoading && isFetchingMore) {
      setIsFetchingMore(false);
    }
  }, [preloadLoading, isFetchingMore]);

  // Refetch functions
  const refetchAll = useCallback(() => {
    mostValuable.refetch();
    topGainers.refetch();
    topVolume.refetch();
    newCoins.refetch();
  }, [mostValuable, topGainers, topVolume, newCoins]);

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
      case "New Coins":
        newCoins.refetch();
        break;
    }
  }, [activeFilter, mostValuable, topGainers, topVolume, newCoins]);

  // Fetch next page by making a direct API call
  const fetchNextPage = useCallback(
    async (cursor: string) => {
      if (!cursor || isFetchingMore) return;
      
      setIsFetchingMore(true);
      
      try {
        // Determine which API to call based on the active filter
        let response;
        const count = 20; // Number of items to fetch
        
        switch (activeFilter) {
          case "Most Valuable":
            response = await getCoinsMostValuable({ count, after: cursor });
            break;
          case "Top Gainers":
            response = await getCoinsTopGainers({ count, after: cursor });
            break;
          case "Top Volume 24h":
            response = await getCoinsTopVolume24h({ count, after: cursor });
            break;
          case "New Coins":
            response = await getCoinsNew({ count, after: cursor });
            break;
          default:
            response = await getCoinsMostValuable({ count, after: cursor });
        }
        
        // Process the response to extract tokens and update state
        if (response && response.data && response.data.exploreList) {
          const newCoins = response.data.exploreList.edges.map(
            (edge: { node: unknown }) => edge.node
          ) as Coin[];
          
          const newCursor = response.data.exploreList.pageInfo?.endCursor;
          
          // Add new coins to existing ones
          const existingIds = new Set(stableCoins.map(coin => coin.id));
          const uniqueNewCoins = newCoins.filter(coin => !existingIds.has(coin.id));
          
          // Update coins state with combined data
          const updatedCoins = [...stableCoins, ...uniqueNewCoins];
          setStableCoins(updatedCoins);
          prevCoinsRef.current = updatedCoins;
          
          // Update page info with new cursor
          const updatedPageInfo = {
            endCursor: newCursor,
            hasNextPage: !!newCursor && newCursor.length > 0,
          };
          setPageInfo(updatedPageInfo);
          prevPageInfoRef.current = updatedPageInfo;
          
          // Update cache
          const currentCache = tabDataCache.get(activeFilter) || {
            coins: [],
            dexScreenerData: {},
            pageInfo: null,
            lastUpdate: 0,
            isInitialized: false,
          };
          
          tabDataCache.set(activeFilter, {
            ...currentCache,
            coins: updatedCoins,
            pageInfo: updatedPageInfo,
            lastUpdate: Date.now(),
            isInitialized: true,
          });
        }
      } catch (err) {
        console.error("Error fetching next page:", err);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsFetchingMore(false);
      }
    },
    [activeFilter, isFetchingMore, stableCoins]
  );

  return {
    coins: stableCoins,
    dexScreenerData: stableDexScreenerData,
    pageInfo,
    error,
    isLoading: isLoading || isFetchingMore,
    refetchAll,
    refetchActive,
    hasData: stableCoins.length > 0,
    fetchNextPage,
  };
}
