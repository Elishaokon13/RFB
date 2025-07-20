import {
  getCoinsTopGainers,
  getCoinsTopVolume24h,
  getCoinsNew,
  getCoinsMostValuable,
} from "@zoralabs/coins-sdk";
import { useEffect, useState } from "react";

/**
 * useTrendingCoins - React hook to fetch and rank trending coins using multiple signals from @zoralabs/coins-sdk.
 *
 * This hook combines data from several endpoints (top gainers, top volume, new coins, most valuable) and computes a
 * custom trending score for each coin based on:
 *   - Market cap delta (24h) — fast risers
 *   - 24h volume — liquidity/interest
 *   - Unique holders — actual adoption
 *
 * The trending score formula is:
 *   Trending Score = (MarketCapDelta24h * capDeltaWeight) + (Volume24h * volumeWeight) + (UniqueHolders * holdersWeight)
 *
 * Default weights:
 *   capDelta: 1.5
 *   volume: 0.001
 *   holders: 2
 *
 * The hook deduplicates coins by address, scores, sorts, and returns the top N trending coins.
 *
 * @param {number} limit - The maximum number of trending coins to return (default: 20)
 * @returns {object} { coins, loading, error }
 *
 * @example
 *   const { coins, loading, error } = useTrendingCoins();
 *   if (loading) return <Spinner />;
 *   return coins.map(coin => <CoinCard key={coin.address} coin={coin} />);
 */

// Trending score weights
const WEIGHTS = {
  capDelta: 1.5,
  volume: 0.001,
  holders: 2,
};

// Coin type (partial, for trending)
export interface TrendingCoin {
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
  score: number;
}

export function useTrendingCoins(limit = 20) {
  const [coins, setCoins] = useState<TrendingCoin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchTrending() {
      setLoading(true);
      setError(null);
      try {
        // Fetch from multiple sources
        const [gainers, volume, newCoins, valuable] = await Promise.all([
          getCoinsTopGainers({ count: limit }),
          getCoinsTopVolume24h({ count: limit }),
          getCoinsNew({ count: limit }),
          getCoinsMostValuable({ count: limit }),
        ]);

        // Flatten data (use Partial<TrendingCoin> for node type)
        const combined: Partial<TrendingCoin>[] = [
          ...(gainers.data?.exploreList?.edges || []),
          ...(volume.data?.exploreList?.edges || []),
          ...(newCoins.data?.exploreList?.edges || []),
          ...(valuable.data?.exploreList?.edges || []),
        ].map((edge: { node: unknown }) => edge.node as Partial<TrendingCoin>);

        // Deduplicate by address
        const map = new Map<string, Partial<TrendingCoin>>();
        combined.forEach((coin) => {
          if (coin?.address) map.set(coin.address, coin);
        });
        const uniqueCoins = Array.from(map.values());

        // Score coins
        const scored: TrendingCoin[] = uniqueCoins.map((coin) => {
          const delta = parseFloat(coin.marketCapDelta24h || "0");
          const volume = parseFloat(coin.volume24h || "0");
          const holders = Number(coin.uniqueHolders || 0);
          const score =
            (delta * WEIGHTS.capDelta) +
            (volume * WEIGHTS.volume) +
            (holders * WEIGHTS.holders);
          return { ...coin, score } as TrendingCoin;
        });

        // Sort by trending score
        scored.sort((a, b) => b.score - a.score);

        if (!cancelled) {
          setCoins(scored.slice(0, limit));
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch trending coins');
          setCoins([]);
          setLoading(false);
        }
      }
    }
    fetchTrending();
    return () => { cancelled = true; };
  }, [limit]);

  return { coins, loading, error };
} 