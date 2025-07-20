import { useState, useEffect, useCallback, useRef } from 'react';

// DexScreener API types
export interface DexScreenerPair {
  chainId?: string;
  dexId?: string;
  url?: string;
  pairAddress?: string;
  baseToken?: {
    address?: string;
    name?: string;
    symbol?: string;
  };
  quoteToken?: {
    symbol?: string;
  };
  priceNative?: string;
  priceUsd?: string;
  txns?: {
    h1?: {
      buys?: number;
      sells?: number;
    };
    h24?: {
      buys?: number;
      sells?: number;
    };
  };
  volume?: {
    h24?: number;
    h6?: number;
    h1?: number;
  };
  priceChange?: {
    m5?: number;
    h1?: number;
    h6?: number;
    h24?: number;
  };
  liquidity?: {
    usd?: number;
    base?: number;
    quote?: number;
  };
  fdv?: number;
  pairCreatedAt?: number;
}

export interface DexScreenerResponse {
  pairs: DexScreenerPair[];
}

// Global DexScreener cache to persist data across tab switches
const globalDexScreenerCache = new Map<string, {
  data: DexScreenerPair;
  timestamp: number;
}>();

// Rate limiting utility
class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async waitForSlot(): Promise<void> {
    const now = Date.now();

    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs);

    // If we're at the limit, wait until we can make another request
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest);
      await new Promise(resolve => setTimeout(resolve, waitTime + 100)); // Add 100ms buffer
    }

    // Add current request
    this.requests.push(now);
  }
}

// Global rate limiter instance (60 requests per minute)
const dexScreenerRateLimiter = new RateLimiter(60, 60000);

// Hook to fetch token price from DexScreener
export const useDexScreenerPrice = (tokenAddress: string | null) => {
  const [priceData, setPriceData] = useState<DexScreenerPair | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPrice = useCallback(async () => {
    if (!tokenAddress) {
      setPriceData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Wait for rate limiter slot
      await dexScreenerRateLimiter.waitForSlot();

      // DexScreener API endpoint for Base chain tokens
      const response = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`,
        {
          signal: AbortSignal.timeout(5000),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: DexScreenerResponse = await response.json();

      if (data.pairs && data.pairs.length > 0) {
        // Find the most relevant pair (usually the one with highest volume)
        const bestPair = data.pairs.reduce((best, current) => {
          const currentVolume = current.volume?.h24 || 0;
          const bestVolume = best.volume?.h24 || 0;
          return currentVolume > bestVolume ? current : best;
        });

        setPriceData(bestPair);
      } else {
        setPriceData(null);
        setError('No trading pairs found for this token');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch price data');
      setPriceData(null);
    } finally {
      setLoading(false);
    }
  }, [tokenAddress]);

  useEffect(() => {
    fetchPrice();
  }, [fetchPrice]);

  return {
    priceData,
    loading,
    error,
    refetch: fetchPrice,
  };
};

// Hook to fetch multiple token prices with rate limiting and global cache
export const useMultipleDexScreenerPrices = (tokenAddresses: string[]) => {
  const [pricesData, setPricesData] = useState<Record<string, DexScreenerPair>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitInfo, setRateLimitInfo] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchPrices = useCallback(async () => {
    if (tokenAddresses.length === 0) {
      setPricesData({});
      return;
    }

    // Cancel previous request if still running
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);
    setRateLimitInfo(null);

    try {
      // More permissive rate limiting - allow more requests
      const batchSize = 3; // Smaller batches for better success rate
      
      const batches = [];
      for (let i = 0; i < tokenAddresses.length; i += batchSize) {
        batches.push(tokenAddresses.slice(i, i + batchSize));
      }

      const allResults: Record<string, DexScreenerPair> = {};

      for (const batch of batches) {
        // Check if request was aborted
        if (abortControllerRef.current?.signal.aborted) {
          break;
        }

        const batchPromises = batch.map(async (address) => {
          try {
            // Check global cache first
            const cached = globalDexScreenerCache.get(address);
            const cacheAge = cached ? Date.now() - cached.timestamp : Infinity;
            
            // Use cached data if it's less than 30 seconds old
            if (cached && cacheAge < 30000) {
              return { address, pair: cached.data };
            }

            // Reduced rate limiting - only wait 500ms between requests
            await new Promise(resolve => setTimeout(resolve, 500));

            // Check if request was aborted
            if (abortControllerRef.current?.signal.aborted) {
              return null;
            }

            const response = await fetch(
              `https://api.dexscreener.com/latest/dex/tokens/${address}`,
              {
                signal: abortControllerRef.current?.signal || AbortSignal.timeout(10000), // Increased timeout
              }
            );

            if (!response.ok) {
              if (response.status === 429) {
                setRateLimitInfo('Rate limit reached. Some prices may be delayed.');
                return null;
              }
              throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data: DexScreenerResponse = await response.json();

            if (data.pairs && data.pairs.length > 0) {
              // Find the most relevant pair
              const bestPair = data.pairs.reduce((best, current) => {
                const currentVolume = current.volume?.h24 || 0;
                const bestVolume = best.volume?.h24 || 0;
                return currentVolume > bestVolume ? current : best;
              });

              // Cache the result globally
              globalDexScreenerCache.set(address, {
                data: bestPair,
                timestamp: Date.now()
              });

              return { address, pair: bestPair };
            }
          } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
              return null;
            }
            console.warn(`Failed to fetch price for ${address}:`, err);
          }
          return null;
        });

        const batchResults = await Promise.all(batchPromises);
        batchResults.forEach((result) => {
          if (result) {
            allResults[result.address] = result.pair;
          }
        });

        // Reduced delay between batches
        if (batches.length > 1 && !abortControllerRef.current?.signal.aborted) {
          await new Promise(resolve => setTimeout(resolve, 300)); // 300ms between batches
        }
      }

      // Only update state if data actually changed and request wasn't aborted
      if (!abortControllerRef.current?.signal.aborted) {
        setPricesData(prevData => {
          // Merge new results with existing data - preserve old data for failed requests
          const mergedData = { ...prevData, ...allResults };
          
          // Deep comparison to check if data actually changed
          const hasChanged = Object.keys(allResults).some(key => {
            const prevPair = prevData[key];
            const nextPair = allResults[key];
            
            if (!prevPair || !nextPair) return true;
            
            return (
              prevPair.priceUsd !== nextPair.priceUsd ||
              prevPair.volume?.h24 !== nextPair.volume?.h24 ||
              prevPair.priceChange?.h24 !== nextPair.priceChange?.h24
            );
          });

          return hasChanged ? mergedData : prevData;
        });
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [tokenAddresses]);

  // Initialize with cached data immediately
  useEffect(() => {
    const cachedData: Record<string, DexScreenerPair> = {};
    let hasCachedData = false;

    // Load cached data for all requested addresses
    tokenAddresses.forEach(address => {
      const cached = globalDexScreenerCache.get(address);
      if (cached) {
        cachedData[address] = cached.data;
        hasCachedData = true;
      }
    });

    // Set cached data immediately if available
    if (hasCachedData) {
      setPricesData(prevData => ({ ...prevData, ...cachedData }));
    }

    // Then fetch fresh data
    fetchPrices();
  }, [tokenAddresses, fetchPrices]);

  useEffect(() => {
    // More frequent refresh - every 10 seconds
    const interval = setInterval(fetchPrices, 10000);

    return () => {
      clearInterval(interval);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchPrices]);

  return {
    pricesData,
    loading,
    error,
    rateLimitInfo,
    refetch: fetchPrices,
  };
};

// Utility function to format price data
export const formatDexScreenerPrice = (priceData: DexScreenerPair | null) => {
  if (!priceData) {
    return {
      priceUsd: 'N/A',
      priceChange24h: 'N/A',
      volume24h: 'N/A',
      liquidity: 'N/A',
      fdv: 'N/A',
    };
  }

  const formatNumber = (value: number | undefined) => {
    if (value === undefined || isNaN(value)) return 'N/A';
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const formatPercentage = (value: number | undefined) => {
    if (value === undefined || isNaN(value)) return 'N/A';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  return {
    priceUsd: priceData.priceUsd ? `$${parseFloat(priceData.priceUsd).toFixed(6)}` : 'N/A',
    priceChange24h: formatPercentage(priceData.priceChange?.h24),
    volume24h: formatNumber(priceData.volume?.h24),
    liquidity: formatNumber(priceData.liquidity?.usd),
    fdv: formatNumber(priceData.fdv),
  };
}; 