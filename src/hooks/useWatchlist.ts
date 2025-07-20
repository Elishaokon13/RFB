import { useState, useEffect, useCallback } from 'react';

// Key prefix for localStorage
const WATCHLIST_KEY_PREFIX = 'wallet_watchlist_';

export function useWatchlist(walletAddress?: string) {
  const [watchlist, setWatchlist] = useState<string[]>([]);

  // Load watchlist from localStorage on mount or wallet change
  useEffect(() => {
    if (!walletAddress) {
      setWatchlist([]);
      return;
    }
    const key = WATCHLIST_KEY_PREFIX + walletAddress.toLowerCase();
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        setWatchlist(JSON.parse(stored));
      } catch {
        setWatchlist([]);
      }
    } else {
      setWatchlist([]);
    }
  }, [walletAddress]);

  // Save watchlist to localStorage when it changes
  useEffect(() => {
    if (!walletAddress) return;
    const key = WATCHLIST_KEY_PREFIX + walletAddress.toLowerCase();
    localStorage.setItem(key, JSON.stringify(watchlist));
  }, [walletAddress, watchlist]);

  // Add an address to the watchlist
  const addToWatchlist = useCallback((address: string) => {
    setWatchlist((prev) => {
      if (!prev.includes(address)) {
        return [...prev, address];
      }
      return prev;
    });
  }, []);

  // Remove an address from the watchlist
  const removeFromWatchlist = useCallback((address: string) => {
    setWatchlist((prev) => prev.filter((a) => a !== address));
  }, []);

  // Check if an address is in the watchlist
  const isInWatchlist = useCallback((address: string) => {
    return watchlist.includes(address);
  }, [watchlist]);

  return {
    watchlist,
    addToWatchlist,
    removeFromWatchlist,
    isInWatchlist,
    setWatchlist,
  };
} 