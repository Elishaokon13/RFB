import { useMemo, useState } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer,
  TooltipProps,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ReferenceLine
} from 'recharts';
import { TokenComparisonData } from '@/hooks/useComparisonTokens';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ChartType } from '@/context/ComparisonContext';
import { RefreshCw, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ComparisonChartsProps {
  data: TokenComparisonData[];
  loading: boolean;
  chartType: ChartType;
  isRelative: boolean;
}

// Types for recharts
interface CustomTooltipProps extends TooltipProps<number, string> {
  active?: boolean;
  payload?: Array<{
    value: number;
    name?: string;
    dataKey: string;
    color: string;
  }>;
  label?: string;
}

interface ChartDataPoint {
  timestamp: number;
  date: string;
  [key: string]: number | string; // For dynamic token addresses
}

// Format date for charts
const formatDate = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric' });
};

// Format time for 1h charts
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: 'numeric' });
};

// Format currency
const formatCurrency = (value: number): string => {
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
};

// Format confidence score
const formatConfidence = (confidence?: number): string => {
  if (confidence === undefined) return 'N/A';
  return `${(confidence * 100).toFixed(0)}%`;
};

// Get confidence color
const getConfidenceColor = (confidence?: number): string => {
  if (confidence === undefined) return 'text-muted-foreground';
  if (confidence >= 0.8) return 'text-green-500';
  if (confidence >= 0.5) return 'text-yellow-500';
  return 'text-red-500';
};

export function ComparisonCharts({ data, loading, chartType, isRelative }: ComparisonChartsProps) {
  const [selectedMetric, setSelectedMetric] = useState<'price' | 'marketCap' | 'volume'>('price');
  
  // Process chart data
  const chartData = useMemo<ChartDataPoint[]>(() => {
    if (data.length === 0) return [];
    
    // Find the first token with valid history data
    const baseToken = data.find(token => 
      token[selectedMetric]?.history?.length > 0
    );
    
    if (!baseToken) return [];
    
    // Create a map of timestamp to data points
    const dataMap = new Map<number, ChartDataPoint>();
    
    // Initialize with the base token's timestamps
    baseToken[selectedMetric].history.forEach(point => {
      dataMap.set(point.timestamp, {
        timestamp: point.timestamp,
        date: selectedMetric === 'price' && baseToken[selectedMetric].history.length <= 24 
          ? formatTime(point.timestamp) 
          : formatDate(point.timestamp),
      });
    });
    
    // Add each token's data
    data.forEach(token => {
      if (!token[selectedMetric]?.history) return;
      
      token[selectedMetric].history.forEach(point => {
        const existingPoint = dataMap.get(point.timestamp);
        if (existingPoint) {
          // If in relative mode, calculate percentage relative to the base token
          if (isRelative && token !== baseToken) {
            const baseValue = baseToken[selectedMetric].history.find(
              p => p.timestamp === point.timestamp
            )?.value || 0;
            
            if (baseValue > 0) {
              const relativeValue = ((point.value - baseValue) / baseValue) * 100;
              existingPoint[token.address] = relativeValue;
            } else {
              existingPoint[token.address] = 0;
            }
          } else {
            // Absolute value
            existingPoint[token.address] = point.value;
          }
        } else {
          // This token has a timestamp that others don't have
          const newPoint: ChartDataPoint = {
            timestamp: point.timestamp,
            date: selectedMetric === 'price' && token[selectedMetric].history.length <= 24 
              ? formatTime(point.timestamp) 
              : formatDate(point.timestamp),
          };
          newPoint[token.address] = point.value;
          dataMap.set(point.timestamp, newPoint);
        }
      });
    });
    
    // Convert map to array and sort by timestamp
    return Array.from(dataMap.values())
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [data, selectedMetric, isRelative]);
  
  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background p-3 border border-border rounded-md shadow-md">
          <p className="text-sm mb-2">{label}</p>
          {payload.map((entry) => {
            const token = data.find(t => t.address === entry.dataKey);
            return (
              <div key={entry.dataKey} className="flex items-center gap-2 text-xs mb-1">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                ></div>
                <span>{token?.symbol || entry.name || entry.dataKey}</span>
                <span className="font-medium">
                  {isRelative && selectedMetric !== 'price' ? 
                    `${entry.value > 0 ? '+' : ''}${entry.value.toFixed(2)}%` : 
                    formatCurrency(entry.value)
                  }
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };
  
  // If no tokens
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Price History</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Add tokens to view charts</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Show loading state
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Loading Chart Data</CardTitle>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <RefreshCw className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading price data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get title based on selected metric
  const getTitle = () => {
    switch (selectedMetric) {
      case 'price':
        return 'Price History';
      case 'marketCap':
        return 'Market Cap History';
      case 'volume':
        return 'Trading Volume';
      default:
        return 'Token Data';
    }
  };
  
  // Get y-axis label
  const getYAxisLabel = () => {
    if (isRelative) return '% Difference';
    
    switch (selectedMetric) {
      case 'price':
        return 'Price (USD)';
      case 'marketCap':
        return 'Market Cap (USD)';
      case 'volume':
        return 'Volume (USD)';
      default:
        return 'Value';
    }
  };
  
  // Render the appropriate chart type
  const renderChart = () => {
    switch (chartType) {
      case 'line':
        return (
          <LineChart
            data={chartData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
            <XAxis 
              dataKey="date" 
              tickMargin={10} 
              tickLine={false}
              axisLine={false}
              fontSize={12}
              stroke="currentColor"
              className="text-muted-foreground"
            />
            <YAxis 
              tickFormatter={(value) => isRelative ? `${value}%` : formatCurrency(value)} 
              domain={isRelative ? ['auto', 'auto'] : [0, 'auto']}
              tickLine={false}
              axisLine={false}
              fontSize={12}
              stroke="currentColor"
              className="text-muted-foreground"
            />
            {isRelative && <ReferenceLine y={0} stroke="#888" strokeDasharray="3 3" />}
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              formatter={(value, entry) => {
                const token = data.find(t => t.address === value);
                return token?.symbol || value;
              }}
            />
            {data.map((token) => (
              <Line
                key={token.address}
                type="monotone"
                dataKey={token.address}
                name={token.symbol}
                stroke={token.color}
                strokeWidth={2}
                activeDot={{ r: 6 }}
                dot={chartData.length < 10}
              />
            ))}
          </LineChart>
        );
      case 'area':
        return (
          <AreaChart
            data={chartData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
            <XAxis 
              dataKey="date" 
              tickMargin={10} 
              tickLine={false}
              axisLine={false}
              fontSize={12}
              stroke="currentColor"
              className="text-muted-foreground"
            />
            <YAxis 
              tickFormatter={(value) => isRelative ? `${value}%` : formatCurrency(value)} 
              domain={isRelative ? ['auto', 'auto'] : [0, 'auto']}
              tickLine={false}
              axisLine={false}
              fontSize={12}
              stroke="currentColor"
              className="text-muted-foreground"
            />
            {isRelative && <ReferenceLine y={0} stroke="#888" strokeDasharray="3 3" />}
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              formatter={(value, entry) => {
                const token = data.find(t => t.address === value);
                return token?.symbol || value;
              }}
            />
            {data.map((token) => (
              <Area
                key={token.address}
                type="monotone"
                dataKey={token.address}
                name={token.symbol}
                stroke={token.color}
                fillOpacity={0.2}
                fill={token.color}
                strokeWidth={2}
                activeDot={{ r: 6 }}
                dot={chartData.length < 10}
              />
            ))}
          </AreaChart>
        );
      case 'bar':
        return (
          <BarChart
            data={chartData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
            <XAxis 
              dataKey="date" 
              tickMargin={10} 
              tickLine={false}
              axisLine={false}
              fontSize={12}
              stroke="currentColor"
              className="text-muted-foreground"
            />
            <YAxis 
              tickFormatter={(value) => isRelative ? `${value}%` : formatCurrency(value)} 
              domain={isRelative ? ['auto', 'auto'] : [0, 'auto']}
              tickLine={false}
              axisLine={false}
              fontSize={12}
              stroke="currentColor"
              className="text-muted-foreground"
            />
            {isRelative && <ReferenceLine y={0} stroke="#888" strokeDasharray="3 3" />}
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              formatter={(value, entry) => {
                const token = data.find(t => t.address === value);
                return token?.symbol || value;
              }}
            />
            {data.map((token) => (
              <Bar
                key={token.address}
                dataKey={token.address}
                name={token.symbol}
                fill={token.color}
                barSize={20}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        );
      default:
        return (
          <LineChart
            data={chartData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
            <XAxis dataKey="date" />
            <YAxis tickFormatter={(value) => isRelative ? `${value}%` : formatCurrency(value)} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {data.map((token) => (
              <Line
                key={token.address}
                type="monotone"
                dataKey={token.address}
                name={token.symbol}
                stroke={token.color}
                strokeWidth={2}
              />
            ))}
          </LineChart>
        );
    }
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{getTitle()}</CardTitle>
        <Tabs 
          defaultValue="price" 
          value={selectedMetric}
          onValueChange={(value) => setSelectedMetric(value as 'price' | 'marketCap' | 'volume')}
          className="space-y-0"
        >
          <TabsList className="grid w-[400px] grid-cols-3">
            <TabsTrigger value="price">Price</TabsTrigger>
            <TabsTrigger value="marketCap">Market Cap</TabsTrigger>
            <TabsTrigger value="volume">Volume</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2 pt-4 border-t">
        <TooltipProvider>
          {data.map((token) => (
            <div key={token.address} className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: token.color }}></div>
              <span className="font-medium">{token.symbol}</span>
              <div className="flex items-center gap-1">
                <span>{formatCurrency(token.price.current)}</span>
                <span className={token.price.change24h >= 0 ? "text-green-500" : "text-red-500"}>
                  ({token.price.change24h >= 0 ? "+" : ""}{token.price.change24h.toFixed(2)}%)
                </span>
              </div>
              
              {token.priceConfidence !== undefined && (
                <UITooltip>
                  <TooltipTrigger asChild>
                    <span className={`ml-1 text-xs ${getConfidenceColor(token.priceConfidence)}`}>
                      ({formatConfidence(token.priceConfidence)})
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>DefiLlama price confidence score</p>
                  </TooltipContent>
                </UITooltip>
              )}
              
              <a
                href={token.geckoTerminalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center ml-1 text-primary hover:text-primary/80"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ))}
        </TooltipProvider>
      </CardFooter>
    </Card>
  );
} 