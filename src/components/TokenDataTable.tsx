import { RefreshCw } from "lucide-react";
import { cn, truncateAddress } from "@/lib/utils";
import { formatCoinData, Coin } from "@/hooks/useTopVolume24h";
import moment from "moment";
import { formatVolumeCompact, formatMarketCapCompact } from "@/lib/formatNumber";
import {
  formatDexScreenerPrice,
  DexScreenerPair,
  calculateFallbackPrice,
} from "@/hooks/useDexScreener";
import { memo, useMemo, useCallback, useRef, useEffect, useState } from "react";
import { Identity } from "@coinbase/onchainkit/identity";
import { Address } from "viem";
import { Star } from "lucide-react";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useBasename } from "@/hooks/useBasename";
import {
  TableSkeleton,
  TokenTableRowSkeleton,
  TableHeaderSkeleton,
} from "@/components/TableSkeleton";
import { FollowerPointerCard } from "@/components/ui/following-pointer";
import { useZoraProfile, getProfileImageSmall } from "@/hooks/useZoraProfile";
import { Copy } from "lucide-react";
import { CoinWithImage } from "./TokenTable";
import { useNotifications } from "./Header";
import { useToast } from "@/components/ui/use-toast";
import { useTokenDetails } from "@/hooks/useTokenDetails";

// Remove the conflicting CoinWithImage type definition and use the imported one from TokenTable

// Real-time age component that updates every second
const RealTimeAge = memo(({ createdAt }: { createdAt?: string }) => {
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    if (!createdAt) return;

    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [createdAt]);

  if (!createdAt) return <span>N/A</span>;

  const created = new Date(createdAt);
  const diffMs = currentTime - created.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffMs / (1000 * 60));
  const diffHour = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);
  const diffYears = Math.floor(diffDays / 365);

  // Debug logging
  console.log("RealTimeAge:", {
    createdAt,
    currentTime,
    diffMs,
    diffSec,
    diffMin,
    diffHour,
  });

  if (diffSec < 60) return <span>{diffSec}s</span>;
  if (diffMin < 60) return <span>{diffMin}m</span>;
  if (diffHour < 24) return <span>{diffHour}h</span>;
  if (diffDays < 7) return <span>{diffDays}d</span>;
  if (diffWeeks < 52) return <span>{diffWeeks}w</span>;
  return <span>{diffYears}y</span>;
});

RealTimeAge.displayName = "RealTimeAge";

// Helper function to calculate age from timestamp
const getAgeFromTimestamp = (timestamp: string) => {
  const now = new Date();
  const created = new Date(timestamp);
  const diffInMs = now.getTime() - created.getTime();
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  const diffInWeeks = Math.floor(diffInDays / 7);
  const diffInYears = Math.floor(diffInDays / 365);

  if (diffInHours < 1) return "<1h";
  if (diffInHours < 24) return `${diffInHours}h`;
  if (diffInDays < 7) return `${diffInDays}d`;
  if (diffInWeeks < 52) return `${diffInWeeks}w`;
  return `${diffInYears}y`;
};

// Deep comparison function for coin data
const areCoinsEqual = (prevCoin: CoinWithImage, nextCoin: CoinWithImage) => {
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
    const price =
      priceData && priceData.priceUsd
        ? `$${parseFloat(priceData.priceUsd).toFixed(6)}`
        : calculateFallbackPrice(coin.marketCap, coin.totalSupply);

    // Calculate percentage change
    const delta = Number(coin.marketCapDelta24h);
    const cap = Number(coin.marketCap);
    let percentageChange = null;
    if (!isNaN(delta) && !isNaN(cap) && cap - delta !== 0) {
      const percent = (delta / (cap - delta)) * 100;
      percentageChange = {
        value: percent,
        isPositive: percent >= 0,
      };
    }

    return (
      <div className="space-y-1">
        <div className="text-sm font-medium text-foreground">{price}</div>
        {percentageChange ? (
          <div
            className={cn(
              "text-xs font-medium",
              percentageChange.isPositive ? "text-gain" : "text-loss"
            )}
          >
            {percentageChange.isPositive ? "+" : ""}
            {formatPercentage(percentageChange.value)}%
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">N/A</div>
        )}
      </div>
    );
  },
  (prevProps, nextProps) =>
    prevProps.coin.address === nextProps.coin.address &&
    prevProps.coin.marketCap === nextProps.coin.marketCap &&
    prevProps.coin.totalSupply === nextProps.coin.totalSupply &&
    prevProps.coin.marketCapDelta24h === nextProps.coin.marketCapDelta24h
);
PriceCell.displayName = "PriceCell";

// Volume and 24h change cells now just show N/A (or fallback if you have another source)
const VolumeCell = memo(
  ({
    coin,
    dexScreenerData,
  }: {
    coin: CoinWithImage;
    dexScreenerData: Record<string, DexScreenerPair>;
  }) => {
    const priceData = dexScreenerData[coin.address.toLowerCase()];
    if (priceData && priceData.volume?.h24 !== undefined) {
      return (
        <div className="text-sm text-black dark:text-white">
          {formatVolumeCompact(priceData.volume.h24)}
        </div>
      );
    }
    const formattedCoin = formatCoinData(coin);
    return (
      <div className="text-sm text-black dark:text-white">
        {formatVolumeCompact(formattedCoin.volume24h) || "N/A"}
      </div>
    );
  }
);
VolumeCell.displayName = "VolumeCell";

const Change24hCell = memo(({ coin }: { coin: CoinWithImage }) => {
  const delta = Number(coin.marketCapDelta24h);
  const cap = Number(coin.marketCap);
  if (!isNaN(delta) && !isNaN(cap) && cap - delta !== 0) {
    const percent = (delta / (cap - delta)) * 100;
    const isPositive = percent >= 0;
    return (
      <span
        className={cn("font-medium", isPositive ? "text-gain" : "text-loss")}
      >
        {isPositive ? "+" : ""}
        {formatPercentage(percent)}%
      </span>
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
        {formatPercentage(calcValue)}%
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
    activeFilter,
    isPinned = false,
  }: {
    coin: CoinWithImage;
    index: number;
    onCoinClick: (address: string) => void;
    dexScreenerData: Record<string, DexScreenerPair>;
    isWatched: boolean;
    onToggleWatch: () => void;
    activeFilter?: string;
    isPinned?: boolean;
  }) => {
    // Log the full coin object for debugging
    const formattedCoin = formatCoinData(coin);
    // Create a stable key for the row based on coin data
    const rowKey = useMemo(() => {
      return `${coin.id}-${coin.marketCap}-${coin.volume24h}`;
    }, [coin.id, coin.marketCap, coin.volume24h]);

    // Get creator profile for the pointer
    const { profile } = useZoraProfile(coin?.creatorAddress || "");
    const imageUrl =
      profile?.avatar?.previewImage?.small || getProfileImageSmall(profile);

    // Creator info for the pointer
    const creatorInfo = (
      <div className="flex items-center gap-2">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="profile"
            className="w-6 h-6 rounded-full object-cover border border-white/10"
          />
        ) : coin.creatorAddress ? (
          <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs">
            {coin.creatorAddress.slice(2, 4).toUpperCase()}
          </div>
        ) : (
          <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs">
            ?
          </div>
        )}
        <span className="font-medium">
          {profile?.displayName ||
            (coin.creatorAddress
              ? truncateAddress(coin.creatorAddress)
              : "Unknown")}
        </span>
      </div>
    );

    const [watchAnimation, setWatchAnimation] = useState<
      "add" | "remove" | null
    >(null);
    const [copied, setCopied] = useState(false);

    const handleWatchlistToggle = (e: React.MouseEvent) => {
      e.stopPropagation();
      setWatchAnimation(isWatched ? "remove" : "add");
      // Reset animation after it plays
      setTimeout(() => setWatchAnimation(null), 500);
      onToggleWatch();
    };

    const handleCopy = async (e: React.MouseEvent) => {
      e.stopPropagation();
      await navigator.clipboard.writeText(coin.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    };

    return (
      <FollowerPointerCard title={creatorInfo} className="contents">
        <tr
          key={`${coin.id}-${coin.address}`}
          onClick={() => onCoinClick(coin.address)}
          className={cn(
            "border-b border-border transition-colors cursor-pointer",
            isPinned
              ? "bg-primary/5 sticky top-0 z-10"
              : index % 2 === 0
              ? "bg-card"
              : "bg-background",
            // Add subtle animation for real-time updates
            "animate-pulse-subtle"
          )}
        >
          <td className="px-2 sm:px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                onClick={handleWatchlistToggle}
                className={cn(
                  "mr-2 p-1.5 rounded-full transition-all duration-300 relative",
                  isWatched
                    ? "text-yellow-500 hover:text-yellow-600 bg-yellow-500/10"
                    : "text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/10"
                )}
                title={isWatched ? "Remove from Watchlist" : "Add to Watchlist"}
              >
                <Star
                  fill={isWatched ? "currentColor" : "none"}
                  strokeWidth={isWatched ? 1 : 2}
                  className={cn(
                    "w-5 h-5 transition-transform",
                    watchAnimation === "add" && "animate-ping-once scale-125",
                    watchAnimation === "remove" && "animate-spin-once"
                  )}
                />
              </button>
              <div className="">
                <img
                  src={coin?.mediaContent?.previewImage?.medium}
                  alt=""
                  className="w-10 h-10 rounded-md overflow-hidden object-cover"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">
                    {coin.symbol?.length > 8
                      ? coin.symbol.slice(0, 8) + "..."
                      : coin.symbol}
                  </span>
                  {isPinned && (
                    <span className="bg-primary/20 text-primary text-xs px-1.5 py-0.5 rounded-full">
                      Pinned
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs font-mono text-muted-foreground">
                    {truncateAddress(coin.address)}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="p-1 hover:bg-muted rounded transition-colors"
                    title="Copy address"
                    tabIndex={0}
                  >
                    {copied ? (
                      <span className="text-green-500 text-xs">Copied</span>
                    ) : (
                      <Copy className="w-3 h-3 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </td>
          <td className="px-2 sm:px-4 py-3">
            <PriceCell coin={coin} dexScreenerData={dexScreenerData} />
          </td>
          {activeFilter !== "New Coins" && (
            <td className="px-2 sm:px-4 py-3 text-sm text-black dark:text-white">
              {coin.fineAge
                ? coin.fineAge
                : coin.createdAt
                ? getAgeFromTimestamp(coin.createdAt)
                : "N/A"}
            </td>
          )}
          <td className="px-2 sm:px-4 py-3">
            <VolumeCell coin={coin} dexScreenerData={dexScreenerData} />
          </td>
          <td className="px-2 sm:px-4 py-3 text-sm text-black dark:text-white">
            {formatMarketCapCompact(formattedCoin.marketCap)}
          </td>
          <td className="px-2 sm:px-4 py-3 text-sm text-muted-foreground">
            <CreatorCell coin={coin} />
          </td>
        </tr>
      </FollowerPointerCard>
    );
  },
  // Update the comparison function to include isPinned
  (prevProps, nextProps) => {
    // Deep comparison for the entire row
    return (
      prevProps.index === nextProps.index &&
      prevProps.coin.address === nextProps.coin.address &&
      prevProps.isPinned === nextProps.isPinned
    );
  }
);

TableRow.displayName = "TableRow";

// Memoized creator cell component for Zora profile name or Basename/address fallback
const truncateMiddle = (address: string) => {
  if (!address) return "";
  return address.length > 10
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : address;
};
const CreatorCell = memo(({ coin }: { coin: CoinWithImage }) => {
  const { basename, loading, error } = useBasename(
    coin?.creatorAddress ? (coin.creatorAddress as `0x${string}`) : undefined
  );
  const { profile } = useZoraProfile(coin?.creatorAddress || "");
  const profileName =
    coin.creatorProfile?.handle || coin.creatorProfile?.displayName;
  const zoraProfileUrl = `https://zora.co/${
    coin.creatorProfile?.handle || coin.creatorAddress || ""
  }`;

  // Get profile image - first try from coin.creatorProfile, then from profile
  const imageUrl =
    coin.creatorProfile?.avatar?.previewImage?.small ||
    profile?.avatar?.previewImage?.small ||
    getProfileImageSmall(profile);

  if (profileName)
    return (
      <a
        href={zoraProfileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:text-blue-800 underline flex items-center gap-2"
        title="View Zora Profile"
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="profile"
            className="w-5 h-5 rounded-full object-cover"
          />
        ) : coin.creatorAddress ? (
          <div className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-xs text-white">
            {coin.creatorAddress.slice(2, 4).toUpperCase()}
          </div>
        ) : (
          <div className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-xs text-white">
            ?
          </div>
        )}
        {profileName}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-3 h-3 inline ml-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18 13v6a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h6m5-3h3m0 0v3m0-3L10 14"
          />
        </svg>
      </a>
    );

  if (!coin.creatorAddress) return <span>N/A</span>;

  if (loading)
    return (
      <div className="flex items-center gap-2">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="profile"
            className="w-5 h-5 rounded-full object-cover"
          />
        ) : (
          <div className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-xs text-white">
            {coin.creatorAddress.slice(2, 4).toUpperCase()}
          </div>
        )}
        <span>Resolving...</span>
      </div>
    );

  if (basename)
    return (
      <div className="flex items-center gap-2">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="profile"
            className="w-5 h-5 rounded-full object-cover"
          />
        ) : (
          <div className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-xs text-white">
            {coin.creatorAddress.slice(2, 4).toUpperCase()}
          </div>
        )}
        <span>{basename}</span>
      </div>
    );

  if (error)
    return (
      <div className="flex items-center gap-2">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="profile"
            className="w-5 h-5 rounded-full object-cover"
          />
        ) : (
          <div className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-xs text-white">
            {coin.creatorAddress.slice(2, 4).toUpperCase()}
          </div>
        )}
        <span title={error}>{truncateMiddle(coin.creatorAddress)}</span>
      </div>
    );

  return (
    <div className="flex items-center gap-2">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt="profile"
          className="w-5 h-5 rounded-full object-cover"
        />
      ) : (
        <div className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-xs text-white">
          {coin.creatorAddress.slice(2, 4).toUpperCase()}
        </div>
      )}
      <span>{truncateMiddle(coin.creatorAddress)}</span>
    </div>
  );
});
CreatorCell.displayName = "CreatorCell";

// Add totalCount to the props interface
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
  activeFilter?: string;
  totalCount?: number;
  pinnedTokenAddress?: Address; // Pinned token address
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
  activeFilter,
  totalCount,
  pinnedTokenAddress = "0x907bdae00e91544a270694714832410ad8418888", // Zoracle token address
}: TokenDataTableProps) {
  const { watchlist, addToWatchlist, removeFromWatchlist, isInWatchlist } =
    useWatchlist(walletAddress);
  const { toast } = useToast();

  // Fetch pinned token data
  const { data: pinnedToken, isLoading: pinnedTokenLoading } =
    useTokenDetails(pinnedTokenAddress);

  // Convert pinnedToken to CoinWithImage format for the table
  const pinnedCoin: CoinWithImage | null = useMemo(() => {
    if (!pinnedToken) return null;

    return {
      id: pinnedToken.id || pinnedTokenAddress,
      name: pinnedToken.name || "Zoracle",
      symbol: pinnedToken.symbol || "ZORA",
      address: pinnedTokenAddress,
      chainId: 8453, // Base chain
      description: pinnedToken.description || "",
      totalSupply: pinnedToken.totalSupply || "",
      totalVolume: pinnedToken.volume24h || "",
      volume24h: pinnedToken.volume24h || "",
      createdAt: pinnedToken.createdAt || "",
      creatorAddress: pinnedToken.creatorAddress || "",
      marketCap: pinnedToken.marketCap || "",
      marketCapDelta24h: pinnedToken.marketCapDelta24h || "",
      uniqueHolders: pinnedToken.uniqueHolders || 0,
      mediaContent: {
        previewImage: {
          small: "/zoracle.svg", // Your Zoracle logo path
          medium: "/zoracle.svg",
          large: "/zoracle.svg",
        },
      },
      // Highlight that this is a pinned token
      isPinned: true,
    };
  }, [pinnedToken, pinnedTokenAddress]);

  // Handle watchlist actions with toasts
  const handleToggleWatchlist = useCallback(
    (coin: CoinWithImage) => {
      if (isInWatchlist(coin.address)) {
        removeFromWatchlist(coin.address);
        toast({
          title: "Removed from watchlist",
          description: `${
            coin.name || coin.symbol
          } has been removed from your watchlist`,
          variant: "default",
        });
      } else {
        // Add with additional metadata
        addToWatchlist({
          address: coin.address,
          name: coin.name,
          symbol: coin.symbol,
          image: coin.mediaContent?.previewImage?.small,
        });

        toast({
          title: "Added to watchlist",
          description: `${
            coin.name || coin.symbol
          } has been added to your watchlist`,
          variant: "default",
        });
      }
    },
    [isInWatchlist, addToWatchlist, removeFromWatchlist, toast]
  );

  // Memoize the click handler to prevent unnecessary re-renders
  const handleCoinClick = useCallback(
    (address: string) => {
      onCoinClick(address);
    },
    [onCoinClick]
  );

  // Combine pinned token with regular coins
  const combinedCoins = useMemo(() => {
    const result: CoinWithImage[] = [];

    // Add pinned token first if available
    if (pinnedCoin) {
      result.push(pinnedCoin);
    }

    // Add the rest of the coins, filtering out duplicates of the pinned token
    coins.forEach((coin) => {
      if (coin.address.toLowerCase() !== pinnedTokenAddress.toLowerCase()) {
        result.push(coin);
      }
    });

    return result;
  }, [coins, pinnedCoin, pinnedTokenAddress]);

  // Memoize the table body with stable keys to prevent unnecessary re-renders
  const tableBody = useMemo(() => {
    return combinedCoins.map((coin, index) => (
      <TableRow
        key={`${coin.id}-${coin.address}${coin.isPinned ? "-pinned" : ""}`}
        coin={coin}
        index={index}
        dexScreenerData={dexScreenerData}
        onCoinClick={handleCoinClick}
        isWatched={isInWatchlist(coin.address)}
        onToggleWatch={() => handleToggleWatchlist(coin)}
        activeFilter={activeFilter}
        isPinned={!!coin.isPinned}
      />
    ));
  }, [
    combinedCoins,
    dexScreenerData,
    handleCoinClick,
    isInWatchlist,
    handleToggleWatchlist,
    activeFilter,
  ]);

  if (loading && coins.length === 0) {
    return (
      <TableSkeleton rows={10} columns={activeFilter === "New Coins" ? 6 : 7} />
    );
  }

  if (coins.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-muted-foreground" />
          <span className="text-muted-foreground">No coins found</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto bg-card border border-border">
      <table
        className={`w-full ${
          activeFilter === "New Coins" ? "min-w-[700px]" : "min-w-[800px]"
        }`}
      >
        <thead className="bg-muted border-b border-border">
          <tr className="text-left">
            <th className="px-2 sm:px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              TOKEN
            </th>
            <th className="px-2 sm:px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              PRICE
            </th>
            {activeFilter !== "New Coins" && (
              <th className="px-2 sm:px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                AGE
              </th>
            )}
            <th className="px-2 sm:px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              VOLUME
            </th>
            <th className="px-2 sm:px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              MCAP
            </th>
            <th className="px-2 sm:px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Creator
            </th>
          </tr>
        </thead>
        <tbody>
          {tableBody}
          {loading && coins.length > 0 && (
            <>
              {Array.from({ length: 3 }, (_, i) => (
                <TokenTableRowSkeleton key={`skeleton-${i}`} />
              ))}
            </>
          )}
          {/* Add a loading skeleton specifically for the pinned token when it's loading */}
          {pinnedTokenLoading && (
            <tr className="bg-primary/5 border-b border-border">
              <td
                colSpan={activeFilter === "New Coins" ? 6 : 7}
                className="p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-muted animate-pulse"></div>
                  <div className="space-y-2">
                    <div className="h-4 w-24 bg-muted animate-pulse rounded"></div>
                    <div className="h-3 w-32 bg-muted animate-pulse rounded"></div>
                  </div>
                </div>
              </td>
            </tr>
          )}
          {pinnedCoin && (
            <tr className="bg-transparent border-b border-primary/20">
              <td
                colSpan={activeFilter === "New Coins" ? 6 : 7}
                className="py-1"
              >
                <div className="flex items-center justify-between px-4 text-xs text-muted-foreground">
                  <div>Featured Token</div>
                  <div className="h-px flex-1 bg-primary/10 mx-2"></div>
                  <div>Token List</div>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Pagination Controls */}
      {showPagination && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-t border-border gap-4">
          <div className="text-sm text-muted-foreground text-center sm:text-left">
            Page {currentPage} - Showing {coins.length}{" "}
            {totalCount ? `of ${totalCount}` : ""} coins
          </div>
          <div className="flex items-center justify-center sm:justify-end gap-2">
            {/* Previous Page */}
            {currentPage > 1 && (
              <button
                onClick={() => onGoToPage(currentPage - 1)}
                disabled={loading}
                className="px-3 py-1 bg-muted text-muted-foreground rounded-md text-sm font-medium hover:bg-muted/80 disabled:opacity-50"
              >
                <span className="hidden sm:inline">Previous</span>
                <span className="sm:hidden">←</span>
              </button>
            )}

            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(currentPage + 2, 5) }, (_, i) => {
                const pageNum = i + 1;
                if (pageNum <= Math.max(currentPage, 1)) {
                  return (
                    <button
                      key={pageNum}
                      onClick={() => onGoToPage(pageNum)}
                      disabled={loading}
                      className={cn(
                        "px-2 sm:px-3 py-1 rounded-md text-sm font-medium transition-colors",
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
                    <span className="hidden sm:inline">Loading</span>
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

export { CreatorsTable } from "./TokenTable";

// Simple in-memory cache for loaded images
const imageCache = new Map<string, string>();

function CachedImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
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
      style={{ background: "#fff" }}
    />
  );
}
