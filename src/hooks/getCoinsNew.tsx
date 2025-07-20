import { useState, useEffect, useCallback } from 'react';
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

export interface PageInfo {
  endCursor?: string;
  hasNextPage?: boolean;
}

export function useGetCoinsNew(params: { count?: number; after?: string }) {
  const { count = 20, after } = params;
  const [coins, setCoins] = useState<NewCoin[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);

  const fetchCoins = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getCoinsNew({ count, after });
      console.log('getCoinsNew raw response:', response);
      const edges = response.data?.exploreList?.edges || [];
      const tokens = edges.map((edge: { node: NewCoin }) => edge.node);
      setCoins(tokens);
      setPageInfo(response.data?.exploreList?.pageInfo || null);
    } catch (err: unknown) {
      setError(typeof err === 'string' ? err : (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [count, after]);

  useEffect(() => {
    fetchCoins();
  }, [fetchCoins]);

  return { coins, loading, error, pageInfo, refetch: fetchCoins };
} 