import { useQuery } from "@tanstack/react-query";

interface TokenPriceData {
  price: number;
  priceChange24h: number;
}

export const useTokenPrice = (tokenAddress: string | null) => {
  return useQuery({
    queryKey: ["token-price", tokenAddress],
    queryFn: async (): Promise<TokenPriceData | null> => {
      if (!tokenAddress) return null;

      try {
        // GeckoTerminal API endpoint for Base network
        const response = await fetch(
          `https://api.geckoterminal.com/api/v2/networks/base/tokens/${tokenAddress}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch token price: ${response.status}`);
        }

        const data = await response.json();
        const tokenData = data.data?.attributes;

        if (!tokenData) {
          throw new Error("Token price data not found");
        }

        return {
          price: parseFloat(tokenData.price_usd || '0'),
          priceChange24h: parseFloat(tokenData.price_change_percentage?.h24 || '0'),
        };
      } catch (error) {
        console.error("Error fetching token price:", error);
        return { price: 0, priceChange24h: 0 };
      }
    },
    enabled: !!tokenAddress,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    refetchInterval: 30 * 1000, // Refresh every 30 seconds
  });
}; 