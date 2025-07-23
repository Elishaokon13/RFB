import React, { useState, useEffect } from "react";
import { useTokenWhaleTracker } from "../hooks/useTokenWhaleTracker";
import { truncateAddress } from "@/lib/utils";

// Format bigint to readable string with decimals
// Format bigint to readable string with decimals
function formatTokenAmount(
  amount: bigint,
  decimals: number | bigint = 18
): string {
  if (amount === 0n) return "0";

  // Ensure decimals is a number
  const decimalCount =
    typeof decimals === "bigint" ? Number(decimals) : decimals;

  // Validate decimals is a reasonable number
  if (
    decimalCount < 0 ||
    decimalCount > 77 ||
    !Number.isInteger(decimalCount)
  ) {
    console.warn(`Invalid decimals value: ${decimals}, using 18 as fallback`);
    return formatTokenAmount(amount, 18);
  }

  // Convert BigInt to string first
  const amountStr = amount.toString();

  // Handle cases where the amount has fewer digits than decimals
  if (amountStr.length <= decimalCount) {
    const paddedStr = amountStr.padStart(decimalCount, "0");
    const decimalPart = paddedStr.replace(/0+$/, "");
    return decimalPart ? `0.${decimalPart}` : "0";
  }

  // Split into integer and decimal parts
  const integerPart = amountStr.slice(0, -decimalCount);
  const decimalPart = amountStr.slice(-decimalCount).replace(/0+$/, "");

  return decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
}

// Format timestamp to readable date/time
function formatTimestamp(timestamp?: number): string {
  if (!timestamp) return "N/A";

  const date = new Date(timestamp * 1000);
  return date.toLocaleString();
}

export function WhaleTracker({ tokenAddress }: { tokenAddress: string }) {
  const [input, setInput] = useState("");
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

  return (
    <div className="w-full mx-auto">
      {tokenMetadata ? (
        <div className="mb-6 flex items-center gap-4 p-4 border rounded-lg bg-card">
          <div className="flex-shrink-0">
            <img
              src={tokenMetadata?.logo}
              alt={tokenMetadata.name}
              className="w-16 h-16 bg-white/20 rounded-full object-cover border-2 border-border"
            />
          </div>
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              {tokenMetadata.name}
              <span className="text-sm font-normal px-2 py-0.5 bg-muted rounded-full">
                {tokenMetadata.symbol}
              </span>
            </h2>
            <div className="text-sm text-muted-foreground mt-1">
              <div className="flex items-center gap-2">
                <span className="font-mono">
                  {truncateAddress(tokenAddress)}
                </span>
                <button
                  onClick={() => navigator.clipboard.writeText(tokenAddress)}
                  className="text-xs underline hover:text-primary"
                >
                  Copy
                </button>
                <a
                  href={`https://basescan.org/token/${tokenAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs underline hover:text-primary"
                >
                  View on BaseScan
                </a>
              </div>
              {totalSupply && (
                <div className="mt-1">
                  Total Supply:{" "}
                  {formatTokenAmount(totalSupply, tokenMetadata.decimals)}{" "}
                  {tokenMetadata.symbol}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <h2 className="text-2xl font-bold mb-4">Top Holders / Whale Tracker</h2>
      )}

      <div className="mb-2 text-sm text-muted-foreground">
        Tracking on Base Mainnet (Chain ID: 8453) via Infura
        <span className="ml-2 inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
          Powered by MetaMask Services
        </span>
      </div>

      <div className="mb-6">
        <input
          className="border rounded px-2 py-1 mr-2"
          placeholder="Follow whale address..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          className="bg-primary text-white px-3 py-1 rounded"
          onClick={() => followWhale(input)}
          disabled={!input}
        >
          Follow
        </button>
        {followed && (
          <span className="ml-4 text-sm">
            Following:{" "}
            <span className="font-mono">{truncateAddress(followed)}</span>
          </span>
        )}
      </div>

      {loading && (
        <>
          <div className="py-4 text-center">
            <div className="mb-2">Loading whale data... {progress}%</div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              This may take a while due to API rate limits. Please be patient.
            </p>
          </div>
        </>
      )}

      {error && (
        <>
          <div className="py-4 px-6 rounded bg-red-50 border border-red-200 text-red-800">
            <p className="font-semibold mb-2">Error loading data</p>
            <p className="text-sm mb-3">
              {error.includes("exceed maximum block range")
                ? "RPC provider limits exceeded. Try again with a more recent token or different RPC."
                : error.includes("call revert exception")
                ? "This contract does not appear to be a valid ERC20 token."
                : error}
            </p>
            <details className="text-xs mt-2">
              <summary>Technical details</summary>
              <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto max-h-40">
                {error}
              </pre>
            </details>
          </div>
        </>
      )}

      {!loading && !error && holders.length === 0 && (
        <div className="py-8 text-center text-muted-foreground">
          No holder data found. This could be a new token or the contract
          doesn't implement the ERC20 standard.
        </div>
      )}

      {holders.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-2">Top Holders</h3>
          <div className="overflow-x-auto">
            <table className="w-full border rounded mb-4">
              <thead>
                <tr className="bg-muted">
                  <th className="px-2 py-1 text-left">#</th>
                  <th className="px-2 py-1 text-left">Address</th>
                  <th className="px-2 py-1 text-left">Balance</th>
                  {totalSupply && (
                    <th className="px-2 py-1 text-left">% of Supply</th>
                  )}
                  <th className="px-2 py-1 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {holders.map((h, i) => (
                  <tr key={h.address} className="border-b hover:bg-muted/50">
                    <td className="px-2 py-1">{i + 1}</td>
                    <td className="px-2 py-1 font-mono">
                      {truncateAddress(h.address)}
                    </td>
                    <td className="px-2 py-1">
                      {tokenMetadata
                        ? `${formatTokenAmount(
                            h.balance,
                            tokenMetadata.decimals
                          )} ${tokenMetadata.symbol}`
                        : h.balance.toString()}
                    </td>
                    {totalSupply && (
                      <td className="px-2 py-1">{h.percentage?.toFixed(2)}%</td>
                    )}
                    <td className="px-2 py-1">
                      <button
                        className="text-xs underline mr-2"
                        onClick={() => navigator.clipboard.writeText(h.address)}
                      >
                        Copy
                      </button>
                      <a
                        className="text-xs underline mr-2"
                        href={`https://basescan.org/address/${h.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Explorer
                      </a>
                      <button
                        className="text-xs underline"
                        onClick={() => followWhale(h.address)}
                      >
                        Follow
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {transfers.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-2">Recent Transfers</h3>
          <div className="overflow-x-auto">
            <table className="w-full border rounded">
              <thead>
                <tr className="bg-muted">
                  <th className="px-2 py-1 text-left">From</th>
                  <th className="px-2 py-1 text-left">To</th>
                  <th className="px-2 py-1 text-left">Value</th>
                  <th className="px-2 py-1 text-left">Block</th>
                  <th className="px-2 py-1 text-left">Time</th>
                  <th className="px-2 py-1 text-left">Tx</th>
                </tr>
              </thead>
              <tbody>
                {transfers.slice(0, 50).map((t, i) => (
                  <tr key={t.txHash + i} className="border-b hover:bg-muted/50">
                    <td className="px-2 py-1 font-mono">
                      {truncateAddress(t.from)}
                    </td>
                    <td className="px-2 py-1 font-mono">
                      {truncateAddress(t.to)}
                    </td>
                    <td className="px-2 py-1">
                      {tokenMetadata
                        ? `${formatTokenAmount(
                            t.value,
                            tokenMetadata.decimals
                          )} ${tokenMetadata.symbol}`
                        : t.value.toString()}
                    </td>
                    <td className="px-2 py-1">{t.blockNumber}</td>
                    <td className="px-2 py-1">
                      {formatTimestamp(t.timestamp)}
                    </td>
                    <td className="px-2 py-1">
                      <a
                        className="text-xs underline"
                        href={`https://basescan.org/tx/${t.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {followed && followedTrades.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-2">
            Recent Trades for Whale
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full border rounded">
              <thead>
                <tr className="bg-muted">
                  <th className="px-2 py-1 text-left">From</th>
                  <th className="px-2 py-1 text-left">To</th>
                  <th className="px-2 py-1 text-left">Value</th>
                  <th className="px-2 py-1 text-left">Block</th>
                  <th className="px-2 py-1 text-left">Time</th>
                  <th className="px-2 py-1 text-left">Tx</th>
                </tr>
              </thead>
              <tbody>
                {followedTrades.map((t, i) => (
                  <tr key={t.txHash + i} className="border-b hover:bg-muted/50">
                    <td className="px-2 py-1 font-mono">
                      {truncateAddress(t.from)}
                    </td>
                    <td className="px-2 py-1 font-mono">
                      {truncateAddress(t.to)}
                    </td>
                    <td className="px-2 py-1">
                      {tokenMetadata
                        ? `${formatTokenAmount(
                            t.value,
                            tokenMetadata.decimals
                          )} ${tokenMetadata.symbol}`
                        : t.value.toString()}
                    </td>
                    <td className="px-2 py-1">{t.blockNumber}</td>
                    <td className="px-2 py-1">
                      {formatTimestamp(t.timestamp)}
                    </td>
                    <td className="px-2 py-1">
                      <a
                        className="text-xs underline"
                        href={`https://basescan.org/tx/${t.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {followed && followedTrades.length === 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-2">
            Recent Trades for Whale
          </h3>
          <div className="py-4 text-center text-muted-foreground">
            No transactions found for this address.
          </div>
        </div>
      )}
    </div>
  );
}
