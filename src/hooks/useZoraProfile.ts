import { useState, useEffect } from "react";
import { getProfile, getProfileBalances } from "@zoralabs/coins-sdk";

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
        // console.log("[useZoraProfile] Raw API response:", response);
        let profile = response?.data?.profile || null;
        // Always transform linkedWallets to an array
        if (profile) {
          let linkedWalletsArr: { type?: string; url?: string }[] | undefined =
            undefined;
          // Type guard for edges property
          const hasEdges = (
            val: unknown
          ): val is {
            edges: { node: { walletType?: string; walletAddress?: string } }[];
          } => {
            return (
              !!val &&
              typeof val === "object" &&
              Array.isArray((val as { edges?: unknown }).edges)
            );
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
              linkedWallets: linkedWalletsArr as { type?: string; url?: string }[],
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
        // console.log("[useZoraProfile] Final profile:", profile);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [identifier]);

  return { profile, loading, error };
}

export function useZoraProfileBalances(
  identifier: string,
  count: number = 20,
  after?: string
) {
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
        const response = await getProfileBalances({ identifier });
        // console.log("[useZoraProfileBalances] Raw API response:", response);
        const profile = response?.data?.profile;
        const edges = profile?.coinBalances?.edges || [];
        const edd = edges.map((edge: { node: CoinBalance }) => edge.node);

        // console.log(edd);
        
        setBalances(edges.map((edge: { node: CoinBalance }) => edge.node));
        setPageInfo(profile?.coinBalances?.pageInfo || null);
        // console.log(
        //   "[useZoraProfileBalances] Final balances:",
        //   edges.map((edge: { node: CoinBalance }) => edge.node)
        // );
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
export function getProfileImageSmall(
  profile: Profile | null
): string | undefined {
  return profile?.profileImage?.small;
}




export function useUserBalances(address?: string) {
  const [balances, setBalances] = useState<CoinBalance[]>([]); // use any here
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [sorted, setSorted] = useState<CoinBalance[]>([]);
  const [totalPosts, setTotalPosts] = useState(0);
  const [totalVolume, setTotalVolume] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [totalHolders, setTotalHolders] = useState(0);

  useEffect(() => {
    if (!address) return;

    const fetchBalances = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await getProfileBalances({
          identifier: address,
          count: 150,
        });

        setBalances(result?.data?.profile);
        const mappedCoins = result?.data?.profile?.coinBalances?.edges;

        const filtered =
          mappedCoins?.filter(
            (item) =>
              item?.node?.coin?.creatorProfile?.handle?.toLowerCase() ===
              address.toLowerCase(),
          ) || [];

        const sorted = filtered.sort((a, b) => {
          const volumeA = parseFloat(a?.node?.coin?.totalVolume ?? "0");
          const volumeB = parseFloat(b?.node?.coin?.totalVolume ?? "0");
          return volumeB - volumeA; // Descending
        });

        const totalVolume = sorted.reduce((acc, item) => {
          return acc + parseFloat(item?.node?.coin?.totalVolume ?? "0");
        }, 0);

        const totalEarnings = sorted.reduce((acc, item) => {
          const earning = item?.node?.coin?.creatorEarnings?.[0]?.amountUsd;
          return acc + parseFloat(earning || "0");
        }, 0);
        const uniqueHolders = sorted.reduce((acc, item) => {
          const earning = item?.node?.coin?.uniqueHolders || "0";
          return acc + parseFloat(String(earning) || "0");
        }, 0);

        setSorted(sorted);
        setTotalVolume(totalVolume);
        setTotalEarnings(totalEarnings);
        setTotalPosts(sorted?.length);
        setTotalHolders(uniqueHolders);
        // console.log("Sorted by volume:", sorted?.length);
        // console.log("Total Trading Volume:", totalVolume);
        // console.log("Total Creator Earnings (USD):", totalEarnings);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchBalances();
  }, [address]);

  return {
    balances,
    isLoadingBalance: loading,
    isBalanceError: error,
    sorted,
    totalVolume,
    totalEarnings,
    totalPosts,
    totalHolders,
  };
}