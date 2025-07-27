import { useQuery } from "@tanstack/react-query";

export interface ZoraCreator {
  id: string;
  address: string;
  handle?: string;
  displayName?: string;
  avatar?: string;
  bio?: string;
  totalVolume: number;
  totalEarnings: number;
  totalTokens: number;
  totalSales: number;
  uniqueHolders: number;
  createdAt: string;
  tokens: Array<{
    id: string;
    name: string;
    symbol: string;
    address: string;
    totalSupply: string;
    totalVolume: string;
    marketCap: string;
    uniqueHolders: number;
    image?: string;
  }>;
}

interface UseZoraGraphQLCreatorsOptions {
  limit?: number;
  orderBy?: string;
}

export const useZoraGraphQLCreators = (options: UseZoraGraphQLCreatorsOptions = {}) => {
  const { limit = 10 } = options;

  return useQuery({
    queryKey: ["zora-graphql-creators", { limit }],
    queryFn: async (): Promise<ZoraCreator[]> => {
      // Note: The Zora GraphQL API at https://api.zora.co/universal/graphql 
      // appears to require authentication or has restricted access.
      // For now, we'll return an empty array and let the UI fall back to the SDK.
      
      console.warn('Zora GraphQL API: Access restricted or requires authentication');
      throw new Error('Zora GraphQL API is not publicly accessible. Using SDK fallback.');
    },
    enabled: false, // Disable this query since the API is not accessible
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: false, // Don't retry since we know it won't work
  });
}; 