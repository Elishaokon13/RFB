import { useMemo } from 'react';
import { TokenComparisonData } from '@/hooks/useComparisonTokens';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ComparisonGridProps {
  data: TokenComparisonData[];
  loading: boolean;
  isRelative: boolean;
}

type MetricInfo = {
  key: string;
  label: string;
  format: (value: number) => string;
  compareTokens?: (a: number, b: number) => string;
};

const METRICS: MetricInfo[] = [
  {
    key: 'price',
    label: 'Current Price',
    format: (value: number) => formatCurrency(value),
    compareTokens: (a: number, b: number) => {
      if (a === 0) return '0%';
      const percentDiff = ((b - a) / a) * 100;
      return `${percentDiff > 0 ? '+' : ''}${percentDiff.toFixed(2)}%`;
    },
  },
  {
    key: 'change24h',
    label: '24h Change',
    format: (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(2)}%`,
    compareTokens: (a: number, b: number) => {
      const diff = b - a;
      return `${diff > 0 ? '+' : ''}${diff.toFixed(2)}%`;
    },
  },
  {
    key: 'marketCap',
    label: 'Market Cap',
    format: (value: number) => formatCurrency(value),
    compareTokens: (a: number, b: number) => {
      if (a === 0) return '0%';
      const percentDiff = ((b - a) / a) * 100;
      return `${percentDiff > 0 ? '+' : ''}${percentDiff.toFixed(2)}%`;
    },
  },
  {
    key: 'volume',
    label: '24h Volume',
    format: (value: number) => formatCurrency(value),
    compareTokens: (a: number, b: number) => {
      if (a === 0) return '0%';
      const percentDiff = ((b - a) / a) * 100;
      return `${percentDiff > 0 ? '+' : ''}${percentDiff.toFixed(2)}%`;
    },
  },
  {
    key: 'holders',
    label: 'Holders',
    format: (value: number) => formatNumber(value),
    compareTokens: (a: number, b: number) => {
      if (a === 0) return '0%';
      const percentDiff = ((b - a) / a) * 100;
      return `${percentDiff > 0 ? '+' : ''}${percentDiff.toFixed(2)}%`;
    },
  },
];

// Format currency values with appropriate units
function formatCurrency(value: number): string {
  if (value === 0) return '$0';
  
  if (value < 0.00001) {
    return `$${value.toExponential(2)}`;
  } else if (value < 0.01) {
    return `$${value.toFixed(6)}`;
  } else if (value < 1) {
    return `$${value.toFixed(4)}`;
  } else if (value < 1000) {
    return `$${value.toFixed(2)}`;
  } else if (value < 1000000) {
    return `$${(value / 1000).toFixed(2)}K`;
  } else if (value < 1000000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  } else {
    return `$${(value / 1000000000).toFixed(2)}B`;
  }
}

// Format large numbers with appropriate units
function formatNumber(value: number): string {
  if (value < 1000) {
    return value.toString();
  } else if (value < 1000000) {
    return `${(value / 1000).toFixed(1)}K`;
  } else {
    return `${(value / 1000000).toFixed(1)}M`;
  }
}

// Format confidence score from DefiLlama
function formatConfidence(confidence?: number): string {
  if (confidence === undefined) return 'N/A';
  return `${(confidence * 100).toFixed(0)}%`;
}

// Get confidence color based on score
function getConfidenceColor(confidence?: number): string {
  if (confidence === undefined) return 'text-muted-foreground';
  if (confidence >= 0.8) return 'text-green-500';
  if (confidence >= 0.5) return 'text-yellow-500';
  return 'text-red-500';
}

export function ComparisonGrid({ data, loading, isRelative }: ComparisonGridProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Token Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Skeleton className="w-full h-80" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Token Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            Add tokens to compare
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Token Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="py-3 px-4 text-left text-muted-foreground font-medium">Metric</th>
                {data.map((token) => (
                  <th key={token.address} className="py-3 px-4 text-center font-medium">
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-2 mb-1">
                        {token.image ? (
                          <img 
                            src={token.image} 
                            alt={token.symbol} 
                            className="w-5 h-5 rounded-full" 
                          />
                        ) : (
                          <div 
                            className="w-5 h-5 rounded-full"
                            style={{ backgroundColor: token.color }}
                          />
                        )}
                        <span>{token.symbol}</span>
                        <a
                          href={token.geckoTerminalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      {token.priceConfidence !== undefined && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="text-xs flex items-center gap-1">
                                <span>Confidence:</span> 
                                <span className={getConfidenceColor(token.priceConfidence)}>
                                  {formatConfidence(token.priceConfidence)}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>DefiLlama price confidence score</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </th>
                ))}
                {data.length > 1 && (
                  <th className="py-3 px-4 text-center font-medium">Difference</th>
                )}
              </tr>
            </thead>
            <tbody>
              {METRICS.map((metric) => {
                const baseToken = data[0];
                const isChangeMetric = metric.key === 'change24h';
                
                return (
                  <tr key={metric.key} className="border-t border-border">
                    <td className="py-4 px-4 text-muted-foreground">{metric.label}</td>
                    {data.map((token) => {
                      const value = metric.key === 'change24h' 
                        ? token.price.change24h
                        : metric.key === 'price' 
                          ? token.price.current
                          : metric.key === 'marketCap' 
                            ? token.marketCap.current
                            : metric.key === 'volume'
                              ? token.volume.current
                              : token.holders.current;

                      let textColorClass = '';
                      if (isChangeMetric) {
                        textColorClass = value > 0 
                          ? 'text-green-500' 
                          : value < 0 
                            ? 'text-red-500' 
                            : '';
                      }
                      
                      return (
                        <td key={token.address} className="py-4 px-4 text-center">
                          <span className={textColorClass}>
                            {metric.format(value)}
                          </span>
                        </td>
                      );
                    })}
                    
                    {data.length > 1 && metric.compareTokens && (
                      <td className="py-4 px-4 text-center">
                        {(() => {
                          const baseValue = metric.key === 'change24h' 
                            ? baseToken.price.change24h
                            : metric.key === 'price' 
                              ? baseToken.price.current
                              : metric.key === 'marketCap' 
                                ? baseToken.marketCap.current
                                : metric.key === 'volume'
                                  ? baseToken.volume.current
                                  : baseToken.holders.current;
                                  
                          const lastValue = metric.key === 'change24h' 
                            ? data[data.length - 1].price.change24h
                            : metric.key === 'price' 
                              ? data[data.length - 1].price.current
                              : metric.key === 'marketCap' 
                                ? data[data.length - 1].marketCap.current
                                : metric.key === 'volume'
                                  ? data[data.length - 1].volume.current
                                  : data[data.length - 1].holders.current;

                          if (data.length === 2) {
                            const diff = metric.compareTokens(baseValue, lastValue);
                            const isPositive = !diff.startsWith('-') && diff !== '0%';
                            const isNegative = diff.startsWith('-');
                            
                            return (
                              <div className="flex items-center justify-center">
                                {isPositive && <TrendingUp className="w-4 h-4 mr-1 text-green-500" />}
                                {isNegative && <TrendingDown className="w-4 h-4 mr-1 text-red-500" />}
                                {!isPositive && !isNegative && <Minus className="w-4 h-4 mr-1 text-gray-500" />}
                                <span className={cn(
                                  isPositive && 'text-green-500',
                                  isNegative && 'text-red-500'
                                )}>
                                  {diff}
                                </span>
                              </div>
                            );
                          }
                          
                          // If more than 2 tokens, show range
                          const values = data.map(token => {
                            return metric.key === 'change24h' 
                              ? token.price.change24h
                              : metric.key === 'price' 
                                ? token.price.current
                                : metric.key === 'marketCap' 
                                  ? token.marketCap.current
                                  : metric.key === 'volume'
                                    ? token.volume.current
                                    : token.holders.current;
                          });
                          
                          const minValue = Math.min(...values);
                          const maxValue = Math.max(...values);
                          const range = `${metric.format(minValue)} - ${metric.format(maxValue)}`;
                          
                          return (
                            <span className="text-xs">Range: {range}</span>
                          );
                        })()}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
} 