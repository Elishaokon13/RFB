import { useQuery } from "@tanstack/react-query";
import { 
  getCoinsMostValuable, 
  getCoinsTopGainers, 
  getCoinsTopVolume24h, 
  getCoinsNew,
  getCoinsLastTraded,
  getCoinsLastTradedUnique,
  getProfileBalances
} from "@zoralabs/coins-sdk";

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
  creatorProfile?: {
    handle?: string;
    address?: string;
    displayName?: string;
    avatar?: {
      previewImage?: {
        small?: string;
        medium?: string;
      };
    };
  };
  creatorEarnings?: Array<{
    amountUsd?: string;
    amountRaw?: string;
  }>;
}

interface Creator {
  address: string;
  handle?: string;
  displayName?: string;
  avatar?: string;
  tokenCount: number;
  totalEarnings: number;
  totalVolume: number;
  totalHolders: number;
  coins: Coin[];
}

interface QueryOptions {
  count?: number;
  after?: string;
}

// Hook to fetch comprehensive creators data ranked by earnings
export const useCreators = (params: QueryOptions = {}) => {
  const { count = 200, after } = params; // Increased count to get more data

  // Fetch multiple data sources to get comprehensive creator data
  const mostValuableQuery = useQuery({
    queryKey: ["creators", "most-valuable", { count, after }],
    queryFn: async () => {
      const response = await getCoinsMostValuable({ count, after });
      return response.data?.exploreList?.edges?.map(
        (edge: { node: unknown }) => edge.node
      ) || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    retry: 3,
  });

  const topGainersQuery = useQuery({
    queryKey: ["creators", "top-gainers", { count, after }],
    queryFn: async () => {
      const response = await getCoinsTopGainers({ count, after });
      return response.data?.exploreList?.edges?.map(
        (edge: { node: unknown }) => edge.node
      ) || [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 3,
  });

  const topVolumeQuery = useQuery({
    queryKey: ["creators", "top-volume", { count, after }],
    queryFn: async () => {
      const response = await getCoinsTopVolume24h({ count, after });
      return response.data?.exploreList?.edges?.map(
        (edge: { node: unknown }) => edge.node
      ) || [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 3,
  });

  const newCoinsQuery = useQuery({
    queryKey: ["creators", "new-coins", { count, after }],
    queryFn: async () => {
      const response = await getCoinsNew({ count, after });
      return response.data?.exploreList?.edges?.map(
        (edge: { node: unknown }) => edge.node
      ) || [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 3,
  });

  const lastTradedQuery = useQuery({
    queryKey: ["creators", "last-traded", { count, after }],
    queryFn: async () => {
      const response = await getCoinsLastTraded({ count, after });
      return response.data?.exploreList?.edges?.map(
        (edge: { node: unknown }) => edge.node
      ) || [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 3,
  });

  const lastTradedUniqueQuery = useQuery({
    queryKey: ["creators", "last-traded-unique", { count, after }],
    queryFn: async () => {
      const response = await getCoinsLastTradedUnique({ count, after });
      return response.data?.exploreList?.edges?.map(
        (edge: { node: unknown }) => edge.node
      ) || [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 3,
  });

  // Combine all coins from different sources
  const allCoins: Coin[] = [
    ...(mostValuableQuery.data || []),
    ...(topGainersQuery.data || []),
    ...(topVolumeQuery.data || []),
    ...(newCoinsQuery.data || []),
    ...(lastTradedQuery.data || []),
    ...(lastTradedUniqueQuery.data || []),
  ];

  // Remove duplicates based on coin address
  const uniqueCoins = allCoins.filter((coin, index, self) => 
    index === self.findIndex(c => c.address === coin.address)
  );

  // Aggregate creators from all unique coins with earnings calculation
  const creatorsMap = new Map<string, { 
    coins: Coin[]; 
    tokenCount: number; 
    totalEarnings: number;
    totalVolume: number;
    totalHolders: number;
  }>();
  
  uniqueCoins.forEach((coin) => {
    if (coin.creatorAddress) {
      const existing = creatorsMap.get(coin.creatorAddress);
      if (existing) {
        existing.tokenCount += 1;
        existing.coins.push(coin);
        
        // Add earnings from this coin
        const coinEarnings = coin.creatorEarnings?.[0]?.amountUsd;
        if (coinEarnings) {
          existing.totalEarnings += parseFloat(coinEarnings) || 0;
        }
        
        // Add volume from this coin
        const coinVolume = parseFloat(coin.totalVolume || "0");
        existing.totalVolume += coinVolume;
        
        // Add holders from this coin
        const coinHolders = parseInt(coin.uniqueHolders?.toString() || "0");
        existing.totalHolders += coinHolders;
      } else {
        const coinEarnings = coin.creatorEarnings?.[0]?.amountUsd;
        const coinVolume = parseFloat(coin.totalVolume || "0");
        const coinHolders = parseInt(coin.uniqueHolders?.toString() || "0");
        
        creatorsMap.set(coin.creatorAddress, {
          tokenCount: 1,
          coins: [coin],
          totalEarnings: parseFloat(coinEarnings || "0"),
          totalVolume: coinVolume,
          totalHolders: coinHolders,
        });
      }
    }
  });

  // Convert to array and sort by earnings (descending)
  const creators: Creator[] = Array.from(creatorsMap.entries())
    .map(([address, { coins, tokenCount, totalEarnings, totalVolume, totalHolders }]) => {
      // Get the first coin's metadata for display info
      const firstCoin = coins[0];
      return {
        address,
        handle: firstCoin?.creatorProfile?.handle,
        displayName: firstCoin?.creatorProfile?.displayName,
        avatar: firstCoin?.creatorProfile?.avatar?.previewImage?.small,
        tokenCount,
        totalEarnings,
        totalVolume,
        totalHolders,
        coins,
      };
    })
    .sort((a, b) => b.totalEarnings - a.totalEarnings);

  // Loading state
  const isLoading = mostValuableQuery.isLoading || 
                   topGainersQuery.isLoading || 
                   topVolumeQuery.isLoading || 
                   newCoinsQuery.isLoading ||
                   lastTradedQuery.isLoading ||
                   lastTradedUniqueQuery.isLoading;

  // Error state
  const error = mostValuableQuery.error || 
                topGainersQuery.error || 
                topVolumeQuery.error || 
                newCoinsQuery.error ||
                lastTradedQuery.error ||
                lastTradedUniqueQuery.error;

  // Refetch function
  const refetch = () => {
    mostValuableQuery.refetch();
    topGainersQuery.refetch();
    topVolumeQuery.refetch();
    newCoinsQuery.refetch();
    lastTradedQuery.refetch();
    lastTradedUniqueQuery.refetch();
  };

  return {
    creators,
    totalCreators: creators.length,
    totalCoins: uniqueCoins.length,
    isLoading,
    error,
    refetch,
  };
}; 