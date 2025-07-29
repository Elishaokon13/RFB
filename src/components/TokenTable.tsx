import { cn, truncateAddress } from "@/lib/utils";
import { useTokenFeed } from "@/hooks/useTokenFeed";
import { useNavigate } from "react-router-dom";
import { TokenDataTable } from "./TokenDataTable";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState, useMemo, useRef } from "react";
import { useBasename } from "@/hooks/useBasename";
import { Address } from "viem";
import { Coin } from "@/hooks/useTopVolume24h";
import { useDexScreenerTokens, DexScreenerPair } from "@/hooks/useDexScreener";
import {
  useZoraProfile,
  useZoraProfileBalances,
  getProfileImageSmall,
  useUserBalances,
} from "@/hooks/useZoraProfile";
import { TableSkeleton } from "@/components/TableSkeleton";
import { useNotifications, NewCoinNotification } from "@/components/Header";

// Filter options
const topFilters = ["Trending", "Top Gainers", "Top Volume 24h", "New Coins"];

const ITEMS_PER_PAGE = 20;

// Extend Coin type to include image property for table display (from TokenDataTable)
export type CoinWithImage = Coin & {
  id: string;
  name: string;
  symbol: string;
  address: string;
  chainId: number;
  description: string;
  totalSupply: string;
  totalVolume: string;
  volume24h: string;
  createdAt: string;
  creatorAddress: string;
  marketCap: string;
  marketCapDelta24h: string;
  uniqueHolders: number;
  uniswapV3PoolAddress?: string;
  mediaContent?: {
    previewImage?: {
      small?: string;
      medium?: string;
      large?: string;
    };
  };
  fineAge?: string;
  creatorProfile?: any;
  isPinned?: boolean; // New property
  pinnedTokenAddress?: string;
};

export function TokenTable() {
  const navigate = useNavigate();
  const [activeTopFilter, setActiveTopFilter] = useState<string>(() => {
    return localStorage.getItem("activeTopFilter") || "Trending";
  });
  const [currentPage, setCurrentPage] = useState(1);

  // Track known tokens to detect new ones
  const [knownTokenAddresses, setKnownTokenAddresses] = useState<Set<string>>(
    () => {
      const saved = localStorage.getItem("known-tokens");
      return new Set(saved ? JSON.parse(saved) : []);
    }
  );

  // Last notification time tracking to prevent spam
  const [lastNotificationTime, setLastNotificationTime] = useState<number>(
    () => {
      return parseInt(localStorage.getItem("last-notification-time") || "0");
    }
  );

  // Access notification context
  const { addNotification } = useNotifications();

  // Use dedicated hook for smart state handling
  const {
    coins,
    pageInfo,
    error,
    isLoading,
    refetchAll,
    refetchActive,
    hasData,
    fetchNextPage, // Make sure this function is available from useTokenFeed
  } = useTokenFeed(activeTopFilter);

  // Initial loading - populate known tokens without notifications
  useEffect(() => {
    if (!isLoading && coins.length > 0 && knownTokenAddresses.size === 0) {
      const initialKnownTokens = new Set(coins.map((coin) => coin.address));
      setKnownTokenAddresses(initialKnownTokens);
      localStorage.setItem(
        "known-tokens",
        JSON.stringify(Array.from(initialKnownTokens))
      );
    }
  }, [coins, isLoading, knownTokenAddresses.size]);

  // Detect new coins and send notifications
  useEffect(() => {
    if (!coins.length || isLoading || knownTokenAddresses.size === 0) return;

    // Check for new coins
    const now = Date.now();
    const newTokens = coins.filter(
      (coin) => !knownTokenAddresses.has(coin.address)
    );

    // Only send notifications if we have new tokens and aren't spamming (limit to once per minute)
    if (newTokens.length > 0 && now - lastNotificationTime > 60000) {
      // Update known tokens
      const updatedKnownTokens = new Set(knownTokenAddresses);

      // Create notifications for new tokens (limit to 5 at once to avoid spam)
      newTokens.slice(0, 5).forEach((token) => {
        // Only notify for tokens less than 12 hours old
        const tokenCreatedAt = token.createdAt
          ? new Date(token.createdAt).getTime()
          : now;
        const isRecent = now - tokenCreatedAt < 12 * 60 * 60 * 1000; // 12 hours

        if (isRecent) {
          // Create the notification
          const notification: NewCoinNotification = {
            id: `new-coin-${token.address}-${Date.now()}`,
            title: `New Token: ${token.symbol || "Unknown"}`,
            message: `${
              token.name || "New token"
            } was just added to the network`,
            timestamp: new Date(),
            read: false,
            coinAddress: token.address,
            tokenSymbol: token.symbol,
            // Use type assertion to access mediaContent
            tokenImage:
              (token as CoinWithImage).mediaContent?.previewImage?.medium ||
              undefined,
          };

          addNotification(notification);
        }

        updatedKnownTokens.add(token.address);
      });

      // Update known tokens state and localStorage
      setKnownTokenAddresses(updatedKnownTokens);
      localStorage.setItem(
        "known-tokens",
        JSON.stringify(Array.from(updatedKnownTokens))
      );

      // Update last notification time
      setLastNotificationTime(now);
      localStorage.setItem("last-notification-time", now.toString());
    }
  }, [
    coins,
    isLoading,
    knownTokenAddresses,
    addNotification,
    lastNotificationTime,
  ]);

  // Save active filter to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("activeTopFilter", activeTopFilter);
    if (currentPage !== 1) setCurrentPage(1);
  }, [activeTopFilter, currentPage]);

  // Setup polling for new coins (every minute for "New Coins" filter)
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (activeTopFilter === "New Coins") {
      interval = setInterval(() => {
        refetchActive();
      }, 60000); // Check every minute
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTopFilter, refetchActive]);

  // Helper for fine-grained age (seconds/minutes/hours/days/weeks/years)
  function getFineAgeFromTimestamp(timestamp: string) {
    const now = new Date();
    const created = new Date(timestamp);
    const diffMs = now.getTime() - created.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffMs / (1000 * 60));
    const diffHour = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.floor(diffDays / 7);
    const diffYears = Math.floor(diffDays / 365);

    if (diffSec < 60) return `${diffSec}s`;
    if (diffMin < 60) return `${diffMin}m`;
    if (diffHour < 24) return `${diffHour}h`;
    if (diffDays < 7) return `${diffDays}d`;
    if (diffWeeks < 52) return `${diffWeeks}w`;
    return `${diffYears}y`;
  }

  // Helper to ensure all required CoinWithImage properties are present
  const ensureCoinWithImage = (coin: unknown): CoinWithImage => {
    const c = coin as Partial<CoinWithImage>;
    return {
      id: c.id ?? c.address ?? "",
      name: c.name ?? "",
      symbol: c.symbol ?? "",
      address: c.address ?? "",
      description: c.description ?? "",
      totalSupply: c.totalSupply ?? "",
      totalVolume: c.totalVolume ?? "",
      volume24h: c.volume24h ?? "",
      createdAt: c.createdAt ?? "",
      creatorAddress: c.creatorAddress ?? "",
      marketCap: c.marketCap ?? "",
      marketCapDelta24h: c.marketCapDelta24h ?? "",
      chainId: c.chainId ?? 8453,
      uniqueHolders: c.uniqueHolders ?? 0,
      uniswapV3PoolAddress: c.uniswapV3PoolAddress ?? "",
      mediaContent: c.mediaContent,
      fineAge: c.createdAt ? getFineAgeFromTimestamp(c.createdAt) : undefined,
      creatorProfile: c.creatorProfile,
    };
  };

  // Get all coins for the current page
  const allCoins = useMemo(() => coins.map(ensureCoinWithImage), [coins]);

  // Pagination logic for 20 per page
  const paginatedCoins = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return allCoins.slice(start, start + ITEMS_PER_PAGE);
  }, [allCoins, currentPage]);

  // Get token addresses for the current page
  const tokenAddresses = useMemo(
    () => paginatedCoins.map((c) => c.address),
    [paginatedCoins]
  );

  // Fetch token details from DexScreener
  const {
    tokens: dexScreenerTokens,
    loading: dexLoading,
    error: dexError,
  } = useDexScreenerTokens("8453", tokenAddresses);

  // Map address to DexScreenerPair for fast lookup
  const dexScreenerData = useMemo(() => {
    const map: Record<string, DexScreenerPair> = {};
    dexScreenerTokens.forEach((pair) => {
      if (pair.baseToken?.address) {
        map[pair.baseToken.address.toLowerCase()] = pair;
      }
    });
    return map;
  }, [dexScreenerTokens]);

  // Handle coin click
  const handleCoinClick = useCallback(
    (address: string) => {
      navigate(`/token/${address}`);
    },
    [navigate]
  );

  // Handle pagination
  const handleLoadNextPage = useCallback(() => {
    // First, check if we need to fetch more data from the API
    if (pageInfo?.hasNextPage && pageInfo?.endCursor && fetchNextPage) {
      // If we have a fetchNextPage function and there's a next page, fetch more data
      fetchNextPage(pageInfo.endCursor);
    }

    // Regardless, update the local page state
    setCurrentPage((prev) => prev + 1);
  }, [pageInfo, fetchNextPage]);

  const handleGoToPage = useCallback(
    (page: number) => {
      // Ensure we have enough data for this page
      const requiredItemCount = page * ITEMS_PER_PAGE;

      // If we need to fetch more data and we can
      if (
        allCoins.length < requiredItemCount &&
        pageInfo?.hasNextPage &&
        fetchNextPage
      ) {
        // Try to fetch more data first
        fetchNextPage(pageInfo.endCursor);
      }

      // Update the page state
      setCurrentPage(page);
    },
    [allCoins.length, pageInfo, fetchNextPage]
  );

  const handleRefresh = useCallback(() => {
    refetchAll();
  }, [refetchAll]);

  const loading = isLoading || dexLoading;
  const errorMsg = error || dexError;

  // Calculate proper pageInfo based on local pagination
  const localPageInfo = useMemo(() => {
    const totalPages = Math.ceil(allCoins.length / ITEMS_PER_PAGE);
    const hasNextPage =
      currentPage < totalPages || (pageInfo?.hasNextPage ?? false);

    return {
      ...pageInfo,
      hasNextPage,
    };
  }, [allCoins.length, currentPage, pageInfo]);

  // Skeleton loading component
  const skeletonLoading = (
    <div className="space-y-4">
      <TableSkeleton />
    </div>
  );

  // Safe error message
  const safeErrorMsg = errorMsg?.toString();

  return (
    <div className="space-y-4 px-4 sm:px-0">
      {/* Header with Live Indicator */}
      <div className="bg-card px-4 p-2">
        {/* Filters */}
        <div className="flex flex-col gap-4">
          {/* Top row: Filters */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="flex bg-muted rounded-lg p-1 overflow-x-auto">
                {topFilters.map((filter) => (
                  <button
                    key={filter}
                    onClick={() => {
                      setActiveTopFilter(filter);
                      setCurrentPage(1);
                    }}
                    className={cn(
                      "px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap",
                      activeTopFilter === filter
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {/* Refresh button with animation */}
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Refresh data"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Progressive Loading - Show data as soon as it's available */}
      {isLoading && !paginatedCoins.length && skeletonLoading}
      {paginatedCoins.length > 0 && (
        <TokenDataTable
          coins={paginatedCoins}
          dexScreenerData={dexScreenerData}
          currentPage={currentPage}
          loading={loading}
          pageInfo={localPageInfo}
          onCoinClick={handleCoinClick}
          onLoadNextPage={handleLoadNextPage}
          onGoToPage={handleGoToPage}
          showPagination={true}
          itemsPerPage={ITEMS_PER_PAGE}
          activeFilter={activeTopFilter}
          totalCount={allCoins.length}
          // pinnedTokenAddress="0x907bdae00e91544a270694714832410ad8418888"
        />
      )}
    </div>
  );
}

// const truncateAddress = (address: string) => {
//   if (!address) return "";
//   return address.slice(0, 6) + "..." + address.slice(-4);
// };

const CreatorRow = ({
  address,
  count,
  idx,
}: {
  address: string;
  count: number;
  idx: number;
}) => {
  const { profile } = useZoraProfile(address);
  const { balances, pageInfo, loading, error } =
    useZoraProfileBalances(address);

  const { sorted, totalPosts } = useUserBalances(address);

  // console.log(balances);
  // console.log('sorted', sorted, totalPosts);

  // Robust fallback for USD value, similar to image logic
  const getUsdValue = (b: unknown): string | number => {
    if (typeof b === "object" && b !== null) {
      // Check for amount.amountUsd
      if ("amount" in b) {
        const amount = (b as { amount?: unknown }).amount;
        if (
          typeof amount === "object" &&
          amount !== null &&
          "amountUsd" in amount
        ) {
          return (amount as { amountUsd?: string }).amountUsd ?? 0;
        }
      }
      // Check for valueUsd
      if ("valueUsd" in b) {
        return (b as { valueUsd?: string }).valueUsd ?? 0;
      }
      // Check for amountUsd
      if ("amountUsd" in b) {
        return (b as { amountUsd?: string }).amountUsd ?? 0;
      }
    }
    return 0;
  };
  // Sum all amountUsd in all creatorEarnings arrays for all balances
  const totalValueUsd = balances?.reduce((sum: number, b): number => {
    if (
      b &&
      typeof b === "object" &&
      "creatorEarnings" in b &&
      Array.isArray((b as { creatorEarnings?: unknown }).creatorEarnings)
    ) {
      const earningsArr = (b as { creatorEarnings: { amountUsd?: string }[] })
        .creatorEarnings;
      const earningsSum = earningsArr.reduce(
        (eSum: number, earning): number => {
          if (earning && typeof earning.amountUsd === "string") {
            return eSum + (parseFloat(earning.amountUsd) || 0);
          }
          return eSum;
        },
        0
      );
      return Number(sum) + earningsSum;
    }
    return Number(sum);
  }, 0);
  // Prefer avatar.previewImage.small if available, else fallback
  const imageUrl =
    profile?.avatar?.previewImage?.small || getProfileImageSmall(profile);

  // Helper to check if displayName is a URL
  const isUrl = (str?: string) => {
    if (!str) return false;
    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <tr className="border-b border-border transition-colors duration-200 hover:bg-muted/50 animate-fade-in">
      <td className="px-4 py-3 text-sm text-muted-foreground align-top">
        {idx + 1}
      </td>
      <td className="px-4 py-3 text-sm align-top">
        <div className="flex items-center gap-3">
          {imageUrl && (
            <img
              src={imageUrl}
              alt="profile"
              className="w-8 h-8 rounded-md object-cover"
            />
          )}
          <span className="font-semibold">
            {profile?.displayName ? (
              isUrl(profile.displayName) ? (
                <a
                  href={profile.displayName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  {profile.displayName}
                </a>
              ) : (
                profile.displayName
              )
            ) : (
              truncateAddress(address)
            )}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm align-top font-mono">
        {truncateAddress(address)}
      </td>
    </tr>
  );
};

export function CreatorsTable({ coins }: { coins: Coin[] }) {
  // Aggregate creators
  const creatorsMap = new Map<string, { count: number }>();
  coins.forEach((coin) => {
    if (coin.creatorAddress) {
      creatorsMap.set(coin.creatorAddress, {
        count: (creatorsMap.get(coin.creatorAddress)?.count || 0) + 1,
      });
    }
  });
  const creators = Array.from(creatorsMap.entries()).map(
    ([address, { count }]) => ({ address, count })
  );

  return (
    <div className="w-full max-w-full overflow-x-auto sm:overflow-x-visible">
      <table className="min-w-full w-full max-w-full">
        <thead className="bg-muted border-b border-border">
          <tr className="text-left">
            <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Creator
            </th>
            <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Address
            </th>
          </tr>
        </thead>
        <tbody>
          {creators.map((creator, idx) => (
            <CreatorRow
              key={creator.address}
              address={creator.address}
              count={creator.count}
              idx={idx}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
