import { useState, useEffect, useCallback, useRef } from 'react';
import { getCoinsTopVolume24h, getCoin } from "@zoralabs/coins-sdk";

// Types for the coin data - updated to match SDK structure
export interface Coin {
  id: string;
  name: string;
  symbol: string;
  description: string;
  address: string;
  totalSupply: string;
  totalVolume: string;
  volume24h: string;
  createdAt?: string;
  creatorAddress?: string;
  creatorEarnings?: Array<{
    amount: {
      currencyAddress: string;
      amountRaw: string;
      amountDecimal: number;
    };
    amountUsd?: string;
  }>;
  marketCap?: string;
  marketCapDelta24h?: string;
  chainId: number;
  price?: string;
  priceChange24h?: string;
  imageUrl?: string;
  website?: string;
  twitter?: string;
  telegram?: string;
  discord?: string;
  metadata?: any;
  uniswapV3PoolAddress: string;
  uniqueHolders: number;
  uniswapV4PoolKey?: any;
  zoraComments?: any;
}

export interface TrendingCoinsResponse {
  data?: {
    exploreList?: {
      edges: Array<{
        node: Coin;
        cursor: string;
      }>;
      pageInfo?: {
        endCursor?: string;
        hasNextPage?: boolean;
      };
    };
  };
}

export interface CoinDetailsResponse {
  data?: {
    zora20Token?: Coin;
  };
}

// Hook for fetching trending coins with pagination
export const useTrendingCoins = (count: number = 5, after?: string) => {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageInfo, setPageInfo] = useState<{
    endCursor?: string;
    hasNextPage?: boolean;
  } | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [allCoins, setAllCoins] = useState<Coin[]>([]);
  const [cursors, setCursors] = useState<string[]>([]);

  const fetchTrendingCoins = useCallback(async (cursor?: string, pageNumber: number = 1) => {
    setLoading(true);
    setError(null);
    
    try {
      const response: any = await getCoinsTopVolume24h({
        count,
        after: cursor,
      });

      if (response.data?.exploreList?.edges) {
        const coinList = response.data.exploreList.edges.map((edge: any) => edge.node);
        const filteredCoinList = coinList.filter((coin: Coin) => coin.chainId === 8453);

        // Store all coins and cursors for pagination
        if (pageNumber === 1) {
          setAllCoins(filteredCoinList);
          setCursors([response.data.exploreList.pageInfo?.endCursor || '']);
        } else {
          setAllCoins(prev => [...prev, ...filteredCoinList]);
          setCursors(prev => [...prev, response.data.exploreList.pageInfo?.endCursor || '']);
        }
        
        setCoins(filteredCoinList);
        setPageInfo(response.data.exploreList.pageInfo || null);
        setTotalCount(allCoins.length + filteredCoinList.length);
        setCurrentPage(pageNumber);
        
        // Log token count for debugging
        console.log(
          `Trending Coins by 24h Volume (${response.data.exploreList.edges.length} coins)`
        );
      } else {
        setCoins([]);
        setPageInfo(null);
        setTotalCount(0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch trending coins');
      setCoins([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [count, after, allCoins.length]);

  useEffect(() => {
    fetchTrendingCoins(after, 1);
  }, [after]);

  const refetch = useCallback(() => {
    fetchTrendingCoins(after, 1);
  }, [fetchTrendingCoins, after]);

  const loadNextPage = useCallback(() => {
    if (pageInfo?.endCursor && pageInfo?.hasNextPage) {
      fetchTrendingCoins(pageInfo.endCursor, currentPage + 1);
    }
  }, [pageInfo, fetchTrendingCoins, currentPage]);

  const goToPage = useCallback((pageNumber: number) => {
    if (pageNumber <= cursors.length) {
      // Go to existing page
      const startIndex = (pageNumber - 1) * count;
      const endIndex = startIndex + count;
      setCoins(allCoins.slice(startIndex, endIndex));
      setCurrentPage(pageNumber);
    } else if (pageInfo?.hasNextPage) {
      // Load new page
      fetchTrendingCoins(pageInfo.endCursor, pageNumber);
    }
  }, [cursors.length, count, allCoins, pageInfo, fetchTrendingCoins]);

  return {
    coins,
    loading,
    error,
    pageInfo,
    totalCount,
    currentPage,
    refetch,
    loadNextPage,
    goToPage,
  };
};

// Optimized hook with additional safeguards
export const useCoinDetails = (coinAddress: string | null) => {
  const [coin, setCoin] = useState<Coin | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Track the last fetched address to prevent duplicate calls
  const lastFetchedAddress = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    console.log('useCoinDetails effect triggered with:', coinAddress);
    
    const fetchCoinDetails = async () => {
      // Early return if address hasn't changed
      if (coinAddress === lastFetchedAddress.current) {
        console.log('Address unchanged, skipping fetch');
        return;
      }

      if (!coinAddress) {
        setCoin(null);
        setError(null);
        lastFetchedAddress.current = null;
        return;
      }

      // Cancel previous request if still pending
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();
      
      setLoading(true);
      setError(null);
      lastFetchedAddress.current = coinAddress;
      
      try {
        console.log('Fetching coin details for:', coinAddress);
        const response: any = await getCoin({ 
          address: coinAddress,
          signal: abortControllerRef.current.signal // Add abort signal if your API supports it
        });
        
        // Check if request was aborted
        if (abortControllerRef.current.signal.aborted) {
          return;
        }
        
        if (response.data?.zora20Token) {
          const coinData = response.data.zora20Token;
          setCoin(coinData);
          
          // Only log once, not on every render
          console.log("=== COIN FETCHED ===", coinData.name);
        } else {
          setCoin(null);
          setError('Coin not found');
        }
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        
        setError(err instanceof Error ? err.message : 'Failed to fetch coin details');
        setCoin(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCoinDetails();

    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [coinAddress]); // Keep only coinAddress as dependency

  const refetch = useCallback(async () => {
    // Force refetch by clearing the last fetched address
    lastFetchedAddress.current = null;
    
    if (!coinAddress) {
      setCoin(null);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response: any = await getCoin({ address: coinAddress });
      
      if (response.data?.zora20Token) {
        const coinData = response.data.zora20Token;
        setCoin(coinData);
        lastFetchedAddress.current = coinAddress;
      } else {
        setCoin(null);
        setError('Coin not found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch coin details');
      setCoin(null);
    } finally {
      setLoading(false);
    }
  }, [coinAddress]);

  return {
    coin,
    loading,
    error,
    refetch,
  };
};

// Hook for fetching multiple coins by addresses
export const useMultipleCoins = (coinAddresses: string[]) => {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMultipleCoins = useCallback(async () => {
    if (coinAddresses.length === 0) {
      setCoins([]);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const promises = coinAddresses.map(address => getCoin({ address }));
      const responses = await Promise.all(promises);
      
      const coinList = responses
        .map((response: any) => response.data?.zora20Token)
        .filter((coin): coin is Coin => coin !== undefined);
      
      setCoins(coinList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch coins');
      setCoins([]);
    } finally {
      setLoading(false);
    }
  }, [coinAddresses]);

  useEffect(() => {
    fetchMultipleCoins();
  }, [fetchMultipleCoins]);

  const refetch = useCallback(() => {
    fetchMultipleCoins();
  }, [fetchMultipleCoins]);

  return {
    coins,
    loading,
    error,
    refetch,
  };
};

// Utility function to format coin data for display
export const formatCoinData = (coin: Coin) => {
  return {
    ...coin,
    formattedPrice: coin.price ? `$${parseFloat(coin.price).toLocaleString()}` : 'N/A',
    formattedMarketCap: coin.marketCap ? `$${parseFloat(coin.marketCap).toLocaleString()}` : 'N/A',
    formattedVolume24h: coin.volume24h ? `$${parseFloat(coin.volume24h).toLocaleString()}` : 'N/A',
    formattedPriceChange: coin.priceChange24h ? `${parseFloat(coin.priceChange24h) > 0 ? '+' : ''}${parseFloat(coin.priceChange24h).toFixed(2)}%` : 'N/A',
    formattedTotalSupply: coin.totalSupply ? parseFloat(coin.totalSupply).toLocaleString() : 'N/A',
    creationDate: coin.createdAt ? new Date(coin.createdAt).toLocaleDateString() : 'N/A',
  };
}; 