import { useQuery } from "@tanstack/react-query";
import { getCoinsLastTraded } from "@zoralabs/coins-sdk";

// Core types for last traded coin data matching Zora Protocol structure
interface LastTradedCoin {
  id?: string;
  name?: string;
  description?: string;
  address?: string;
  symbol?: string;
  totalSupply?: string;
  totalVolume?: string;
  volume24h?: string;
  createdAt?: string;
  creatorAddress?: string;
  marketCap?: string;
  marketCapDelta24h?: string;
  chainId?: number;
  uniqueHolders?: number;
  lastTradedAt?: string;
  image?: string;
}

interface ExploreQueryOptions {
  after?: string;
  count?: number;
}

interface QueryResponse {
  coins: LastTradedCoin[];
  pagination?: {
    cursor?: string;
  };
}

// Optimized hook with correct Zora Protocol response structure
export const useGetCoinsLastTraded = (params: ExploreQueryOptions = {}) => {
  const { count = 20, after } = params;
  
  return useQuery<QueryResponse>({
    queryKey: ["coins", "last-traded", "zora", { count, after }],
    queryFn: async () => {
      const response = await getCoinsLastTraded({ count, after });
      
      // Extract coins from exploreList edges
      const tokens = response.data?.exploreList?.edges?.map(
        (edge: { node: unknown }) => edge.node
      ) || [];
      
      return {
        coins: tokens as LastTradedCoin[],
        pagination: {
          cursor: response.data?.exploreList?.pageInfo?.endCursor,
        },
      };
    },
    staleTime: 1 * 60 * 1000, // 1 minute - very fast refresh for trading data
    gcTime: 3 * 60 * 1000, // 3 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 8000),
    refetchOnWindowFocus: true, // Important for trading data
    refetchOnReconnect: true,
  });
};

// Optimized formatting functions with memoization-friendly design
export const formatLastTradedTime = (lastTradedAt?: string): string => {
  if (!lastTradedAt) return "N/A";
  
  try {
    const tradedTime = new Date(lastTradedAt);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - tradedTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    
    const days = Math.floor(diffInMinutes / 1440);
    return `${days}d ago`;
  } catch {
    return "Invalid Date";
  }
};

export const formatMarketCap = (marketCap?: string): string => {
  if (!marketCap) return "N/A";
  
  const value = parseFloat(marketCap);
  if (isNaN(value)) return "N/A";
  
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: value >= 1e9 ? "compact" : "standard",
    maximumFractionDigits: 2,
  });
  
  return formatter.format(value);
};

export const formatVolume = (volume24h?: string): string => {
  if (!volume24h) return "N/A";
  
  const value = parseFloat(volume24h);
  if (isNaN(value)) return "N/A";
  
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: value >= 1e6 ? "compact" : "standard",
    maximumFractionDigits: 2,
  });
  
  return formatter.format(value);
};

// Activity indicators for micro-interactions
export const getActivityColor = (lastTradedAt?: string): string => {
  if (!lastTradedAt) return "bg-gray-100 text-gray-800";
  
  try {
    const tradedTime = new Date(lastTradedAt);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - tradedTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 2) return "bg-green-100 text-green-800"; // Very recent
    if (diffInMinutes < 10) return "bg-blue-100 text-blue-800"; // Recent
    if (diffInMinutes < 30) return "bg-yellow-100 text-yellow-800"; // Moderate
    return "bg-gray-100 text-gray-800"; // Old
  } catch {
    return "bg-gray-100 text-gray-800";
  }
};

// Trading intensity indicator
export const getTradingIntensity = (volume24h?: string, marketCap?: string): string => {
  if (!volume24h || !marketCap) return "bg-gray-100 text-gray-800";
  
  const volumeValue = parseFloat(volume24h);
  const marketCapValue = parseFloat(marketCap);
  
  if (isNaN(volumeValue) || isNaN(marketCapValue) || marketCapValue === 0) {
    return "bg-gray-100 text-gray-800";
  }
  
  const ratio = (volumeValue / marketCapValue) * 100;
  
  if (ratio >= 50) return "bg-purple-100 text-purple-800"; // Very high
  if (ratio >= 20) return "bg-green-100 text-green-800"; // High
  if (ratio >= 10) return "bg-blue-100 text-blue-800"; // Moderate
  if (ratio >= 5) return "bg-yellow-100 text-yellow-800"; // Low
  return "bg-gray-100 text-gray-800"; // Very low
};

export type { LastTradedCoin, ExploreQueryOptions, QueryResponse }; 