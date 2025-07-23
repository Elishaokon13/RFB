import React, { useState, useEffect } from "react";
import { useTokenWhaleTracker } from "../hooks/useTokenWhaleTracker";
import { truncateAddress } from "@/lib/utils";
import { 
  Copy, 
  ExternalLink, 
  TrendingUp, 
  Users, 
  Activity, 
  Eye, 
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle,
  BarChart3,
  Clock,
  Hash,
  ArrowUpRight
} from "lucide-react";

// Format bigint to readable string with decimals
function formatTokenAmount(
  amount: bigint,
  decimals: number | bigint = 18
): string {
  if (amount === 0n) return "0";

  const decimalCount = typeof decimals === "bigint" ? Number(decimals) : decimals;

  if (decimalCount < 0 || decimalCount > 77 || !Number.isInteger(decimalCount)) {
    console.warn(`Invalid decimals value: ${decimals}, using 18 as fallback`);
    return formatTokenAmount(amount, 18);
  }

  const amountStr = amount.toString();

  if (amountStr.length <= decimalCount) {
    const paddedStr = amountStr.padStart(decimalCount, "0");
    const decimalPart = paddedStr.replace(/0+$/, "");
    return decimalPart ? `0.${decimalPart}` : "0";
  }

  const integerPart = amountStr.slice(0, -decimalCount);
  const decimalPart = amountStr.slice(-decimalCount).replace(/0+$/, "");

  return decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
}

// Format timestamp to readable date/time
function formatTimestamp(timestamp?: number): string {
  if (!timestamp) return "N/A";

  const date = new Date(timestamp * 1000);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return "Just now";
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Format large numbers
function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export function WhaleTracker({ tokenAddress }: { tokenAddress: string }) {
  const [input, setInput] = useState("");
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const {
    holders,
    transfers,
    loading,
    error,
    followWhale,
    followed,
    followedTrades,
    totalSupply,
    progress,
    tokenMetadata,
  } = useTokenWhaleTracker({ tokenAddress });

  const handleCopyAddress = async (address: string) => {
    await navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Token Info Card */}
      {tokenMetadata ? (
        <div className="bg-card border border-border rounded-xl shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-shrink-0">
              <img
                src={tokenMetadata?.logo}
                alt={tokenMetadata.name}
                className="w-16 h-16 bg-white/20 rounded-xl object-cover border-2 border-border shadow-sm"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                    {tokenMetadata.name}
                    <span className="text-sm font-normal px-2 py-1 bg-primary/10 text-primary rounded-full">
                      {tokenMetadata.symbol}
                    </span>
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-sm text-muted-foreground">
                      {truncateAddress(tokenAddress)}
                    </span>
                    <button
                      onClick={() => handleCopyAddress(tokenAddress)}
                      className="p-1 hover:bg-muted rounded transition-colors"
                      title="Copy address"
                    >
                      {copiedAddress === tokenAddress ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                    <a
                      href={`https://basescan.org/token/${tokenAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 hover:bg-muted rounded transition-colors"
                      title="View on BaseScan"
                    >
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    </a>
                  </div>
                </div>
                {totalSupply && (
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Total Supply</div>
                    <div className="font-semibold">
                      {formatTokenAmount(totalSupply, tokenMetadata.decimals)} {tokenMetadata.symbol}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Top Holders / Whale Tracker
          </h2>
        </div>
      )}


      

      {/* Whale Follow Section */}
      <div className="bg-card border border-border rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Eye className="w-5 h-5 text-primary" />
          Follow Whale Address
        </h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              className="w-full pl-10 pr-4 py-3 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              placeholder="Enter whale address to follow..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <Eye className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          </div>
          <button
            className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg disabled:opacity-50 transition-all font-medium flex items-center gap-2"
            onClick={() => followWhale(input)}
            disabled={!input}
          >
            <Eye className="w-4 h-4" />
            Follow
          </button>
        </div>
        {followed && (
          <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <Eye className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">Following:</span>
              <span className="font-mono font-medium">{truncateAddress(followed)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-card border border-border rounded-xl shadow-sm p-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Loading whale data...</h3>
          <div className="w-full bg-muted rounded-full h-2 mb-4">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300 ease-in-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-sm text-muted-foreground">
            This may take a while due to API rate limits. Please be patient.
          </p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-800 mb-2">Error loading data</h3>
              <p className="text-sm text-red-700 mb-3">
                {error.includes("exceed maximum block range")
                  ? "RPC provider limits exceeded. Try again with a more recent token or different RPC."
                  : error.includes("call revert exception")
                  ? "This contract does not appear to be a valid ERC20 token."
                  : error}
              </p>
              <details className="text-xs">
                <summary className="cursor-pointer text-red-600 hover:text-red-800">Technical details</summary>
                <pre className="mt-2 p-3 bg-red-100 rounded-lg overflow-auto max-h-40 text-red-800">
                  {error}
                </pre>
              </details>
            </div>
          </div>
        </div>
      )}

      {/* No Data State */}
      {!loading && !error && holders.length === 0 && (
        <div className="bg-card border border-border rounded-xl shadow-sm p-8 text-center">
          <div className="p-4 bg-muted/50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No holder data found</h3>
          <p className="text-muted-foreground">
            This could be a new token or the contract doesn't implement the ERC20 standard.
          </p>
        </div>
      )}

      {/* Top Holders */}
      {holders.length > 0 && (
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Top Holders
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Balance</th>
                  {totalSupply && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">% of Supply</th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {holders.map((h, i) => (
                  <tr key={h.address} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-sm">{truncateAddress(h.address)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {tokenMetadata
                        ? `${formatTokenAmount(h.balance, tokenMetadata.decimals)} ${tokenMetadata.symbol}`
                        : h.balance.toString()}
                    </td>
                    {totalSupply && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="font-medium">{h.percentage?.toFixed(2)}%</span>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          className="p-1 hover:bg-muted rounded transition-colors"
                          onClick={() => handleCopyAddress(h.address)}
                          title="Copy address"
                        >
                          {copiedAddress === h.address ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4 text-muted-foreground" />
                          )}
                        </button>
                        <a
                          className="p-1 hover:bg-muted rounded transition-colors"
                          href={`https://basescan.org/address/${h.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="View on BaseScan"
                        >
                          <ExternalLink className="w-4 h-4 text-muted-foreground" />
                        </a>
                        <button
                          className="p-1 hover:bg-muted rounded transition-colors"
                          onClick={() => followWhale(h.address)}
                          title="Follow whale"
                        >
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Transfers */}
      {transfers.length > 0 && (
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Recent Transfers
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">From</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">To</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Value</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Tx</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transfers.slice(0, 50).map((t, i) => (
                  <tr key={t.txHash + i} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-sm">{truncateAddress(t.from)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-sm">{truncateAddress(t.to)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {tokenMetadata
                        ? `${formatTokenAmount(t.value, tokenMetadata.decimals)} ${tokenMetadata.symbol}`
                        : t.value.toString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {formatTimestamp(t.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <a
                        className="p-1 hover:bg-muted rounded transition-colors inline-flex items-center gap-1"
                        href={`https://basescan.org/tx/${t.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="View transaction"
                      >
                        <Hash className="w-4 h-4 text-muted-foreground" />
                        <ArrowUpRight className="w-3 h-3 text-muted-foreground" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Followed Whale Trades */}
      {followed && followedTrades.length > 0 && (
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              Recent Trades for Followed Whale
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {truncateAddress(followed)}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">From</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">To</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Value</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Tx</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {followedTrades.map((t, i) => (
                  <tr key={t.txHash + i} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-sm">{truncateAddress(t.from)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-sm">{truncateAddress(t.to)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {tokenMetadata
                        ? `${formatTokenAmount(t.value, tokenMetadata.decimals)} ${tokenMetadata.symbol}`
                        : t.value.toString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {formatTimestamp(t.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <a
                        className="p-1 hover:bg-muted rounded transition-colors inline-flex items-center gap-1"
                        href={`https://basescan.org/tx/${t.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="View transaction"
                      >
                        <Hash className="w-4 h-4 text-muted-foreground" />
                        <ArrowUpRight className="w-3 h-3 text-muted-foreground" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No Followed Trades */}
      {followed && followedTrades.length === 0 && (
        <div className="bg-card border border-border rounded-xl shadow-sm p-8 text-center">
          <div className="p-4 bg-muted/50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <EyeOff className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No transactions found</h3>
          <p className="text-muted-foreground">
            No transactions found for the followed whale address.
          </p>
        </div>
      )}
    </div>
  );
}
