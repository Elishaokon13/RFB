import { useQuery } from "@tanstack/react-query";
import { getCoinsNew } from "@zoralabs/coins-sdk";

// Core types for top volume coin data matching Zora Protocol structure
interface TopVolumeCoin {
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
  coins: TopVolumeCoin[];
  pagination?: {
    cursor?: string;
  };
}

// Optimized hook with correct Zora Protocol response structure
export const useGetCoinsTopVolume24h = (params: ExploreQueryOptions = {}) => {
  const { count = 20, after } = params;
  
  return useQuery<QueryResponse>({
    queryKey: ["coins", "top-volume", "zora", { count, after }],
    queryFn: async () => {
      const response = await getCoinsNew({ count, after });
      console.log('testing:', response);
      
      // Extract coins from exploreList edges
      const tokens = response.data?.exploreList?.edges?.map(
        (edge: { node: unknown }) => edge.node
      ) || [];
      
      return {
        coins: tokens as TopVolumeCoin[],
        pagination: {
          cursor: response.data?.exploreList?.pageInfo?.endCursor,
        },
      };
    },
    staleTime: 15 * 1000, // 15 seconds - very fast refresh for volume data
    gcTime: 3 * 60 * 1000, // 3 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 6000),
    refetchOnWindowFocus: true, // Important for volume data
    refetchOnReconnect: true,
    refetchOnMount: true, // Always refetch on mount for fresh data
  });
};

// Optimized formatting functions with memoization-friendly design
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

export const formatUniqueHolders = (uniqueHolders?: number): string => {
  if (!uniqueHolders) return "N/A";
  
  const formatter = new Intl.NumberFormat("en-US", {
    notation: uniqueHolders >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  });
  
  return formatter.format(uniqueHolders);
};

// Activity indicators for micro-interactions
export const getVolumeActivityLevel = (volume24h?: string): string => {
  if (!volume24h) return "bg-gray-100 text-gray-800";
  
  const value = parseFloat(volume24h);
  if (isNaN(value)) return "bg-gray-100 text-gray-800";
  
  if (value >= 1e9) return "bg-purple-100 text-purple-800"; // Very high volume
  if (value >= 1e8) return "bg-green-100 text-green-800"; // High volume
  if (value >= 1e7) return "bg-blue-100 text-blue-800"; // Moderate volume
  if (value >= 1e6) return "bg-yellow-100 text-yellow-800"; // Low volume
  return "bg-gray-100 text-gray-800"; // Very low volume
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

// Trading intensity indicator
export const getTradingIntensity = (volume24h?: string, marketCap?: string): string => {
  const ratio = getVolumeToMarketCapRatio(volume24h, marketCap);
  
  if (ratio >= 100) return "bg-purple-100 text-purple-800"; // Extremely high
  if (ratio >= 50) return "bg-green-100 text-green-800"; // Very high
  if (ratio >= 20) return "bg-blue-100 text-blue-800"; // High
  if (ratio >= 10) return "bg-yellow-100 text-yellow-800"; // Moderate
  if (ratio >= 5) return "bg-orange-100 text-orange-800"; // Low
  return "bg-gray-100 text-gray-800"; // Very low
};

// Volume trend indicator
export const getVolumeTrend = (volume24h?: string, uniqueHolders?: number): string => {
  if (!volume24h || !uniqueHolders) return "bg-gray-100 text-gray-800";
  
  const volumeValue = parseFloat(volume24h);
  if (isNaN(volumeValue)) return "bg-gray-100 text-gray-800";
  
  const volumePerHolder = volumeValue / uniqueHolders;
  
  if (volumePerHolder >= 1e6) return "bg-purple-100 text-purple-800"; // Very active
  if (volumePerHolder >= 1e5) return "bg-green-100 text-green-800"; // Active
  if (volumePerHolder >= 1e4) return "bg-blue-100 text-blue-800"; // Moderate
  if (volumePerHolder >= 1e3) return "bg-yellow-100 text-yellow-800"; // Low
  return "bg-gray-100 text-gray-800"; // Very low
};

export type { TopVolumeCoin, ExploreQueryOptions, QueryResponse }; 