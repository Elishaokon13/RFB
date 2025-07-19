import { useQuery } from "@tanstack/react-query";
import { getCoinsNew } from "@zoralabs/coins-sdk";

// Types for coin data
interface Coin {
  id: string;
  name: string;
  symbol: string;
  price?: number;
  marketCap?: number;
  volume24h?: number;
  change24h?: number;
  image?: string;
}

interface GetCoinsParams {
  limit?: number;
  offset?: number;
  search?: string;
}

// Custom hook for fetching coins
export const useGetCoins = (params: GetCoinsParams = {}) => {
  return useQuery({
    queryKey: ["coins", "zora", params],
    queryFn: () => getCoinsNew(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export type { Coin, GetCoinsParams };
