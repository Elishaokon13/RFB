import { useEffect, useState, useCallback } from 'react';
import { ethers } from 'ethers';

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
}

export function useTokenWhaleTracker({
  tokenAddress,
  abi,
  startBlock = 0,
  providerUrl = "wss://mainnet.infura.io/ws/v3/YOUR_INFURA_KEY"
}: {
  tokenAddress: string;
  abi?: unknown[];
  startBlock?: number;
  providerUrl?: string;
}) {
  const [holders, setHolders] = useState<WhaleHolder[]>([]);
  const [transfers, setTransfers] = useState<WhaleTransferEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followed, setFollowed] = useState<string | null>(null);
  const [followedTrades, setFollowedTrades] = useState<WhaleTransferEvent[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function fetchTransfers() {
      setLoading(true);
      setError(null);
      try {
        const provider = new ethers.WebSocketProvider(providerUrl);
        const contract = new ethers.Contract(
          tokenAddress,
          abi || [
            "event Transfer(address indexed from, address indexed to, uint256 value)"
          ],
          provider
        );
        // Get latest block
        const latestBlock = await provider.getBlockNumber();
        // Query all Transfer events
        const events = await contract.queryFilter(
          contract.filters.Transfer(),
          startBlock,
          latestBlock
        );
        // Aggregate balances
        const balances = new Map<string, bigint>();
        const txs: WhaleTransferEvent[] = [];
        for (const event of events) {
          if (!('args' in event) || !event.args) continue;
          const { from, to, value } = (event.args as unknown as { from: string; to: string; value: bigint });
          balances.set(from, (balances.get(from) || 0n) - value);
          balances.set(to, (balances.get(to) || 0n) + value);
          txs.push({
            from,
            to,
            value,
            blockNumber: event.blockNumber,
            txHash: event.transactionHash,
          });
        }
        // Convert to array and sort
        const holderArr: WhaleHolder[] = Array.from(balances.entries())
          .map(([address, balance]) => ({ address, balance }))
          .filter(h => h.balance > 0n)
          .sort((a, b) => (b.balance > a.balance ? 1 : b.balance < a.balance ? -1 : 0));
        if (!cancelled) {
          setHolders(holderArr);
          setTransfers(txs.reverse()); // newest first
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }
    fetchTransfers();
    return () => {
      cancelled = true;
    };
  }, [tokenAddress, abi, startBlock, providerUrl]);

  // Follow whale logic
  useEffect(() => {
    if (!followed) {
      setFollowedTrades([]);
      return;
    }
    setFollowedTrades(transfers.filter(t => t.from === followed || t.to === followed));
  }, [followed, transfers]);

  const followWhale = useCallback((address: string) => {
    setFollowed(address);
  }, []);

  return { holders, transfers, loading, error, followWhale, followed, followedTrades };
} 