import { Search, Bell, User, Menu, X, TrendingUp, DollarSign, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useRef } from "react";
import { getCoin, getCoinsTopGainers, getCoinsTopVolume24h, getCoinsMostValuable, getCoinsNew } from "@zoralabs/coins-sdk";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Skeleton } from "@/components/ui/skeleton";

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

export function Header() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

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
              return [{ ...response.data.zora20Token as SearchResult, searchScore: 100 }];
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
              (edge: { node: unknown }) => edge.node as SearchResult
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

  // Close search on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "/" && !isSearchOpen) {
        event.preventDefault();
        setIsSearchOpen(true);
      }
      if (event.key === "Escape" && isSearchOpen) {
        setIsSearchOpen(false);
        setSearchQuery("");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSearchOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      console.log("Searching for:", searchQuery);
      setIsSearchOpen(false);
    }
  };

  const handleTokenClick = (token: SearchResult) => {
    // Navigate to token details page
    navigate(`/token/${token.address}`);
    // Close search and clear query
    setIsSearchOpen(false);
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

  const formatVolume = (volume24h?: string): string => {
    if (!volume24h) return "N/A";
    const value = parseFloat(volume24h);
    if (isNaN(value)) return "N/A";
    
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: value >= 1e6 ? "compact" : "standard",
      maximumFractionDigits: 2,
    });
    
    return formatter.format(value);
  };

  // Helper function to format percentage with abbreviations
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

  const getSearchScoreColor = (score?: number): string => {
    if (!score) return "text-muted-foreground";
    if (score >= 80) return "text-green-600";
    if (score >= 50) return "text-blue-600";
    if (score >= 20) return "text-yellow-600";
    return "text-muted-foreground";
  };

  return (
    <header className="h-16 bg-background border-b border-border flex items-center justify-between px-6">
      <div className="flex items-center gap-4 flex-1">
        {/* Mobile menu */}
        <button className="lg:hidden">
          <Menu className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Search */}
        <div className="relative flex-1 max-w-2xl" ref={searchRef}>
          <form onSubmit={handleSearchSubmit}>
            <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
                placeholder="Search tokens by name, symbol, or address..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => setIsSearchOpen(true)}
                className="pl-10 bg-muted border-0 focus:ring-2 focus:ring-primary h-10"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setIsSearchOpen(false);
                  }}
                  className="absolute right-8 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
          <kbd className="absolute right-3 top-1/2 transform -translate-y-1/2 px-1.5 py-0.5 bg-muted-foreground/10 text-xs text-muted-foreground rounded">
            /
          </kbd>
            </div>
          </form>

          {/* Search Results Dropdown */}
          {isSearchOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
              {debouncedQuery.length < 2 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Type at least 2 characters to search</p>
                  <div className="mt-3 text-xs space-y-1">
                    <p className="font-medium">Smart Search Features:</p>
                    <p>• Fuzzy matching for similar names</p>
                    <p>• Partial word matching</p>
                    <p>• Popular token suggestions</p>
                    <p>• Use keyboard shortcut: <kbd className="px-1 py-0.5 bg-muted rounded text-xs">/</kbd></p>
                    <p>• Press <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Esc</kbd> to close</p>
                  </div>
                </div>
              ) : isSearching ? (
                <div className="p-2">
                  <div className="text-xs text-muted-foreground mb-2 px-2 flex justify-between">
                    <span>Searching...</span>
                  </div>
                  {Array.from({ length: 5 }, (_, index) => (
                    <Card key={index} className="p-3 mb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Skeleton className="w-8 h-8 rounded-full" />
                          <div>
                            <Skeleton className="h-4 w-32 mb-1" />
                            <Skeleton className="h-3 w-16" />
                          </div>
                        </div>
                        <div className="text-right">
                          <Skeleton className="h-4 w-20 mb-1" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-4">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </Card>
                  ))}
                </div>
              ) : searchResults && searchResults.length > 0 ? (
                <div className="p-2">
                  <div className="text-xs text-muted-foreground mb-2 px-2 flex justify-between">
                    <span>Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}</span>
                    <span className="text-xs">Sorted by relevance</span>
                  </div>
                  {searchResults.map((token, index) => (
                    <Card 
                      key={token.id} 
                      className="p-3 mb-2 hover:bg-muted/50 cursor-pointer transition-all duration-200 hover:shadow-md active:scale-95"
                      onClick={() => handleTokenClick(token)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {token.image ? (
                            <img src={token.image} alt={token.name} className="w-8 h-8 rounded-full" />
                          ) : (
                            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                              <DollarSign className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                                                      <div>
                              <div className="font-medium flex items-center gap-2">
                                {token.name?.length > 12 ? token.name.slice(0, 12) + '...' : token.name}
                                {index < 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    Top {index + 1}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {token.symbol?.length > 8 ? token.symbol.slice(0, 8) + '...' : token.symbol}
                              </div>
                            </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">{formatMarketCap(token.marketCap)}</div>
                          <div className={`text-xs ${getChangeColor(token.marketCapDelta24h)}`}>
                            {formatPercentChange(token.marketCapDelta24h)}
                          </div>
                          {token.searchScore && (
                            <div className={`text-xs ${getSearchScoreColor(token.searchScore)}`}>
                              {token.searchScore}% match
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {formatVolume(token.volume24h)}
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {token.address.slice(0, 6)}...{token.address.slice(-4)}
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : debouncedQuery.length >= 2 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No tokens found for "{debouncedQuery}"</p>
                  <p className="text-xs mt-1">Try different keywords or check spelling</p>
                  <div className="mt-2 text-xs">
                    <p>Suggestions:</p>
                    <p>• Try partial names (e.g., "eth" for "Ethereum")</p>
                    <p>• Use symbols (e.g., "BTC" for "Bitcoin")</p>
                    <p>• Enter full contract address</p>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <button className="relative">
          <Bell className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full"></span>
        </button>

        {/* Profile */}
        {/* <button className="w-8 h-8 bg-muted rounded-full flex items-center justify-center hover:bg-muted/80 transition-colors">
          <User className="w-4 h-4 text-muted-foreground" />
        </button> */}
      </div>
    </header>
  );
}