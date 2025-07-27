import { useState, useEffect } from 'react';
import { fetchDefiLlamaPrice, DefiLlamaPrice } from './useDexScreener';

interface TokenPriceData {
  price: number;
  priceChange24h: number;
  symbol?: string;
  confidence?: number;
  loading: boolean;
  error: string | null;
  timestamp?: number;
}

/**
 * Custom hook to fetch the latest price and price change for a token using DefiLlama
 * 
 * @param tokenAddress The token address to get price data for
 * @returns TokenPriceData object containing price, priceChange24h, and loading/error states
 */
export function useTokenPrice(tokenAddress: string | null): TokenPriceData {
  const [priceData, setPriceData] = useState<TokenPriceData>({
    price: 0,
    priceChange24h: 0,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!tokenAddress) return;

    const fetchPriceData = async () => {
      setPriceData(prev => ({ ...prev, loading: true, error: null }));
      
      try {
        console.log(`Fetching price data for ${tokenAddress}`);
        
        // Get current price from DefiLlama
        const llamaPrice = await fetchDefiLlamaPrice('8453', tokenAddress);
        
        if (!llamaPrice || !llamaPrice.price) {
          throw new Error('No price data available');
        }
        
        // We don't have a built-in 24h change from DefiLlama in a single call
        // This would ideally be calculated from historical data
        // For now, we'll use a placeholder of 0 for the change
        const priceChange24h = 0;
        
        setPriceData({
          price: llamaPrice.price,
          priceChange24h,
          symbol: llamaPrice.symbol,
          confidence: llamaPrice.confidence,
          timestamp: llamaPrice.timestamp,
          loading: false,
          error: null,
        });
        
      } catch (err) {
        console.error('Error fetching token price:', err);
        setPriceData(prev => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load price data'
        }));
      }
    };

    fetchPriceData();
  }, [tokenAddress]);

  return priceData;
}

/**
 * Format a token price for display based on its value
 * 
 * @param price The price value to format
 * @returns Formatted price string
 */
export function formatTokenPrice(price: number): string {
  if (price === 0) return '$0.00';
  
  if (price < 0.00001) {
    return `$${price.toExponential(2)}`;
  } else if (price < 0.01) {
    return `$${price.toFixed(6)}`;
  } else if (price < 1) {
    return `$${price.toFixed(4)}`;
  } else if (price < 1000) {
    return `$${price.toFixed(2)}`;
  } else if (price < 1000000) {
    return `$${(price / 1000).toFixed(2)}K`;
  } else if (price < 1000000000) {
    return `$${(price / 1000000).toFixed(2)}M`;
  } else {
    return `$${(price / 1000000000).toFixed(2)}B`;
  }
} 