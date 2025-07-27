import { useEffect, useState, useCallback } from "react";
import { getProfile, getProfileBalances } from "@zoralabs/coins-sdk";

export function useUserProfile(address?: string) {
  // Profile states
  const [profile, setProfile] = useState<any | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<Error | null>(null);

  // Balances states
  const [balances, setBalances] = useState<any>(null);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [balancesError, setBalancesError] = useState<Error | null>(null);
  const [sorted, setSorted] = useState<any[]>([]);
  const [totalPosts, setTotalPosts] = useState(0);
  const [totalVolume, setTotalVolume] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [totalHolders, setTotalHolders] = useState(0);

  // Added states for refetching
  const [isRefetching, setIsRefetching] = useState(false);

  // Combined loading and error states
  const loading = profileLoading || balancesLoading;
  const error = profileError || balancesError;

  // Define fetch functions as useCallback to avoid recreating them unnecessarily
  const fetchProfile = useCallback(async () => {
    if (!address) return null;

    setProfileLoading(true);
    setProfileError(null);

    try {
      const data = await getProfile({ identifier: address });
      setProfile(data?.data?.profile);
      return data?.data?.profile;
    } catch (err) {
      setProfileError(err as Error);
      return null;
    } finally {
      setProfileLoading(false);
    }
  }, [address]);

  const fetchBalances = useCallback(async () => {
    if (!address) return null;

    setBalancesLoading(true);
    setBalancesError(null);

    try {
      const result = await getProfileBalances({
        identifier: address,
        count: 150,
      });

      setBalances(result?.data?.profile);
      const mappedCoins = result?.data?.profile?.coinBalances?.edges;

      const filtered =
        mappedCoins?.filter(
          (item) => item?.node?.coin?.creatorProfile?.handle === profile?.handle
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

      return result?.data?.profile;
    } catch (err) {
      setBalancesError(err as Error);
      return null;
    } finally {
      setBalancesLoading(false);
    }
  }, [address, profile?.handle]);

  // Create a refetch function that refreshes both profile and balances
  const refetch = useCallback(async () => {
    if (!address) return { success: false, message: "No address provided" };

    setIsRefetching(true);

    try {
      console.log(`[useUserProfile] Refetching data for ${address}...`);

      // Run both requests in parallel for faster refresh
      const [profileResult, balancesResult] = await Promise.allSettled([
        fetchProfile(),
        fetchBalances(),
      ]);

      const success =
        profileResult.status === "fulfilled" ||
        balancesResult.status === "fulfilled";

      return {
        success,
        profile:
          profileResult.status === "fulfilled" ? profileResult.value : null,
        balances:
          balancesResult.status === "fulfilled" ? balancesResult.value : null,
        message: success
          ? "Data refreshed successfully"
          : "Failed to refresh data",
      };
    } catch (err) {
      console.error("[useUserProfile] Refetch error:", err);
      return { success: false, message: "Error refreshing data" };
    } finally {
      setIsRefetching(false);
    }
  }, [address, fetchProfile, fetchBalances]);

  // Initial data fetching
  useEffect(() => {
    if (!address) return;

    // Fetch both profile and balances simultaneously
    fetchProfile();
    fetchBalances();
  }, [address, fetchProfile, fetchBalances]);

  return {
    // Profile data
    profile,

    // Balances data
    balances,
    isLoadingBalance: balancesLoading,
    isBalanceError: balancesError,
    sorted,
    totalVolume,
    totalEarnings,
    totalPosts,
    totalHolders,

    // Combined states
    loading,
    error,

    // New refetch functionality
    refetch,
    isRefetching,
  };
}
