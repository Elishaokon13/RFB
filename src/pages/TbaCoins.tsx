import { useGetTBATokens } from "@/hooks/useGetTBATokens";
import React from "react";

export default function TbaCoins() {
  const { data, loading, error, refresh } = useGetTBATokens();

  console.log("[TBA] Trending tokens:", data, loading);

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Trending Tokens</h2>
        <button
          onClick={refresh}
          className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary"
        >
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="py-2 text-left">Token</th>
              <th className="py-2 text-right">Price</th>
              <th className="py-2 text-right">24h</th>
              <th className="py-2 text-right">Market Cap</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((token) => (
              <tr
                key={token.id}
                className="border-b border-border/50 hover:bg-muted/30"
              >
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    {token.logoURI && (
                      <img
                        src={token.logoURI}
                        alt={token.name}
                        className="w-6 h-6 rounded-full"
                      />
                    )}
                    <div>
                      <div className="font-medium">{token.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {token.symbol}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-3 text-right font-mono">
                  ${token.price?.toFixed(6) || "N/A"}
                </td>
                <td
                  className={`py-3 text-right ${
                    token.priceChange24h && token.priceChange24h > 0
                      ? "text-green-500"
                      : "text-red-500"
                  }`}
                >
                  {/* {formatPriceChange(token.priceChange24h)} */}
                </td>
                <td className="py-3 text-right">
                  {/* {formatMarketCap(token.marketCap)} */}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
