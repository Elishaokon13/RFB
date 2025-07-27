import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePrivy } from '@privy-io/react-auth';
import { useBalance } from 'wagmi';
import { Swap, SwapAmountInput, SwapToggleButton, SwapButton, SwapMessage } from '@coinbase/onchainkit/swap';
import { Token } from '@coinbase/onchainkit/token';
import {
  ArrowLeft,
  TrendingUp,
  DollarSign,
  Activity,
  ExternalLink,
  ArrowUpDown,
  Wallet,
  MessageCircle,
  Users,
  BarChart3,
  Lock,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTokenDetails, calculateCreatorEarnings, formatTokenValue, type TokenDetails } from "@/hooks/useTokenDetails";
import { useNumberFormatter } from "@/lib/formatNumber";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useZoraProfile, getProfileImageSmall } from "@/hooks/useZoraProfile";
import { formatLastTradedTime } from "@/hooks/getCoinsLastTraded";
import { formatUniqueHolders } from "@/hooks/getCoinsLastTradedUnique";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTokenWhaleTracker, WhaleTransferEvent, WhaleHolder } from "@/hooks/useTokenWhaleTracker";

// DefiLlama API helper functions
interface DefiLlamaTransaction {
  id: string;
  type: "Buy" | "Sell";
  amount: string;
  tokenAmount: string;
  price: number;
  timestamp: number;
  maker: {
    address: string;
    profileName?: string;
    profileImage?: string;
  };
  txHash: string;
}

interface DefiLlamaTrader {
  address: string;
  profileName?: string;
  profileImage?: string;
  totalVolume: number;
  trades: number;
  lastTraded: number;
}

// Helper function to fetch token transactions from DefiLlama
const fetchTokenTransactions = async (
  tokenAddress: string,
  chain: string = "base"
): Promise<DefiLlamaTransaction[]> => {
  try {
    // Use DefiLlama API to fetch transactions
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    let response;
    try {
      response = await fetch(
        `https://api.llama.fi/token/${chain}:${tokenAddress}/transactions?limit=50`,
        { signal: controller.signal }
      );
    } catch (err) {
      console.error("Fetch error:", err);
      clearTimeout(timeoutId);
      return [];
    }
    
    clearTimeout(timeoutId);
    
    if (!response || !response.ok) {
      console.warn(`Failed to fetch transactions: ${response?.statusText || 'Null response'}`);
      return [];
    }
    
    let data;
    try {
      data = await response.text();
      // Only try to parse as JSON if we have content
      data = data ? JSON.parse(data) : { transactions: [] };
    } catch (err) {
      console.error("JSON parse error:", err);
      return [];
    }
    
    // Transform the data to our transaction format
    return Array.isArray(data.transactions) ? data.transactions.map((tx: Record<string, unknown>) => ({
      id: tx.hash?.toString() || `tx-${Math.random().toString(16).slice(2)}`,
      type: tx.type === "sell" ? "Sell" : "Buy",
      amount: `${parseFloat(tx.amountUSD?.toString() || "0").toFixed(4)} USD`,
      tokenAmount: `${parseFloat(tx.amount?.toString() || "0").toFixed(2)} ${tx.symbol?.toString() || "tokens"}`,
      price: parseFloat(tx.priceUSD?.toString() || "0"),
      timestamp: (tx.timestamp ? Number(tx.timestamp) * 1000 : Date.now()),
      maker: {
        address: tx.from?.toString() || "0x0000000000000000000000000000000000000000",
        profileName: undefined,
      },
      txHash: tx.hash?.toString() || "",
    })) : [];
  } catch (error) {
    console.error("Error fetching token transactions:", error);
    return [];
  }
};

// Helper function to fetch top traders from DefiLlama
const fetchTopTraders = async (
  tokenAddress: string,
  chain: string = "base"
): Promise<DefiLlamaTrader[]> => {
  try {
    // Use DefiLlama API to fetch top traders
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    let response;
    try {
      response = await fetch(
        `https://api.llama.fi/token/${chain}:${tokenAddress}/traders?limit=10`,
        { signal: controller.signal }
      );
    } catch (err) {
      console.error("Fetch error:", err);
      clearTimeout(timeoutId);
      return [];
    }
    
    clearTimeout(timeoutId);
    
    if (!response || !response.ok) {
      console.warn(`Failed to fetch top traders: ${response?.statusText || 'Null response'}`);
      return [];
    }
    
    let data;
    try {
      data = await response.text();
      // Only try to parse as JSON if we have content
      data = data ? JSON.parse(data) : { traders: [] };
    } catch (err) {
      console.error("JSON parse error:", err);
      return [];
    }
    
    // Transform the data to our trader format
    return Array.isArray(data.traders) ? data.traders.map((trader: Record<string, unknown>) => ({
      address: trader.address?.toString() || `0x${Math.random().toString(16).slice(2, 42)}`,
      profileName: undefined,
      totalVolume: parseFloat(trader.volumeUSD?.toString() || "0"),
      trades: Number(trader.txCount || 0),
      lastTraded: (trader.lastTimestamp ? Number(trader.lastTimestamp) * 1000 : Date.now()),
    })).sort((a: DefiLlamaTrader, b: DefiLlamaTrader) => b.totalVolume - a.totalVolume) : [];
  } catch (error) {
    console.error("Error fetching top traders:", error);
    return [];
  }
};

// Function to transform WhaleHolder data to our format
const transformHolders = (holders: WhaleHolder[], tokenPrice: number): Holder[] => {
  return holders.map((holder, index) => {
    const balance = Number(holder.balance.toString()) / 10**18; // Convert from wei to token units
    const percentage = holder.percentage || 0;
    const value = balance * tokenPrice;
    
    return {
      address: holder.address,
      profileName: undefined,
      balance: balance.toLocaleString(undefined, { maximumFractionDigits: 2 }),
      percentage,
      value,
    };
  }).sort((a, b) => b.percentage - a.percentage);
};

// Chart period types
type ChartPeriod = "1H" | "6H" | "24H" | "7D" | "1M" | "All";

// Helper function to calculate market cap from price and total supply
const calculateMarketCap = (
  price: number,
  totalSupply: string | number
): number => {
  const supply =
    typeof totalSupply === "string" ? parseFloat(totalSupply) : totalSupply;
  return price * supply;
};

// Helper function to transform price data to market cap data
const transformPriceToMarketCap = (
  priceData: Array<{ timestamp: number; price: number }> | null,
  totalSupply: string | number
): Array<{ timestamp: number; value: number; price: number }> => {
  if (!priceData || priceData.length === 0) return [];

  return priceData.map((point) => ({
    timestamp: point.timestamp,
    value: calculateMarketCap(point.price, totalSupply),
    price: point.price,
  }));
};

// Helper function to calculate percentage change
const calculatePercentageChange = (
  data: Array<{ timestamp: number; value: number; price: number }>
): number => {
  if (data.length < 2) return 0;

  const latest = data[data.length - 1].value;
  const earliest = data[0].value;

  if (earliest === 0) return 0;

  return ((latest - earliest) / earliest) * 100;
};

// Place this helper function before TokenDetails component
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

// --- Trade Hook ---
function useTradeCoin({
  account,
  walletClient,
  publicClient,
}: {
  account: Account | null;
  walletClient: WalletClient | null;
  publicClient: PublicClient | null;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<unknown>(null);

  const trade = async (tradeParameters: TradeParameters) => {
    setLoading(true);
    setError(null);
    setReceipt(null);
    try {
      if (!account || !walletClient || !publicClient)
        throw new Error("Wallet not connected");
      const result: unknown = await tradeCoin({
        tradeParameters,
        walletClient,
        account,
        publicClient,
      });
      setReceipt(result);
      return result;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Trade failed");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { trade, loading, error, receipt };
}

function hasMediaContent(
  token: unknown
): token is { mediaContent: { previewImage?: { medium?: string } } } {
  return typeof token === "object" && token !== null && "mediaContent" in token;
}

// Transaction data types
interface Transaction {
  id: string;
  type: "Buy" | "Sell";
  amount: string;
  tokenAmount: string;
  price: number;
  timestamp: number;
  maker: {
    address: string;
    profileName?: string;
    profileImage?: string;
  };
  txHash: string;
}

// Top trader data type
interface Trader {
  address: string;
  profileName?: string;
  profileImage?: string;
  totalVolume: number;
  trades: number;
  lastTraded: number;
}

// Holder data type
interface Holder {
  address: string;
  profileName?: string;
  profileImage?: string;
  balance: string;
  percentage: number;
  value: number;
}

// Mock data generator functions
const generateMockTransactions = (
  tokenSymbol: string = "TOKEN",
  count: number = 10
): Transaction[] => {
  return Array.from({ length: count }, (_, i) => {
    const now = Date.now();
    const type = Math.random() > 0.5 ? "Buy" : "Sell";
    const amount = (Math.random() * 2 + 0.1).toFixed(4);
    const tokenAmount = (Math.random() * 10000 + 100).toFixed(2);
    const price = parseFloat((Math.random() * 0.001 + 0.0001).toFixed(6));

    return {
      id: `tx-${i}`,
      type,
      amount: `${amount} ETH`,
      tokenAmount: `${tokenAmount} ${tokenSymbol}`,
      price,
      timestamp: now - i * 60000 - Math.floor(Math.random() * 300000),
      maker: {
        address: `0x${Math.random().toString(16).substring(2, 42)}`,
        profileName: Math.random() > 0.7 ? `trader${i}` : undefined,
      },
      txHash: `0x${Math.random().toString(16).substring(2, 66)}`,
    };
  });
};

const generateMockTraders = (count: number = 10): Trader[] => {
  return Array.from({ length: count }, (_, i) => {
    const now = Date.now();
    return {
      address: `0x${Math.random().toString(16).substring(2, 42)}`,
      profileName: Math.random() > 0.7 ? `trader${i}` : undefined,
      totalVolume: Math.random() * 100000 + 1000,
      trades: Math.floor(Math.random() * 100) + 1,
      lastTraded: now - Math.floor(Math.random() * 86400000),
    };
  }).sort((a, b) => b.totalVolume - a.totalVolume);
};

const generateMockHolders = (
  totalSupply: string,
  count: number = 10
): Holder[] => {
  const total = parseFloat(totalSupply || "1000000");
  let remainingPercentage = 100;

  return Array.from({ length: count }, (_, i) => {
    const percentage =
      i === count - 1
        ? remainingPercentage
        : Math.min(
            remainingPercentage,
            Math.random() * 20 + (i === 0 ? 10 : 1)
          );

    remainingPercentage -= percentage;
    const balance = ((total * percentage) / 100).toFixed(2);
    const value = Math.random() * 10000 * percentage;

    return {
      address: `0x${Math.random().toString(16).substring(2, 42)}`,
      profileName: Math.random() > 0.7 ? `holder${i}` : undefined,
      balance,
      percentage,
      value,
    };
  }).sort((a, b) => b.percentage - a.percentage);
};

const TRADE_ROUTER_ADDRESS = "0x6ff5693b99212da76ad316178a184ab56d299b43";

export default function TokenDetails() {
  const { address: rawAddress } = useParams<{ address: string }>();
  const navigate = useNavigate();
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>("24H");
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({
    transactions: false,
    traders: false,
    holders: false,
  });

  const { formatNumber } = useNumberFormatter();

  // Get chart parameters based on selected period
  const getChartParams = (period: ChartPeriod) => {
    switch (period) {
      case "1H":
        return { period: "5m", span: 12, timeRange: 3600 }; // 1 hour, 5-min intervals
      case "6H":
        return { period: "15m", span: 24, timeRange: 21600 }; // 6 hours, 15-min intervals
      case "24H":
        return { period: "1h", span: 24, timeRange: 86400 }; // 24 hours, 1-hour intervals
      case "7D":
        return { period: "4h", span: 42, timeRange: 604800 }; // 7 days, 4-hour intervals
      case "1M":
        return { period: "1d", span: 30, timeRange: 2592000 }; // 30 days, daily intervals
      case "All":
        return { period: "1d", span: 90, timeRange: 7776000 }; // 90 days, daily intervals
      default:
        return { period: "1h", span: 24, timeRange: 86400 };
    }
  };

  const chartParams = getChartParams(chartPeriod);

  // Stabilize the address to prevent unnecessary re-renders
  const address = useMemo(() => {
    return rawAddress || null;
  }, [rawAddress]);

  // Fetch coin details using the proper hook
  const { coin: token, loading, error } = useCoinDetails(address);

  // Fetch DexScreener data for this token
  const {
    tokens: dexTokens,
    loading: dexLoading,
    error: dexError,
  } = useDexScreenerTokens("8453", rawAddress ? [rawAddress] : []);

  const dexData: DexScreenerPair | undefined = useMemo(
    () => (dexTokens && dexTokens.length > 0 ? dexTokens[0] : undefined),
    [dexTokens]
  );

  // Fetch current price from DefiLlama
  const {
    priceData: defiLlamaPrice,
    loading: priceLoading,
    error: priceError,
  } = useDefiLlamaPrice("8453", address);

  // Use DefiLlama price if available, otherwise fall back to calculated price
  const price =
    defiLlamaPrice?.price ||
    (token?.marketCap && token?.totalSupply
      ? Number(token.marketCap) / Number(token.totalSupply)
      : null);

  // Use TokenWhaleTracker for real holder data
  const {
    holders: whaleHolders,
    loading: holdersLoading,
    error: holdersError,
    totalSupply,
  } = useTokenWhaleTracker({
    tokenAddress: address || "",
    startBlock: 0,
  });

  // State for real data
  const [transactions, setTransactions] = useState<DefiLlamaTransaction[]>([]);
  const [topTraders, setTopTraders] = useState<DefiLlamaTrader[]>([]);
  const [holders, setHolders] = useState<Holder[]>([]);

  // Transform whale holders data when available
  useEffect(() => {
    if (whaleHolders.length > 0 && typeof price === 'number' && price > 0) {
      const transformedHolders = transformHolders(whaleHolders, price);
      setHolders(transformedHolders.length > 0 ? transformedHolders : generateMockHolders(token?.totalSupply || "1000000", 10));
    } else if (token?.totalSupply && !holdersLoading) {
      setHolders(generateMockHolders(token.totalSupply, 10));
    }
  }, [whaleHolders, price, holdersLoading, token?.totalSupply]);

  // Fetch real data when address changes or tab is selected
  useEffect(() => {
    const fetchData = async () => {
      if (!address) return;

      // Fetch transactions when transactions tab is selected
      if (activeTab === "transactions" && !transactions.length) {
        setIsLoading((prev) => ({ ...prev, transactions: true }));
        try {
          const txData = await fetchTokenTransactions(address);
          setTransactions(txData.length > 0 ? txData : generateMockTransactions(token?.symbol || "TOKEN", 20));
        } catch (err) {
          console.error("Error fetching transactions:", err);
          setTransactions(generateMockTransactions(token?.symbol || "TOKEN", 20));
        } finally {
          setIsLoading((prev) => ({ ...prev, transactions: false }));
        }
      }

      // Fetch top traders when traders tab is selected
      if (activeTab === "traders" && !topTraders.length) {
        setIsLoading((prev) => ({ ...prev, traders: true }));
        try {
          const tradersData = await fetchTopTraders(address);
          setTopTraders(tradersData.length > 0 ? tradersData : generateMockTraders(10));
        } catch (err) {
          console.error("Error fetching top traders:", err);
          setTopTraders(generateMockTraders(10));
        } finally {
          setIsLoading((prev) => ({ ...prev, traders: false }));
        }
      }
    };

    fetchData();
  }, [address, activeTab, transactions.length, topTraders.length, token?.symbol]);

  // Fetch historical price data for chart from DefiLlama
  const {
    chartData: historicalPriceData,
    loading: chartLoading,
    error: chartError,
  } = useDefiLlamaHistoricalPrices(
    "8453",
    address,
    chartParams.span,
    chartParams.timeRange
  );

  // Transform price data to market cap data
  const marketCapChartData = useMemo(() => {
    // If we have historical data and total supply, use real data
    if (
      historicalPriceData &&
      Array.isArray(historicalPriceData) &&
      historicalPriceData.length > 0 &&
      token?.totalSupply
    ) {
      try {
        // DefiLlama historical data format is { timestamp: number, price: number }
        const transformed = historicalPriceData.map(dataPoint => {
          // Ensure dataPoint has the expected properties
          if (typeof dataPoint !== 'object' || dataPoint === null) {
            return null;
          }
          
          const timestamp = typeof dataPoint.timestamp === 'number' ? dataPoint.timestamp : Math.floor(Date.now() / 1000);
          const price = typeof dataPoint.price === 'number' ? dataPoint.price : 0;
          
          return {
            timestamp,
            value: calculateMarketCap(price, token.totalSupply),
            price,
          };
        }).filter(Boolean); // Remove any null entries
        
        return transformed;
      } catch (e) {
        console.error("Error transforming price data:", e);
        return [];
      }
    }

    // Fallback: create synthetic data based on current price and market cap
    if (price && token?.marketCap) {
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const syntheticData = [];

      // Create 24 data points over the last 24 hours
      for (let i = 23; i >= 0; i--) {
        const timestamp = currentTimestamp - i * 3600; // 1 hour intervals
        // Add some realistic variation (±5%)
        const variation = 1 + (Math.random() - 0.5) * 0.1;
        const syntheticPrice = price * variation;
        const syntheticMarketCap = calculateMarketCap(
          syntheticPrice,
          token.totalSupply || 0
        );

        syntheticData.push({
          timestamp,
          value: syntheticMarketCap,
          price: syntheticPrice,
        });
      }

      return syntheticData;
    }

    // Final fallback: use current market cap as a single data point
    if (token?.marketCap) {
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const currentMarketCap = parseFloat(token.marketCap);

      // Create a simple line with the current market cap
      return [
        {
          timestamp: currentTimestamp - 3600, // 1 hour ago
          value: currentMarketCap * 0.98, // Slightly lower
          price: price || 0,
        },
        {
          timestamp: currentTimestamp,
          value: currentMarketCap,
          price: price || 0,
        },
      ];
    }

    return [];
  }, [historicalPriceData, token?.totalSupply, price, token?.marketCap]);

  // Calculate percentage change for the chart
  const chartPercentageChange = useMemo(() => {
    return calculatePercentageChange(marketCapChartData);
  }, [marketCapChartData]);

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleCoinClick = useCallback(
    (coinAddress: string) => {
      navigate(`/token/${coinAddress}`);
    },
    [navigate]
  );

  // Add wagmi wallet connection state
  const { address: walletAddress, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [txStatus, setTxStatus] = useState<
    null | "pending" | "success" | "error"
  >(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [txReceipt, setTxReceipt] = useState<unknown>(null);

  const { data: ethBalance, isLoading: isBalanceLoading } = useBalance({
    address: walletAddress,
    chainId: 8453, // Base mainnet
    token: undefined, // native ETH
  });

  // Trading UI state
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const [tradeAmount, setTradeAmount] = useState("");
  const [slippage, setSlippage] = useState(0.5); // Default slippage
  const [inputMode, setInputMode] = useState<"ETH" | "USD">("ETH");
  const [sellInputMode, setSellInputMode] = useState<"TOKEN" | "USD">("TOKEN");
import { Badge } from "@/components/ui/badge";

// GeckoTerminalWidget Component
function GeckoTerminalWidget({ tokenAddress }: { tokenAddress: string }) {
  const [widgetLoaded, setWidgetLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setWidgetLoaded(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full h-full">
      <div className="w-full h-[800px] rounded-lg overflow-hidden relative bg-white border border-gray-200 dark:bg-gray-900 dark:border-gray-700">
        {!widgetLoaded && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 mx-auto bg-blue-500 rounded-full flex items-center justify-center animate-pulse">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Loading Trading Interface</p>
            </div>
          </div>
        )}
        <iframe
          src={`https://www.geckoterminal.com/base/tokens/${tokenAddress}?embed=1&info=0&swaps=1`}
          frameBorder="0"
          allow="clipboard-write"
          className="w-full h-full"
          onLoad={() => setWidgetLoaded(true)}
          title="GeckoTerminal Trading Widget"
        />
      </div>
    </div>
  );
}

// TokenHeader Component
function TokenHeader({ token }: { token: TokenDetails | null }) {
  const [showFullDescription, setShowFullDescription] = useState(false);
  const creatorHandle = token?.creatorAddress ? `${token.creatorAddress.slice(0, 6)}...${token.creatorAddress.slice(-4)}` : 'Unknown';
  const timeAgo = token?.createdAt ? getTimeAgo(token.createdAt) : '4d';
  
  const description = token?.description || "Loading token description...";
  const MAX_DESCRIPTION_LENGTH = 120; // Characters to show before truncating
  const shouldTruncate = description.length > MAX_DESCRIPTION_LENGTH;
  const displayDescription = shouldTruncate && !showFullDescription 
    ? `${description.slice(0, MAX_DESCRIPTION_LENGTH)}...` 
    : description;

  return (
    <div className="p-6 border-b border-gray-100 dark:border-gray-800">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
          {token?.mediaContent?.previewImage?.small ? (
            <img 
              src={token.mediaContent.previewImage.small} 
              alt={token.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-lg">🧠</span>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm text-gray-500">{creatorHandle}</span>
            <span className="text-sm text-gray-400">{timeAgo}</span>
            {token?.creatorAddress && (
              <a 
                href={`https://basescan.org/address/${token.creatorAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {token?.name || "Loading..."}
          </h1>
          <div className="text-gray-600 dark:text-gray-400 text-sm">
            <p className="leading-relaxed">
              {displayDescription}
            </p>
            {shouldTruncate && (
              <button
                onClick={() => setShowFullDescription(!showFullDescription)}
                className="text-primary hover:text-primary/80 text-xs font-medium mt-1 transition-colors"
              >
                {showFullDescription ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// TokenStats Component
function TokenStats({ token }: { token: TokenDetails | null }) {
  const creatorEarnings = calculateCreatorEarnings(token);

  return (
    <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
      <div className="grid grid-cols-3 gap-6">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Market Cap</p>
          <div className="flex items-center gap-1">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="font-semibold text-green-500">
              ${token ? formatTokenValue(token.marketCap) : '0'}
            </span>
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">24H Volume</p>
          <div className="flex items-center gap-1">
            <Activity className="w-4 h-4 text-gray-600" />
            <span className="font-semibold text-gray-900 dark:text-white">
              ${token ? formatTokenValue(token.volume24h) : '0'}
            </span>
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Creator Earnings</p>
          <div className="flex items-center gap-1">
            <Wallet className="w-4 h-4 text-gray-600" />
            <span className="font-semibold text-gray-900 dark:text-white">
              ${formatTokenValue(creatorEarnings)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sleek Trading Interface with OnchainKit Swap
function TradingInterface({ token }: { token: TokenDetails | null }) {
  // Get Privy user info
  const { user, authenticated } = usePrivy();
  const userAddress = user?.wallet?.address;

  // Get ETH balance
  const { data: ethBalance, isLoading: isBalanceLoading, refetch: refetchBalance } = useBalance({
    address: userAddress as `0x${string}`,
    query: {
      enabled: !!userAddress && authenticated,
      refetchInterval: 10000, // Refresh every 10 seconds
    },
  });

  // Define ETH token for Base chain (always the source)
  const ETH_TOKEN: Token = {
    name: 'Ethereum',
    address: '', // Empty string for native ETH on Base
    symbol: 'ETH',
    decimals: 18,
    image: 'https://wallet-api-production.s3.amazonaws.com/uploads/tokens/eth_288.png',
    chainId: 8453,
  };

  // Define current token (always the destination)
  const CURRENT_TOKEN: Token = {
    name: token?.name || 'Token',
    address: (token?.address || '0x') as `0x${string}`,
    symbol: token?.symbol || 'TOKEN',
    decimals: 18,
    image: token?.mediaContent?.previewImage?.small || '',
    chainId: 8453,
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        
        
        
      </div>

      {/* OnchainKit Swap Component */}
      <div className="space-y-4">
        <Swap>
          <SwapAmountInput
            label="You pay"
            type="from"
            token={ETH_TOKEN}
          />
          <SwapAmountInput
            label="You receive"
            type="to"
            token={CURRENT_TOKEN}
          />
          <SwapButton />
          <SwapMessage />
        </Swap>
      </div>
    </div>
  );
}

// CommentsSection Component
function CommentsSection({ token }: { token: TokenDetails | null }) {
  const comments = token?.zoraComments?.edges || [];
  const commentsCount = token?.zoraComments?.count || 0;

  return (
    <div className="flex-1">
      <Tabs defaultValue="comments" className="h-full flex flex-col">
        <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-800">
          <TabsList className="grid w-full grid-cols-4 bg-gray-100 dark:bg-gray-800">
            <TabsTrigger value="comments" className="text-xs">
              Comments <Badge className="ml-1 text-xs">{commentsCount}</Badge>
            </TabsTrigger>
            <TabsTrigger value="holders" className="text-xs">
              Holders <Badge className="ml-1 text-xs">{token?.uniqueHolders || '0'}</Badge>
            </TabsTrigger>
            <TabsTrigger value="activity" className="text-xs">Activity</TabsTrigger>
            <TabsTrigger value="details" className="text-xs">Details</TabsTrigger>
          </TabsList>
        </div>

          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }, (_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <Skeleton className="w-20 h-4" />
                    <Skeleton className="w-32 h-8" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Chart Skeleton */}
          <Card>
            <CardContent className="pt-6">
              <Skeleton className="w-full h-64" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !token) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6 text-center">
              <div className="mb-4">
                <Shield className="w-12 h-12 mx-auto text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Token Not Found
              </h2>
              <p className="text-muted-foreground mb-6">
                The token you're looking for doesn't exist or has been removed.
              </p>
              <Button onClick={handleBack} className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const formattedToken = formatCoinData(token);

  return (
    <div className="w-full mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="w-full flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-xl overflow-hidden flex items-center justify-center">
              {hasMediaContent(token) &&
              token.mediaContent.previewImage?.medium ? (
                <img
                  src={token.mediaContent.previewImage.medium}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-muted-foreground text-xl">◎</span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {token.name || "Unknown Token"}
              </h1>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{token.symbol || "N/A"}</Badge>
                <Badge variant="outline">Base</Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="w-full lg:col-span-2 space-y-6">
          {/* Price Overview Cards */}
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Current Price</p>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {priceLoading ? (
                    <Skeleton className="w-24 h-8" />
                  ) : price !== null ? (
                    `$${price.toFixed(6)}`
                  ) : (
                    calculateFallbackPrice(token?.marketCap, token?.totalSupply)
                  )}
                </p>
                {defiLlamaPrice?.confidence && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Confidence: {(defiLlamaPrice.confidence * 100).toFixed(0)}%
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Market Cap</p>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  ${formatNumber(token?.marketCap || "0")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">24h Volume</p>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  ${formatNumber(token?.volume24h || "0")}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs for different content sections */}
          <Tabs
            defaultValue="overview"
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
              <TabsTrigger value="traders">Top Traders</TabsTrigger>
              <TabsTrigger value="holders">Holders</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Interactive Price Chart */}
              <Card>
                <CardContent className="pt-6">
                  <PriceChart
                    data={marketCapChartData}
                    changePercent={chartPercentageChange}
                    selectedRange={chartPeriod}
                    onRangeChange={(range) =>
                      setChartPeriod(range as ChartPeriod)
                    }
                    loading={chartLoading || loading || !token}
                    error={chartError || error}
                    totalSupply={token?.totalSupply}
                  />
                </CardContent>
              </Card>

              {/* Token Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Token Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground flex items-center gap-2">
                          <Globe className="w-4 h-4" />
                          Token Address
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono text-foreground">
                            {truncateAddress(token?.address || "")}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Total Supply
                        </span>
                        <span className="text-sm text-foreground">
                          {formattedToken?.formattedTotalSupply || "N/A"}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Holders
                        </span>
                        <span className="text-sm text-foreground">
                          {token?.uniqueHolders || "N/A"}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Created
                        </span>
                        <span className="text-sm text-foreground">
                          {token?.createdAt
                            ? new Date(token.createdAt).toLocaleDateString()
                            : "N/A"}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Chain
                        </span>
                        <Badge variant="outline">Base</Badge>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Contract Type
                        </span>
                        <Badge variant="secondary">ERC-20</Badge>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Creator
                        </span>
                        <span className="text-sm text-foreground">
                          {typeof token?.creatorAddress === "string" ? (
                            <Identity
                              address={token.creatorAddress as `0x${string}`}
                            >
                              {null}
                            </Identity>
                          ) : (
                            "N/A"
                          )}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Age
                        </span>
                        <span className="text-sm text-foreground">
                          {token?.createdAt
                            ? getAgeFromTimestamp(token.createdAt)
                            : "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Transactions Tab */}
            <TabsContent value="transactions">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Recent Transactions
                  </CardTitle>
                  <CardDescription>
                    Latest trades for {token?.symbol || "this token"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading.transactions ? (
                    <div className="space-y-4 py-4">
                      <div className="flex justify-center">
                        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                      <p className="text-center text-sm text-muted-foreground">
                        Loading transaction data...
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Maker</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead className="text-right">Tx</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-4">
                              No transactions found
                            </TableCell>
                          </TableRow>
                        ) : (
                          transactions.map((tx) => (
                            <TableRow key={tx.id}>
                              <TableCell>
                                <span className={cn(
                                  "px-2 py-1 rounded-md text-xs font-medium",
                                  tx.type === "Buy" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                )}>
                                  {tx.type}
                                </span>
                              </TableCell>
                              <TableCell>${tx.price.toFixed(6)}</TableCell>
                              <TableCell>{tx.tokenAmount}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                                    {tx.maker.address.slice(2, 4).toUpperCase()}
                                  </div>
                                  <span className="text-sm">
                                    {tx.maker.profileName || truncateAddress(tx.maker.address)}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {(() => {
                                  try {
                                    return formatLastTradedTime(new Date(tx.timestamp).toISOString());
                                  } catch (e) {
                                    return `${Math.floor((Date.now() - tx.timestamp) / 60000)}m ago`;
                                  }
                                })()}
                              </TableCell>
                              <TableCell className="text-right">
                                <a 
                                  href={`https://basescan.org/tx/${tx.txHash}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline flex items-center justify-end gap-1"
                                >
                                  <span className="text-xs">{truncateAddress(tx.txHash)}</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  )}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Maker</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead className="text-right">Tx</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-4">
                            No transactions found
                          </TableCell>
                        </TableRow>
                      ) : (
                        transactions.map((tx) => (
                          <TableRow key={tx.id}>
                            <TableCell>
                              <span
                                className={cn(
                                  "px-2 py-1 rounded-md text-xs font-medium",
                                  tx.type === "Buy"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                )}
                              >
                                {tx.type}
                              </span>
                            </TableCell>
                            <TableCell>${tx.price.toFixed(6)}</TableCell>
                            <TableCell>{tx.tokenAmount}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                                  {tx.maker.address.slice(2, 4).toUpperCase()}
                                </div>
                                <span className="text-sm">
                                  {tx.maker.profileName ||
                                    truncateAddress(tx.maker.address)}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {(() => {
                                try {
                                  return formatLastTradedTime(
                                    new Date(tx.timestamp).toISOString()
                                  );
                                } catch (e) {
                                  return `${Math.floor(
                                    (Date.now() - tx.timestamp) / 60000
                                  )}m ago`;
                                }
                              })()}
                            </TableCell>
                            <TableCell className="text-right">
                              <a
                                href={`https://basescan.org/tx/${tx.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline flex items-center justify-end gap-1"
                              >
                                <span className="text-xs">
                                  {truncateAddress(tx.txHash)}
                                </span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Top Traders Tab */}
            <TabsContent value="traders">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Top Traders
                  </CardTitle>
                  <CardDescription>
                    Most active traders for {token?.symbol || "this token"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading.traders ? (
                    <div className="space-y-4 py-4">
                      <div className="flex justify-center">
                        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                      <p className="text-center text-sm text-muted-foreground">
                        Loading trader data...
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rank</TableHead>
                          <TableHead>Trader</TableHead>
                          <TableHead>Total Volume</TableHead>
                          <TableHead>Trades</TableHead>
                          <TableHead>Last Traded</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topTraders.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-4">
                              No traders found
                            </TableCell>
                          </TableRow>
                        ) : (
                          topTraders.map((trader, index) => (
                            <TableRow key={trader.address}>
                              <TableCell>#{index + 1}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                                    {trader.address.slice(2, 4).toUpperCase()}
                                  </div>
                                  <span className="text-sm">
                                    {trader.profileName || truncateAddress(trader.address)}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>${trader.totalVolume.toLocaleString()}</TableCell>
                              <TableCell>{trader.trades}</TableCell>
                              <TableCell>
                                {(() => {
                                  try {
                                    return formatLastTradedTime(new Date(trader.lastTraded).toISOString());
                                  } catch (e) {
                                    return `${Math.floor((Date.now() - trader.lastTraded) / 60000)}m ago`;
                                  }
                                })()}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  )}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rank</TableHead>
                        <TableHead>Trader</TableHead>
                        <TableHead>Total Volume</TableHead>
                        <TableHead>Trades</TableHead>
                        <TableHead>Last Traded</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topTraders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-4">
                            No traders found
                          </TableCell>
                        </TableRow>
                      ) : (
                        topTraders.map((trader, index) => (
                          <TableRow key={trader.address}>
                            <TableCell>#{index + 1}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                                  {trader.address.slice(2, 4).toUpperCase()}
                                </div>
                                <span className="text-sm">
                                  {trader.profileName ||
                                    truncateAddress(trader.address)}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              ${trader.totalVolume.toLocaleString()}
                            </TableCell>
                            <TableCell>{trader.trades}</TableCell>
                            <TableCell>
                              {(() => {
                                try {
                                  return formatLastTradedTime(
                                    new Date(trader.lastTraded).toISOString()
                                  );
                                } catch (e) {
                                  return `${Math.floor(
                                    (Date.now() - trader.lastTraded) / 60000
                                  )}m ago`;
                                }
                              })()}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Holders Tab */}
            <TabsContent value="holders">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Top Holders
                  </CardTitle>
                  <CardDescription>
                    Largest holders of {token?.symbol || "this token"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {holdersLoading ? (
                    <div className="space-y-4 py-4">
                      <div className="flex justify-center">
                        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                      <p className="text-center text-sm text-muted-foreground">
                        Loading holder data...
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rank</TableHead>
                          <TableHead>Holder</TableHead>
                          <TableHead>Balance</TableHead>
                          <TableHead>Percentage</TableHead>
                          <TableHead className="text-right">Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {holders.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-4">
                              No holders found
                            </TableCell>
                          </TableRow>
                        ) : (
                          holders.map((holder, index) => (
                            <TableRow key={holder.address}>
                              <TableCell>#{index + 1}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                                    {holder.address.slice(2, 4).toUpperCase()}
                                  </div>
                                  <span className="text-sm">
                                    {holder.profileName || truncateAddress(holder.address)}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>{holder.balance}</TableCell>
                              <TableCell>{holder.percentage.toFixed(2)}%</TableCell>
                              <TableCell className="text-right">${holder.value.toLocaleString()}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  )}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rank</TableHead>
                        <TableHead>Holder</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Percentage</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {holders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-4">
                            No holders found
                          </TableCell>
                        </TableRow>
                      ) : (
                        holders.map((holder, index) => (
                          <TableRow key={holder.address}>
                            <TableCell>#{index + 1}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                                  {holder.address.slice(2, 4).toUpperCase()}
                                </div>
                                <span className="text-sm">
                                  {holder.profileName ||
                                    truncateAddress(holder.address)}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>{holder.balance}</TableCell>
                            <TableCell>
                              {holder.percentage.toFixed(2)}%
                            </TableCell>
                            <TableCell className="text-right">
                              ${holder.value.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        {isConnected ? (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Trading Coins</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    variant={tradeType === "buy" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTradeType("buy")}
                    className="flex-1"
                  >
                    Buy
                  </Button>
                  <Button
                    variant={tradeType === "sell" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTradeType("sell")}
                    className="flex-1"
                  >
                    Sell
                  </Button>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder={
                      tradeType === "buy"
                        ? inputMode === "ETH"
                          ? "ETH amount to buy"
                          : "USD amount to spend"
                        : sellInputMode === "TOKEN"
                        ? `${token?.symbol || "Token"} amount to sell`
                        : "USD amount to sell"
                    }
                    value={tradeAmount}
                    onChange={(e) => setTradeAmount(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-background pr-20"
                  />
                  {(tradeType === "buy" || tradeType === "sell") && (
                    <button
                      type="button"
                      className="absolute right-14 top-1/2 -translate-y-1/2 text-xs text-primary font-semibold px-1 py-0.5 rounded hover:underline"
                      style={{ background: "transparent", border: "none" }}
                      onClick={
                        tradeType === "buy" ? handleMaxBuy : handleMaxSell
                      }
                      tabIndex={-1}
                    >
                      Max
                    </button>
                  )}
                  {tradeType === "buy" && (
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() =>
                        setInputMode(inputMode === "ETH" ? "USD" : "ETH")
                      }
                      tabIndex={-1}
                      aria-label="Toggle input mode"
                    >
                      {inputMode === "ETH" ? (
                        <DollarSign size={18} />
                      ) : (
                        <span className="text-sm font-bold">ETH</span>
                      )}
                    </button>
                  )}
                  {tradeType === "sell" && (
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() =>
                        setSellInputMode(
                          sellInputMode === "TOKEN" ? "USD" : "TOKEN"
                        )
                      }
                      tabIndex={-1}
                      aria-label="Toggle sell input mode"
                    >
                      {sellInputMode === "TOKEN" ? (
                        token?.imageUrl ? (
                          <img
                            src={token.imageUrl}
                            alt={token.symbol || "Token"}
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: "50%",
                            }}
                          />
                        ) : (
                          <HelpCircle size={18} />
                        )
                      ) : (
                        <DollarSign size={18} />
                      )}
                    </button>
                  )}
                </div>
                {tradeType === "buy" && (
                  <div className="text-xs text-muted-foreground text-right">
                    {isBalanceLoading || ethPriceLoading
                      ? "Loading ETH balance..."
                      : (() => {
                          const eth = ethBalance?.formatted
                            ? Number(ethBalance.formatted)
                            : 0;
                          const price = ethPriceData?.price || 0;
                          const usd = eth * price;
                          const ethDisplay = eth
                            ? eth >= 1
                              ? eth.toFixed(2)
                              : eth.toPrecision(2)
                            : "0";
                          const usdDisplay = usd
                            ? `$${
                                usd >= 1 ? usd.toFixed(2) : usd.toPrecision(2)
                              }`
                            : "$0";
                          return `${ethDisplay} ETH (${usdDisplay})`;
                        })()}
                  </div>
                )}
                {tradeType === "sell" && (
                  <div className="text-xs text-muted-foreground text-right">
                    {isTokenBalanceLoading || priceLoading
                      ? `Loading ${token?.symbol || "Token"} balance...`
                      : (() => {
                          const tokenBal = tokenBalance?.formatted
                            ? Number(tokenBalance.formatted)
                            : 0;
                          // Prefer price from price, then dexData.priceUsd, else 0
                          let pricePerToken = 0;
                          if (typeof price === "number" && !isNaN(price)) {
                            pricePerToken = price;
                          } else if (dexData?.priceUsd) {
                            pricePerToken = parseFloat(dexData.priceUsd);
                          }
                          const usd = tokenBal * pricePerToken;
                          const tokenDisplay = tokenBal
                            ? tokenBal >= 1
                              ? tokenBal.toFixed(2)
                              : tokenBal.toPrecision(2)
                            : "0";
                          const usdDisplay = usd
                            ? `$${
                                usd >= 1 ? usd.toFixed(2) : usd.toPrecision(2)
                              }`
                            : "$0";
                          return `${tokenDisplay} ${
                            tokenBalance?.symbol || token?.symbol || "Token"
                          } (${usdDisplay})`;
                        })()}
                  </div>
                )}
                <Button
                  className="w-full"
                  disabled={
                    !tradeAmount ||
                    Number(getEthAmount()) <= 0 ||
                    (tradeType === "buy" &&
                      (!ethBalance?.formatted ||
                        isNaN(Number(ethBalance.formatted)) ||
                        Number(getEthAmount()) >
                          Number(ethBalance.formatted))) ||
                    (tradeType === "sell" &&
                      (!tokenBalance?.formatted ||
                        isNaN(Number(tokenBalance.formatted)) ||
                        Number(getSellTokenAmount()) >
                          Number(tokenBalance.formatted)))
                  }
                  onClick={tradeType === "buy" ? handleBuy : handleSell}
                >
                  {tradeType === "buy"
                    ? `Buy ${token?.symbol || "Token"}`
                    : `Sell ${token?.symbol || "Token"}`}
                </Button>
                {txStatus === "pending" && (
                  <div className="text-xs text-blue-500 mt-2">
                    Transaction pending...
                  </div>
                )}
                {txStatus === "success" && (
                  <div className="text-xs text-green-600 mt-2 text-right">
                    Success!{" "}
                    <a
                      href={`https://basescan.org/tx/${
                        typeof txReceipt === "object" &&
                        txReceipt !== null &&
                        "transactionHash" in txReceipt
                          ? txReceipt.transactionHash
                          : ""
                      }`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      Check Tx
                    </a>
                  </div>
                )}
                {txStatus === "error" && (
                  <div className="text-xs text-red-500 mt-2">
                    Error: {txError}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}
        <TabsContent value="comments" className="flex-1 p-0 m-0">
          <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Add a comment..."
                className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>Become a holder to unlock</span>
                <Lock className="w-4 h-4" />
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {comments.length > 0 ? (
              comments.map((comment, index) => (
                <div key={comment.node.txHash || index} className="px-6 py-4 border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm overflow-hidden">
                      {comment.node.userProfile?.avatar?.previewImage?.small ? (
                        <img 
                          src={comment.node.userProfile.avatar.previewImage.small} 
                          alt={comment.node.userProfile.handle}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>👤</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-gray-900 dark:text-white">
                          {comment.node.userProfile?.handle || `${comment.node.userAddress.slice(0, 6)}...${comment.node.userAddress.slice(-4)}`}
                        </span>
                        <span className="text-xs text-gray-500">
                          {getTimeAgo(new Date(comment.node.timestamp * 1000).toISOString())}
                        </span>
                        <div className="ml-auto flex items-center gap-1">
                          <button className="text-gray-400 hover:text-gray-600">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 12l-4-4h8l-4 4z"/>
                            </svg>
                          </button>
                          <span className="text-xs text-gray-500">0</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        {comment.node.comment}
                      </p>
                      <button className="text-xs text-gray-500 hover:text-gray-700 mt-2">
                        Reply
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center py-12">
                <div className="text-center text-gray-500">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2" />
                  <p>No comments yet</p>
                  <p className="text-xs">Be the first to comment!</p>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="holders" className="flex-1 p-6">
          <div className="text-center text-gray-500 py-8">
            <Users className="w-8 h-8 mx-auto mb-2" />
            <p>Holders: {token?.uniqueHolders || '0'}</p>
            <p className="text-sm">Total Supply: {token ? formatTokenValue(token.totalSupply) : '0'}</p>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="flex-1 p-6">
          <div className="text-center text-gray-500 py-8">
            <BarChart3 className="w-8 h-8 mx-auto mb-2" />
            <p>Total Volume: ${token ? formatTokenValue(token.totalVolume) : '0'}</p>
            <p className="text-sm">24h Volume: ${token ? formatTokenValue(token.volume24h) : '0'}</p>
          </div>
        </TabsContent>

        <TabsContent value="details" className="flex-1 p-6">
          <div className="space-y-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Contract Address:</span>
              <span className="font-mono">{token?.address ? `${token.address.slice(0, 6)}...${token.address.slice(-4)}` : 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Symbol:</span>
              <span>{token?.symbol || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Creator:</span>
              <span className="font-mono">{token?.creatorAddress ? `${token.creatorAddress.slice(0, 6)}...${token.creatorAddress.slice(-4)}` : 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Created:</span>
              <span>{token?.createdAt ? new Date(token.createdAt).toLocaleDateString() : 'N/A'}</span>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper function to get time ago
function getTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

  if (diffInDays > 0) {
    return `${diffInDays}d`;
  } else if (diffInHours > 0) {
    return `${diffInHours}h`;
  } else if (diffInMinutes > 0) {
    return `${diffInMinutes}m`;
  } else {
    return 'now';
  }
}

export default function TokenDetails() {
  const { address: rawAddress } = useParams<{ address: string }>();
  const navigate = useNavigate();

  const address = useMemo(() => rawAddress || null, [rawAddress]);
  const { data: token, isLoading: loading, error } = useTokenDetails(address);

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4 py-6 max-w-[1800px]">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Skeleton className="h-8 w-48" />
          </div>
          <div className="flex gap-6">
            <div className="flex-1">
              <Skeleton className="h-[800px] w-full rounded-lg" />
            </div>
            <div className="w-80 xl:w-96 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
              <Skeleton className="h-[800px] w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !token) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4 py-6 max-w-[1800px]">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Token Not Found</h2>
              <p className="text-gray-500">
                The token you're looking for doesn't exist or couldn't be loaded.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4 py-6 max-w-[1800px]">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>

        {/* Main Layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Section - Main Content (GeckoTerminal Widget) */}
          <div className="flex-1">
            <GeckoTerminalWidget tokenAddress={token.address} />
          </div>

          {/* Right Section - Sidebar (Fixed Width) */}
          <div className="w-full lg:w-80 xl:w-96 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col h-[800px]">
            <TokenHeader token={token} />
            <TokenStats token={token} />
            <TradingInterface token={token} />
            
          </div>
        </div>
      </div>
    </div>
  );
}