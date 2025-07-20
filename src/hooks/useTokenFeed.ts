import { useState, useEffect, useCallback, useRef } from 'react';
import { usePreloadAllData } from './usePreloadAllData';
import { useMultipleDexScreenerPrices } from './useDexScreener';
import { Coin as PreloadCoin } from './usePreloadAllData';
import { Coin as TokenDataCoin } from './useTopVolume24h';

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

// Deep comparison function for coin data
const areCoinsEqual = (prevCoin: PreloadCoin, nextCoin: PreloadCoin) => {
  return (
    prevCoin.id === nextCoin.id &&
    prevCoin.marketCap === nextCoin.marketCap &&
    prevCoin.volume24h === nextCoin.volume24h &&
    prevCoin.marketCapDelta24h === nextCoin.marketCapDelta24h &&
    prevCoin.uniqueHolders === nextCoin.uniqueHolders
  );
};

// Smart state management with diffing
export function useTokenFeed(activeFilter: string) {
  const [stableCoins, setStableCoins] = useState<TokenDataCoin[]>([]);
  const [stableDexScreenerData, setStableDexScreenerData] = useState<Record<string, any>>({});
  const [pageInfo, setPageInfo] = useState<{ endCursor?: string; hasNextPage?: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Refs to store previous data for comparison
  const prevCoinsRef = useRef<PreloadCoin[]>([]);
  const prevDexDataRef = useRef<Record<string, any>>({});
  const prevPageInfoRef = useRef<any>(null);

  // Preload all data sources
  const { mostValuable, topGainers, topVolume, isLoading: preloadLoading } = usePreloadAllData();

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
  const tokenAddresses = currentCoins.map(coin => coin.address).filter(Boolean);

  // Get DexScreener data for real-time price updates
  const { pricesData: dexScreenerData, loading: dexScreenerLoading } = useMultipleDexScreenerPrices(tokenAddresses);

  // Smart diffing for coins data
  useEffect(() => {
    const prevCoins = prevCoinsRef.current;
    
    // Check if coins data actually changed
    const coinsChanged = currentCoins.length !== prevCoins.length ||
      currentCoins.some((coin, index) => {
        const prevCoin = prevCoins[index];
        if (!prevCoin) return true;
        return !areCoinsEqual(prevCoin, coin);
      });

    // Only update if data actually changed
    if (coinsChanged) {
      const convertedCoins = currentCoins.map(convertToTokenDataCoin);
      setStableCoins(convertedCoins);
      prevCoinsRef.current = currentCoins;
    }
  }, [currentCoins]);

  // Smart diffing for page info
  useEffect(() => {
    const prevPageInfo = prevPageInfoRef.current;
    
    if (currentPageInfo !== prevPageInfo) {
      const newPageInfo = currentPageInfo ? {
        endCursor: currentPageInfo.cursor,
        hasNextPage: !!currentPageInfo.cursor,
      } : null;
      
      setPageInfo(newPageInfo);
      prevPageInfoRef.current = currentPageInfo;
    }
  }, [currentPageInfo]);

  // Smart diffing for DexScreener data
  useEffect(() => {
    const prevDexData = prevDexDataRef.current;
    
    // Check if DexScreener data actually changed
    const dexDataChanged = Object.keys(dexScreenerData).some(key => {
      const prevData = prevDexData[key];
      const currentData = dexScreenerData[key];
      
      if (!prevData || !currentData) return true;
      
      return (
        prevData.priceUsd !== currentData.priceUsd ||
        prevData.volume?.h24 !== currentData.volume?.h24 ||
        prevData.priceChange?.h24 !== currentData.priceChange?.h24
      );
    });

    // Only update if data actually changed
    if (dexDataChanged) {
      setStableDexScreenerData(dexScreenerData);
      prevDexDataRef.current = dexScreenerData;
    }
  }, [dexScreenerData]);

  // Handle errors
  useEffect(() => {
    const currentError = mostValuable.error || topGainers.error || topVolume.error;
    setError(currentError ? currentError.toString() : null);
  }, [mostValuable.error, topGainers.error, topVolume.error]);

  // Handle loading state
  useEffect(() => {
    setIsLoading(preloadLoading || dexScreenerLoading);
  }, [preloadLoading, dexScreenerLoading]);

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