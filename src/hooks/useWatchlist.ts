import { useState, useEffect, useCallback } from 'react';

// Key for localStorage
const WATCHLIST_KEY_PREFIX = 'wallet_watchlist_';
const GUEST_WATCHLIST_KEY = 'guest_watchlist';

export interface WatchlistToken {
  address: string;
  name?: string;
  symbol?: string;
  image?: string;
  addedAt: number;
}

export function useWatchlist(walletAddress?: string) {
  const [watchlist, setWatchlist] = useState<WatchlistToken[]>([]);
  
  // Determine the storage key based on whether wallet is connected
  const storageKey = walletAddress 
    ? WATCHLIST_KEY_PREFIX + walletAddress.toLowerCase()
    : GUEST_WATCHLIST_KEY;

  // Load watchlist from localStorage on mount or wallet change
  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Check if we need to migrate from old format (just array of addresses)
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (typeof parsed[0] === 'string') {
            // Old format - migrate to new format
            const migratedWatchlist = parsed.map((address: string) => ({
              address,
              addedAt: Date.now()
            }));
            setWatchlist(migratedWatchlist);
          } else {
            // Already in new format
            setWatchlist(parsed);
          }
        } else {
          // Empty array or invalid data
          setWatchlist([]);
        }
      } catch {
        setWatchlist([]);
      }
    } else {
      setWatchlist([]);
    }
  }, [walletAddress, storageKey]);

  // Save watchlist to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(watchlist));
  }, [watchlist, storageKey]);

  // Add a token to the watchlist
  const addToWatchlist = useCallback((token: string | Partial<WatchlistToken>) => {
    setWatchlist((prev) => {
      // If token is just a string (address), create minimal token object
      const tokenObj = typeof token === 'string' 
        ? { 
            address: token, 
            addedAt: Date.now() 
          } 
        : {
            ...token,
            address: token.address!,
            addedAt: Date.now()
          };
      
      // Check if token is already in watchlist
      if (!prev.some(item => item.address === tokenObj.address)) {
        return [...prev, tokenObj as WatchlistToken];
      }
      return prev;
    });
  }, []);

  // Remove a token from the watchlist
  const removeFromWatchlist = useCallback((address: string) => {
    setWatchlist((prev) => prev.filter((token) => token.address !== address));
  }, []);

  // Check if a token is in the watchlist
  const isInWatchlist = useCallback((address: string) => {
    return watchlist.some((token) => token.address === address);
  }, [watchlist]);

  // Clear the entire watchlist
  const clearWatchlist = useCallback(() => {
    setWatchlist([]);
  }, []);

  // Get a token from the watchlist by address
  const getTokenFromWatchlist = useCallback((address: string) => {
    return watchlist.find(token => token.address === address);
  }, [watchlist]);

  return {
    watchlist,
    addToWatchlist,
    removeFromWatchlist,
    isInWatchlist,
    clearWatchlist,
    getTokenFromWatchlist,
    setWatchlist,
  };
} 