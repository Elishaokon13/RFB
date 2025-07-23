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

// Filter options
const topFilters = [
  "Trending",
  "Top Gainers",
  "Top Volume 24h",
  "New Coins",
];

const ITEMS_PER_PAGE = 20;

// Extend Coin type to include image property for table display (from TokenDataTable)
type CoinWithImage = Coin & {
  mediaContent?: {
    mimeType?: string;
    originalUri?: string;
    previewImage?: {
      small?: string;
      medium?: string;
      blurhash?: string;
    };
  };
  fineAge?: string;
  creatorProfile?: {
    handle?: string;
    address?: string;
    displayName?: string;
    avatar?: {
      previewImage?: {
        small?: string;
        medium?: string;
      };
    };
  };
};

export function TokenTable() {
  const navigate = useNavigate();
  const [activeTopFilter, setActiveTopFilter] = useState<string>(() => {
    return localStorage.getItem("activeTopFilter") || "Most Valuable";
  });
  const [currentPage, setCurrentPage] = useState(1);

  // Use dedicated hook for smart state handling
  const {
    coins,
    pageInfo,
    error,
    isLoading,
    refetchAll,
    refetchActive,
    hasData,
  } = useTokenFeed(activeTopFilter);

  // Save active filter to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("activeTopFilter", activeTopFilter);
    if (currentPage !== 1) setCurrentPage(1);
  }, [activeTopFilter, currentPage]);

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

  // Pagination logic for 20 per page
  const paginatedCoins = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return coins.slice(start, start + ITEMS_PER_PAGE).map(ensureCoinWithImage);
  }, [coins, currentPage]);

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
    setCurrentPage((prev) => prev + 1);
  }, []);

  const handleGoToPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleRefresh = useCallback(() => {
    refetchAll();
  }, [refetchAll]);

  const loading = isLoading;
  const errorMsg = error || dexError;
  const pageInfoToUse = pageInfo;

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
      <div className="bg-card border-b border-border p-4">
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
          </div>
        </div>
      </div>

      {/* Progressive Loading - Show data as soon as it's available */}
      {isLoading && skeletonLoading}
      {paginatedCoins.length > 0 && (
        <TokenDataTable
          coins={paginatedCoins}
          dexScreenerData={dexScreenerData}
          currentPage={currentPage}
          loading={loading}
          pageInfo={pageInfoToUse}
          onCoinClick={handleCoinClick}
          onLoadNextPage={handleLoadNextPage}
          onGoToPage={handleGoToPage}
          showPagination={true}
          itemsPerPage={ITEMS_PER_PAGE}
          activeFilter={activeTopFilter}
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
              #
            </th>
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
