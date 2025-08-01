import React from "react";
import {
  useGetCoinsTopGainers,
  formatPercentChange,
  formatMarketCap,
  formatVolume,
} from "../hooks/getCoinsTopGainers";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Skeleton } from "./ui/skeleton";

interface TopGainersTableProps {
  count?: number;
}

export const TopGainersTable: React.FC<TopGainersTableProps> = ({
  count = 10,
}) => {
  const { data, isLoading, error, refetch } = useGetCoinsTopGainers({ count });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Gainers (24h)</CardTitle>
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
    refetch()
    return (
      <div className="flex flex-col items-center justify-center py-16 animate-pulse">
        <span className="text-6xl animate-bounce">🔥</span>
        <span className="mt-4 text-lg font-semibold text-primary animate-pulse">
          Loading the hottest new picks...
        </span>
        <span className="mt-2 text-sm text-muted-foreground">
          Fetching the latest tokens. This may take a moment if the network is
          busy.
        </span>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Gainers (24h)</CardTitle>
        <p className="text-sm text-muted-foreground">
          Coins with the highest market cap growth in the last 24 hours
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data?.coins?.map((coin, index) => (
            <div
              key={coin.id}
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
                  <span className="text-sm font-medium text-primary">
                    {index + 1}
                  </span>
                </div>
                <div>
                  <div className="font-medium">{coin.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {coin.symbol}
                  </div>
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

                <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                  +{formatPercentChange(coin.marketCapDelta24h)}
                </Badge>
              </div>
            </div>
          ))}
        </div>

        {data?.pagination?.cursor && (
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              Next page available - cursor: {data.pagination.cursor}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
