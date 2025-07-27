import { useState, useMemo, useEffect } from "react";
import { useWatchlist, WatchlistToken } from "@/hooks/useWatchlist";
import { getCoin } from "@zoralabs/coins-sdk";
import { useDexScreenerTokens } from "@/hooks/useDexScreener";
import { Coin } from "@/hooks/useTopVolume24h";
import { CoinWithImage } from "@/components/TokenTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePrivy } from '@privy-io/react-auth';
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Star, Trash2, RefreshCw, AlertCircle, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { FollowerPointerCard } from "@/components/ui/following-pointer";
import { formatDexScreenerPrice, DexScreenerPair } from "@/hooks/useDexScreener";
import moment from 'moment';
import { truncateAddress } from "@/lib/utils";
import { ReactNode } from "react";

// Custom WatchlistTable component
function WatchlistTable({ 
  coins, 
  dexScreenerData, 
  onCoinClick, 
  onRemove, 
  loading 
}: { 
  coins: CoinWithImage[], 
  dexScreenerData: Record<string, DexScreenerPair>, 
  onCoinClick: (address: string) => void,
  onRemove: (coin: CoinWithImage) => void,
  loading: boolean
}) {
  return (
    <div className="w-full overflow-x-auto bg-card rounded-lg border border-border">
      <table className="w-full">
        <thead className="bg-muted/50 text-muted-foreground text-sm">
          <tr>
            <th className="py-3 px-4 text-left font-medium">Token</th>
            <th className="py-3 px-4 text-left font-medium">Price</th>
            <th className="py-3 px-4 text-right font-medium">Market Cap</th>
            <th className="py-3 px-4 text-right font-medium">Added</th>
            <th className="py-3 px-4 text-center font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {coins.map((coin, index) => {
            const dexData = dexScreenerData[coin.address.toLowerCase()];
            const price = dexData ? String(formatDexScreenerPrice(dexData)) : "N/A";
            const marketCap = coin.marketCap ? `$${parseInt(coin.marketCap).toLocaleString()}` : "N/A";
            
            // Get watchlist entry for this token to show when it was added
            const watchlistData = coin.fineAge || 
              moment((coin as CoinWithImage & { addedAt?: number }).addedAt || Date.now()).fromNow();
              
            return (
              <tr 
                key={coin.address}
                onClick={() => onCoinClick(coin.address)}
                className={cn(
                  "border-b border-border hover:bg-muted/50 transition-colors cursor-pointer",
                  index % 2 === 0 ? "bg-card" : "bg-background"
                )}
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center overflow-hidden">
                      {coin.mediaContent?.previewImage?.small ? (
                        <img 
                          src={coin.mediaContent.previewImage.small} 
                          alt={coin.symbol} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center w-full h-full text-xs font-medium">
                          {coin.symbol?.charAt(0) || '?'}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{coin.symbol}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">{coin.name}</div>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="font-medium">{price}</div>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="font-medium">{marketCap}</div>
                </td>
                <td className="py-3 px-4 text-right text-sm text-muted-foreground">
                  {watchlistData}
                </td>
                <td className="py-3 px-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(coin);
                      }} 
                      className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-full transition-colors"
                      title="Remove from watchlist"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <span className="text-yellow-500 bg-yellow-500/10 p-1.5 rounded-full">
                      <Star className="w-4 h-4" fill="currentColor" />
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
          {loading && (
            <tr>
              <td colSpan={5} className="py-3 px-4 text-center">
                <div className="flex items-center justify-center">
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  <span>Loading tokens...</span>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function WatchlistPage() {
  const { user } = usePrivy();
  const walletAddress = user?.wallet?.address;
  const { watchlist, removeFromWatchlist, clearWatchlist } = useWatchlist(walletAddress);
  const [coins, setCoins] = useState<CoinWithImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const addresses = useMemo(() => 
    watchlist.map((token) => token.address), 
    [watchlist]
  );
  
  // Fetch DexScreener data for watched tokens
  const { 
    tokens: dexScreenerTokens, 
    loading: dexLoading, 
    error: dexError 
  } = useDexScreenerTokens("8453", addresses);
  
  // Fix DexScreenerData type
  const dexScreenerData = useMemo(() => {
    const map: Record<string, unknown> = {};
    dexScreenerTokens.forEach((pair) => {
      if (pair.baseToken?.address) {
        map[pair.baseToken.address.toLowerCase()] = pair;
      }
    });
    return map;
  }, [dexScreenerTokens]);

  // Function to fetch all token details
  const fetchTokenDetails = async (refresh = false) => {
    if (addresses.length === 0) {
      setCoins([]);
      setLoading(false);
      return;
    }
    
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    setError(null);
    
    try {
      const tokenDataPromises = addresses.map(async (address) => {
        try {
          const response = await getCoin({ address });
          const token = response.data?.zora20Token;
          
          if (!token) {
            console.warn(`No data found for token address: ${address}`);
            return null;
          }
          
          // Find watchlist entry
          const watchlistEntry = watchlist.find(t => t.address === address);
          
          // Fix type conversion for token object
          return {
            id: token.id || address,
            name: token.name || "Unknown Token",
            symbol: token.symbol || "???",
            address: address,
            description: token.description || "",
            totalSupply: token.totalSupply || "0",
            totalVolume: token.totalVolume || "0",
            volume24h: token.volume24h || "0",
            createdAt: token.createdAt || "",
            creatorAddress: token.creatorAddress || "",
            marketCap: token.marketCap || "0",
            marketCapDelta24h: token.marketCapDelta24h || "0",
            chainId: 8453, // Base chain
            uniqueHolders: token.uniqueHolders || 0,
            mediaContent: token.mediaContent,
            uniswapV3PoolAddress: token.uniswapV3PoolAddress || "",
            // Include watchlist metadata 
            addedAt: watchlistEntry?.addedAt || Date.now(),
            fineAge: watchlistEntry?.addedAt 
              ? moment(watchlistEntry.addedAt).fromNow()
              : 'Recently'
          } as unknown as CoinWithImage; // Safe type conversion
        } catch (err) {
          console.error(`Failed to fetch token ${address}:`, err);
          return null;
        }
      });
      
      const results = await Promise.all(tokenDataPromises);
      const validTokens = results.filter((token): token is CoinWithImage => token !== null);
      
      // Fix addedAt type issues
      validTokens.sort((a, b) => {
        const tokenA = watchlist.find(t => t.address === a.address);
        const tokenB = watchlist.find(t => t.address === b.address);
        const aAddedAt = tokenA?.addedAt || 0;
        const bAddedAt = tokenB?.addedAt || 0;
        return bAddedAt - aAddedAt;
      });
      
      setCoins(validTokens);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch watchlist tokens");
      console.error("Error fetching watchlist tokens:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch token data when watchlist changes
  useEffect(() => {
    fetchTokenDetails();
  }, [addresses]);

  // Handle refresh button click
  const handleRefresh = () => {
    fetchTokenDetails(true);
  };

  // Handle token click
  const handleCoinClick = (address: string) => {
    navigate(`/token/${address}`);
  };
  
  // Handle token removal
  const handleRemoveToken = (coin: CoinWithImage) => {
    removeFromWatchlist(coin.address);
    toast({
      title: "Removed from watchlist",
      description: `${coin.name || coin.symbol} has been removed from your watchlist`,
      variant: "default",
    });
  };

  // Handle clear watchlist with confirmation
  const handleClearWatchlist = () => {
    if (window.confirm("Are you sure you want to clear your entire watchlist?")) {
      clearWatchlist();
      toast({
        title: "Watchlist cleared",
        description: "All tokens have been removed from your watchlist",
        variant: "default",
      });
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-[1800px]">
      <div className="flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Watchlist</h1>
            <p className="text-muted-foreground mt-1">
              {watchlist.length} token{watchlist.length !== 1 ? "s" : ""} saved
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={refreshing || loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {watchlist.length > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleClearWatchlist}
                className="text-red-500 hover:text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid gap-4">
            <Skeleton className="h-64 w-full" />
          </div>
        ) : error ? (
          <Card className="w-full">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center p-6 text-center">
                <AlertCircle className="w-10 h-10 text-red-500 mb-2" />
                <h3 className="text-lg font-medium">Error loading watchlist</h3>
                <p className="text-muted-foreground mt-2">{error}</p>
                <Button 
                  variant="outline" 
                  className="mt-4" 
                  onClick={handleRefresh}
                >
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : watchlist.length === 0 ? (
          <Card className="w-full">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <Star className="w-12 h-12 text-yellow-500 mb-4" fill="currentColor" />
                <h3 className="text-xl font-medium">Your watchlist is empty</h3>
                <p className="text-muted-foreground mt-2 max-w-md">
                  Add tokens to your watchlist by clicking the star icon next to any token on Zoracle.
                </p>
                <Button 
                  variant="default" 
                  className="mt-6" 
                  onClick={() => navigate("/")}
                >
                  Explore Tokens
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <WatchlistTable
            coins={coins}
            dexScreenerData={dexScreenerData}
            onCoinClick={handleCoinClick}
            onRemove={handleRemoveToken}
            loading={refreshing}
          />
        )}
      </div>
    </div>
  );
} 