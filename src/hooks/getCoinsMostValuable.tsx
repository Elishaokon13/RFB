import { useQuery } from "@tanstack/react-query";
import { getCoinsMostValuable } from "@zoralabs/coins-sdk";

// Core types for most valuable coin data matching Zora Protocol structure
interface MostValuableCoin {
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
  coins: MostValuableCoin[];
  pagination?: {
    cursor?: string;
  };
}

// Optimized hook with correct Zora Protocol response structure
export const useGetCoinsMostValuable = (params: ExploreQueryOptions = {}) => {
  const { count = 20, after } = params;
  
  return useQuery<QueryResponse>({
    queryKey: ["coins", "most-valuable", "zora", { count, after }],
    queryFn: async () => {
      const response = await getCoinsMostValuable({ count, after });
      
      // Extract coins from exploreList edges
      const tokens = response.data?.exploreList?.edges?.map(
        (edge: { node: unknown }) => edge.node
      ) || [];
      
      return {
        coins: tokens as MostValuableCoin[],
        pagination: {
          cursor: response.data?.exploreList?.pageInfo?.endCursor,
        },
      };
    },
    staleTime: 30 * 1000, // 30 seconds - faster refresh for better UX
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 8000),
    refetchOnWindowFocus: true, // Enable background refetching
    refetchOnReconnect: true,
    refetchOnMount: true, // Always refetch on mount for fresh data
  });
};

// Optimized formatting functions with memoization-friendly design
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

export const formatCreationDate = (createdAt?: string): string => {
  if (!createdAt) return "N/A";
  
  try {
    const date = new Date(createdAt);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "Invalid Date";
  }
};

// Activity indicators for micro-interactions
export const getMarketCapTier = (marketCap?: string): string => {
  if (!marketCap) return "bg-gray-100 text-gray-800";
  
  const value = parseFloat(marketCap);
  if (isNaN(value)) return "bg-gray-100 text-gray-800";
  
  if (value >= 1e12) return "bg-purple-100 text-purple-800"; // Mega cap
  if (value >= 1e11) return "bg-indigo-100 text-indigo-800"; // Large cap
  if (value >= 1e10) return "bg-green-100 text-green-800"; // Mid cap
  if (value >= 1e9) return "bg-blue-100 text-blue-800"; // Small cap
  if (value >= 1e8) return "bg-yellow-100 text-yellow-800"; // Micro cap
  return "bg-gray-100 text-gray-800"; // Nano cap
};

export const getMarketCapTierLabel = (marketCap?: string): string => {
  if (!marketCap) return "Unknown";
  
  const value = parseFloat(marketCap);
  if (isNaN(value)) return "Unknown";
  
  if (value >= 1e12) return "Mega Cap";
  if (value >= 1e11) return "Large Cap";
  if (value >= 1e10) return "Mid Cap";
  if (value >= 1e9) return "Small Cap";
  if (value >= 1e8) return "Micro Cap";
  return "Nano Cap";
};

export const getVolumeToMarketCapRatio = (volume24h?: string, marketCap?: string): number => {
  if (!volume24h || !marketCap) return 0;
  
  const volumeValue = parseFloat(volume24h);
  const marketCapValue = parseFloat(marketCap);
  
  if (isNaN(volumeValue) || isNaN(marketCapValue) || marketCapValue === 0) return 0;
  return (volumeValue / marketCapValue) * 100;
};

export const formatVolumeToMarketCapRatio = (volume24h?: string, marketCap?: string): string => {
  const ratio = getVolumeToMarketCapRatio(volume24h, marketCap);
  if (ratio === 0) return "N/A";
  return `${ratio.toFixed(2)}%`;
};

export const getLiquidityIndicator = (volume24h?: string, marketCap?: string): string => {
  const ratio = getVolumeToMarketCapRatio(volume24h, marketCap);
  
  if (ratio >= 50) return "bg-green-100 text-green-800"; // Very liquid
  if (ratio >= 20) return "bg-blue-100 text-blue-800"; // Liquid
  if (ratio >= 10) return "bg-yellow-100 text-yellow-800"; // Moderate liquidity
  if (ratio >= 5) return "bg-orange-100 text-orange-800"; // Low liquidity
  return "bg-red-100 text-red-800"; // Very low liquidity
};

// Market dominance indicator
export const getMarketDominance = (marketCap?: string, totalMarketCap?: string): string => {
  if (!marketCap || !totalMarketCap) return "bg-gray-100 text-gray-800";
  
  const marketCapValue = parseFloat(marketCap);
  const totalMarketCapValue = parseFloat(totalMarketCap);
  
  if (isNaN(marketCapValue) || isNaN(totalMarketCapValue) || totalMarketCapValue === 0) {
    return "bg-gray-100 text-gray-800";
  }
  
  const dominance = (marketCapValue / totalMarketCapValue) * 100;
  
  if (dominance >= 10) return "bg-purple-100 text-purple-800"; // Dominant
  if (dominance >= 5) return "bg-green-100 text-green-800"; // Major
  if (dominance >= 1) return "bg-blue-100 text-blue-800"; // Significant
  if (dominance >= 0.1) return "bg-yellow-100 text-yellow-800"; // Minor
  return "bg-gray-100 text-gray-800"; // Micro
};

export type { MostValuableCoin, ExploreQueryOptions, QueryResponse }; 