import { useState, useEffect } from "react";
import axios from "axios";

// Define types for the API response
interface TBAToken {
  id: string;
  name: string;
  symbol: string;
  address: string;
  chainId: number;
  decimals: number;
  logoURI?: string;
  price?: number;
  priceChange24h?: number;
  volume24h?: number;
  marketCap?: number;
  createdAt?: string;
  launchDate?: string;
  description?: string;
  website?: string;
  twitter?: string;
  telegram?: string;
  discord?: string;
  totalSupply?: string;
  holders?: number;
}

interface TBAResponse {
  tokens: TBAToken[];
}

/**
 * Hook to fetch token data from TBA backend
 */
export function useGetTBATokens() {
  const [data, setData] = useState<TBAResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTokens = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get("http://localhost:3000/api/");

      console.log("[TBA] API response:", response.data);
      setData(response.data);

      return response.data;
    } catch (err) {
      console.error("[TBA] Error fetching tokens:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch token data";
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch on mount and when dependencies change
  useEffect(() => {
    fetchTokens();
  }, []);

  // Function to search tokens
  const searchTokens = async (query: string) => {
    return fetchTokens();
  };

  // Function to refresh current data
  const refresh = () => {
    return fetchTokens();
  };

  return {
    data,
    loading,
    error,
    fetchTokens,
    searchTokens,
    refresh,
  };
}

// Helper function to format market cap
export const formatMarketCap = (marketCap?: number): string => {
  if (!marketCap) return "N/A";

  if (marketCap >= 1_000_000_000) {
    return `$${(marketCap / 1_000_000_000).toFixed(2)}B`;
  }

  if (marketCap >= 1_000_000) {
    return `$${(marketCap / 1_000_000).toFixed(2)}M`;
  }

  if (marketCap >= 1_000) {
    return `$${(marketCap / 1_000).toFixed(2)}K`;
  }

  return `$${marketCap.toFixed(2)}`;
};

// Helper function to format price change percentage
export const formatPriceChange = (priceChange?: number): string => {
  if (priceChange === undefined || priceChange === null) return "N/A";

  const sign = priceChange >= 0 ? "+" : "";
  return `${sign}${priceChange.toFixed(2)}%`;
};

// Export types for use in other components
export type { TBAToken, TBAResponse };
