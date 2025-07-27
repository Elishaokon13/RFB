import { useQuery } from "@tanstack/react-query";

interface TokenPriceData {
  price: number;
  priceChange24h: number;
}

export const useBulkTokenPrices = (tokenAddresses: string[]) => {
  return useQuery({
    queryKey: ["bulk-token-prices", tokenAddresses.sort().join(",")],
    queryFn: async (): Promise<Record<string, TokenPriceData>> => {
      if (!tokenAddresses.length) return {};

      const results: Record<string, TokenPriceData> = {};
      
      // GeckoTerminal bulk endpoint supports up to 30 addresses at once
      const chunks = [];
      for (let i = 0; i < tokenAddresses.length; i += 30) {
        chunks.push(tokenAddresses.slice(i, i + 30));
      }

      for (const chunk of chunks) {
        try {
          const addressList = chunk.join(",");
          const response = await fetch(
            `https://api.geckoterminal.com/api/v2/networks/base/tokens/multi/${addressList}`
          );

          if (response.ok) {
            const data = await response.json();
            
            Object.entries(data.data || {}).forEach(([address, tokenData]: [string, any]) => {
              const attributes = tokenData.attributes;
              if (attributes) {
                results[address.toLowerCase()] = {
                  price: parseFloat(attributes.price_usd || '0'),
                  priceChange24h: parseFloat(attributes.price_change_percentage?.h24 || '0'),
                };
              }
            });
          }
        } catch (error) {
          console.warn("Error fetching bulk token prices:", error);
        }
      }

      return results;
    },
    enabled: tokenAddresses.length > 0,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}; 