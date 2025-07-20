import { useEffect, useState } from 'react';
import { Address } from 'viem';
import { resolveBasename } from '@/utils/basenames';

// In-memory cache for Basename lookups
const basenameCache = new Map<Address, string | null>();

export function useBasename(address: Address | undefined) {
  const [basename, setBasename] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) {
      setBasename(null);
      setError(null);
      return;
    }
    // Check cache first
    if (basenameCache.has(address)) {
      setBasename(basenameCache.get(address) ?? null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    resolveBasename(address)
      .then((name) => {
        setBasename(name);
        setLoading(false);
        basenameCache.set(address, name);
        console.log('[Basename Hook]', { address, basename: name });
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
        setBasename(null);
        setLoading(false);
        basenameCache.set(address, null);
      });
  }, [address]);

  return { basename, loading, error };
} 