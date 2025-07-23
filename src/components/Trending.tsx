import React from "react";
import { useTrendingCoins } from "../hooks/useTrendingCoins";
import { Skeleton } from "./ui/skeleton";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function Trending() {
  const { coins, loading, error } = useTrendingCoins(20);
  // Limit coins based on screen size to reduce width
  const displayedCoins = coins.slice(
    0,
    window.innerWidth < 640 ? 8 : window.innerWidth < 1024 ? 12 : 16
  );

  // Helper function to truncate text
  const truncateText = (text?: string, maxLength: number = 6) => {
    if (!text) return "";
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
  };

  // Helper function to calculate price from market cap and total supply
  const calculatePrice = (marketCap?: string, totalSupply?: string) => {
    if (!marketCap || !totalSupply) return "N/A";
    const cap = parseFloat(marketCap);
    const supply = parseFloat(totalSupply);
    if (isNaN(cap) || isNaN(supply) || supply === 0) return "N/A";
    return (cap / supply).toFixed(6);
  };

  // Helper function to format percentage with abbreviations
  const formatPercentage = (value: number): string => {
    const absValue = Math.abs(value);
    if (absValue >= 1000000) {
      return `${(value / 1000000).toFixed(1)}m`;
    } else if (absValue >= 1000) {
      return `${(value / 1000).toFixed(1)}k`;
    } else {
      return value.toFixed(2);
    }
  };

  // Helper function to format percentage change
  const formatPercentageChange = (marketCapDelta24h?: string, marketCap?: string) => {
    if (!marketCapDelta24h || !marketCap) return "N/A";
    const delta = parseFloat(marketCapDelta24h);
    const cap = parseFloat(marketCap);
    if (isNaN(delta) || isNaN(cap) || cap - delta === 0) return "N/A";
    const percentage = (delta / (cap - delta)) * 100;
    return `${percentage >= 0 ? "+" : ""}${formatPercentage(percentage)}%`;
  };

  // Helper function to get change color
  const getChangeColor = (marketCapDelta24h?: string, marketCap?: string) => {
    if (!marketCapDelta24h || !marketCap) return "text-muted-foreground";
    const delta = parseFloat(marketCapDelta24h);
    const cap = parseFloat(marketCap);
    if (isNaN(delta) || isNaN(cap) || cap - delta === 0) return "text-muted-foreground";
    const percentage = (delta / (cap - delta)) * 100;
    return percentage >= 0 ? "text-green-600" : "text-red-600";
  };

  if (loading)
    return (
      <div className="w-full max-w-full overflow-x-hidden py-2 bg-muted rounded mx-auto">
        <div className="marquee whitespace-nowrap flex items-center gap-4 sm:gap-6 md:gap-8 px-4">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 flex-shrink-0 bg-primary/30 dark:bg-purple-900/20 px-4 py-2 rounded-lg">
              <Skeleton className="w-6 h-6 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-2 w-12" />
              </div>
              <div className="text-right space-y-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-2 w-12" />
              </div>
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
            className="flex items-center gap-3 flex-shrink-0 bg-primary/30 dark:bg-purple-900/20 px-4 py-2 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/30 transition-colors cursor-pointer"
          >
            {/* Image */}
            <div className="flex-shrink-0">
              {coin.mediaContent?.previewImage?.medium ? (
                <img
                  src={coin.mediaContent.previewImage.medium}
                  alt={coin.symbol}
                  className="w-10 h-10 rounded-md  dark:border-gray-700"
                />
              ) : coin.image ? (
                <img
                  src={coin.image}
                  alt={coin.symbol}
                  className="w-10 h-10 rounded-md  dark:border-gray-700"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-primary dark:bg-purple-800 flex items-center justify-center">
                  <span className="text-xs font-bold text-purple-600 dark:text-purple-300">
                    {coin.symbol?.charAt(0) || "?"}
                  </span>
                </div>
              )}
            </div>

            {/* Name and Symbol */}
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-foreground text-xs truncate max-w-[60px] sm:max-w-[80px]">
                {truncateText(coin.symbol, 6)}
              </span>
              <span className="text-muted-foreground text-[10px] truncate max-w-[60px] sm:max-w-[80px]">
                {truncateText(coin.name, 8)}
              </span>
            </div>

            {/* Price and Change */}
            <div className="flex flex-col items-end text-right min-w-0">
              <span className="font-medium text-foreground text-xs">
                ${calculatePrice(coin.marketCap, coin.totalSupply)}
              </span>
              <div className={`flex items-center gap-1 text-[10px] ${getChangeColor(coin.marketCapDelta24h, coin.marketCap)}`}>
                {coin.marketCapDelta24h && coin.marketCap && (
                  <>
                    {parseFloat(coin.marketCapDelta24h) >= 0 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    <span>{formatPercentageChange(coin.marketCapDelta24h, coin.marketCap)}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        {/* Duplicate for seamless loop */}
        {displayedCoins.map((coin) => (
          <div
            key={coin.address + "-dup"}
            className="flex items-center gap-3 flex-shrink-0 bg-primary/30 dark:bg-purple-900/20 px-4 py-2 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/30 transition-colors cursor-pointer"
          >
            {/* Image */}
            <div className="flex-shrink-0">
              {coin.mediaContent?.previewImage?.medium ? (
                <img
                  src={coin.mediaContent.previewImage.medium}
                  alt={coin.symbol}
                  className="w-10 h-10 rounded-md  dark:border-gray-700"
                />
              ) : coin.image ? (
                <img
                  src={coin.image}
                  alt={coin.symbol}
                  className="w-10 h-10 rounded-md  dark:border-gray-700"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-primary dark:bg-purple-800 flex items-center justify-center">
                  <span className="text-xs font-bold text-purple-600 dark:text-purple-300">
                    {coin.symbol?.charAt(0) || "?"}
                  </span>
                </div>
              )}
            </div>

            {/* Name and Symbol */}
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-foreground text-xs truncate max-w-[60px] sm:max-w-[80px]">
                {truncateText(coin.symbol, 6)}
              </span>
              <span className="text-muted-foreground text-[10px] truncate max-w-[60px] sm:max-w-[80px]">
                {truncateText(coin.name, 8)}
              </span>
            </div>

            {/* Price and Change */}
            <div className="flex flex-col items-end text-right min-w-0">
              <span className="font-medium text-foreground text-xs">
                ${calculatePrice(coin.marketCap, coin.totalSupply)}
              </span>
              <div className={`flex items-center gap-1 text-[10px] ${getChangeColor(coin.marketCapDelta24h, coin.marketCap)}`}>
                {coin.marketCapDelta24h && coin.marketCap && (
                  <>
                    {parseFloat(coin.marketCapDelta24h) >= 0 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    <span>{formatPercentageChange(coin.marketCapDelta24h, coin.marketCap)}</span>
                  </>
                )}
              </div>
            </div>
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
            animation-duration: 20s; /* Slightly slower for better readability */
          }
        }

        @media (min-width: 641px) and (max-width: 1024px) {
          .marquee {
            animation-duration: 25s;
          }
        }

        @media (min-width: 1025px) {
          .marquee {
            animation-duration: 30s;
          }
        }
      `}</style>
    </div>
  );
}
