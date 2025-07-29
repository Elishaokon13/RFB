import { useState, useEffect, useRef } from "react";
import { Search, X, TrendingUp, TrendingDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { getCoin, getCoinsTopGainers, getCoinsTopVolume24h, getCoinsMostValuable, getCoinsNew } from "@zoralabs/coins-sdk";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  name: string;
  symbol: string;
  address: string;
  marketCap?: string;
  volume24h?: string;
  marketCapDelta24h?: string;
  image?: string;
  searchScore?: number;
  mediaContent?: {
    mimeType?: string;
    originalUri?: string;
    previewImage?: {
      small?: string;
      medium?: string;
      blurhash?: string;
    };
  };
}

interface TokenIndex {
  token: SearchResult;
  searchTerms: string[];
  normalizedName: string;
  normalizedSymbol: string;
}

// Popular token addresses for demo purposes
const POPULAR_TOKENS = [
  {
    name: "Ethereum",
    symbol: "ETH",
    address: "0x0000000000000000000000000000000000000000",
    searchTerms: ["ethereum", "eth", "ether", "crypto", "blockchain"]
  },
  {
    name: "USDC",
    symbol: "USDC", 
    address: "0xA0b86a33E6441b8c4C8C8C8C8C8C8C8C8C8C8C8C",
    searchTerms: ["usdc", "usd coin", "stablecoin", "dollar", "usd"]
  },
  {
    name: "USDT",
    symbol: "USDT",
    address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    searchTerms: ["usdt", "tether", "stablecoin", "dollar", "usd"]
  },
  {
    name: "Bitcoin",
    symbol: "BTC",
    address: "0x0000000000000000000000000000000000000001",
    searchTerms: ["bitcoin", "btc", "crypto", "digital gold"]
  }
];

// Fuzzy search utility functions
const normalizeString = (str: string): string => {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
};

const calculateSimilarity = (str1: string, str2: string): number => {
  const normalized1 = normalizeString(str1);
  const normalized2 = normalizeString(str2);
  
  if (normalized1 === normalized2) return 1.0;
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) return 0.8;
  
  // Levenshtein distance for similarity
  const matrix = Array(normalized2.length + 1).fill(null).map(() => Array(normalized1.length + 1).fill(null));
  
  for (let i = 0; i <= normalized1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= normalized2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= normalized2.length; j++) {
    for (let i = 1; i <= normalized1.length; i++) {
      const indicator = normalized1[i - 1] === normalized2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  
  const maxLength = Math.max(normalized1.length, normalized2.length);
  return 1 - (matrix[normalized2.length][normalized1.length] / maxLength);
};

const tokenToIndex = (token: SearchResult): TokenIndex => {
  const name = token.name || '';
  const symbol = token.symbol || '';
  const address = token.address || '';
  
  // Generate search terms from token data
  const searchTerms = [
    name.toLowerCase(),
    symbol.toLowerCase(),
    address.toLowerCase(),
    // Add common variations
    name.toLowerCase().replace(/\s+/g, ''),
    symbol.toLowerCase().replace(/\s+/g, ''),
    // Add partial matches
    ...name.toLowerCase().split(/\s+/),
    ...symbol.toLowerCase().split(/\s+/)
  ].filter(term => term.length > 0);
  
  return {
    token,
    searchTerms,
    normalizedName: normalizeString(name),
    normalizedSymbol: normalizeString(symbol)
  };
};

const searchTokens = (tokens: SearchResult[], query: string): SearchResult[] => {
  const normalizedQuery = normalizeString(query);
  const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0);
  
  const scoredResults = tokens.map(token => {
    const index = tokenToIndex(token);
    let score = 0;
    
    // Exact matches get highest score
    if (index.normalizedName === normalizedQuery) score += 100;
    if (index.normalizedSymbol === normalizedQuery) score += 100;
    if (token.address.toLowerCase() === query.toLowerCase()) score += 100;
    
    // Partial matches
    if (index.normalizedName.includes(normalizedQuery)) score += 50;
    if (index.normalizedSymbol.includes(normalizedQuery)) score += 50;
    if (token.address.toLowerCase().includes(query.toLowerCase())) score += 30;
    
    // Fuzzy matching
    const nameSimilarity = calculateSimilarity(token.name || '', query);
    const symbolSimilarity = calculateSimilarity(token.symbol || '', query);
    
    if (nameSimilarity > 0.7) score += Math.floor(nameSimilarity * 40);
    if (symbolSimilarity > 0.7) score += Math.floor(symbolSimilarity * 40);
    
    // Term matching
    queryTerms.forEach(term => {
      index.searchTerms.forEach(searchTerm => {
        if (searchTerm.includes(term)) score += 10;
        if (term.includes(searchTerm)) score += 5;
      });
    });
    
    // Boost popular tokens
    const isPopular = POPULAR_TOKENS.some(popular => 
      popular.address.toLowerCase() === token.address.toLowerCase()
    );
    if (isPopular) score += 20;
    
    return { ...token, searchScore: score };
  });
  
  // Filter and sort by score
  return scoredResults
    .filter(result => result.searchScore! > 0)
    .sort((a, b) => (b.searchScore || 0) - (a.searchScore || 0))
    .slice(0, 15); // Return top 15 results
};

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  // Search for tokens using Zora Protocol with indexing
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ["token-search", debouncedQuery],
    queryFn: async (): Promise<SearchResult[]> => {
      if (!debouncedQuery || debouncedQuery.length < 2) return [];
      
      const query = debouncedQuery.toLowerCase().trim();
      
      try {
        // 1. Direct address search (highest priority)
        if (query.startsWith("0x") && query.length === 42) {
          try {
            const response = await getCoin({ address: query });
            if (response.data?.zora20Token) {
              const token = response.data.zora20Token as SearchResult;
              return [{ 
                ...token, 
                searchScore: 100,
                image: token.mediaContent?.previewImage?.medium || token.image
              }];
            }
          } catch (error) {
            console.log("Token not found by address:", query);
          }
        }

        // 2. Search through various token lists
        const searchPromises = [
          getCoinsTopGainers({ count: 100 }),
          getCoinsTopVolume24h({ count: 100 }),
          getCoinsMostValuable({ count: 100 }),
          getCoinsNew({ count: 100 })
        ];

        const responses = await Promise.allSettled(searchPromises);
        
        const allTokens: SearchResult[] = [];
        
        responses.forEach((response) => {
          if (response.status === 'fulfilled' && response.value.data?.exploreList?.edges) {
            const tokens = response.value.data.exploreList.edges.map(
              (edge: { node: unknown }) => {
                const token = edge.node as SearchResult;
                return {
                  ...token,
                  image: token.mediaContent?.previewImage?.medium || token.image
                };
              }
            );
            allTokens.push(...tokens);
          }
        });

        // 3. Add popular tokens
        const popularTokens: SearchResult[] = POPULAR_TOKENS.map(popular => ({
          id: popular.address,
          name: popular.name,
          symbol: popular.symbol,
          address: popular.address,
          marketCap: "0",
          volume24h: "0",
          marketCapDelta24h: "0"
        }));
        
        allTokens.push(...popularTokens);

        // 4. Remove duplicates
        const uniqueTokens = Array.from(
          new Map(allTokens.map(token => [token.address, token])).values()
        );

        // 5. Apply indexed search with fuzzy matching
        const searchResults = searchTokens(uniqueTokens, query);
        
        return searchResults;
        
      } catch (error) {
        console.error("Search error:", error);
        return [];
      }
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleTokenClick = (token: SearchResult) => {
    navigate(`/token/${token.address}`);
    onClose();
    setSearchQuery("");
  };

  const formatMarketCap = (marketCap?: string): string => {
    if (!marketCap) return "N/A";
    const value = parseFloat(marketCap);
    if (isNaN(value)) return "N/A";
    
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: value >= 1e9 ? "compact" : "standard",
      maximumFractionDigits: 2,
    });
    
    return formatter.format(value);
  };

  const formatPercentage = (value: number): string => {
    const absValue = Math.abs(value);
    if (absValue >= 1000000) {
      return `${(value / 1000000).toFixed(1)}m`;
    } else if (absValue >= 1000) {
      return `${(value / 1000).toFixed(1)}k`;
    } else {
      return value.toFixed(2);
    }
  };

  const formatPercentChange = (marketCapDelta24h?: string): string => {
    if (!marketCapDelta24h) return "N/A";
    const change = parseFloat(marketCapDelta24h);
    if (isNaN(change)) return "N/A";
    return `${change >= 0 ? "+" : ""}${formatPercentage(change)}%`;
  };

  const getChangeColor = (marketCapDelta24h?: string): string => {
    if (!marketCapDelta24h) return "text-muted-foreground";
    const change = parseFloat(marketCapDelta24h);
    if (isNaN(change)) return "text-muted-foreground";
    return change >= 0 ? "text-green-600" : "text-red-600";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm">
      <div className="flex items-start justify-center min-h-screen p-4 pt-[10vh]">
        <div className="w-full max-w-2xl bg-background border border-border rounded-2xl shadow-2xl overflow-hidden">
          {/* Header with Search Input */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-4">
              <Search className="w-6 h-6 text-muted-foreground flex-shrink-0" />
              <Input
                ref={inputRef}
                type="text"
                placeholder="Search tokens by name, symbol or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 border-0 text-lg bg-transparent focus:ring-0 placeholder:text-muted-foreground/70"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="p-2 hover:bg-muted rounded-lg"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Results */}
          <div className="max-h-[60vh] overflow-y-auto">
            {debouncedQuery.length < 2 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Search Tokens</h3>
                <p className="text-muted-foreground">Type at least 2 characters to start searching</p>
              </div>
            ) : isSearching ? (
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <span className="text-sm font-medium">Searching...</span>
                </div>
                <div className="space-y-3">
                  {Array.from({ length: 3 }, (_, index) => (
                    <div key={index} className="p-4 bg-muted/30 rounded-xl animate-pulse">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-muted rounded-xl" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted rounded w-3/4" />
                          <div className="h-3 bg-muted rounded w-1/2" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : searchResults && searchResults.length > 0 ? (
              <div className="p-4">
                <div className="text-sm text-muted-foreground mb-4">
                  {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
                </div>
                <div className="space-y-2">
                  {searchResults.map((token) => (
                    <div
                      key={token.id}
                      className="p-4 hover:bg-muted/50 rounded-xl cursor-pointer transition-colors"
                      onClick={() => handleTokenClick(token)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative flex-shrink-0">
                          <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-xl flex items-center justify-center overflow-hidden">
                            {token.image ? (
                              <img 
                                src={token.image} 
                                alt={token.symbol} 
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  target.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                            ) : null}
                            <span className={`text-lg font-bold text-primary ${token.image ? 'hidden' : ''}`}>
                              {token.symbol?.charAt(0) || '?'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-foreground truncate">
                              {token.name}
                            </h4>
                            <Badge variant="secondary" className="text-xs">
                              {token.symbol}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground font-mono">
                            {token.address.slice(0, 6)}...{token.address.slice(-4)}
                          </p>
                        </div>
                        
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-semibold">
                            {formatMarketCap(token.marketCap)}
                          </div>
                          <div className={`text-xs ${getChangeColor(token.marketCapDelta24h)}`}>
                            {formatPercentChange(token.marketCapDelta24h)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : debouncedQuery.length >= 2 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No tokens found</h3>
                <p className="text-muted-foreground mb-6">
                  No results for "<span className="font-medium text-foreground">{debouncedQuery}</span>"
                </p>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p className="font-medium">Try these suggestions:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <span className="px-3 py-1 bg-muted/50 rounded-lg">Use partial names</span>
                    <span className="px-3 py-1 bg-muted/50 rounded-lg">Try symbols (BTC, ETH)</span>
                    <span className="px-3 py-1 bg-muted/50 rounded-lg">Enter full address</span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}