import { useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";
import { sanitizeEthereumAddress } from "@/lib/utils";

export interface WhaleTransferEvent {
  from: string;
  to: string;
  value: bigint;
  blockNumber: number;
  txHash: string;
  timestamp?: number;
}

export interface WhaleHolder {
  address: string;
  balance: bigint;
  percentage?: number;
}

export interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint;
  logo?: string;
}

// Interface for Coingecko token data
interface CoingeckoToken {
  id: string;
  symbol: string;
  name: string;
  image: string;
}

// Helper function to add delay between API calls
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function useTokenWhaleTracker({
  tokenAddress,
  abi,
  startBlock = 0,
}: {
  tokenAddress: string;
  abi?: unknown[];
  startBlock?: number;
}) {
  const [holders, setHolders] = useState<WhaleHolder[]>([]);
  const [transfers, setTransfers] = useState<WhaleTransferEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followed, setFollowed] = useState<string | null>(null);
  const [followedTrades, setFollowedTrades] = useState<WhaleTransferEvent[]>(
    []
  );
  const [totalSupply, setTotalSupply] = useState<bigint | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [tokenMetadata, setTokenMetadata] = useState<TokenMetadata | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;

    async function fetchTransfers() {
      if (!tokenAddress) {
        setError("Token address is required");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setProgress(0);
      setTokenMetadata(null);

      // Sanitize token address
      const sanitizedTokenAddress = sanitizeEthereumAddress(
        tokenAddress,
        "useTokenWhaleTracker"
      );
      if (!sanitizedTokenAddress) {
        setError("Invalid token address format");
        setLoading(false);
        return;
      }


      // Infura API key for Base network
      const INFURA_API_KEY = import.meta.env.VITE_INFURA_API_KEY;

      // RPC endpoints with fallbacks
      const RPC_URLS = [
        `https://base-mainnet.infura.io/v3/${INFURA_API_KEY}`,
        "https://mainnet.base.org",
        "https://base.meowrpc.com",
        "https://base.publicnode.com",
      ];

      // Try each provider in order until one works
      let provider: ethers.Provider | null = null;
      let providerIndex = 0;

      while (!provider && providerIndex < RPC_URLS.length) {
        try {
          provider = new ethers.JsonRpcProvider(RPC_URLS[providerIndex]);
          await provider.getBlockNumber(); // Test connection
        } catch (error) {
          console.warn(
            `[useTokenWhaleTracker] Failed to connect to ${
              RPC_URLS[providerIndex].split("/")[2]
            }:`,
            error
          );
          provider = null;
          providerIndex++;
        }
      }

      if (!provider) {
        setError("Failed to connect to any RPC provider");
        setLoading(false);
        return;
      }

      try {
        const contract = new ethers.Contract(
          sanitizedTokenAddress,
          abi || [
            "event Transfer(address indexed from, address indexed to, uint256 value)",
            "function totalSupply() view returns (uint256)",
            "function balanceOf(address owner) view returns (uint256)",
            "function decimals() view returns (uint8)",
            "function symbol() view returns (string)",
            "function name() view returns (string)",
          ],
          provider
        );

        // Fetch token metadata
        const metadata: TokenMetadata = {
          name: "Unknown Token",
          symbol: "UNKNOWN",
          decimals: 18,
          totalSupply: 0n,
        };


        try {
          // Try to get token name
          metadata.name = await contract.name();
        } catch (err) {
          console.warn(
            "[useTokenWhaleTracker] Could not fetch token name:",
            err
          );
        }

        try {
          // Try to get token symbol
          metadata.symbol = await contract.symbol();
          console.log("[useTokenWhaleTracker] Token symbol:", metadata.symbol);
        } catch (err) {
          console.warn(
            "[useTokenWhaleTracker] Could not fetch token symbol:",
            err
          );
        }

        try {
          // Try to get token decimals
          metadata.decimals = await contract.decimals();
          console.log(
            "[useTokenWhaleTracker] Token decimals:",
            metadata.decimals
          );
        } catch (err) {
          console.warn(
            "[useTokenWhaleTracker] Could not fetch decimals, using default (18):",
            err
          );
        }

        try {
          // Try to get total supply
          metadata.totalSupply = await contract.totalSupply();
          setTotalSupply(metadata.totalSupply);
          console.log(
            "[useTokenWhaleTracker] Total supply:",
            metadata.totalSupply.toString()
          );
        } catch (err) {
          console.warn(
            "[useTokenWhaleTracker] Could not fetch total supply:",
            err
          );
        }

        // Try to get token logo from multiple sources
        try {
          // Default Base logo as fallback
          const baseExplorerLogoUrl = `https://raw.githubusercontent.com/ethereum-lists/chains/master/_data/icons/base.png`;
          metadata.logo = baseExplorerLogoUrl;

          // Try Coingecko API first
          try {
            console.log(
              "[useTokenWhaleTracker] Trying to fetch token info from Coingecko"
            );
            const coingeckoResponse = await fetch(
              `https://api.coingecko.com/api/v3/coins/base/contract/${sanitizedTokenAddress}`
            );

            if (coingeckoResponse.ok) {
              const tokenData = await coingeckoResponse.json();
              if (tokenData && tokenData.image && tokenData.image.large) {
                metadata.logo = tokenData.image.large;
                console.log(
                  "[useTokenWhaleTracker] Found logo from Coingecko:",
                  metadata.logo
                );
              }
            } else {
              console.log(
                "[useTokenWhaleTracker] Coingecko API returned status:",
                coingeckoResponse.status
              );

              // Try Coingecko search as fallback
              if (metadata.symbol) {
                const searchResponse = await fetch(
                  `https://api.coingecko.com/api/v3/search?query=${metadata.symbol}`
                );
                if (searchResponse.ok) {
                  const searchData = await searchResponse.json();
                  if (
                    searchData &&
                    searchData.coins &&
                    searchData.coins.length > 0
                  ) {
                    // Find a matching coin by symbol
                    const matchingCoin = searchData.coins.find(
                      (coin: CoingeckoToken) =>
                        coin.symbol.toLowerCase() ===
                        metadata.symbol.toLowerCase()
                    );

                    if (matchingCoin && matchingCoin.image) {
                      metadata.logo = matchingCoin.image;
                      console.log(
                        "[useTokenWhaleTracker] Found logo from Coingecko search:",
                        metadata.logo
                      );
                    }
                  }
                }
              }
            }
          } catch (coingeckoError) {
            console.warn(
              "[useTokenWhaleTracker] Error fetching from Coingecko:",
              coingeckoError
            );
          }

          // Try Trustwallet assets as fallback
          if (metadata.logo === baseExplorerLogoUrl) {
            const address = sanitizedTokenAddress.toLowerCase();
            const trustwalletLogoUrl = `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/assets/${address}/logo.png`;

            // Just set the URL - the image component will handle fallback if it fails to load
            metadata.logo = trustwalletLogoUrl;
            console.log(
              "[useTokenWhaleTracker] Using Trustwallet logo URL as fallback:",
              metadata.logo
            );
          }

          // Update metadata with logo
          setTokenMetadata(metadata);
          console.log("[useTokenWhaleTracker] Token metadata:", metadata);
        } catch (err) {
          console.warn(
            "[useTokenWhaleTracker] Error fetching token logo:",
            err
          );
          setTokenMetadata(metadata);
        }

        // Get latest block
        console.log("[useTokenWhaleTracker] Fetching latest block number");
        const latestBlock = await provider.getBlockNumber();
        console.log("[useTokenWhaleTracker] Latest block:", latestBlock);

        // For free tier Infura, use smaller block ranges to avoid rate limits
        const MAX_BLOCK_RANGE = 2000; // Much smaller range to avoid rate limits

        // Limit the total blocks to search to reduce API calls
        const BLOCKS_TO_SEARCH =
          startBlock > 0
            ? Math.min(latestBlock - startBlock, 50000) // Limit to 50k blocks if startBlock is specified
            : 50000; // Otherwise just look back 50k blocks

        const initialFromBlock = Math.max(
          startBlock,
          latestBlock - BLOCKS_TO_SEARCH
        );

        console.log(
          "[useTokenWhaleTracker] Will search from block",
          initialFromBlock,
          "to",
          latestBlock
        );
        console.log(
          "[useTokenWhaleTracker] Total block range:",
          latestBlock - initialFromBlock,
          "blocks"
        );

        // We'll collect all events from all chunks
        let allEvents: ethers.Log[] = [];

        // Split into chunks of MAX_BLOCK_RANGE
        const chunks = [];
        for (
          let start = initialFromBlock;
          start < latestBlock;
          start += MAX_BLOCK_RANGE
        ) {
          const end = Math.min(start + MAX_BLOCK_RANGE - 1, latestBlock);
          chunks.push({ fromBlock: start, toBlock: end });
        }

        console.log(
          `[useTokenWhaleTracker] Splitting query into ${chunks.length} chunks of ≤${MAX_BLOCK_RANGE} blocks`
        );

        // Process each chunk with delay between requests
        for (let i = 0; i < chunks.length && !cancelled; i++) {
          const { fromBlock, toBlock } = chunks[i];
          console.log(
            `[useTokenWhaleTracker] Querying chunk ${i + 1}/${
              chunks.length
            }: blocks ${fromBlock}-${toBlock} (range: ${
              toBlock - fromBlock + 1
            })`
          );

          try {
            // Add delay between requests to avoid rate limits
            if (i > 0) {
              console.log(
                `[useTokenWhaleTracker] Waiting 1 second before next request...`
              );
              await sleep(1000);
            }

            const chunkEvents = await contract.queryFilter(
              contract.filters.Transfer(),
              fromBlock,
              toBlock
            );

            console.log(
              `[useTokenWhaleTracker] Found ${
                chunkEvents.length
              } events in chunk ${i + 1}`
            );
            allEvents = [...allEvents, ...chunkEvents];

            // Update progress
            setProgress(Math.floor(((i + 1) / chunks.length) * 100));
          } catch (error) {
            console.error(
              `[useTokenWhaleTracker] Error in chunk ${i + 1}:`,
              error
            );
            // Continue with other chunks even if one fails
          }
        }

        console.log(
          "[useTokenWhaleTracker] Total events found across all chunks:",
          allEvents.length
        );

        // Aggregate balances
        const balances = new Map<string, bigint>();
        const txs: WhaleTransferEvent[] = [];

        console.log(
          "[useTokenWhaleTracker] Processing events to calculate balances"
        );
        for (const event of allEvents) {
          if (!("args" in event) || !event.args) continue;
          const { from, to, value } = event.args as unknown as {
            from: string;
            to: string;
            value: bigint;
          };
          balances.set(from, (balances.get(from) || 0n) - value);
          balances.set(to, (balances.get(to) || 0n) + value);

          // We'll fetch timestamps in batches later to avoid rate limits
          txs.push({
            from,
            to,
            value,
            blockNumber: event.blockNumber,
            txHash: event.transactionHash,
          });
        }

        console.log(
          "[useTokenWhaleTracker] Processed",
          txs.length,
          "transfers"
        );
        console.log(
          "[useTokenWhaleTracker] Found",
          balances.size,
          "unique addresses"
        );

        // Convert to array and sort
        const holderArr: WhaleHolder[] = Array.from(balances.entries())
          .map(([address, balance]) => ({
            address,
            balance,
            percentage:
              metadata.totalSupply > 0n
                ? Number((balance * 10000n) / metadata.totalSupply) / 100
                : undefined,
          }))
          .filter((h) => h.balance > 0n)
          .sort((a, b) =>
            b.balance > a.balance ? 1 : b.balance < a.balance ? -1 : 0
          );

        console.log(
          "[useTokenWhaleTracker] Filtered to",
          holderArr.length,
          "holders with positive balance"
        );

        // Sort transactions newest first
        txs.sort((a, b) => b.blockNumber - a.blockNumber);

        // Only get timestamps for the 50 most recent transactions to avoid rate limits
        const recentTxs = txs.slice(0, 50);
        console.log(
          "[useTokenWhaleTracker] Getting timestamps for most recent 50 transactions"
        );

        // Get timestamps in batches with delay
        const BATCH_SIZE = 5;
        for (let i = 0; i < recentTxs.length && !cancelled; i += BATCH_SIZE) {
          const batch = recentTxs.slice(i, i + BATCH_SIZE);

          if (i > 0) {
            await sleep(1000); // Wait between batches
          }

          await Promise.all(
            batch.map(async (tx) => {
              try {
                const block = await provider!.getBlock(tx.blockNumber);
                if (block) tx.timestamp = Number(block.timestamp);
              } catch (err) {
                // Ignore timestamp errors
              }
            })
          );
        }

        if (!cancelled) {
          console.log("[useTokenWhaleTracker] Setting state with results");
          setHolders(holderArr);
          setTransfers(txs);
          setProgress(100);
        }
      } catch (err) {
        console.error("[useTokenWhaleTracker] Error:", err);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        console.log("[useTokenWhaleTracker] Fetch completed");
        if (!cancelled) setLoading(false);
      }
    }

    fetchTransfers();
    return () => {
      cancelled = true;
      console.log(
        "[useTokenWhaleTracker] Cleanup - cancelled any pending operations"
      );
    };
  }, [tokenAddress, abi, startBlock]);

  // Follow whale logic
  useEffect(() => {
    if (!followed) {
      console.log("[useTokenWhaleTracker] Cleared followed whale");
      setFollowedTrades([]);
      return;
    }

    console.log("[useTokenWhaleTracker] Following whale:", followed);
    setFollowedTrades(
      transfers.filter((t) => t.from === followed || t.to === followed)
    );
  }, [followed, transfers]);

  const followWhale = useCallback((address: string) => {
    console.log("[useTokenWhaleTracker] Setting followed whale to:", address);
    setFollowed(address);
  }, []);

  return {
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
  };
}
