import { useState, useEffect } from 'react';
import { getProfile, getProfileBalances } from '@zoralabs/coins-sdk';

// --- Types ---
type Profile = {
  address?: string;
  handle?: string;
  displayName?: string;
  bio?: string;
  joinedAt?: string;
  profileImage?: { small?: string; medium?: string; blurhash?: string };
  avatar?: {
    previewImage?: {
      small?: string;
      medium?: string;
      blurhash?: string;
    };
    blurhash?: string;
    medium?: string;
    small?: string;
  };
  linkedWallets?: Array<{ type?: string; url?: string }>;
};

type CoinBalance = {
  id?: string;
  token?: {
    id?: string;
    name?: string;
    symbol?: string;
    address?: string;
    chainId?: number;
    totalSupply?: string;
    marketCap?: string;
    volume24h?: string;
    createdAt?: string;
    uniqueHolders?: number;
    media?: { previewImage?: string; medium?: string; blurhash?: string };
  };
  amount?: { amountRaw?: string; amountDecimal?: number };
  valueUsd?: string;
  timestamp?: string;
};

export function useZoraProfile(identifier: string) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!identifier) return;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const response = await getProfile({ identifier });
        console.log('[useZoraProfile] Raw API response:', response);
        let profile = response?.data?.profile || null;
        // Always transform linkedWallets to an array
        if (profile) {
          let linkedWalletsArr: { type?: string; url?: string }[] | undefined = undefined;
          // Type guard for edges property
          const hasEdges = (val: unknown): val is { edges: { node: { walletType?: string; walletAddress?: string } }[] } => {
            return !!val && typeof val === 'object' && Array.isArray((val as { edges?: unknown }).edges);
          };
          if (profile.linkedWallets && hasEdges(profile.linkedWallets)) {
            linkedWalletsArr = profile.linkedWallets.edges.map((edge) => ({
              type: edge.node?.walletType,
              url: edge.node?.walletAddress,
            }));
            // Remove the original linkedWallets object with edges
            const { linkedWallets, ...restProfile } = profile;
            profile = {
              ...restProfile,
              linkedWallets: linkedWalletsArr,
            };
          } else if (Array.isArray(profile.linkedWallets)) {
            profile = {
              ...profile,
              linkedWallets: profile.linkedWallets,
            };
          } else {
            profile = {
              ...profile,
              linkedWallets: undefined,
            };
          }
        }
        setProfile(profile);
        console.log('[useZoraProfile] Final profile:', profile);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [identifier]);

  return { profile, loading, error };
}

export function useZoraProfileBalances(identifier: string, count: number = 20, after?: string) {
  const [balances, setBalances] = useState<CoinBalance[]>([]);
  const [pageInfo, setPageInfo] = useState<{ endCursor?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!identifier) return;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const response = await getProfileBalances({ identifier, count, after });
        console.log('[useZoraProfileBalances] Raw API response:', response);
        const profile = response?.data?.profile;
        const edges = profile?.coinBalances?.edges || [];
        setBalances(edges.map((edge: { node: CoinBalance }) => edge.node));
        setPageInfo(profile?.coinBalances?.pageInfo || null);
        console.log('[useZoraProfileBalances] Final balances:', edges.map((edge: { node: CoinBalance }) => edge.node));
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [identifier, count, after]);

  return { balances, pageInfo, loading, error };
}

// Helper to get the profile image URL (small)
export function getProfileImageSmall(profile: Profile | null): string | undefined {
  return profile?.profileImage?.small;
} 