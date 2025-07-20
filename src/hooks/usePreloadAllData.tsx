import { useQuery } from "@tanstack/react-query";
import { getCoinsMostValuable } from "@zoralabs/coins-sdk";
import { getCoinsTopGainers } from "@zoralabs/coins-sdk";
import { getCoinsTopVolume24h } from "@zoralabs/coins-sdk";

// Core types for coin data
interface Coin {
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

interface QueryOptions {
  count?: number;
  after?: string;
}

interface QueryResponse {
  coins: Coin[];
  pagination?: {
    cursor?: string;
  };
}

// Hook to preload all data sources in parallel
export const usePreloadAllData = (params: QueryOptions = {}) => {
  const { count = 20, after } = params;

  // Fetch all three data sources in parallel with real-time updates
  const mostValuableQuery = useQuery<QueryResponse>({
    queryKey: ["coins", "most-valuable", "zora", { count, after }],
    queryFn: async () => {
      const response = await getCoinsMostValuable({ count, after });
      
      const tokens = response.data?.exploreList?.edges?.map(
        (edge: { node: unknown }) => edge.node
      ) || [];
      
      return {
        coins: tokens as Coin[],
        pagination: {
          cursor: response.data?.exploreList?.pageInfo?.endCursor,
        },
      };
    },
    staleTime: 0, // Always consider data stale for real-time updates
    gcTime: 15 * 60 * 1000, // 15 minutes cache time to prevent blank states
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 8000),
    refetchOnWindowFocus: false, // Prevent refetch on focus to avoid blank states
    refetchOnReconnect: true,
    refetchOnMount: false, // Prevent refetch on mount if we have cached data
    refetchInterval: () => document.visibilityState === 'visible' ? 10000 : false, // Refetch every 10 seconds if tab is visible, pause if hidden
    refetchIntervalInBackground: true, // Continue refetching even when tab is not active
    notifyOnChangeProps: ['data'], // Only notify when data changes
    placeholderData: (previousData) => previousData, // Keep previous data while fetching
    structuralSharing: true, // Enable structural sharing for better performance
  });

  const topGainersQuery = useQuery<QueryResponse>({
    queryKey: ["coins", "top-gainers", "zora", { count, after }],
    queryFn: async () => {
      const response = await getCoinsTopGainers({ count, after });
      
      const tokens = response.data?.exploreList?.edges?.map(
        (edge: { node: unknown }) => edge.node
      ) || [];
      
      return {
        coins: tokens as Coin[],
        pagination: {
          cursor: response.data?.exploreList?.pageInfo?.endCursor,
        },
      };
    },
    staleTime: 0, // Always consider data stale for real-time updates
    gcTime: 15 * 60 * 1000, // 15 minutes cache time to prevent blank states
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 6000),
    refetchOnWindowFocus: false, // Prevent refetch on focus to avoid blank states
    refetchOnReconnect: true,
    refetchOnMount: false, // Prevent refetch on mount if we have cached data
    refetchInterval: () => document.visibilityState === 'visible' ? 10000 : false, // Refetch every 10 seconds if tab is visible, pause if hidden
    refetchIntervalInBackground: true, // Continue refetching even when tab is not active
    notifyOnChangeProps: ['data'], // Only notify when data changes
    placeholderData: (previousData) => previousData, // Keep previous data while fetching
    structuralSharing: true, // Enable structural sharing for better performance
  });

  const topVolumeQuery = useQuery<QueryResponse>({
    queryKey: ["coins", "top-volume", "zora", { count, after }],
    queryFn: async () => {
      const response = await getCoinsTopVolume24h({ count, after });
      
      const tokens = response.data?.exploreList?.edges?.map(
        (edge: { node: unknown }) => edge.node
      ) || [];
      
      return {
        coins: tokens as Coin[],
        pagination: {
          cursor: response.data?.exploreList?.pageInfo?.endCursor,
        },
      };
    },
    staleTime: 0, // Always consider data stale for real-time updates
    gcTime: 15 * 60 * 1000, // 15 minutes cache time to prevent blank states
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 6000),
    refetchOnWindowFocus: false, // Prevent refetch on focus to avoid blank states
    refetchOnReconnect: true,
    refetchOnMount: false, // Prevent refetch on mount if we have cached data
    refetchInterval: () => document.visibilityState === 'visible' ? 10000 : false, // Refetch every 10 seconds if tab is visible, pause if hidden
    refetchIntervalInBackground: true, // Continue refetching even when tab is not active
    notifyOnChangeProps: ['data'], // Only notify when data changes
    placeholderData: (previousData) => previousData, // Keep previous data while fetching
    structuralSharing: true, // Enable structural sharing for better performance
  });

  // Combined loading state
  const isLoading = mostValuableQuery.isLoading || topGainersQuery.isLoading || topVolumeQuery.isLoading;

  // Combined error state
  const error = mostValuableQuery.error || topGainersQuery.error || topVolumeQuery.error;

  // Combined refetch function
  const refetchAll = () => {
    mostValuableQuery.refetch();
    topGainersQuery.refetch();
    topVolumeQuery.refetch();
  };

  return {
    mostValuable: {
      data: mostValuableQuery.data,
      isLoading: mostValuableQuery.isLoading,
      error: mostValuableQuery.error,
      refetch: mostValuableQuery.refetch,
    },
    topGainers: {
      data: topGainersQuery.data,
      isLoading: topGainersQuery.isLoading,
      error: topGainersQuery.error,
      refetch: topGainersQuery.refetch,
    },
    topVolume: {
      data: topVolumeQuery.data,
      isLoading: topVolumeQuery.isLoading,
      error: topVolumeQuery.error,
      refetch: topVolumeQuery.refetch,
    },
    isLoading,
    error,
    refetchAll,
  };
};

export type { Coin, QueryOptions, QueryResponse }; 