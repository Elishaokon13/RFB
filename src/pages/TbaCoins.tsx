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
        
        </table>
      </div>
    </div>
  );
}
