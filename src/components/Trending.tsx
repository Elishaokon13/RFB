import React from "react";
import { useTrendingCoins } from "../hooks/useTrendingCoins";
import { Skeleton } from "./ui/skeleton";

export default function Trending() {
  const { coins, loading, error } = useTrendingCoins(20);
  // Limit coins based on screen size to reduce width
  const displayedCoins = coins.slice(
    0,
    window.innerWidth < 640 ? 8 : window.innerWidth < 1024 ? 12 : 16
  );

  if (loading)
    return (
      <div className="w-full max-w-full overflow-x-hidden py-2 bg-muted rounded mx-auto">
        <div className="marquee whitespace-nowrap flex items-center gap-4 sm:gap-6 md:gap-8 px-4">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="flex items-center gap-2 flex-shrink-0">
              <Skeleton className="w-5 h-5 sm:w-6 sm:h-6 rounded-full" />
              <Skeleton className="h-3 w-12 sm:w-16" />
              <Skeleton className="h-3 w-16 sm:w-20 hidden sm:block" />
            </div>
          ))}
        </div>
      </div>
    );
  if (error)
    return (
      <div className="py-4 text-center text-red-500 text-xs">
        Failed to load trending coins
      </div>
    );
  if (!displayedCoins.length)
    return <div className="py-4 text-center">No trending coins found</div>;

  return (
    <div className="w-full max-w-full overflow-x-hidden py-2 bg-muted rounded mx-auto">
      <div
        className="marquee whitespace-nowrap flex items-center gap-4 sm:gap-6 md:gap-8 px-4"
        style={{
          animation: "marquee 30s linear infinite",
          willChange: "transform",
          maxWidth: "80vw",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.animationPlayState = "paused";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.animationPlayState = "running";
        }}
        onTouchStart={(e) => {
          e.currentTarget.style.animationPlayState = "paused";
        }}
        onTouchEnd={(e) => {
          e.currentTarget.style.animationPlayState = "running";
        }}
      >
        {displayedCoins.map((coin) => (
          <div
            key={coin.address}
            className="flex items-center gap-2 flex-shrink-0"
          >
            {coin.mediaContent.previewImage.medium && (
              <img
                src={coin.mediaContent.previewImage.medium}
                alt={coin.symbol}
                className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border"
              />
            )}
            <span className="font-semibold text-foreground text-[10px] sm:text-xs truncate max-w-[60px] sm:max-w-[80px]">
              {coin.symbol}
            </span>
            <span className="text-muted-foreground text-[10px] sm:text-xs truncate max-w-[100px] sm:max-w-[120px] hidden sm:inline">
              {coin.name}
            </span>
          </div>
        ))}
        {/* Duplicate for seamless loop */}
        {displayedCoins.map((coin) => (
          <div
            key={coin.address + "-dup"}
            className="flex items-center gap-2 flex-shrink-0"
          >
            {coin.image && (
              <img
                src={coin.image}
                alt={coin.symbol}
                className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border"
              />
            )}
            <span className="font-semibold text-foreground text-[10px] sm:text-xs truncate max-w-[60px] sm:max-w-[80px]">
              {coin.symbol}
            </span>
            <span className="text-muted-foreground text-[10px] sm:text-xs truncate max-w-[100px] sm:max-w-[120px] hidden sm:inline">
              {coin.name}
            </span>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        .marquee {
          display: inline-flex;
          width: 100%;
          max-width: 100vw;
        }

        @media (max-width: 640px) {
          .marquee {
            animation-duration: 15s; /* Faster for fewer items */
          }
        }

        @media (min-width: 641px) and (max-width: 1024px) {
          .marquee {
            animation-duration: 20s;
          }
        }

        @media (min-width: 1025px) {
          .marquee {
            animation-duration: 25s;
          }
        }
      `}</style>
    </div>
  );
}
