import { useState, useEffect } from 'react';
import { getCoin } from '@zoralabs/coins-sdk';
import { ComparisonToken, TimeframeOption } from '@/context/ComparisonContext';
import { 
  useDexScreenerTokens, 
  fetchDefiLlamaHistoricalPrices, 
  fetchDefiLlamaPrice,
  DefiLlamaPrice 
} from '@/hooks/useDexScreener';

export interface TokenComparisonData {
  id: string;
  address: string;
  name: string;
  symbol: string;
  image?: string;
  color: string;
  price: {
    current: number;
    change24h: number;
    history: {
      timestamp: number;
      value: number;
    }[];
  };
  marketCap: {
    current: number;
    change24h: number;
    history: {
      timestamp: number;
      value: number;
    }[];
  };
  volume: {
    current: number;
    change24h: number;
    history: {
      timestamp: number;
      value: number;
    }[];
  };
  holders: {
    current: number;
    change24h: number;
  };
  createdAt: string;
  loading: boolean;
  error: string | null;
  // Add GeckoTerminal URL and DefiLlama confidence
  geckoTerminalUrl: string;
  priceConfidence?: number;
}

// Function to convert DefiLlama timestamp (seconds) to milliseconds
const convertTimestamp = (timestamp: number): number => {
  // If timestamp is already in milliseconds (13 digits), return as is
  if (timestamp > 1000000000000) return timestamp;
  // Otherwise convert from seconds to milliseconds
  return timestamp * 1000;
};

// Function to get the appropriate time range and data points based on timeframe
const getTimeframeConfig = (timeframe: TimeframeOption): { 
  timeRange: number; 
  dataPoints: number;
} => {
  switch (timeframe) {
    case '1h':
      return { timeRange: 3600, dataPoints: 12 };  // 5-minute intervals
    case '24h':
      return { timeRange: 86400, dataPoints: 24 }; // 1-hour intervals
    case '7d':
      return { timeRange: 604800, dataPoints: 28 }; // 6-hour intervals
    case '30d':
      return { timeRange: 2592000, dataPoints: 30 }; // 1-day intervals
    case '1y':
      return { timeRange: 31536000, dataPoints: 52 }; // 1-week intervals
    default:
      return { timeRange: 86400, dataPoints: 24 };
  }
};

// Generate GeckoTerminal URL for a token
const getGeckoTerminalUrl = (tokenAddress: string): string => {
  return `https://www.geckoterminal.com/base/tokens/${tokenAddress}`;
};

export function useComparisonTokens(tokens: ComparisonToken[], timeframe: TimeframeOption) {
  const [comparisonData, setComparisonData] = useState<TokenComparisonData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get all token addresses
  const addresses = tokens.map(token => token.address);
  
  // Use existing hooks for price data from DexScreener
  const { 
    tokens: dexScreenerTokens, 
    loading: dexLoading, 
    error: dexError 
  } = useDexScreenerTokens("8453", addresses);
  
  // Get the timeframe configuration
  const { timeRange, dataPoints } = getTimeframeConfig(timeframe);
  
  // Fetch detailed token data
  useEffect(() => {
    const fetchTokenData = async () => {
      if (!tokens.length) {
        setComparisonData([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      
      try {
        // Fetch data for all tokens in parallel
        const tokenDataPromises = tokens.map(async (token) => {
          try {
            // Get basic token data from Zora SDK
            const response = await getCoin({ address: token.address });
            const zoraToken = response.data?.zora20Token;

            if (!zoraToken) {
              throw new Error(`No data found for token ${token.address}`);
            }

            // Find matching DexScreener data
            const dexData = dexScreenerTokens.find(
              (dex) => dex.baseToken?.address?.toLowerCase() === token.address.toLowerCase()
            );

            // Get numerical values, ensuring proper type conversion
            const priceValue = dexData?.priceUsd ? parseFloat(String(dexData.priceUsd)) : 0;
            const volumeValue = dexData?.volume?.h24 ? parseFloat(String(dexData.volume.h24)) : 0;
            const marketCapValue = zoraToken.marketCap ? parseFloat(String(zoraToken.marketCap)) : 0;
            
            // Fetch DefiLlama price data for more accurate historical data
            let priceHistory: { timestamp: number; value: number }[] = [];
            let priceChange24h = dexData?.priceChange?.h24 ? parseFloat(String(dexData.priceChange.h24)) : 0;
            let llamaPriceData: DefiLlamaPrice | null = null;
            
            try {
              // Get current price from DefiLlama
              llamaPriceData = await fetchDefiLlamaPrice('8453', token.address);
              
              // Update price if DefiLlama has data
              if (llamaPriceData?.price) {
                console.log(`DefiLlama price for ${token.symbol}: $${llamaPriceData.price}`);
              }
              
              // Get historical price data from DefiLlama
              const llamaHistoricalData = await fetchDefiLlamaHistoricalPrices(
                '8453', 
                token.address, 
                dataPoints, 
                timeRange
              );
              
              if (llamaHistoricalData) {
                // Convert to our expected format
                priceHistory = llamaHistoricalData.map(point => ({
                  timestamp: convertTimestamp(point.timestamp),
                  value: point.price
                }));
                
                // Calculate price change if we have enough data points
                if (priceHistory.length >= 2) {
                  const oldestPrice = priceHistory[0].value;
                  const newestPrice = priceHistory[priceHistory.length - 1].value;
                  
                  if (oldestPrice > 0) {
                    priceChange24h = ((newestPrice - oldestPrice) / oldestPrice) * 100;
                  }
                }
              } else {
                // Fall back to placeholder data
                priceHistory = generatePlaceholderHistory(
                  llamaPriceData?.price || priceValue, 
                  timeframe
                );
              }
            } catch (err) {
              console.error(`Error fetching DefiLlama data for ${token.address}:`, err);
              // Fall back to placeholder data
              priceHistory = generatePlaceholderHistory(priceValue, timeframe);
            }
            
            // Generate placeholder data for marketCap and volume (we'd replace this with real data if available)
            const marketCapHistory = generatePlaceholderHistory(marketCapValue, timeframe);
            const volumeHistory = generatePlaceholderHistory(volumeValue, timeframe); 

            // Format the comparison data
            return {
              id: zoraToken.id || token.address,
              address: token.address,
              name: zoraToken.name || token.name,
              symbol: zoraToken.symbol || token.symbol,
              image: zoraToken.mediaContent?.previewImage?.small || token.image,
              color: token.color,
              price: {
                current: llamaPriceData?.price || priceValue,
                change24h: priceChange24h,
                history: priceHistory,
              },
              marketCap: {
                current: marketCapValue,
                change24h: zoraToken.marketCapDelta24h ? parseFloat(String(zoraToken.marketCapDelta24h)) : 0,
                history: marketCapHistory,
              },
              volume: {
                current: volumeValue,
                change24h: 0, // Would need historical data to calculate
                history: volumeHistory,
              },
              holders: {
                current: zoraToken.uniqueHolders || 0,
                change24h: 0, // Would need historical data to calculate
              },
              createdAt: zoraToken.createdAt || '',
              loading: false,
              error: null,
              // Add GeckoTerminal URL for easy linking
              geckoTerminalUrl: getGeckoTerminalUrl(token.address),
              // Add DefiLlama confidence score if available
              priceConfidence: llamaPriceData?.confidence
            } as TokenComparisonData;
          } catch (err) {
            console.error(`Error fetching data for ${token.address}:`, err);
            
            // Return a placeholder with error
            return {
              id: token.address,
              address: token.address,
              name: token.name,
              symbol: token.symbol,
              image: token.image,
              color: token.color,
              price: { current: 0, change24h: 0, history: [] },
              marketCap: { current: 0, change24h: 0, history: [] },
              volume: { current: 0, change24h: 0, history: [] },
              holders: { current: 0, change24h: 0 },
              createdAt: '',
              loading: false,
              error: err instanceof Error ? err.message : 'Failed to fetch token data',
              geckoTerminalUrl: getGeckoTerminalUrl(token.address),
              priceConfidence: undefined
            } as TokenComparisonData;
          }
        });
        
        const results = await Promise.all(tokenDataPromises);
        setComparisonData(results);
      } catch (err) {
        console.error('Error in useComparisonTokens:', err);
        setError(err instanceof Error ? err.message : 'An error occurred while fetching comparison data');
      } finally {
        setLoading(false);
      }
    };

    fetchTokenData();
  }, [tokens, timeframe, dexScreenerTokens, dataPoints, timeRange]);

  return {
    data: comparisonData,
    loading: loading || dexLoading,
    error: error || dexError
  };
}

// Helper function to generate placeholder historical data
// In a real implementation, this would be replaced with API calls to get historical data
function generatePlaceholderHistory(currentValue: number, timeframe: TimeframeOption) {
  const now = Date.now();
  const points: { timestamp: number, value: number }[] = [];
  
  let timeRangeMs: number;
  let pointCount: number;
  
  switch (timeframe) {
    case '1h':
      timeRangeMs = 60 * 60 * 1000;
      pointCount = 12; // 5-minute intervals
      break;
    case '24h':
      timeRangeMs = 24 * 60 * 60 * 1000;
      pointCount = 24; // hourly
      break;
    case '7d':
      timeRangeMs = 7 * 24 * 60 * 60 * 1000;
      pointCount = 7; // daily
      break;
    case '30d':
      timeRangeMs = 30 * 24 * 60 * 60 * 1000;
      pointCount = 30; // daily
      break;
    case '1y':
      timeRangeMs = 365 * 24 * 60 * 60 * 1000;
      pointCount = 12; // monthly
      break;
    default:
      timeRangeMs = 24 * 60 * 60 * 1000;
      pointCount = 24;
  }
  
  const variance = currentValue * 0.2; // 20% variance for demonstration
  
  for (let i = 0; i < pointCount; i++) {
    const timestamp = now - (timeRangeMs * (1 - i / pointCount));
    // Generate a random value around the current value with some variance
    const randomFactor = 0.8 + Math.random() * 0.4; // Between 0.8 and 1.2
    const value = currentValue * randomFactor;
    points.push({ timestamp, value });
  }
  
  // Ensure the last point is the current value
  if (points.length > 0) {
    points[points.length - 1].value = currentValue;
  }
  
  return points;
} 