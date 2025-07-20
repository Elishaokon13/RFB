import React from 'react';
import { useGetCoins, formatCreationDate, formatMarketCap, formatVolume, formatCreatorAddress } from '../hooks/getCoins';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';

interface NewCoinsTableProps {
  count?: number;
}

export const NewCoinsTable: React.FC<NewCoinsTableProps> = ({ count = 10 }) => {
  const { data, isLoading, error } = useGetCoins({ count });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>New Coins</CardTitle>
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
          <CardTitle>New Coins</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-500">
            Error loading new coins: {error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Coins</CardTitle>
        <p className="text-sm text-muted-foreground">
          Most recently created coins on Zora Protocol
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
                    {formatCreatorAddress(coin.creatorAddress)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Creator
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-sm font-medium">
                    {formatCreationDate(coin.createdAt)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Created
                  </div>
                </div>
                
                <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">
                  New
                </Badge>
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