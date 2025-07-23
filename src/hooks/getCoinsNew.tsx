import { useQuery } from "@tanstack/react-query";
import { getCoinsNew } from '@zoralabs/coins-sdk';

export interface NewCoin {
  id?: string;
  name?: string;
  symbol?: string;
  address?: string;
  createdAt?: string;
  creatorAddress?: string;
  marketCap?: string;
  totalSupply?: string;
  totalVolume?: string;
  volume24h?: string;
  chainId?: number;
  uniqueHolders?: number;
  image?: string;
}

interface QueryResponse {
  coins: NewCoin[];
  pagination: {
    cursor?: string;
  };
}

interface ExploreQueryOptions {
  count?: number;
  after?: string;
}

// Optimized hook with correct Zora Protocol response structure
export const useGetCoinsNew = (params: ExploreQueryOptions = {}) => {
  const { count = 20, after } = params;
  
  return useQuery<QueryResponse>({
    queryKey: ["coins", "new", "zora", { count, after }],
    queryFn: async () => {
      const response = await getCoinsNew({ count, after });
      console.log('[getCoinsNew] Full response:', response);
      
      // Extract coins from exploreList edges
      const tokens = response.data?.exploreList?.edges?.map(
        (edge: { node: unknown }) => edge.node
      ) || [];
      
      return {
        coins: tokens as NewCoin[],
        pagination: {
          cursor: response.data?.exploreList?.pageInfo?.endCursor,
        },
      };
    },
    staleTime: 5 * 1000, // 5 seconds - very fast refresh for new coins
    gcTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 6000),
    refetchOnWindowFocus: true, // Important for new coins data
    refetchOnReconnect: true,
    refetchOnMount: true, // Always refetch on mount for fresh data
    refetchInterval: () => document.visibilityState === 'visible' ? 5000 : false, // Refetch every 5 seconds if tab is visible
    refetchIntervalInBackground: true, // Continue refetching even when tab is not active
  });
};

// Optimized formatting functions with memoization-friendly design
export const formatCreationTime = (createdAt?: string): string => {
  if (!createdAt) return "N/A";
  
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now.getTime() - created.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffMs / (1000 * 60));
  const diffHour = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return created.toLocaleDateString();
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

// Age indicator for new coins
export const getAgeIndicator = (createdAt?: string): string => {
  if (!createdAt) return "bg-gray-100 text-gray-800";
  
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now.getTime() - created.getTime();
  const diffMin = Math.floor(diffMs / (1000 * 60));
  const diffHour = Math.floor(diffMs / (1000 * 60 * 60));
  
  if (diffMin < 5) return "bg-red-100 text-red-800"; // Very new (red)
  if (diffMin < 30) return "bg-orange-100 text-orange-800"; // New (orange)
  if (diffHour < 1) return "bg-yellow-100 text-yellow-800"; // Recent (yellow)
  if (diffHour < 24) return "bg-blue-100 text-blue-800"; // Today (blue)
  return "bg-gray-100 text-gray-800"; // Older (gray)
};

// Freshness indicator
export const getFreshnessIndicator = (createdAt?: string): string => {
  if (!createdAt) return "bg-gray-100 text-gray-800";
  
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now.getTime() - created.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffMs / (1000 * 60));
  
  if (diffSec < 60) return "bg-green-100 text-green-800"; // Just created
  if (diffMin < 5) return "bg-blue-100 text-blue-800"; // Very fresh
  if (diffMin < 30) return "bg-yellow-100 text-yellow-800"; // Fresh
  if (diffMin < 60) return "bg-orange-100 text-orange-800"; // Recent
  return "bg-gray-100 text-gray-800"; // Older
}; 