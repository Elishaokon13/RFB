import { useState, useEffect } from 'react';

// DexScreener API types
export interface DexScreenerPair {
  chainId?: string;
  dexId?: string;
  url?: string;
  pairAddress?: string;
  baseToken?: {
    address?: string;
    name?: string;
    symbol?: string;
  };
  quoteToken?: {
    symbol?: string;
  };
  priceNative?: string;
  priceUsd?: string;
  txns?: {
    h1?: {
      buys?: number;
      sells?: number;
    };
    h24?: {
      buys?: number;
      sells?: number;
    };
  };
  volume?: {
    h24?: number;
    h6?: number;
    h1?: number;
  };
  priceChange?: {
    m5?: number;
    h1?: number;
    h6?: number;
    h24?: number;
  };
  liquidity?: {
    usd?: number;
    base?: number;
    quote?: number;
  };
  fdv?: number;
  marketCap?: number;
  pairCreatedAt?: number;
  info?: {
    imageUrl?: string;
    websites?: { url: string }[];
    socials?: { platform: string; handle: string }[];
  };
  boosts?: {
    active?: number;
  };
}

// Utility function to format price data
export const formatDexScreenerPrice = (priceData: DexScreenerPair | null) => {
  if (!priceData) {
    return {
      priceUsd: 'N/A',
      priceChange24h: 'N/A',
      volume24h: 'N/A',
      liquidity: 'N/A',
      fdv: 'N/A',
    };
  }

  const formatNumber = (value: number | undefined) => {
    if (value === undefined || isNaN(value)) return 'N/A';
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const formatPercentage = (value: number | undefined) => {
    if (value === undefined || isNaN(value)) return 'N/A';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  return {
    priceUsd: priceData.priceUsd ? `$${parseFloat(priceData.priceUsd).toFixed(6)}` : 'N/A',
    priceChange24h: formatPercentage(priceData.priceChange?.h24),
    volume24h: formatNumber(priceData.volume?.h24),
    liquidity: formatNumber(priceData.liquidity?.usd),
    fdv: formatNumber(priceData.fdv),
  };
};

// Utility function to calculate fallback price (market cap / total supply)
export function calculateFallbackPrice(marketCap?: string, totalSupply?: string): string {
  if (!marketCap || !totalSupply) return 'N/A';
  const cap = parseFloat(marketCap);
  const supply = parseFloat(totalSupply);
  if (isNaN(cap) || isNaN(supply) || supply === 0) return 'N/A';
  const price = cap / supply;
  if (!isFinite(price)) return 'N/A';
  if (price < 0.000001) return `$${price.toExponential(2)}`;
  if (price < 0.01) return `$${price.toFixed(6)}`;
  if (price < 1) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(2)}`;
}

/**
 * Fetches token details (including price, volume, etc.) for up to 60 tokens on a given chain from DexScreener API.
 * Uses the /tokens/v1/{chainId}/{tokenAddresses} endpoint. Rate limit: 60 requests per minute.
 * @param chainId The chain ID (e.g., '8453' for Base)
 * @param tokenAddresses Array of token addresses (max 60 per request)
 * @returns Array of DexScreenerPair objects
 * @see https://docs.dexscreener.com/api/reference
 */
export async function fetchDexScreenerTokens(chainId: string, tokenAddresses: string[]): Promise<DexScreenerPair[]> {
  if (tokenAddresses.length === 0) return [];
  // DexScreener API allows up to 60 addresses per request
  const addressesParam = tokenAddresses.slice(0, 60).join(',');
  const url = `https://api.dexscreener.com/tokens/v1/${chainId}/${addressesParam}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`DexScreener API error: ${response.status}`);
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

/**
 * React hook to fetch token details (including price, volume, etc.) for up to 60 tokens on a given chain from DexScreener API.
 * @param chainId The chain ID (e.g., '8453' for Base)
 * @param tokenAddresses Array of token addresses (max 60 per request)
 * @returns { tokens, loading, error }
 */
export function useDexScreenerTokens(chainId: string, tokenAddresses: string) {
  const [tokens, setTokens] = useState<DexScreenerPair[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchTokens() {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchDexScreenerTokens(chainId, tokenAddresses);
        if (!cancelled) setTokens(result);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (tokenAddresses.length > 0) fetchTokens();
    else setTokens([]);
    return () => {
      cancelled = true;
    };
  }, [chainId, tokenAddresses]);

  return { tokens, loading, error };
} 