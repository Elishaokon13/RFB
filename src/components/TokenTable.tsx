import { useState, useMemo, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTrendingCoins } from "@/hooks/useTopVolume24h";
import { useGetCoinsMostValuable, MostValuableCoin } from "@/hooks/getCoinsMostValuable";
import { useGetCoinsTopGainers, TopGainerCoin } from "@/hooks/getCoinsTopGainers";
import { useMultipleDexScreenerPrices } from "@/hooks/useDexScreener";
import { useNavigate } from "react-router-dom";
import { TokenDataTable } from "./TokenDataTable";

const topFilters = [
  "Most Valuable",
  "Top Gainers",
  "Top Volume 24h",
  "New Pairs",
];

// Helper function to convert MostValuableCoin to Coin format for compatibility
const convertMostValuableToCoin = (mostValuableCoin: MostValuableCoin) => ({
  id: mostValuableCoin.id || "",
  name: mostValuableCoin.name || "",
  symbol: mostValuableCoin.symbol || "",
  description: mostValuableCoin.description || "",
  address: mostValuableCoin.address || "",
  totalSupply: mostValuableCoin.totalSupply || "",
  totalVolume: mostValuableCoin.totalVolume || "",
  volume24h: mostValuableCoin.volume24h || "",
  createdAt: mostValuableCoin.createdAt || "",
  creatorAddress: mostValuableCoin.creatorAddress || "",
  creatorEarnings: [],
  marketCap: mostValuableCoin.marketCap || "",
  marketCapDelta24h: mostValuableCoin.marketCapDelta24h || "",
  chainId: mostValuableCoin.chainId || 0,
  price: "",
  priceChange24h: "",
  imageUrl: mostValuableCoin.image || "",
  website: "",
  twitter: "",
  telegram: "",
  discord: "",
  metadata: {},
  uniswapV3PoolAddress: "",
  uniqueHolders: mostValuableCoin.uniqueHolders || 0,
  uniswapV4PoolKey: null,
  zoraComments: null,
});

// Helper function to convert TopGainerCoin to Coin format for compatibility
const convertTopGainerToCoin = (topGainerCoin: TopGainerCoin) => ({
  id: topGainerCoin.id || "",
  name: topGainerCoin.name || "",
  symbol: topGainerCoin.symbol || "",
  description: topGainerCoin.description || "",
  address: topGainerCoin.address || "",
  totalSupply: topGainerCoin.totalSupply || "",
  totalVolume: topGainerCoin.totalVolume || "",
  volume24h: topGainerCoin.volume24h || "",
  createdAt: topGainerCoin.createdAt || "",
  creatorAddress: topGainerCoin.creatorAddress || "",
  creatorEarnings: [],
  marketCap: topGainerCoin.marketCap || "",
  marketCapDelta24h: topGainerCoin.marketCapDelta24h || "",
  chainId: topGainerCoin.chainId || 0,
  price: "",
  priceChange24h: "",
  imageUrl: topGainerCoin.image || "",
  website: "",
  twitter: "",
  telegram: "",
  discord: "",
  metadata: {},
  uniswapV3PoolAddress: "",
  uniqueHolders: topGainerCoin.uniqueHolders || 0,
  uniswapV4PoolKey: null,
  zoraComments: null,
});

export function TokenTable() {
  const [activeTimeFilter, setActiveTimeFilter] = useState("6H");
  const [activeTopFilter, setActiveTopFilter] = useState("Trending");
  const navigate = useNavigate();

  // Fetch trending coin data from Zora SDK
  const {
    coins: trendingCoins,
    loading: trendingLoading,
    error: trendingError,
    refetch: refetchTrending,
    totalCount: trendingTotalCount,
    currentPage: trendingCurrentPage,
    pageInfo: trendingPageInfo,
    loadNextPage: loadNextTrendingPage,
    goToPage: goToTrendingPage,
  } = useTrendingCoins(20);

  // Fetch most valuable coin data from Zora SDK
  const {
    data: mostValuableData,
    isLoading: mostValuableLoading,
    error: mostValuableError,
    refetch: refetchMostValuable,
  } = useGetCoinsMostValuable({ count: 20 });

  // Fetch top gainers coin data from Zora SDK
  const {
    data: topGainersData,
    isLoading: topGainersLoading,
    error: topGainersError,
    refetch: refetchTopGainers,
  } = useGetCoinsTopGainers({ count: 20 });

  // Convert most valuable coins to compatible format
  const mostValuableCoins = useMemo(() => {
    if (!mostValuableData?.coins) return [];
    return mostValuableData.coins.map(convertMostValuableToCoin);
  }, [mostValuableData]);

  // Convert top gainers coins to compatible format
  const topGainersCoins = useMemo(() => {
    if (!topGainersData?.coins) return [];
    return topGainersData.coins.map(convertTopGainerToCoin);
  }, [topGainersData]);

  // Determine which data to use based on active filter
  const isTrendingActive = activeTopFilter === "Trending";
  const isTopGainersActive = activeTopFilter === "Top Gainers";
  
  let coins = trendingCoins;
  let loading = trendingLoading;
  let error: string | null = trendingError;
  let currentPage = trendingCurrentPage;
  let pageInfo = trendingPageInfo;

  if (isTopGainersActive) {
    coins = topGainersCoins;
    loading = topGainersLoading;
    error = topGainersError?.toString() || null;
    currentPage = 1;
    pageInfo = null;
  } else if (!isTrendingActive) {
    coins = mostValuableCoins;
    loading = mostValuableLoading;
    error = mostValuableError?.toString() || null;
    currentPage = 1;
    pageInfo = null;
  }

  // Extract token addresses for DexScreener API - memoized to prevent unnecessary re-renders
  const tokenAddresses = useMemo(() => 
    coins.map(coin => coin.address).filter(Boolean), 
    [coins]
  );

  // Fetch DexScreener price data for all tokens
  const {
    pricesData: dexScreenerData,
    loading: dexScreenerLoading,
    error: dexScreenerError,
    refetch: refetchDexScreener,
  } = useMultipleDexScreenerPrices(tokenAddresses);

  // Calculate total volume for header stats
  const totalVolume = coins.reduce((sum, coin) => {
    return sum + (parseFloat(coin.volume24h || "0") || 0);
  }, 0);

  const handleCoinClick = useCallback((coinAddress: string) => {
    navigate(`/token/${coinAddress}`);
  }, [navigate]);

  const handleRefresh = useCallback(() => {
    if (isTrendingActive) {
      refetchTrending();
    } else if (isTopGainersActive) {
      refetchTopGainers();
    } else {
      refetchMostValuable();
    }
    refetchDexScreener();
  }, [isTrendingActive, isTopGainersActive, refetchTrending, refetchTopGainers, refetchMostValuable, refetchDexScreener]);

  const handleLoadNextPage = useCallback(() => {
    if (isTrendingActive && loadNextTrendingPage) {
      loadNextTrendingPage();
    }
  }, [isTrendingActive, loadNextTrendingPage]);

  const handleGoToPage = useCallback((page: number) => {
    if (isTrendingActive && goToTrendingPage) {
      goToTrendingPage(page);
    }
  }, [isTrendingActive, goToTrendingPage]);

  return (
    <div className="flex-1 bg-background">
      {/* Header Stats */}
      <div className="bg-card border-b border-border p-4">
        {/* Filters */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex bg-muted rounded-lg p-1">
              {topFilters.map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveTopFilter(filter)}
                  className={cn(
                    "px-3 py-1 rounded-md text-sm font-medium transition-colors",
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

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-1 px-3 py-1 bg-muted rounded-lg text-sm text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center p-8">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Loading trending coins...</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {(error || dexScreenerError) && (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <p className="text-red-500 mb-2">
              {error?.toString() || dexScreenerError?.toString() || "An error occurred"}
            </p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <TokenDataTable
          coins={coins}
          dexScreenerData={dexScreenerData}
          currentPage={currentPage}
          loading={loading}
          pageInfo={pageInfo}
          onCoinClick={handleCoinClick}
          onLoadNextPage={handleLoadNextPage}
          onGoToPage={handleGoToPage}
          showPagination={isTrendingActive}
          itemsPerPage={20}
        />
      )}
    </div>
  );
}
