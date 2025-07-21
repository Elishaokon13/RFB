import { RefreshCw } from "lucide-react";
import { cn, truncateAddress } from "@/lib/utils";
import { formatCoinData, Coin } from "@/hooks/useTopVolume24h";
import {
  formatDexScreenerPrice,
  DexScreenerPair,
  calculateFallbackPrice,
} from "@/hooks/useDexScreener";
import { memo, useMemo, useCallback, useRef, useEffect } from "react";
import { Identity } from '@coinbase/onchainkit/identity';
import { Address } from 'viem';
import { Star } from 'lucide-react';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useBasename } from '@/hooks/useBasename';
import React, { useState } from 'react';

// Extend Coin type to include image property for table display
type CoinWithImage = Coin & {
  image?: string;
  mediaContent?: {
    mimeType?: string;
    originalUri?: string;
    previewImage?: {
      small?: string;
      medium?: string;
      blurhash?: string;
    };
  };
  fineAge?: string; // Add this for New Picks fine-grained age
};

// Helper function to calculate age from timestamp
const getAgeFromTimestamp = (timestamp: string) => {
  const now = new Date();
  const created = new Date(timestamp);
  const diffInHours = Math.floor(
    (now.getTime() - created.getTime()) / (1000 * 60 * 60)
  );

  if (diffInHours < 1) return "<1h";
  if (diffInHours < 24) return `${diffInHours}h`;
  const days = Math.floor(diffInHours / 24);
  return `${days}d`;
};

// Deep comparison function for coin data
const areCoinsEqual = (
  prevCoin: CoinWithImage,
  nextCoin: CoinWithImage
) => {
  // Compare core coin properties
  return (
    prevCoin.id === nextCoin.id &&
    prevCoin.symbol === nextCoin.symbol &&
    prevCoin.name === nextCoin.name &&
    prevCoin.address === nextCoin.address &&
    prevCoin.marketCap === nextCoin.marketCap &&
    prevCoin.volume24h === nextCoin.volume24h &&
    prevCoin.marketCapDelta24h === nextCoin.marketCapDelta24h &&
    prevCoin.createdAt === nextCoin.createdAt &&
    prevCoin.uniqueHolders === nextCoin.uniqueHolders
  );
};

// Memoized price cell component with aggressive memoization
const PriceCell = memo(
  ({
    coin,
    dexScreenerData,
  }: {
    coin: CoinWithImage;
    dexScreenerData: Record<string, DexScreenerPair>;
  }) => {
    const priceData = dexScreenerData[coin.address.toLowerCase()];
    if (priceData && priceData.priceUsd) {
      return (
        <div className="text-sm font-medium text-foreground">
          ${parseFloat(priceData.priceUsd).toFixed(6)}
        </div>
      );
    }
    // Fallback: calculate price as market cap / total supply
    const fallbackPrice = calculateFallbackPrice(coin.marketCap, coin.totalSupply);
    return (
      <div className="text-sm font-medium text-foreground">
        {fallbackPrice}
      </div>
    );
  },
  (prevProps, nextProps) => prevProps.coin.address === nextProps.coin.address && prevProps.coin.marketCap === nextProps.coin.marketCap && prevProps.coin.totalSupply === nextProps.coin.totalSupply
);
PriceCell.displayName = "PriceCell";

// Volume and 24h change cells now just show N/A (or fallback if you have another source)
const VolumeCell = memo(({ coin, dexScreenerData }: { coin: CoinWithImage; dexScreenerData: Record<string, DexScreenerPair> }) => {
  const priceData = dexScreenerData[coin.address.toLowerCase()];
  if (priceData && priceData.volume?.h24 !== undefined) {
    return <div className="text-sm text-muted-foreground">{priceData.volume.h24.toLocaleString()}</div>;
  }
  const formattedCoin = formatCoinData(coin);
  return <div className="text-sm text-muted-foreground">{formattedCoin.formattedVolume24h || 'N/A'}</div>;
});
VolumeCell.displayName = "VolumeCell";

const Change24hCell = memo(({ coin }: { coin: CoinWithImage }) => {
  const delta = Number(coin.marketCapDelta24h);
  const cap = Number(coin.marketCap);
  if (!isNaN(delta) && !isNaN(cap) && cap - delta !== 0) {
    const percent = (delta / (cap - delta)) * 100;
    const isPositive = percent >= 0;
    return (
      <span className={cn("font-medium", isPositive ? "text-gain" : "text-loss")}>{isPositive ? '+' : ''}{percent.toFixed(2)}%</span>
    );
  }
  return <span className="text-muted-foreground">N/A</span>;
});
Change24hCell.displayName = "Change24hCell";

// Memoized percentage cell component
const PercentageCell = memo(
  ({ value, cap }: { value: number; cap: string | undefined }) => {
    const isPositive = value > 0;
    const capValue = parseFloat(cap || "0");
    const calcValue = capValue > 0 ? (capValue / value) * 100 : 0;

    return (
      <span
        className={cn("font-medium", isPositive ? "text-gain" : "text-loss")}
      >
        {isPositive ? "+" : ""}
        {calcValue.toFixed(2)}%
      </span>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.value === nextProps.value && prevProps.cap === nextProps.cap
    );
  }
);

PercentageCell.displayName = "PercentageCell";

// Memoized table row component with stable keys and aggressive memoization
const TableRow = memo(
  ({
    coin,
    index,
    onCoinClick,
    dexScreenerData,
    isWatched,
    onToggleWatch,
  }: {
    coin: CoinWithImage;
    index: number;
    onCoinClick: (address: string) => void;
    dexScreenerData: Record<string, DexScreenerPair>;
    isWatched: boolean;
    onToggleWatch: () => void;
  }) => {
    // Log the full coin object for debugging
    const formattedCoin = formatCoinData(coin);
    // Create a stable key for the row based on coin data
    const rowKey = useMemo(() => {
      return `${coin.id}-${coin.marketCap}-${coin.volume24h}`;
    }, [coin.id, coin.marketCap, coin.volume24h]);

    // console.log(coin);
    

    return (
      <tr
        key={rowKey}
        onClick={() => onCoinClick(coin.address)}
        className={cn(
          "border-b border-border hover:bg-muted/50 transition-colors cursor-pointer",
          index % 2 === 0 ? "bg-card" : "bg-background",
          // Add subtle animation for real-time updates
          "animate-pulse-subtle"
        )}
      >
        <td className="px-4 py-3 text-sm text-muted-foreground">
          #{index + 1}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleWatch();
              }}
              className={cn(
                "mr-2 p-1 rounded-full hover:bg-muted transition-colors",
                isWatched ? "text-yellow-500" : "text-muted-foreground"
              )}
              title={isWatched ? "Remove from Watchlist" : "Add to Watchlist"}
            >
              <Star
                fill={isWatched ? "currentColor" : "none"}
                strokeWidth={2}
                className="w-5 h-5"
              />
            </button>
            {/* {coin.mediaContent?.previewImage?.medium ? (
              <CachedImage
                src={coin.mediaContent.previewImage.medium}
                alt={coin.symbol || 'token'}
                className="w-7 h-7 rounded-full border bg-white object-cover"
              />
            ) : coin.image ? (
              <CachedImage
                src={coin.image}
                alt={coin.symbol || 'token'}
                className="w-7 h-7 rounded-full border bg-white object-cover"
              />
            ) : (
              <span className="w-7 h-7 rounded-full bg-gray-200 border flex items-center justify-center text-xs text-gray-400">
                ◎
              </span>
            )} */}
            <div className="">
              <img
                src={coin?.mediaContent?.previewImage?.medium}
                alt=""
                className="w-7 h-7 rounded-full overflow-hidden object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">
                  {coin.symbol}
                </span>
              </div>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <PriceCell coin={coin} dexScreenerData={dexScreenerData} />
        </td>
        <td className="px-4 py-3 text-sm text-muted-foreground">
          {coin.fineAge
            ? coin.fineAge
            : coin.createdAt
            ? getAgeFromTimestamp(coin.createdAt)
            : "N/A"}
        </td>
        <td className="px-4 py-3">
          <VolumeCell coin={coin} dexScreenerData={dexScreenerData} />
        </td>
        <td className="px-4 py-3">
          <Change24hCell coin={coin} />
        </td>
        <td className="px-4 py-3 text-sm text-muted-foreground">
          {formattedCoin.formattedMarketCap}
        </td>
        <td className="px-4 py-3 text-sm text-muted-foreground">
          <CreatorCell creatorAddress={coin.creatorAddress} />
        </td>
      </tr>
    );
  },
  (prevProps, nextProps) => {
    // Deep comparison for the entire row
    return prevProps.index === nextProps.index && prevProps.coin.address === nextProps.coin.address;
  }
);

TableRow.displayName = "TableRow";

// Memoized creator cell component for Basename resolution
const truncateMiddle = (address: string) => {
  if (!address) return '';
  return address.length > 10 ? `${address.slice(0, 6)}...${address.slice(-4)}` : address;
};
const CreatorCell = memo(({ creatorAddress }: { creatorAddress?: string }) => {
  const { basename, loading, error } = useBasename(creatorAddress as `0x${string}`);
  // Log the full Basename object for debugging
  // console.log('[TokenDataTable] Basename:', { address: creatorAddress, basename, loading, error });
  if (!creatorAddress) return <span>N/A</span>;
  if (loading) return <span>Resolving...</span>;
  if (basename) return <span>{basename}</span>;
  if (error) return <span title={error}>{truncateMiddle(creatorAddress)}</span>;
  return <span>{truncateMiddle(creatorAddress)}</span>;
});
CreatorCell.displayName = 'CreatorCell';

interface TokenDataTableProps {
  coins: CoinWithImage[];
  dexScreenerData: Record<string, DexScreenerPair>;
  currentPage: number;
  loading: boolean;
  pageInfo?: {
    endCursor?: string;
    hasNextPage?: boolean;
  } | null;
  onCoinClick: (address: string) => void;
  onLoadNextPage: () => void;
  onGoToPage: (page: number) => void;
  showPagination?: boolean;
  itemsPerPage?: number;
  walletAddress?: string;
}

export function TokenDataTable({
  coins,
  dexScreenerData,
  currentPage,
  loading,
  pageInfo,
  onCoinClick,
  onLoadNextPage,
  onGoToPage,
  showPagination = true,
  itemsPerPage = 20,
  walletAddress,
}: TokenDataTableProps) {
  const { watchlist, addToWatchlist, removeFromWatchlist, isInWatchlist } = useWatchlist(walletAddress);
  // Memoize the click handler to prevent unnecessary re-renders
  const handleCoinClick = useCallback(
    (address: string) => {
      onCoinClick(address);
    },
    [onCoinClick]
  );

  // Memoize the table body with stable keys to prevent unnecessary re-renders
  const tableBody = useMemo(() => {
    return coins.map((coin, index) => (
      <TableRow
        key={`${coin.id}-${coin.address}`}
        coin={coin}
        index={index}
        dexScreenerData={dexScreenerData}
        onCoinClick={handleCoinClick}
        isWatched={isInWatchlist(coin.address)}
        onToggleWatch={() => {
          if (isInWatchlist(coin.address)) removeFromWatchlist(coin.address);
          else addToWatchlist(coin.address);
        }}
      />
    ));
  }, [coins, dexScreenerData, handleCoinClick, isInWatchlist, addToWatchlist, removeFromWatchlist]);

  if (coins.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Loading coins...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-x-auto sm:overflow-x-visible">
      <table className="min-w-full w-full max-w-full">
        <thead className="bg-muted border-b border-border">
          <tr className="text-left">
            <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              #
            </th>
            <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              TOKEN
            </th>
            <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              PRICE
            </th>
            <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              AGE
            </th>
            <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              VOLUME
            </th>
            <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              24H
            </th>
            <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              MCAP
            </th>
            <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Creator
            </th>
          </tr>
        </thead>
        <tbody>
          {tableBody}
        </tbody>
      </table>

      {/* Pagination Controls */}
      {showPagination && (
        <div className="flex items-center justify-between p-4 border-t border-border">
          <div className="text-sm text-muted-foreground">
            Page {currentPage} - Showing {coins.length} coins
          </div>
          <div className="flex items-center gap-2">
            {/* Previous Page */}
            {currentPage > 1 && (
              <button
                onClick={() => onGoToPage(currentPage - 1)}
                disabled={loading}
                className="px-3 py-1 bg-muted text-muted-foreground rounded-md text-sm font-medium hover:bg-muted/80 disabled:opacity-50"
              >
                Previous
              </button>
            )}

            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(currentPage + 2, 5) }, (_, i) => {
                const pageNum = i + 1;
                if (pageNum <= currentPage) {
                  return (
                    <button
                      key={pageNum}
                      onClick={() => onGoToPage(pageNum)}
                      disabled={loading}
                      className={cn(
                        "px-3 py-1 rounded-md text-sm font-medium transition-colors",
                        pageNum === currentPage
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                }
                return null;
              })}
            </div>

            {/* Next Page */}
            {pageInfo?.hasNextPage && (
              <button
                onClick={onLoadNextPage}
                disabled={loading}
                className="px-3 py-1 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? (
                  <div className="flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Loading
                  </div>
                ) : (
                  "Next"
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export { CreatorsTable } from './TokenTable';

// Simple in-memory cache for loaded images
const imageCache = new Map<string, string>();

function CachedImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [imgSrc, setImgSrc] = useState(() => {
    if (src && imageCache.has(src)) return imageCache.get(src)!;
    return src;
  });
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <span className="w-7 h-7 rounded-full bg-gray-200 border flex items-center justify-center text-xs text-gray-400">
        ◎
      </span>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      onLoad={() => {
        if (src && !imageCache.has(src)) imageCache.set(src, src);
      }}
      onError={() => setError(true)}
      loading="lazy"
      crossOrigin="anonymous"
      style={{ background: '#fff' }}
    />
  );
}
