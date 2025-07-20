import { useQuery } from "@tanstack/react-query";
import { getCoinsTopGainers } from "@zoralabs/coins-sdk";

// Core types for top gainers coin data matching Zora Protocol structure
interface TopGainerCoin {
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
  image?: string;
}

interface ExploreQueryOptions {
  after?: string;
  count?: number;
}

interface QueryResponse {
  coins: TopGainerCoin[];
  pagination?: {
    cursor?: string;
  };
}

// Optimized hook with correct Zora Protocol response structure
export const useGetCoinsTopGainers = (params: ExploreQueryOptions = {}) => {
  const { count = 20, after } = params;
  
  return useQuery<QueryResponse>({
    queryKey: ["coins", "top-gainers", "zora", { count, after }],
    queryFn: async () => {
      const response = await getCoinsTopGainers({ count, after });
      
      // Extract coins from exploreList edges
      const tokens = response.data?.exploreList?.edges?.map(
        (edge: { node: unknown }) => edge.node
      ) || [];
      
      return {
        coins: tokens as TopGainerCoin[],
        pagination: {
          cursor: response.data?.exploreList?.pageInfo?.endCursor,
        },
      };
    },
    staleTime: 1 * 60 * 1000, // 1 minute - very fast refresh for gainers data
    gcTime: 3 * 60 * 1000, // 3 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 8000),
    refetchOnWindowFocus: true, // Important for gainers data
    refetchOnReconnect: true,
  });
};

// Optimized formatting functions with memoization-friendly design
export const formatPercentChange = (marketCapDelta24h?: string): string => {
  if (!marketCapDelta24h) return "N/A";
  return `${parseFloat(marketCapDelta24h).toFixed(2)}%`;
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
export const getGainIndicator = (marketCapDelta24h?: string): string => {
  if (!marketCapDelta24h) return "bg-gray-100 text-gray-800";
  
  const change = parseFloat(marketCapDelta24h);
  if (isNaN(change)) return "bg-gray-100 text-gray-800";
  
  if (change >= 100) return "bg-purple-100 text-purple-800"; // Massive gain
  if (change >= 50) return "bg-green-100 text-green-800"; // High gain
  if (change >= 20) return "bg-blue-100 text-blue-800"; // Moderate gain
  if (change >= 10) return "bg-yellow-100 text-yellow-800"; // Low gain
  if (change >= 0) return "bg-gray-100 text-gray-800"; // Minimal gain
  return "bg-red-100 text-red-800"; // Loss
};

// Momentum indicator
export const getMomentumIndicator = (marketCapDelta24h?: string, volume24h?: string): string => {
  if (!marketCapDelta24h || !volume24h) return "bg-gray-100 text-gray-800";
  
  const change = parseFloat(marketCapDelta24h);
  const volumeValue = parseFloat(volume24h);
  
  if (isNaN(change) || isNaN(volumeValue)) return "bg-gray-100 text-gray-800";
  
  const momentumScore = change * Math.log10(volumeValue);
  
  if (momentumScore >= 1000) return "bg-purple-100 text-purple-800"; // Very high momentum
  if (momentumScore >= 500) return "bg-green-100 text-green-800"; // High momentum
  if (momentumScore >= 100) return "bg-blue-100 text-blue-800"; // Moderate momentum
  if (momentumScore >= 50) return "bg-yellow-100 text-yellow-800"; // Low momentum
  return "bg-gray-100 text-gray-800"; // Very low momentum
};

export type { TopGainerCoin, ExploreQueryOptions, QueryResponse }; 