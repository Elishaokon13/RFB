import React from 'react';
import { useGetCoinsLastTradedUnique, formatLastTradedTime, formatMarketCap, formatVolume, formatUniqueHolders, getHolderActivityLevel, getActivityColor } from '../hooks/getCoinsLastTradedUnique';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';

interface LastTradedUniqueTableProps {
  count?: number;
}

export const LastTradedUniqueTable: React.FC<LastTradedUniqueTableProps> = ({ count = 10 }) => {
  const { data, isLoading, error } = useGetCoinsLastTradedUnique({ count });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recently Traded by Unique Traders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: count }).map((_, index) => (
              <div key={index} className="flex items-center space-x-4">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-3 w-[100px]" />
                </div>
                <Skeleton className="h-4 w-[80px]" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recently Traded by Unique Traders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-500">
            Error loading recently traded unique coins: {error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recently Traded by Unique Traders</CardTitle>
        <p className="text-sm text-muted-foreground">
          Coins that have been traded by unique traders most recently
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data?.coins?.map((coin, index) => (
            <div key={coin.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
                  <span className="text-sm font-medium text-primary">
                    {index + 1}
                  </span>
                </div>
                <div>
                  <div className="font-medium">{coin.name}</div>
                  <div className="text-sm text-muted-foreground">{coin.symbol}</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-sm font-medium">
                    {formatMarketCap(coin.marketCap)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Market Cap
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-sm font-medium">
                    {formatVolume(coin.volume24h)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Volume 24h
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-sm font-medium">
                    {formatUniqueHolders(coin.uniqueHolders)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Unique Holders
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-sm font-medium">
                    {formatLastTradedTime(coin.lastTradedAt)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Last Traded
                  </div>
                </div>
                
                <div className="flex flex-col space-y-1">
                  <Badge className={getHolderActivityLevel(coin.uniqueHolders)}>
                    {coin.uniqueHolders && coin.uniqueHolders >= 10000 ? "Very Active" :
                     coin.uniqueHolders && coin.uniqueHolders >= 1000 ? "High Activity" :
                     coin.uniqueHolders && coin.uniqueHolders >= 100 ? "Moderate" :
                     coin.uniqueHolders && coin.uniqueHolders >= 10 ? "Low Activity" : "Inactive"}
                  </Badge>
                  <Badge className={getActivityColor(coin.lastTradedAt)}>
                    Recent
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {data?.pageInfo?.endCursor && (
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              Next page available - cursor: {data.pageInfo.endCursor}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 