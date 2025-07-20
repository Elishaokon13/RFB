import React from "react";
import { useTrendingCoins } from "../hooks/useTrendingCoins";

export default function Trending() {
  const { coins, loading, error } = useTrendingCoins(20);

  if (loading)
    return <div className="py-4 text-center">Loading trending coins...</div>;
  if (error)
    return (
      <div className="py-4 text-center text-red-500">
        Failed to load trending coins
      </div>
    );
  if (!coins.length)
    return <div className="py-4 text-center">No trending coins found</div>;

  return (
    <div className="w-full overflow-hidden py-2 bg-muted rounded">
      <div
        className="marquee whitespace-nowrap flex items-center gap-8 px-4"
        style={{
          animation: "marquee 30s linear infinite",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.animationPlayState = "paused";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.animationPlayState = "running";
        }}
      >
        {coins.map((coin) => (
          <div key={coin.address} className="flex items-center gap-2 min-w-max">
            {coin.image && (
              <img
                src={coin.image}
                alt={coin.symbol}
                className="w-6 h-6 rounded-full border"
              />
            )}
            <span className="font-semibold text-foreground text-xs">{coin.symbol}</span>
            <span className="text-muted-foreground text-xs">{coin.name}</span>
          </div>
        ))}
        {/* Duplicate for seamless loop */}
        {coins.map((coin) => (
          <div
            key={coin.address + "-dup"}
            className="flex items-center gap-2 min-w-max"
          >
            {coin.image && (
              <img
                src={coin.image}
                alt={coin.symbol}
                className="w-6 h-6 rounded-full border"
              />
            )}
            <span className="font-semibold text-foreground text-xs">{coin.symbol}</span>
            <span className="text-muted-foreground text-xs">{coin.name}</span>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
