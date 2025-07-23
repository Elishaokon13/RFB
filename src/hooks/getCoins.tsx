import { useQuery } from "@tanstack/react-query";
import { getCoinsNew } from "@zoralabs/coins-sdk";

// Core types for new coin data matching Zora Protocol structure
interface NewCoin {
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
  coins: NewCoin[];
  pagination?: {
    cursor?: string;
  };
}

// Optimized hook with correct Zora Protocol response structure
export const useGetCoins = (params: ExploreQueryOptions = {}) => {
  const { count = 20, after } = params;
  
  return useQuery<QueryResponse>({
    queryKey: ["coins", "new", "zora", { count, after }],
    queryFn: async () => {
      const response = await getCoinsNew({ count, after });
      
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
    staleTime: 2 * 60 * 1000, // 2 minutes - faster refresh for new coins
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
};

// Optimized formatting functions with memoization-friendly design
export const formatCreationDate = (createdAt?: string): string => {
  if (!createdAt) return "N/A";
  
  try {
    const date = new Date(createdAt);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    const diffInWeeks = Math.floor(diffInDays / 7);
    const diffInYears = Math.floor(diffInDays / 365);
    
    if (diffInMinutes < 1) return "<1m";
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInHours < 24) return `${diffInHours}h`;
    if (diffInDays < 7) return `${diffInDays}d`;
    if (diffInWeeks < 52) return `${diffInWeeks}w`;
    return `${diffInYears}y`;
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

export const formatCreatorAddress = (creatorAddress?: string): string => {
  if (!creatorAddress) return "N/A";
  return creatorAddress.length <= 10 
    ? creatorAddress 
    : `${creatorAddress.slice(0, 6)}...${creatorAddress.slice(-4)}`;
};

// Activity indicators for micro-interactions
export const getCreationActivityLevel = (createdAt?: string): string => {
  if (!createdAt) return "bg-gray-100 text-gray-800";
  
  try {
    const date = new Date(createdAt);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 5) return "bg-green-100 text-green-800"; // Very recent
    if (diffInMinutes < 30) return "bg-blue-100 text-blue-800"; // Recent
    if (diffInMinutes < 120) return "bg-yellow-100 text-yellow-800"; // Moderate
    return "bg-gray-100 text-gray-800"; // Old
  } catch {
    return "bg-gray-100 text-gray-800";
  }
};

export type { NewCoin, ExploreQueryOptions, QueryResponse };
