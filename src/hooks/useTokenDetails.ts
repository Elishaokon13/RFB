import { useQuery } from "@tanstack/react-query";
import { getCoin } from "@zoralabs/coins-sdk";
import { base } from "viem/chains";

export interface TokenDetails {
  id: string;
  name: string;
  description: string;
  address: string;
  symbol: string;
  totalSupply: string;
  totalVolume: string;
  volume24h: string;
  marketCap: string;
  createdAt?: string;
  creatorAddress?: string;
  uniqueHolders?: number;
  mediaContent?: {
    previewImage?: {
      small?: string;
      medium?: string;
      blurhash?: string;
    };
  };
  zoraComments: {
    pageInfo: {
      endCursor?: string;
      hasNextPage: boolean;
    };
    count: number;
    edges: Array<{
      node: {
        txHash: string;
        comment: string;
        userAddress: string;
        timestamp: number;
        userProfile?: {
          id: string;
          handle: string;
          avatar?: {
            previewImage: {
              blurhash?: string;
              small: string;
              medium: string;
            };
          };
        };
      };
    }>;
  };
}

export const useTokenDetails = (tokenAddress: string | null) => {
  return useQuery({
    queryKey: ["token-details", tokenAddress],
    queryFn: async (): Promise<TokenDetails | null> => {
      if (!tokenAddress) return null;

      try {
        const response = await getCoin({
          address: tokenAddress,
          chain: base.id, // Base chain
        });

        const token = response.data?.zora20Token;
        
        if (!token) {
          throw new Error("Token not found");
        }

        return token as TokenDetails;
      } catch (error) {
        console.error("Error fetching token details:", error);
        throw error;
      }
    },
    enabled: !!tokenAddress,
    staleTime: 30 * 1000, // 30 seconds - reduced for more frequent updates
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    refetchInterval: 60 * 1000, // Auto-refresh every 60 seconds
    refetchIntervalInBackground: true, // Continue refreshing even when tab is not active
  });
};

// Helper function to calculate creator earnings
export const calculateCreatorEarnings = (token: TokenDetails | null): number => {
  if (!token) return 0;
  
  // Use actual creator earnings calculation based on token data
  // This should be based on the actual protocol fees and creator rewards
  const totalVolumeNum = parseFloat(token.totalVolume) || 0;
  return totalVolumeNum * 0.025; // 2.5% creator earnings assumption
};

// Helper function to format large numbers
export const formatTokenValue = (value: string | number): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) return '0';
  
  if (num >= 1e9) {
    return `${(num / 1e9).toFixed(2)}B`;
  } else if (num >= 1e6) {
    return `${(num / 1e6).toFixed(2)}M`;
  } else if (num >= 1e3) {
    return `${(num / 1e3).toFixed(2)}K`;
  }
  
  return num.toFixed(2);
}; 