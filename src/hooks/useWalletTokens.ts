import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';

interface TokenBalance {
  contractAddress: string;
  tokenBalance: string;
  error?: string;
}

interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  logo?: string;
}

interface WalletToken {
  contractAddress: string;
  name: string;
  symbol: string;
  balance: number;
  decimals: number;
  logo?: string;
  error?: string;
}

export const useWalletTokens = () => {
  const { user, authenticated } = usePrivy();
  const [tokens, setTokens] = useState<WalletToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Alchemy API endpoint for Base
  const ALCHEMY_BASE_URL = 'https://base-mainnet.g.alchemy.com/v2/dnbpgJAxbCT9dbs-cHKAXVSYLNYDrt_n';
  
  // Note: In production, you should use environment variables for the API key
  // const ALCHEMY_BASE_URL = `https://base-mainnet.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_API_KEY}`;

  // Function to get token balances using RPC calls
  const getTokenBalances = async (walletAddress: string): Promise<WalletToken[]> => {
    try {
      // Get all ERC20 token balances
      const balanceResponse = await fetch(ALCHEMY_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'alchemy_getTokenBalances',
          params: [walletAddress],
          id: 1,
        }),
      });

      if (!balanceResponse.ok) {
        throw new Error('Failed to fetch token balances');
      }

      const balanceData = await balanceResponse.json();
      
      if (balanceData.error) {
        throw new Error(balanceData.error.message || 'Failed to fetch token balances');
      }

      const tokenBalances: TokenBalance[] = balanceData.result.tokenBalances || [];

      // Filter out zero balances
      const nonZeroBalances = tokenBalances.filter(
        (token) => token.tokenBalance !== '0x0000000000000000000000000000000000000000000000000000000000000000'
      );

      // Get metadata for each token
      const tokensWithMetadata: WalletToken[] = [];

      for (const token of nonZeroBalances) {
        try {
          // Get token metadata
          const metadataResponse = await fetch(ALCHEMY_BASE_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'alchemy_getTokenMetadata',
              params: [token.contractAddress],
              id: 1,
            }),
          });

          if (metadataResponse.ok) {
            const metadataData = await metadataResponse.json();
            
            if (metadataData.result) {
              const metadata: TokenMetadata = metadataData.result;
              
              // Convert hex balance to decimal
              const balance = parseInt(token.tokenBalance, 16);
              const adjustedBalance = balance / Math.pow(10, metadata.decimals);

              tokensWithMetadata.push({
                contractAddress: token.contractAddress,
                name: metadata.name,
                symbol: metadata.symbol,
                balance: adjustedBalance,
                decimals: metadata.decimals,
                logo: metadata.logo,
              });
            } else {
              // Handle tokens without metadata
              tokensWithMetadata.push({
                contractAddress: token.contractAddress,
                name: 'Unknown Token',
                symbol: 'UNKNOWN',
                balance: 0,
                decimals: 18,
                error: 'Failed to fetch metadata',
              });
            }
          } else {
            // Handle metadata fetch errors
            tokensWithMetadata.push({
              contractAddress: token.contractAddress,
              name: 'Unknown Token',
              symbol: 'UNKNOWN',
              balance: 0,
              decimals: 18,
              error: 'Failed to fetch metadata',
            });
          }
        } catch (metadataError) {
          // Handle individual token metadata errors
          tokensWithMetadata.push({
            contractAddress: token.contractAddress,
            name: 'Unknown Token',
            symbol: 'UNKNOWN',
            balance: 0,
            decimals: 18,
            error: 'Failed to fetch metadata',
          });
        }
      }

      return tokensWithMetadata;
    } catch (err) {
      console.error('Error fetching wallet tokens:', err);
      throw err;
    }
  };

  // Fetch tokens when wallet is connected
  const fetchTokens = async () => {
    if (!authenticated || !user?.wallet?.address) {
      setTokens([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const walletAddress = user.wallet.address;
      const walletTokens = await getTokenBalances(walletAddress);
      setTokens(walletTokens);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch wallet tokens');
      setTokens([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch tokens when wallet connection changes
  useEffect(() => {
    fetchTokens();
  }, [authenticated, user?.wallet?.address]);

  return {
    tokens,
    loading,
    error,
    refetch: fetchTokens,
    isConnected: authenticated && !!user?.wallet?.address,
    walletAddress: user?.wallet?.address,
  };
}; 