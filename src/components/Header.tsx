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
import { PrivyWalletConnect } from "@/components/PrivyWalletConnect";

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

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
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
                // Ensure we have the proper image data structure
                const processedToken = {
                  ...token,
                  image: token.mediaContent?.previewImage?.medium || token.image
                };
                
                // Debug logging for first few tokens
                if (allTokens.length < 3) {
                  console.log('Token image data:', {
                    name: processedToken.name,
                    symbol: processedToken.symbol,
                    image: processedToken.image,
                    mediaContent: processedToken.mediaContent
                  });
                }
                
                return processedToken;
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
      // Cmd+K (Mac) or Ctrl+K (Windows/Linux) to open search
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setIsSearchOpen(true);
      }
      // Escape to close search
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
    <header className="h-16 bg-background border-b border-border flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-2 sm:gap-4 flex-1">
        {/* Mobile menu */}
        <button 
          className="lg:hidden p-2 rounded-md hover:bg-muted transition-colors"
          onClick={onMenuClick}
        >
          <Menu className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Search */}
        <div className="relative flex-1 max-w-md lg:max-w-lg z-50" ref={searchRef}>
          <form onSubmit={handleSearchSubmit}>
            <div className="relative group">
              {/* Glowing background effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-purple-500/20 to-blue-500/20 rounded-xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"></div>
              
                            {/* Main search container */}
              <div className="relative bg-background/80 backdrop-blur-xl  rounded-lg shadow-lg group-focus-within:shadow-xl group-focus-within:border-primary/50 transition-all duration-300">
                <div className="flex items-center px-2 py-2">
                  {/* Search icon with animation */}
                  
                  
                  {/* Input field */}
                  <Input
                    type="text"
                    placeholder="Search tokens..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setIsSearchOpen(true);
                    }}
                    onFocus={() => setIsSearchOpen(true)}
                    className="flex-1 ml-2 bg-transparent border-0 focus:ring-0 text-sm placeholder:text-muted-foreground/70 placeholder:font-medium transition-all duration-300 group-focus-within:text-foreground"
                  />
                  
                  {/* Clear button with smooth animation */}
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setIsSearchOpen(false);
                      }}
                      className="relative p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200 group/clear"
                    >
                      <X className="w-3 h-3 transition-transform duration-200 group-hover/clear:scale-110" />
                      <div className="absolute inset-0 bg-red-500/10 rounded-md scale-0 group-hover/clear:scale-100 transition-transform duration-200"></div>
                    </button>
                  )}
                  
                  {/* Keyboard shortcut badge */}
                  <div className="relative ml-1.5">
                    <kbd className="px-1.5 py-0.5 bg-muted/50 text-xs text-muted-foreground rounded-md border border-border/50 font-mono transition-all duration-300 group-focus-within:bg-primary/10 group-focus-within:text-primary group-focus-within:border-primary/30">
                      ⌘K
                    </kbd>
                  </div>
                </div>
              </div>
            </div>
          </form>

          {/* Enhanced Search Results Dropdown */}
          {isSearchOpen && (
            <div className="absolute top-full left-0 right-0 mt-3 animate-in slide-in-from-top-2 duration-300 z-[9999]">
              {/* Backdrop blur */}
              <div className="absolute inset-0 bg-background/80 backdrop-blur-xl rounded-2xl border border-border/50 shadow-2xl"></div>
              
              {/* Content */}
              <div className="relative bg-background/90 backdrop-blur-xl rounded-2xl border border-border/50 shadow-2xl max-h-96 overflow-hidden">
                {debouncedQuery.length < 2 ? (
                  <div className="p-8 text-center">
                    <div className="relative mb-6">
                      <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Search className="w-8 h-8 text-primary" />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-2xl blur-xl opacity-50"></div>
                    </div>
                    <h3 className="text-lg font-semibold mb-2 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                      Smart Token Search
                    </h3>
                    <p className="text-muted-foreground mb-6">Type at least 2 characters to discover tokens</p>
                    
                    {/* Feature highlights */}
                    
                  </div>
                ) : isSearching ? (
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="relative">
                        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                      </div>
                      <span className="text-sm font-medium">Searching across networks...</span>
                    </div>
                    
                    {/* Enhanced skeleton loading */}
                    <div className="space-y-3">
                      {Array.from({ length: 3 }, (_, index) => (
                        <div key={index} className="p-4 bg-muted/30 rounded-xl border border-border/30 animate-pulse">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-muted rounded-xl"></div>
                            <div className="flex-1 space-y-2">
                              <div className="h-4 bg-muted rounded w-3/4"></div>
                              <div className="h-3 bg-muted rounded w-1/2"></div>
                            </div>
                            <div className="text-right space-y-2">
                              <div className="h-4 bg-muted rounded w-20"></div>
                              <div className="h-3 bg-muted rounded w-16"></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : searchResults && searchResults.length > 0 ? (
                  <div className="p-4">
                    {/* Results header */}
                    <div className="flex items-center justify-between mb-4 p-3 bg-muted/30 rounded-xl">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium">
                          {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-lg">
                        Sorted by relevance
                      </span>
                    </div>
                    
                    {/* Results list */}
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {searchResults.map((token, index) => (
                        <div 
                          key={token.id} 
                          className="group p-4 bg-muted/20 hover:bg-muted/40 rounded-xl border border-border/30 cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                          onClick={() => handleTokenClick(token)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              {/* Token icon */}
                              <div className="relative">
                                <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-xl flex items-center justify-center overflow-hidden">
                                  {token.image ? (
                                    <img 
                                      src={token.image} 
                                      alt={token.symbol} 
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        // Fallback to symbol if image fails to load
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
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background flex items-center justify-center">
                                  <div className="w-2 h-2 bg-white rounded-full"></div>
                                </div>
                              </div>
                              
                              {/* Token info */}
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                    {token.name}
                                  </h4>
                                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-lg font-medium">
                                    {token.symbol}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground font-mono">
                                  {token.address.slice(0, 6)}...{token.address.slice(-4)}
                                </p>
                              </div>
                            </div>
                            
                            {/* Market data */}
                            <div className="text-right">
                              <div className="text-sm font-semibold text-foreground">
                                {formatMarketCap(token.marketCap)}
                              </div>
                              <div className={`text-xs font-medium ${getChangeColor(token.marketCapDelta24h)}`}>
                                {formatPercentChange(token.marketCapDelta24h)}
                              </div>
                            </div>
                          </div>
                          
                          {/* Additional metrics */}
                          
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
                    
                    {/* Suggestions */}
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
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notifications - Hidden on mobile */}
        <button className="relative hidden sm:block">
          <Bell className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full"></span>
        </button>

        {/* Wallet Connect */}
        <div>
          <PrivyWalletConnect />
        </div>
      </div>
    </header>
  );
}