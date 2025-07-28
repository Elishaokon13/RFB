import { useState, useCallback, useMemo } from 'react';
import { Search, X, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useComparison, ComparisonToken } from '@/context/ComparisonContext';
import { useTokenFeed } from '@/hooks/useTokenFeed';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Coin } from '@/hooks/usePreloadAllData';

// Define a type for tokens with optional image
interface TokenWithImage extends Partial<Coin> {
  address: string;
  name?: string;
  symbol?: string;
  mediaContent?: {
    previewImage?: {
      small?: string;
    };
  };
}

export function TokenSelector() {
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { state, addToken, removeToken, clearTokens } = useComparison();
  
  // Use the existing token feed to get popular tokens
  const { coins, isLoading } = useTokenFeed('Most Valuable');
  
  // Filter coins based on the search query
  const filteredCoins = useMemo(() => {
    if (!searchQuery.trim()) return coins.slice(0, 10); // Show top 10 if no search
    
    return coins.filter(coin => 
      coin.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      coin.symbol?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coin.address.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 10); // Limit to 10 results
  }, [coins, searchQuery]);
  
  // Handle token selection
  const handleSelectToken = useCallback((coin: TokenWithImage) => {
    addToken({
      address: coin.address,
      name: coin.name || 'Unknown',
      symbol: coin.symbol || 'UNK',
      image: coin.mediaContent?.previewImage?.small,
    });
    setSearchQuery('');
    setDropdownOpen(false);
  }, [addToken]);
  
  // Get the count of currently selected tokens
  const selectedCount = state.tokens.length;
  const canAddMore = selectedCount < 4;
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Compare Tokens</h2>
        {selectedCount > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearTokens}
          >
            Clear All
          </Button>
        )}
      </div>
      
      {/* Selected tokens */}
      <div className="flex flex-wrap gap-2 mb-4">
        {state.tokens.map(token => (
          <Badge 
            key={token.address} 
            variant="outline" 
            className="flex items-center gap-2 py-1 pl-2 pr-1 bg-background"
            style={{ borderColor: token.color, color: token.color }}
          >
            {token.image && (
              <div className="w-4 h-4 rounded-full overflow-hidden">
                <img src={token.image} alt={token.symbol} className="w-full h-full object-cover" />
              </div>
            )}
            <span>{token.symbol}</span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-4 w-4 p-0 hover:bg-muted rounded-full ml-1"
              onClick={() => removeToken(token.address)}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        ))}
        
        {/* Token selector dropdown */}
        {canAddMore && (
          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-1 h-8"
              >
                <Plus className="h-4 w-4" />
                Add Token
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[300px]">
              <DropdownMenuLabel>Select a token to compare</DropdownMenuLabel>
              <div className="px-2 py-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, symbol or address"
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <DropdownMenuSeparator />
              <ScrollArea className="h-[300px]">
                <DropdownMenuGroup>
                  {isLoading ? (
                    <div className="p-4 text-center text-muted-foreground">
                      Loading tokens...
                    </div>
                  ) : filteredCoins.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      No tokens found
                    </div>
                  ) : (
                    filteredCoins.map(coin => {
                      const isSelected = state.tokens.some(t => t.address === coin.address);
                      const typedCoin = coin as unknown as TokenWithImage;
                      return (
                        <DropdownMenuItem
                          key={typedCoin.address}
                          disabled={isSelected}
                          onSelect={() => !isSelected && handleSelectToken(typedCoin)}
                          className="flex items-center gap-2 py-2"
                        >
                          <div className="w-6 h-6 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                            {typedCoin.mediaContent?.previewImage?.small ? (
                              <img 
                                src={typedCoin.mediaContent.previewImage.small} 
                                alt={typedCoin.symbol} 
                                className="w-full h-full object-cover" 
                              />
                            ) : (
                              <span className="text-xs">{typedCoin.symbol?.[0] || '?'}</span>
                            )}
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <div className="font-medium truncate">{typedCoin.name || 'Unknown'}</div>
                            <div className="text-xs text-muted-foreground">{typedCoin.symbol || 'UNK'}</div>
                          </div>
                          {isSelected && <Badge variant="outline">Selected</Badge>}
                        </DropdownMenuItem>
                      );
                    })
                  )}
                </DropdownMenuGroup>
              </ScrollArea>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
} 