import { useState, useEffect, useCallback } from 'react';

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
      // DexScreener API endpoint for Base chain tokens
      const response = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: DexScreenerResponse = await response.json();

      // Debug logging
      console.log('DexScreener API response for', tokenAddress, ':', data);

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

// Hook to fetch multiple token prices
export const useMultipleDexScreenerPrices = (tokenAddresses: string[]) => {
  const [pricesData, setPricesData] = useState<Record<string, DexScreenerPair>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPrices = useCallback(async () => {
    if (tokenAddresses.length === 0) {
      setPricesData({});
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch prices for all tokens in parallel
      const pricePromises = tokenAddresses.map(async (address) => {
        try {
          const response = await fetch(
            `https://api.dexscreener.com/latest/dex/tokens/${address}`
          );

          if (!response.ok) {
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

            return { address, pair: bestPair };
          }
        } catch (err) {
          console.warn(`Failed to fetch price for ${address}:`, err);
        }
        return null;
      });

      const results = await Promise.all(pricePromises);
      
      const newPricesData: Record<string, DexScreenerPair> = {};
      results.forEach((result) => {
        if (result) {
          newPricesData[result.address] = result.pair;
        }
      });

      setPricesData(newPricesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch price data');
    } finally {
      setLoading(false);
    }
  }, [tokenAddresses]);

  useEffect(() => {
    // Initial fetch
    fetchPrices();

    // Set up interval for 20-second refresh
    const intervalId = setInterval(() => {
      fetchPrices();
    }, 20000); // 20 seconds

    return () => clearInterval(intervalId);
  }, [fetchPrices]);

  return {
    pricesData,
    loading,
    error,
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

  const formatPrice = (price: string | undefined) => {
    if (!price) return 'N/A';
    const num = parseFloat(price);
    if (isNaN(num)) return 'N/A';
    if (num < 0.000001) return `$${num.toExponential(2)}`;
    if (num < 0.01) return `$${num.toFixed(6)}`;
    if (num < 1) return `$${num.toFixed(4)}`;
    return `$${num.toFixed(2)}`;
  };

  const formatPercentage = (value: number | undefined) => {
    if (value === undefined || isNaN(value)) return 'N/A';
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  return {
    priceUsd: formatPrice(priceData.priceUsd),
    priceChange24h: formatPercentage(priceData.priceChange?.h24),
    volume24h: formatNumber(priceData.volume?.h24),
    liquidity: formatNumber(priceData.liquidity?.usd),
    fdv: formatNumber(priceData.fdv),
  };
}; 