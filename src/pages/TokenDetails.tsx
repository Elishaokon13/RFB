import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, TrendingUp, TrendingDown, DollarSign, BarChart3, Activity, Globe, Calendar, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTrendingCoins, formatCoinData, Coin } from "@/hooks/useTopVolume24h";
import { useDexScreenerPrice, formatDexScreenerPrice, DexScreenerPair } from "@/hooks/useDexScreener";

export default function TokenDetails() {
  const { address } = useParams<{ address: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch token data from Zora SDK
  const {
    coins,
    loading,
    error,
    refetch,
  } = useTrendingCoins(1000); // Fetch more to find our token

  // Find the specific token
  const token = coins.find(coin => coin.address === address);

  // Fetch DexScreener data for this specific token
  const {
    priceData: dexScreenerData,
    loading: dexScreenerLoading,
    error: dexScreenerError,
    refetch: refetchDexScreener,
  } = useDexScreenerPrice(address || "");

  const handleRefresh = () => {
    refetch();
    refetchDexScreener();
  };

  const handleBack = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="flex-1 bg-background">
        <div className="flex items-center justify-center p-8">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Loading token details...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !token) {
    return (
      <div className="flex-1 bg-background">
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-foreground mb-2">Token Not Found</h2>
            <p className="text-muted-foreground mb-4">The token you're looking for doesn't exist or has been removed.</p>
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const formattedToken = formatCoinData(token);
  const formattedDexScreener = dexScreenerData ? formatDexScreenerPrice(dexScreenerData) : null;

  return (
    <div className="flex-1 bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-3 py-1 bg-muted rounded-lg text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">{token.name || "Unknown Token"}</h1>
                <p className="text-sm text-muted-foreground">{token.symbol || "N/A"}</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleRefresh}
            disabled={loading || dexScreenerLoading}
            className="flex items-center gap-1 px-3 py-1 bg-muted rounded-lg text-sm text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={cn("w-4 h-4", (loading || dexScreenerLoading) && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 p-6">
        {/* Main Content */}
        <div className="flex-1 space-y-6">
          {/* Price Overview Card */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Current Price */}
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Current Price</p>
                <p className="text-2xl font-bold text-foreground">
                  {formattedDexScreener?.priceUsd || formattedToken.formattedPrice}
                </p>
                {dexScreenerData?.priceChange?.h24 !== undefined && (
                  <div className="flex items-center gap-2">
                    {dexScreenerData.priceChange.h24 >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-gain" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-loss" />
                    )}
                    <span className={cn("text-sm font-medium", 
                      dexScreenerData.priceChange.h24 >= 0 ? "text-gain" : "text-loss"
                    )}>
                      {formattedDexScreener?.priceChange24h || "N/A"}
                    </span>
                  </div>
                )}
              </div>

              {/* Market Cap */}
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Market Cap</p>
                <p className="text-2xl font-bold text-foreground">
                  {formattedToken.formattedMarketCap}
                </p>
                <p className="text-sm text-muted-foreground">
                  {dexScreenerData?.liquidity?.usd ? `Liquidity: $${dexScreenerData.liquidity.usd.toLocaleString()}` : "N/A"}
                </p>
              </div>

              {/* Volume */}
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">24h Volume</p>
                <p className="text-2xl font-bold text-foreground">
                  {formattedDexScreener?.volume24h || formattedToken.formattedVolume24h}
                </p>
                <p className="text-sm text-muted-foreground">
                  {dexScreenerData?.txns?.h24 ? `${dexScreenerData.txns.h24} transactions` : "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* Chart Area */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Price Chart</h2>
              <div className="flex bg-muted rounded-lg p-1">
                {["1H", "6H", "24H", "7D", "1M"].map((period) => (
                  <button
                    key={period}
                    className="px-3 py-1 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground"
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Chart Placeholder */}
            <div className="h-80 bg-muted/20 rounded-lg border-2 border-dashed border-muted flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Chart integration coming soon</p>
                <p className="text-sm text-muted-foreground">Real-time price visualization</p>
              </div>
            </div>
          </div>

          {/* Token Information */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Token Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Token Address</span>
                  <span className="text-sm font-mono text-foreground">{token.address}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Supply</span>
                  <span className="text-sm text-foreground">{formattedToken.formattedTotalSupply}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Holders</span>
                  <span className="text-sm text-foreground">{token.uniqueHolders || "N/A"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Created</span>
                  <span className="text-sm text-foreground">
                    {token.createdAt ? new Date(token.createdAt).toLocaleDateString() : "N/A"}
                  </span>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Chain</span>
                  <span className="text-sm text-foreground">Base</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Contract Type</span>
                  <span className="text-sm text-foreground">ERC-20</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Creator</span>
                  <span className="text-sm text-foreground">{token.creatorAddress || "N/A"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Age</span>
                  <span className="text-sm text-foreground">
                    {token.createdAt ? getAgeFromTimestamp(token.createdAt) : "N/A"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:w-80 space-y-6">
          {/* Quick Stats */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Quick Stats</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Price Change 1H</span>
                </div>
                <span className={cn("text-sm font-medium", 
                  dexScreenerData?.priceChange?.h1 && dexScreenerData.priceChange.h1 >= 0 ? "text-gain" : "text-loss"
                )}>
                  {dexScreenerData?.priceChange?.h1 ? `${dexScreenerData.priceChange.h1 >= 0 ? '+' : ''}${dexScreenerData.priceChange.h1.toFixed(2)}%` : "N/A"}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Price Change 6H</span>
                </div>
                <span className={cn("text-sm font-medium", 
                  dexScreenerData?.priceChange?.h6 && dexScreenerData.priceChange.h6 >= 0 ? "text-gain" : "text-loss"
                )}>
                  {dexScreenerData?.priceChange?.h6 ? `${dexScreenerData.priceChange.h6 >= 0 ? '+' : ''}${dexScreenerData.priceChange.h6.toFixed(2)}%` : "N/A"}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">FDV</span>
                </div>
                <span className="text-sm font-medium text-foreground">
                  {dexScreenerData?.fdv ? `$${dexScreenerData.fdv.toLocaleString()}` : "N/A"}
                </span>
              </div>
              
                              <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Transactions 24H</span>
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {dexScreenerData?.txns?.h24 ? `${dexScreenerData.txns.h24.buys + dexScreenerData.txns.h24.sells}` : "N/A"}
                  </span>
                </div>
            </div>
          </div>

          {/* Trading Pairs */}
          {dexScreenerData && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Trading Pairs</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-foreground">{dexScreenerData.baseToken.symbol}/USDC</p>
                    <p className="text-xs text-muted-foreground">{dexScreenerData.dexId}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">
                      ${parseFloat(dexScreenerData.priceUsd || "0").toFixed(6)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Vol: ${(dexScreenerData.volume?.h24 || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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